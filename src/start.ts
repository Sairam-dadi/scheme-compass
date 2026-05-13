import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Attach the Supabase session JWT to every server-fn request so
// `requireSupabaseAuth` middleware sees a valid bearer token.
const supabaseAuthHeader = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token: string | undefined;
    if (typeof window !== "undefined") {
      try {
        const { supabase } = await import("./integrations/supabase/client");
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token;
      } catch (e) {
        console.warn("supabaseAuthHeader: failed to read session", e);
      }
    }
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
  functionMiddleware: [supabaseAuthHeader],
}));
