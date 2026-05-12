import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INDIAN_STATES } from "@/lib/seed-data";
import { toast } from "sonner";
import { Sparkles, Shield } from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data ?? { id: user.id }));
  }, [user]);

  if (loading || !user || !profile) return <div className="container mx-auto px-4 py-12">Loading…</div>;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({ ...profile, id: user.id });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Profile saved");
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {profile.full_name ?? user.email}</h1>
        <p className="text-muted-foreground mt-1">Manage your profile for better scheme matching.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Find schemes</CardTitle></CardHeader>
          <CardContent><Button asChild className="w-full"><Link to="/eligibility">Run eligibility check</Link></Button></CardContent>
        </Card>
        {isAdmin && (
          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-accent" />Admin panel</CardTitle></CardHeader>
            <CardContent><Button asChild variant="outline" className="w-full"><Link to="/admin">Manage schemes</Link></Button></CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Your profile</CardTitle><CardDescription>Used to personalise eligibility results.</CardDescription></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Full name</Label><Input value={profile.full_name ?? ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Age</Label><Input type="number" value={profile.age ?? ""} onChange={(e) => setProfile({ ...profile, age: e.target.value ? +e.target.value : null })} /></div>
          <div className="space-y-1.5"><Label>Gender</Label>
            <Select value={profile.gender ?? ""} onValueChange={(v) => setProfile({ ...profile, gender: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>State</Label>
            <Select value={profile.state ?? ""} onValueChange={(v) => setProfile({ ...profile, state: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Education</Label>
            <Select value={profile.education ?? ""} onValueChange={(v) => setProfile({ ...profile, education: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent><SelectItem value="primary">Primary</SelectItem><SelectItem value="secondary">Secondary</SelectItem><SelectItem value="graduate">Graduate</SelectItem><SelectItem value="postgraduate">Postgraduate</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Occupation</Label><Input value={profile.occupation ?? ""} onChange={(e) => setProfile({ ...profile, occupation: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Annual income (₹)</Label><Input type="number" value={profile.annual_income ?? ""} onChange={(e) => setProfile({ ...profile, annual_income: e.target.value ? +e.target.value : null })} /></div>
          <div className="md:col-span-2"><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button></div>
        </CardContent>
      </Card>
    </div>
  );
}
