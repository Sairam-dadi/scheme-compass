## Problem

The admin **Fetch from web** button fails with two layered bugs:

1. **401 Unauthorized — `No authorization header provided`** (visible in network tab).
   The `scrapeSchemes` server function uses `requireSupabaseAuth`, which reads `Authorization: Bearer <token>` from the request. But TanStack Start's `useServerFn` client does **not** automatically attach the Supabase session JWT — so every call lands at the middleware with no auth header and is rejected.

2. **`Cannot read properties of undefined (reading 'length')`** in the success path.
   Even when a call eventually returns, the handler reads `(search as any).web ?? (search as any).data` and assumes the result is an array. The Firecrawl SDK v2 returns its results under `search.web.results` (or a different wrapper depending on version), so `results` becomes `undefined` and the subsequent `for (const r of results)` / `results.length` crashes. The crash is then surfaced as a toast on the next render, which is why the UI shows "Scraped undefined pages — undefined new, undefined updated" followed by the length error.

## Fix

### 1. Attach the Supabase session JWT to every server-fn call

Add a small **client middleware** that reads the current Supabase session and sets the `Authorization` header on every server function request, then attach it to a shared `startInstance` so all server fns inherit it.

```ts
// src/start.ts — add a client-side middleware
const supabaseAuthHeader = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({
      sendContext: {},
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
  functionMiddleware: [supabaseAuthHeader], // applied to every createServerFn
}));
```

This removes the need to manually pass tokens from each component and fixes the 401 for `scrapeSchemes` (and any future protected server fn).

### 2. Normalize the Firecrawl SDK v2 response shape

Replace the brittle `(search as any).web ?? (search as any).data` with a defensive normalizer that handles all known v2 shapes:

```ts
const raw: any = search ?? {};
const results: any[] =
  (Array.isArray(raw.web?.results) && raw.web.results) ||
  (Array.isArray(raw.web) && raw.web) ||
  (Array.isArray(raw.data) && raw.data) ||
  (Array.isArray(raw.results) && raw.results) ||
  [];

if (results.length === 0) {
  return { inserted: 0, updated: 0, skipped: 0, scanned: 0, errors: ['No results from Firecrawl search'] };
}
```

Also guard `r.markdown` — if the search call did not return scraped content for a result, fall back to `firecrawl.scrape(url, { formats: ['markdown'] })` for that single URL before extraction. This makes the pipeline resilient to Firecrawl returning hits without inline markdown.

### 3. Harden the AI JSON extraction

The Lovable AI Gateway sometimes returns markdown-wrapped or truncated JSON. Wrap `JSON.parse` in a small extractor that:

- strips ```` ```json ```` fences,
- trims to the first `{` … last `}`,
- on failure, logs the raw content and returns `{ schemes: [] }` instead of throwing.

This guarantees one bad page never aborts the whole batch (it's already in a per-URL `try/catch`, but the parse itself was the most common failure inside that block).

### 4. Tighten the admin UI feedback

In `src/routes/admin.tsx`, the toast currently reads `${res.scanned}` etc. without checking the response. After the server fn is fixed, also:

- show `res.errors[0]` in a `toast.error` when `inserted + updated === 0`,
- keep `toast.success` only when at least one row was inserted/updated.

This prevents the misleading "Scraped undefined pages…" success toast.

## Files to change

- `src/start.ts` — add client middleware that attaches the Supabase JWT to every server-fn request.
- `src/lib/scrape-schemes.functions.ts` — normalize Firecrawl response, fall back to per-URL scrape when markdown is missing, harden JSON parsing.
- `src/routes/admin.tsx` — clearer toasts based on `res` contents.

No database / RLS / schema changes are needed.

## Verification

1. Reload `/admin`, click **Fetch from web** with the existing query.
2. Network panel: the `POST /_serverFn/...` request now carries `Authorization: Bearer …` and returns 200.
3. Toast shows real numbers (`Scraped N pages — X new, Y updated`) or a real error, never `undefined`.
4. The schemes list refreshes with newly inserted rows.
