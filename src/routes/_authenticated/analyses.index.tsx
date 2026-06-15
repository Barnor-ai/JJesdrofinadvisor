import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/analyses/")({
  head: () => ({ meta: [{ title: "Reports — FinScope" }] }),
  component: List,
});

function List() {
  const { data } = useQuery({
    queryKey: ["analyses"],
    queryFn: async () => (await supabase.from("analyses").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div><p className="text-xs tracking-[0.3em] text-gold uppercase">Reports</p><h1 className="font-display text-4xl mt-2">All analyses</h1></div>
          <Button asChild variant="gold"><Link to="/upload"><Upload className="h-4 w-4" /> New</Link></Button>
        </div>
        <Card className="p-6">
          {(data ?? []).length === 0 ? <p className="text-muted-foreground">No reports yet.</p> : (
            <div className="divide-y divide-border">
              {data?.map(a => (
                <Link key={a.id} to="/analyses/$id" params={{ id: a.id }} className="flex items-center justify-between py-3 px-2 hover:bg-muted/40 rounded">
                  <div><p className="font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{a.period_label} · {format(new Date(a.created_at), "PP")}</p></div>
                  <div className="flex gap-3 items-center">
                    <span className={`text-xs px-2 py-1 rounded ${a.status === "completed" ? "bg-success/15 text-success" : a.status === "failed" ? "bg-destructive/15 text-destructive" : "bg-muted"}`}>{a.status}</span>
                    {a.risk_score && <span className="font-display">Risk {a.risk_score}/10</span>}
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
