import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Building2, Upload, TrendingUp, LayoutDashboard, FileText, Settings, LogOut, Menu, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const nav = [
  { to: "/company", label: "Company profile", icon: Building2 },
  { to: "/upload", label: "New analysis", icon: Upload },
  { to: "/profitability", label: "Profitability", icon: TrendingUp },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyses", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: '/subscription', label: 'Membership', icon: CreditCard },
];

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const path = useRouterState({ select: s => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 p-6 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-gold text-navy font-display text-lg font-bold">F</div>
          <span className="font-display text-xl">FinScope</span>
        </Link>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(n => {
            const active = path === n.to || path.startsWith(n.to + "/");
            return (
              <Link key={n.to} to={n.to} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${active ? "bg-sidebar-accent text-gold" : "hover:bg-sidebar-accent/50"}`}>
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <Button variant="ghost" onClick={signOut} className="m-3 justify-start text-sidebar-foreground">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="md:hidden sticky top-0 z-30 bg-sidebar text-sidebar-foreground border-b border-sidebar-border flex items-center justify-between px-4 h-14">
          <Link to="/dashboard" className="font-display text-xl">FinScope</Link>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Open navigation"><Menu className="h-5 w-5" /></Button></SheetTrigger><SheetContent side="left" className="bg-sidebar text-sidebar-foreground"><SheetTitle className="font-display text-sidebar-foreground">FinScope</SheetTitle><nav className="mt-6 space-y-2">{nav.map(n => <Link key={n.to} to={n.to} onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm ${path.startsWith(n.to) ? 'bg-sidebar-accent text-gold' : ''}`}><n.icon className="h-5 w-5" />{n.label}</Link>)}</nav><Button variant="ghost" className="mt-6" onClick={signOut}><LogOut className="h-4 w-4" />Sign out</Button></SheetContent></Sheet>
        </header>
        {children}
      </main>
    </div>
  );
}
