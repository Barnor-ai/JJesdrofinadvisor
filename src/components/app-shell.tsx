import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Building2, Upload, TrendingUp, LayoutDashboard, FileText, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode } from "react";

const nav = [
  { to: "/company", label: "Company profile", icon: Building2 },
  { to: "/upload", label: "New analysis", icon: Upload },
  { to: "/profitability", label: "Profitability", icon: TrendingUp },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyses", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const path = useRouterState({ select: s => s.location.pathname });

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
        <button onClick={signOut} className="m-3 flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
