import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, TrendingUp } from "lucide-react";
import { YoyTable, type YoyRow } from "@/components/yoy-table";

export const Route = createFileRoute("/_authenticated/profitability")({
  head: () => ({ meta: [{ title: "Profitability — FinScope" }] }),
  component: ProfitabilityPage,
});

function ProfitabilityPage() {
  const { data } = useQuery({
    queryKey: ["profitability-analyses"],
    queryFn: async () => (await supabase.from("analyses").select("*, companies(name,currency)").eq("status", "completed").order("created_at", { ascending: false })).data ?? [],
  });

  const [selectedId, setSelectedId] = useState<string>("");
  const list = data ?? [];
  const current = list.find(a => a.id === selectedId) ?? list[0];

  const yoy: YoyRow[] = useMemo(() => {
    const a = (current?.analysis ?? {}) as { yoy_pl?: YoyRow[] };
    return a.yoy_pl ?? [];
  }, [current]);

  const narration = useMemo(() => {
    const a = (current?.analysis ?? {}) as {
      profitability_narration?: { overview?: string; revenue_drivers?: string; cost_drivers?: string; margin_commentary?: string; key_takeaways?: string[] };
      profitability_analysis?: string;
    };
    return { ...(a.profitability_narration ?? {}), fallback: a.profitability_analysis };
  }, [current]);

  const currency = (current?.companies as { currency?: string } | null)?.currency ?? "USD";

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <p className="text-xs tracking-[0.3em] text-gold uppercase">Profitability Analysis</p>
            <h1 className="font-display text-4xl mt-2 flex items-center gap-3"><TrendingUp className="h-8 w-8 text-gold" /> Revenue → Net Income</h1>
            <p className="text-muted-foreground text-sm mt-2">Line-by-line comparison of current and prior period.</p>
          </div>
          {list.length > 0 && (
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={current?.id ?? ""} onChange={e => setSelectedId(e.target.value)}>
              {list.map(a => <option key={a.id} value={a.id}>{a.title} · {a.period_label ?? ""}</option>)}
            </select>
          )}
        </div>

        {!current ? (
          <Card className="p-10 text-center">
            <p className="text-muted-foreground">No completed analyses yet.</p>
            <Button asChild variant="gold" className="mt-4"><Link to="/upload"><Upload className="h-4 w-4" /> Run an analysis</Link></Button>
          </Card>
        ) : yoy.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">No year-over-year breakdown available for this report.</Card>
        ) : (
          <YoyTable rows={yoy} currency={currency} />
        )}
      </div>
    </AppShell>
  );
}
