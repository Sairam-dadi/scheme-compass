import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SchemeCard } from "@/components/SchemeCard";
import { INDIAN_STATES } from "@/lib/seed-data";
import { Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/eligibility")({ component: EligibilityPage });

type Profile = {
  age: number; gender: string; state: string; education: string; occupation: string;
  income: number; isStudent: boolean; isFarmer: boolean; isEmployed: boolean;
};

function EligibilityPage() {
  const [p, setP] = useState<Profile>({
    age: 25, gender: "any", state: "All India", education: "graduate", occupation: "any",
    income: 200000, isStudent: false, isFarmer: false, isEmployed: false,
  });
  const [submitted, setSubmitted] = useState(false);

  const { data: schemes } = useQuery({
    queryKey: ["schemes-elig"],
    queryFn: async () => {
      const { data, error } = await supabase.from("schemes").select("*").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const matches = (() => {
    if (!schemes || !submitted) return { eligible: [], partial: [] };
    const eligible: any[] = []; const partial: any[] = [];
    for (const s of schemes) {
      const checks: { ok: boolean; label: string }[] = [];
      checks.push({ ok: s.min_age == null || p.age >= s.min_age, label: `Age ≥ ${s.min_age ?? "—"}` });
      checks.push({ ok: s.max_age == null || p.age <= s.max_age, label: `Age ≤ ${s.max_age ?? "—"}` });
      checks.push({ ok: !s.gender || s.gender === "any" || s.gender === p.gender, label: `Gender ${s.gender}` });
      checks.push({ ok: s.state_applicability === "All India" || s.state_applicability === p.state, label: `State ${s.state_applicability}` });
      checks.push({ ok: s.max_income == null || p.income <= s.max_income, label: `Income ≤ ₹${s.max_income?.toLocaleString("en-IN")}` });
      const occOk = !s.occupation || s.occupation === "any"
        || (s.occupation === "student" && p.isStudent)
        || (s.occupation === "farmer" && p.isFarmer)
        || (s.occupation === "employed" && p.isEmployed)
        || (s.occupation === p.occupation);
      checks.push({ ok: occOk, label: `Occupation: ${s.occupation}` });

      const failed = checks.filter((c) => !c.ok);
      const passed = checks.filter((c) => c.ok);
      const reason = passed.slice(0, 3).map((c) => c.label).join(", ");
      const missing = failed.map((c) => c.label).join(", ");
      if (failed.length === 0) eligible.push({ ...s, _reason: reason });
      else if (failed.length <= 2) partial.push({ ...s, _reason: reason, _missing: missing });
    }
    return { eligible, partial };
  })();

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <header className="text-center max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium"><Sparkles className="h-3.5 w-3.5" />Smart Eligibility Checker</span>
        <h1 className="text-3xl md:text-4xl font-bold mt-3">Find schemes that fit you.</h1>
        <p className="text-muted-foreground mt-2">Tell us a bit about yourself — we'll match you to relevant schemes instantly.</p>
      </header>

      <Card className="max-w-3xl mx-auto shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle>Your details</CardTitle><CardDescription>None of this is shared. Used only for matching.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Age</Label><Input type="number" min={0} max={120} value={p.age} onChange={(e) => setP({ ...p, age: +e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Gender</Label>
              <Select value={p.gender} onValueChange={(v) => setP({ ...p, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="any">Prefer not to say</SelectItem><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>State</Label>
              <Select value={p.state} onValueChange={(v) => setP({ ...p, state: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Annual income (₹)</Label><Input type="number" min={0} value={p.income} onChange={(e) => setP({ ...p, income: +e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Education</Label>
              <Select value={p.education} onValueChange={(v) => setP({ ...p, education: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem><SelectItem value="secondary">Secondary / 12th</SelectItem>
                  <SelectItem value="graduate">Graduate</SelectItem><SelectItem value="postgraduate">Postgraduate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Occupation</Label>
              <Select value={p.occupation} onValueChange={(v) => setP({ ...p, occupation: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Other</SelectItem>
                  <SelectItem value="unemployed">Unemployed</SelectItem>
                  <SelectItem value="self-employed">Self-employed</SelectItem>
                  <SelectItem value="employed">Salaried</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 grid grid-cols-3 gap-3 pt-2">
              <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer"><Switch checked={p.isStudent} onCheckedChange={(v) => setP({ ...p, isStudent: v })} /><span className="text-sm">Student</span></label>
              <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer"><Switch checked={p.isFarmer} onCheckedChange={(v) => setP({ ...p, isFarmer: v })} /><span className="text-sm">Farmer</span></label>
              <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer"><Switch checked={p.isEmployed} onCheckedChange={(v) => setP({ ...p, isEmployed: v })} /><span className="text-sm">Employed</span></label>
            </div>
            <Button type="submit" size="lg" className="md:col-span-2 mt-2">Find matching schemes</Button>
          </form>
        </CardContent>
      </Card>

      {submitted && (
        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /> Eligible schemes ({matches.eligible.length})</h2>
            {matches.eligible.length === 0 ? <p className="text-muted-foreground text-sm">No fully eligible schemes found. See partial matches below.</p> : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {matches.eligible.map((s: any) => <SchemeCard key={s.id} scheme={s} matchReason={s._reason} />)}
              </div>
            )}
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><AlertCircle className="h-5 w-5 text-warning" /> Partially eligible ({matches.partial.length})</h2>
            <p className="text-sm text-muted-foreground mb-4">You meet most criteria — review missing requirements.</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {matches.partial.map((s: any) => <SchemeCard key={s.id} scheme={s} matchReason={`Missing: ${s._missing}`} />)}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
