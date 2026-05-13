import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import Firecrawl from "@mendable/firecrawl-js";
import { z } from "zod";

const SchemeExtract = z.object({
  schemes: z.array(
    z.object({
      scheme_name: z.string(),
      description: z.string(),
      eligibility_criteria: z.string(),
      benefits: z.string(),
      required_documents: z.array(z.string()).default([]),
      application_link: z.string().nullable().optional(),
      deadline: z.string().nullable().optional(),
      state_applicability: z.string().default("All India"),
      category: z.string().default("Other"),
      min_age: z.number().nullable().optional(),
      max_age: z.number().nullable().optional(),
      gender: z.string().nullable().optional(),
      max_income: z.number().nullable().optional(),
      education_level: z.string().nullable().optional(),
      occupation: z.string().nullable().optional(),
    })
  ),
});

async function aiExtract(markdown: string, sourceUrl: string) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const prompt = `From the following web page about Indian government schemes, extract every distinct scheme as structured JSON.
Return ONLY valid JSON matching this exact shape: {"schemes":[{...}]}.
Each scheme object: scheme_name (string), description (1-3 sentences), eligibility_criteria (string), benefits (string), required_documents (string array), application_link (url or null), deadline (YYYY-MM-DD or null), state_applicability (Indian state name or "All India"), category (one of: Agriculture, Education, Health, Housing, Employment, Women, Senior Citizens, Disability, Financial, Other), min_age (number or null), max_age (number or null), gender ("male"|"female"|"any"|null), max_income (annual INR number or null), education_level ("primary"|"secondary"|"graduate"|"postgraduate"|"any"|null), occupation ("student"|"farmer"|"employed"|"self-employed"|"unemployed"|"any"|null).
If the page is not about a scheme, return {"schemes":[]}.

SOURCE URL: ${sourceUrl}
PAGE CONTENT:
${markdown.slice(0, 12000)}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You extract structured data and respond with valid JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const content: string = json.choices?.[0]?.message?.content ?? "{}";

  // Robust JSON extraction — strip code fences, trim to outer braces.
  let cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.search(/[\{\[]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start !== -1 && end !== -1 && end > start) cleaned = cleaned.slice(start, end + 1);

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    try {
      parsed = JSON.parse(cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, ""));
    } catch (e) {
      console.warn("aiExtract: JSON parse failed", e, content.slice(0, 300));
      return [];
    }
  }

  // Tolerate either {schemes:[...]} or a bare array.
  if (Array.isArray(parsed)) parsed = { schemes: parsed };
  const safe = SchemeExtract.safeParse(parsed);
  return safe.success ? safe.data.schemes : [];
}

export const scrapeSchemes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { query?: string; limit?: number }) => ({
    query: d.query ?? "latest Indian government welfare schemes 2026 eligibility benefits site:myscheme.gov.in OR site:india.gov.in",
    limit: Math.min(Math.max(d.limit ?? 5, 1), 10),
  }))
  .handler(async ({ data, context }) => {
    // Admin-only
    const { data: roleRow } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new Error("Admin access required");

    const fcKey = process.env.FIRECRAWL_API_KEY;
    if (!fcKey) throw new Error("Firecrawl not connected");
    const firecrawl = new Firecrawl({ apiKey: fcKey });

    const search = await firecrawl.search(data.query, {
      limit: data.limit,
      scrapeOptions: { formats: ["markdown"] },
    });

    // Normalize Firecrawl SDK v2 response shape (web.results | web | data | results).
    const raw: any = search ?? {};
    const results: any[] =
      (Array.isArray(raw?.web?.results) && raw.web.results) ||
      (Array.isArray(raw?.web) && raw.web) ||
      (Array.isArray(raw?.data) && raw.data) ||
      (Array.isArray(raw?.results) && raw.results) ||
      [];

    let inserted = 0, updated = 0, skipped = 0;
    const errors: string[] = [];

    if (results.length === 0) {
      return { inserted: 0, updated: 0, skipped: 0, scanned: 0, errors: ["No results from Firecrawl search"] };
    }

    for (const r of results) {
      const url = r.url ?? r.link;
      let md: string | undefined = r.markdown ?? r.content ?? r.description;
      if (!url) { skipped++; continue; }

      // Fall back to per-URL scrape when search didn't return inline content.
      if (!md) {
        try {
          const scraped: any = await firecrawl.scrape(url, { formats: ["markdown"], onlyMainContent: true });
          md = scraped?.markdown ?? scraped?.data?.markdown;
        } catch (e: any) {
          errors.push(`scrape ${url}: ${e.message}`);
        }
      }
      if (!md) { skipped++; continue; }


      try {
        const schemes = await aiExtract(md, url);
        for (const s of schemes) {
          if (!s.scheme_name || !s.description) { skipped++; continue; }
          const row = {
            scheme_name: s.scheme_name,
            description: s.description,
            eligibility_criteria: s.eligibility_criteria || "Refer to official source",
            benefits: s.benefits || "Refer to official source",
            required_documents: s.required_documents ?? [],
            application_link: s.application_link ?? url,
            deadline: s.deadline && /^\d{4}-\d{2}-\d{2}$/.test(s.deadline) ? s.deadline : null,
            state_applicability: s.state_applicability || "All India",
            category: s.category || "Other",
            min_age: s.min_age ?? null,
            max_age: s.max_age ?? null,
            gender: s.gender ?? "any",
            max_income: s.max_income ?? null,
            education_level: s.education_level ?? "any",
            occupation: s.occupation ?? "any",
            source_url: url,
            is_active: true,
          };

          const { data: existing } = await supabaseAdmin
            .from("schemes").select("id").ilike("scheme_name", row.scheme_name).maybeSingle();

          if (existing) {
            const { error } = await supabaseAdmin.from("schemes").update(row).eq("id", existing.id);
            if (error) errors.push(error.message); else updated++;
          } else {
            const { error } = await supabaseAdmin.from("schemes").insert(row);
            if (error) errors.push(error.message); else inserted++;
          }
        }
      } catch (e: any) {
        errors.push(`${url}: ${e.message}`);
      }
    }

    return { inserted, updated, skipped, scanned: results.length, errors: errors.slice(0, 5) };
  });
