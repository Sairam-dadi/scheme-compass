import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SchemeCard, type SchemeRow } from "@/components/SchemeCard";
import { Search, Sparkles, ShieldCheck, Zap, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { data: latest } = useQuery({
    queryKey: ["latest-schemes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("schemes")
        .select("id,scheme_name,description,category,state_applicability,deadline,benefits")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data as SchemeRow[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["scheme-stats"],
    queryFn: async () => {
      const { count } = await supabase.from("schemes").select("*", { count: "exact", head: true }).eq("is_active", true);
      return { total: count ?? 0 };
    },
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[image:var(--gradient-hero)] opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(0.72_0.18_50/0.25),transparent_50%)]" />
        <div className="relative container mx-auto px-4 py-20 md:py-28 text-primary-foreground">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Smart eligibility • {stats?.total ?? "—"} schemes tracked
            </span>
            <h1 className="mt-5 text-4xl md:text-6xl font-bold leading-tight">
              Every government scheme you qualify for, <span className="text-accent">in one place.</span>
            </h1>
            <p className="mt-5 text-lg text-primary-foreground/85 max-w-2xl">
              YojanaMitra finds central and state schemes that match your age, state, income and occupation — so you never miss a benefit you're entitled to.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/eligibility"><Zap className="h-4 w-4 mr-2" /> Check my eligibility</Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-white/40 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground" asChild>
                <Link to="/schemes"><Search className="h-4 w-4 mr-2" /> Browse all schemes</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Zap, title: "Smart Eligibility", text: "Answer a few questions and get a tailored list of schemes you qualify for, with reasons." },
            { icon: Search, title: "Powerful Search", text: "Filter by state, category, income and education across central and state schemes." },
            { icon: ShieldCheck, title: "Always Up to Date", text: "Schemes are scraped and curated from official portals — the latest deadlines, always." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 shadow-[var(--shadow-card)]">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary mb-4"><f.icon className="h-5 w-5" /></div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1.5">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Latest schemes */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Latest schemes</h2>
            <p className="text-muted-foreground text-sm mt-1">Recently added or updated.</p>
          </div>
          <Button variant="ghost" asChild><Link to="/schemes">View all <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {latest?.map((s) => <SchemeCard key={s.id} scheme={s} />)}
        </div>
      </section>
    </div>
  );
}
