import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";

export type SchemeRow = {
  id: string;
  scheme_name: string;
  description: string;
  category: string;
  state_applicability: string;
  deadline: string | null;
  benefits: string;
};

export function SchemeCard({ scheme, matchReason }: { scheme: SchemeRow; matchReason?: string }) {
  const expiringSoon = scheme.deadline && new Date(scheme.deadline) > new Date() && (new Date(scheme.deadline).getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;
  return (
    <Card className="group flex flex-col h-full hover:shadow-[var(--shadow-elegant)] transition-all border-border/60">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="secondary" className="font-medium">{scheme.category}</Badge>
          {expiringSoon && <Badge className="bg-warning text-warning-foreground">Expiring soon</Badge>}
        </div>
        <CardTitle className="text-lg leading-snug">{scheme.scheme_name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-3">{scheme.description}</p>
        {matchReason && <p className="text-xs rounded-md bg-success/10 text-success-foreground border border-success/20 px-2.5 py-1.5"><span className="font-semibold text-success">Why match: </span>{matchReason}</p>}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{scheme.state_applicability}</span>
          {scheme.deadline && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(scheme.deadline), "dd MMM yyyy")}</span>}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="ghost" size="sm" className="w-full justify-between" asChild>
          <Link to="/schemes/$id" params={{ id: scheme.id }}>
            View details <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
