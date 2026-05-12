import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SchemeCard, type SchemeRow } from "@/components/SchemeCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INDIAN_STATES, SCHEME_CATEGORIES } from "@/lib/seed-data";

export const Route = createFileRoute("/schemes")({ component: SchemesPage });

function SchemesPage() {
  const [q, setQ] = useState("");
  const [state, setState] = useState("all");
  const [category, setCategory] = useState("all");
  const [income, setIncome] = useState("");
  const [education, setEducation] = useState("all");

  const { data: schemes, isLoading } = useQuery({
    queryKey: ["schemes-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("schemes")
        .select("id,scheme_name,description,category,state_applicability,deadline,benefits,max_income,education_level")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (SchemeRow & { max_income: number | null; education_level: string })[];
    },
  });

  const filtered = useMemo(() => {
    if (!schemes) return [];
    const incomeNum = income ? Number(income) : null;
    const ql = q.trim().toLowerCase();
    return schemes.filter((s) => {
      if (ql && !s.scheme_name.toLowerCase().includes(ql) && !s.description.toLowerCase().includes(ql) && !s.category.toLowerCase().includes(ql)) return false;
      if (state !== "all" && s.state_applicability !== state && s.state_applicability !== "All India") return false;
      if (category !== "all" && s.category !== category) return false;
      if (incomeNum !== null && s.max_income !== null && incomeNum > s.max_income) return false;
      if (education !== "all" && s.education_level !== "any" && s.education_level !== education) return false;
      return true;
    });
  }, [schemes, q, state, category, income, education]);

  const expiring = useMemo(() => {
    if (!schemes) return [];
    const cutoff = Date.now() + 30 * 24 * 60 * 60 * 1000;
    return schemes.filter((s) => s.deadline && new Date(s.deadline).getTime() < cutoff && new Date(s.deadline).getTime() > Date.now()).slice(0, 6);
  }, [schemes]);

  const reset = () => { setQ(""); setState("all"); setCategory("all"); setIncome(""); setEducation("all"); };
  const hasFilters = q || state !== "all" || category !== "all" || income || education !== "all";

  return (
    <div className="container mx-auto px-4 py-10 space-y-10">
      <header>
        <h1 className="text-3xl md:text-4xl font-bold">Browse Government Schemes</h1>
        <p className="text-muted-foreground mt-2">Search and filter across {schemes?.length ?? "—"} central and state schemes.</p>
      </header>

      {/* Search + filters */}
      <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)] space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search by name, keyword or category…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">State</Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {SCHEME_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Annual income (₹)</Label>
            <Input type="number" placeholder="e.g. 200000" value={income} onChange={(e) => setIncome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Education</Label>
            <Select value={education} onValueChange={setEducation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="secondary">Secondary / 12th</SelectItem>
                <SelectItem value="graduate">Graduate</SelectItem>
                <SelectItem value="postgraduate">Postgraduate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {hasFilters && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-muted-foreground inline-flex items-center gap-1.5"><Filter className="h-3.5 w-3.5" /> {filtered.length} of {schemes?.length} schemes</span>
            <Button variant="ghost" size="sm" onClick={reset}><X className="h-3.5 w-3.5 mr-1" /> Reset</Button>
          </div>
        )}
      </div>

      {/* Expiring soon */}
      {expiring.length > 0 && !hasFilters && (
        <section>
          <h2 className="text-xl font-semibold mb-4">⏳ Expiring soon</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {expiring.map((s) => <SchemeCard key={s.id} scheme={s} />)}
          </div>
        </section>
      )}

      {/* Results */}
      <section>
        <h2 className="text-xl font-semibold mb-4">{hasFilters ? "Results" : "All schemes"}</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-xl">
            <p className="text-muted-foreground">No schemes match your filters.</p>
            <Button variant="outline" className="mt-4" onClick={reset}>Clear filters</Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((s) => <SchemeCard key={s.id} scheme={s} />)}
          </div>
        )}
      </section>
    </div>
  );
}
