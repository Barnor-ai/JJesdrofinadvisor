import { pageMetadata } from "@/lib/page-metadata";
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
  head: () => pageMetadata("Profitability — FinScope", "Compare revenue and profitability across financial periods in FinScope."),
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
          <div className="space-y-6">
            <YoyTable rows={yoy} currency={currency} />

            <Card className="p-6">
              <h3 className="font-display text-2xl mb-1">Why the numbers moved</h3>
              <p className="text-xs text-muted-foreground mb-4">AI-generated narrative explaining the drivers behind the period-over-period changes.</p>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {narration.overview && (
                  <div className="md:col-span-2 rounded-md border border-border p-4 bg-muted/30">
                    <p className="text-xs uppercase tracking-wider text-gold mb-2">Overview</p>
                    <p className="leading-relaxed">{narration.overview}</p>
                  </div>
                )}
                {narration.revenue_drivers && (
                  <div className="rounded-md border border-border p-4">
                    <p className="text-xs uppercase tracking-wider text-gold mb-2">Revenue drivers</p>
                    <p className="leading-relaxed">{narration.revenue_drivers}</p>
                  </div>
                )}
                {narration.cost_drivers && (
                  <div className="rounded-md border border-border p-4">
                    <p className="text-xs uppercase tracking-wider text-gold mb-2">Cost drivers</p>
                    <p className="leading-relaxed">{narration.cost_drivers}</p>
                  </div>
                )}
                {narration.margin_commentary && (
                  <div className="md:col-span-2 rounded-md border border-border p-4">
                    <p className="text-xs uppercase tracking-wider text-gold mb-2">Margin commentary</p>
                    <p className="leading-relaxed">{narration.margin_commentary}</p>
                  </div>
                )}
                {narration.key_takeaways && narration.key_takeaways.length > 0 && (
                  <div className="md:col-span-2 rounded-md border border-border p-4">
                    <p className="text-xs uppercase tracking-wider text-gold mb-2">Key takeaways</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {narration.key_takeaways.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                )}
                {!narration.overview && !narration.revenue_drivers && !narration.cost_drivers && !narration.margin_commentary && narration.fallback && (
                  <div className="md:col-span-2 rounded-md border border-border p-4">
                    <p className="leading-relaxed whitespace-pre-wrap">{narration.fallback}</p>
                  </div>
                )}
                {!narration.overview && !narration.revenue_drivers && !narration.cost_drivers && !narration.margin_commentary && !narration.fallback && (
                  <p className="md:col-span-2 text-muted-foreground text-center">No narrative available for this report. Re-run the analysis to generate one.</p>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
