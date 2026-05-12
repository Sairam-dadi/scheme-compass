import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Landmark, LogOut, Shield, User as UserIcon } from "lucide-react";

export function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const router = useRouter();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-card)]">
            <Landmark className="h-5 w-5" />
          </span>
          <span>YojanaMitra</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/schemes" className="text-muted-foreground hover:text-foreground transition" activeProps={{ className: "text-foreground" }}>Browse Schemes</Link>
          <Link to="/eligibility" className="text-muted-foreground hover:text-foreground transition" activeProps={{ className: "text-foreground" }}>Eligibility Checker</Link>
          {user && <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition" activeProps={{ className: "text-foreground" }}>Dashboard</Link>}
          {isAdmin && <Link to="/admin" className="text-accent-foreground/80 hover:text-foreground transition flex items-center gap-1" activeProps={{ className: "text-foreground" }}><Shield className="h-3.5 w-3.5" />Admin</Link>}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => router.navigate({ to: "/dashboard" })}>
                <UserIcon className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline truncate max-w-[120px]">{user.email}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={async () => { await signOut(); router.navigate({ to: "/" }); }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild><Link to="/login">Login</Link></Button>
              <Button size="sm" asChild><Link to="/signup">Sign up</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
