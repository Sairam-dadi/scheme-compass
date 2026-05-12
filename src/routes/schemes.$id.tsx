import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, ExternalLink, FileText, MapPin } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/schemes/$id")({ component: SchemeDetail });

function SchemeDetail() {
  const { id } = Route.useParams();
  const { data: scheme, isLoading } = useQuery({
    queryKey: ["scheme", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("schemes").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  if (isLoading) return <div className="container mx-auto px-4 py-12">Loading…</div>;
  if (!scheme) return null;

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <Button variant="ghost" size="sm" asChild className="mb-4"><Link to="/schemes"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant="secondary">{scheme.category}</Badge>
        <Badge variant="outline"><MapPin className="h-3 w-3 mr-1" />{scheme.state_applicability}</Badge>
        {scheme.deadline && <Badge className="bg-warning text-warning-foreground"><Calendar className="h-3 w-3 mr-1" />{format(new Date(scheme.deadline), "dd MMM yyyy")}</Badge>}
      </div>
      <h1 className="text-3xl md:text-4xl font-bold mb-3">{scheme.scheme_name}</h1>
      <p className="text-lg text-muted-foreground">{scheme.description}</p>

      <div className="grid md:grid-cols-2 gap-5 mt-8">
        <Card><CardHeader><CardTitle className="text-base">Eligibility</CardTitle></CardHeader><CardContent className="text-sm whitespace-pre-line">{scheme.eligibility_criteria}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Benefits</CardTitle></CardHeader><CardContent className="text-sm whitespace-pre-line">{scheme.benefits}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Required documents</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1.5 list-disc list-inside">
              {(scheme.required_documents ?? []).map((d: string) => <li key={d}>{d}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-base">Apply</CardTitle></CardHeader>
          <CardContent>
            {scheme.application_link ? (
              <Button asChild className="w-full"><a href={scheme.application_link} target="_blank" rel="noreferrer">Apply now <ExternalLink className="h-4 w-4 ml-1.5" /></a></Button>
            ) : <p className="text-sm text-muted-foreground">No direct link available.</p>}
            {scheme.source_url && <a href={scheme.source_url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground mt-3 block hover:text-foreground">Source: {scheme.source_url}</a>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
