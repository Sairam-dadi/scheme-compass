import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { INDIAN_STATES, SCHEME_CATEGORIES } from "@/lib/seed-data";
import { scrapeSchemes } from "@/lib/scrape-schemes.functions";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Globe, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminPage });

const empty = {
  scheme_name: "", description: "", eligibility_criteria: "", benefits: "",
  required_documents: [] as string[], application_link: "", deadline: null as string | null,
  state_applicability: "All India", category: "Education",
  min_age: null as number | null, max_age: null as number | null, gender: "any",
  max_income: null as number | null, education_level: "any", occupation: "any",
  source_url: "", is_active: true,
};

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [scrapeQuery, setScrapeQuery] = useState("");
  const [scraping, setScraping] = useState(false);
  const runScrape = useServerFn(scrapeSchemes);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate({ to: "/" });
  }, [loading, user, isAdmin, navigate]);

  const handleScrape = async () => {
    setScraping(true);
    try {
      const res = await runScrape({ data: { query: scrapeQuery || undefined, limit: 5 } });
      const inserted = res?.inserted ?? 0;
      const updated = res?.updated ?? 0;
      const scanned = res?.scanned ?? 0;
      const errs = res?.errors ?? [];
      if (inserted + updated > 0) {
        toast.success(`Scraped ${scanned} page(s) — ${inserted} new, ${updated} updated`);
      } else {
        toast.error(errs[0] || `No schemes extracted from ${scanned} page(s)`);
      }
      if (errs.length) console.warn("scrape errors", errs);
      qc.invalidateQueries({ queryKey: ["admin-schemes"] });
      qc.invalidateQueries({ queryKey: ["schemes-all"] });
    } catch (e: any) {
      toast.error(e?.message || "Scrape failed");
    } finally {
      setScraping(false);
    }
  };


  const { data: schemes } = useQuery({
    queryKey: ["admin-schemes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("schemes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  if (loading || !isAdmin) return <div className="container mx-auto px-4 py-12">Loading…</div>;

  const save = async () => {
    const payload = { ...editing };
    if (payload.required_documents && typeof payload.required_documents === "string") {
      payload.required_documents = payload.required_documents.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
    const { error } = payload.id
      ? await supabase.from("schemes").update(payload).eq("id", payload.id)
      : await supabase.from("schemes").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setOpen(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-schemes"] });
    qc.invalidateQueries({ queryKey: ["schemes-all"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this scheme?")) return;
    const { error } = await supabase.from("schemes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-schemes"] });
  };

  const openNew = () => { setEditing({ ...empty, required_documents: "" }); setOpen(true); };
  const openEdit = (s: any) => { setEditing({ ...s, required_documents: (s.required_documents ?? []).join(", ") }); setOpen(true); };

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">{schemes?.length ?? 0} schemes in database</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Add scheme</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing?.id ? "Edit scheme" : "New scheme"}</DialogTitle></DialogHeader>
            {editing && (
              <div className="grid md:grid-cols-2 gap-3">
                <div className="md:col-span-2 space-y-1.5"><Label>Name</Label><Input value={editing.scheme_name} onChange={(e) => setEditing({ ...editing, scheme_name: e.target.value })} /></div>
                <div className="md:col-span-2 space-y-1.5"><Label>Description</Label><Textarea rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
                <div className="md:col-span-2 space-y-1.5"><Label>Eligibility</Label><Textarea rows={2} value={editing.eligibility_criteria} onChange={(e) => setEditing({ ...editing, eligibility_criteria: e.target.value })} /></div>
                <div className="md:col-span-2 space-y-1.5"><Label>Benefits</Label><Textarea rows={2} value={editing.benefits} onChange={(e) => setEditing({ ...editing, benefits: e.target.value })} /></div>
                <div className="md:col-span-2 space-y-1.5"><Label>Required documents (comma-separated)</Label><Input value={editing.required_documents} onChange={(e) => setEditing({ ...editing, required_documents: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Category</Label>
                  <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SCHEME_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>State</Label>
                  <Select value={editing.state_applicability} onValueChange={(v) => setEditing({ ...editing, state_applicability: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Min age</Label><Input type="number" value={editing.min_age ?? ""} onChange={(e) => setEditing({ ...editing, min_age: e.target.value ? +e.target.value : null })} /></div>
                <div className="space-y-1.5"><Label>Max age</Label><Input type="number" value={editing.max_age ?? ""} onChange={(e) => setEditing({ ...editing, max_age: e.target.value ? +e.target.value : null })} /></div>
                <div className="space-y-1.5"><Label>Gender</Label>
                  <Select value={editing.gender} onValueChange={(v) => setEditing({ ...editing, gender: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="any">Any</SelectItem><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Max income (₹)</Label><Input type="number" value={editing.max_income ?? ""} onChange={(e) => setEditing({ ...editing, max_income: e.target.value ? +e.target.value : null })} /></div>
                <div className="space-y-1.5"><Label>Education</Label>
                  <Select value={editing.education_level} onValueChange={(v) => setEditing({ ...editing, education_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="any">Any</SelectItem><SelectItem value="primary">Primary</SelectItem><SelectItem value="secondary">Secondary</SelectItem><SelectItem value="graduate">Graduate</SelectItem><SelectItem value="postgraduate">Postgraduate</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Occupation</Label>
                  <Select value={editing.occupation} onValueChange={(v) => setEditing({ ...editing, occupation: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="any">Any</SelectItem><SelectItem value="student">Student</SelectItem><SelectItem value="farmer">Farmer</SelectItem><SelectItem value="employed">Employed</SelectItem><SelectItem value="self-employed">Self-employed</SelectItem><SelectItem value="unemployed">Unemployed</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Deadline</Label><Input type="date" value={editing.deadline ?? ""} onChange={(e) => setEditing({ ...editing, deadline: e.target.value || null })} /></div>
                <div className="md:col-span-2 space-y-1.5"><Label>Application link</Label><Input value={editing.application_link ?? ""} onChange={(e) => setEditing({ ...editing, application_link: e.target.value })} /></div>
                <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={save}>Save</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> Auto-fetch from the web</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Searches official Indian government sources, extracts schemes with AI, and adds or updates them in the database.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder='e.g. "PM scholarship schemes 2026" (leave blank for general latest schemes)'
              value={scrapeQuery}
              onChange={(e) => setScrapeQuery(e.target.value)}
              disabled={scraping}
            />
            <Button onClick={handleScrape} disabled={scraping} className="shrink-0">
              {scraping ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Scraping…</> : <><Globe className="h-4 w-4 mr-1.5" />Fetch from web</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">All schemes</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {schemes?.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{s.scheme_name}</div>
                  <div className="text-xs text-muted-foreground">{s.category} · {s.state_applicability}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
