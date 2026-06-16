import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, TrendingUp, ShieldAlert, FileText } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — FinScope" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [{ data: companies }, { data: analyses }] = await Promise.all([
        supabase.from("companies").select("*").order("created_at", { ascending: false }),
        supabase.from("analyses").select("*").order("created_at", { ascending: false }).limit(10),
      ]);
      return { companies: companies ?? [], analyses: analyses ?? [] };
    },
  });

  if (data && data.companies.length === 0) {
    return <AppShell><Onboard onDone={() => navigate({ to: "/upload" })} /></AppShell>;
  }

  const avgRisk = (data?.analyses.filter(a => a.risk_score).reduce((s, a) => s + (a.risk_score ?? 0), 0) ?? 0) / Math.max(1, (data?.analyses.filter(a => a.risk_score).length ?? 1));
  const completed = data?.analyses.filter(a => a.status === "completed").length ?? 0;

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs tracking-[0.3em] text-gold uppercase">Dashboard</p>
            <h1 className="font-display text-4xl mt-2">Financial overview</h1>
          </div>
          <Button asChild variant="gold"><Link to="/upload"><Upload className="h-4 w-4" /> New analysis</Link></Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Stat icon={FileText} label="Total reports" value={data?.analyses.length ?? 0} />
          <Stat icon={TrendingUp} label="Completed" value={completed} />
          <Stat icon={ShieldAlert} label="Avg risk score" value={avgRisk ? avgRisk.toFixed(1) : "—"} />
        </div>

        <Card className="p-6">
          <h2 className="font-display text-2xl mb-4">Recent reports</h2>
          {(data?.analyses ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">No analyses yet. <Link to="/upload" className="text-gold underline">Upload a statement</Link> to begin.</p>
          ) : (
            <div className="divide-y divide-border">
              {data?.analyses.map(a => (
                <Link key={a.id} to="/analyses/$id" params={{ id: a.id }} className="flex items-center justify-between py-3 hover:bg-muted/40 px-2 rounded transition">
                  <div>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.period_label ?? "—"} · {format(new Date(a.created_at), "PP")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded ${a.status === "completed" ? "bg-success/15 text-success" : a.status === "failed" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>{a.status}</span>
                    {a.risk_score && <span className="text-sm font-display">Risk {a.risk_score}/10</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-5 w-5 text-gold" />
      </div>
      <p className="font-display text-4xl mt-2">{value}</p>
    </Card>
  );
}

function Onboard({ onDone }: { onDone: () => void }) {
  return (
    <div className="p-10 max-w-2xl mx-auto">
      <p className="text-xs tracking-[0.3em] text-gold uppercase">Welcome</p>
      <h1 className="font-display text-4xl mt-2">Set up your company</h1>
      <p className="text-muted-foreground mt-2">Before your first analysis, add basic details so reports are tailored to your business.</p>
      <div className="mt-6"><Button asChild variant="gold"><Link to="/settings">Go to settings</Link></Button></div>
    </div>
  );
}
