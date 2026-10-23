import { pageMetadata } from "@/lib/page-metadata";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, TrendingUp, ShieldAlert, FileText, DollarSign, Scale, Percent, Wallet } from "lucide-react";
import { format } from "date-fns";
import { RevenueVsNetIncomeChart, ExpenseBreakdownChart, TrendChart, RiskTrendChart } from "@/components/dashboard-charts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => pageMetadata("Dashboard — FinScope", "Your FinScope financial overview, key metrics and financial trends."),
  component: Dashboard,
});

type SummaryMetrics = {
  revenue?: number | null; accounts_receivable?: number | null; accounts_payable?: number | null;
  current_ratio?: number | null; equity_ratio?: number | null;
  gross_margin_pct?: number | null; net_margin_pct?: number | null; debt_to_equity?: number | null;
};
type Extracted = {
  income_statement?: { revenue?: number | null; net_income?: number | null; gross_profit?: number | null };
  prior_income_statement?: { revenue?: number | null; net_income?: number | null; gross_profit?: number | null };
};
type AJ = {
  summary_metrics?: SummaryMetrics;
  extracted?: Extracted;
  expense_breakdown?: Array<{ name: string; value: number }>;
  trend_series?: { labels?: string[]; revenue?: Array<number | null>; gross_profit?: Array<number | null>; net_income?: Array<number | null> };
};

function fmtMoney(n: number | null | undefined, currency = "USD") {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency, notation: Math.abs(n) >= 1_000_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n); }
  catch { return n.toLocaleString(); }
}

function Dashboard() {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [{ data: companies }, { data: analyses }] = await Promise.all([
        supabase.from("companies").select("*").order("created_at", { ascending: false }),
        supabase.from("analyses").select("*, companies(currency)").order("created_at", { ascending: false }).limit(20),
      ]);
      return { companies: companies ?? [], analyses: analyses ?? [] };
    },
  });

  if (data && data.companies.length === 0) {
    return <AppShell>
      <div className="p-10 max-w-2xl mx-auto">
        <p className="text-xs tracking-[0.3em] text-gold uppercase">Welcome</p>
        <h1 className="font-display text-4xl mt-2">Set up your company</h1>
        <p className="text-muted-foreground mt-2">Add your company profile so reports are tailored to your business.</p>
        <div className="mt-6"><Button variant="gold" onClick={() => navigate({ to: "/company" })}>Go to company profile</Button></div>
      </div>
    </AppShell>;
  }

  const analyses = data?.analyses ?? [];
  const completed = analyses.filter(a => a.status === "completed");
  const latest = completed[0];
  const aj = (latest?.analysis ?? {}) as AJ;
  const sm = aj.summary_metrics ?? {};
  const currency = (latest?.companies as { currency?: string } | null)?.currency ?? "USD";

  const revenueVsNI = useMemo(() => {
    const cur = aj.extracted?.income_statement;
    const prev = aj.extracted?.prior_income_statement;
    return [
      { label: "Previous", revenue: prev?.revenue ?? null, netIncome: prev?.net_income ?? null },
      { label: "Current", revenue: cur?.revenue ?? null, netIncome: cur?.net_income ?? null },
    ];
  }, [aj]);

  const trendData = useMemo(() => {
    const ts = aj.trend_series;
    if (ts?.labels && ts.labels.length >= 2) {
      return ts.labels.map((label, i) => ({
        label,
        revenue: ts.revenue?.[i] ?? null,
        grossProfit: ts.gross_profit?.[i] ?? null,
        netIncome: ts.net_income?.[i] ?? null,
      }));
    }
    // fallback: across completed analyses
    return completed.slice().reverse().map(a => {
      const ex = (a.analysis as AJ | null)?.extracted?.income_statement;
      return { label: a.title.slice(0, 14), revenue: ex?.revenue ?? null, grossProfit: ex?.gross_profit ?? null, netIncome: ex?.net_income ?? null };
    });
  }, [aj, completed]);

  const riskTrend = completed.slice().reverse().map(a => ({ label: a.title.slice(0, 14), risk: a.risk_score }));
  const avgRisk = completed.filter(a => a.risk_score).reduce((s, a) => s + (a.risk_score ?? 0), 0) / Math.max(1, completed.filter(a => a.risk_score).length);

  const kpis = [
    { label: "Revenue", value: fmtMoney(sm.revenue, currency), icon: DollarSign },
    { label: "Accounts receivable", value: fmtMoney(sm.accounts_receivable, currency), icon: Wallet },
    { label: "Accounts payable", value: fmtMoney(sm.accounts_payable, currency), icon: Wallet },
    { label: "Current ratio", value: sm.current_ratio?.toFixed(2) ?? "—", icon: Scale },
    { label: "Equity ratio", value: sm.equity_ratio !== null && sm.equity_ratio !== undefined ? `${(sm.equity_ratio * 100).toFixed(1)}%` : "—", icon: Percent },
    { label: "Gross margin", value: sm.gross_margin_pct !== null && sm.gross_margin_pct !== undefined ? `${sm.gross_margin_pct.toFixed(1)}%` : "—", icon: Percent },
  ];

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <p className="text-xs tracking-[0.3em] text-gold uppercase">Dashboard</p>
            <h1 className="font-display text-4xl mt-2">Financial overview</h1>
            {latest && <p className="text-sm text-muted-foreground mt-1">Latest report: <span className="font-medium">{latest.title}</span> · {latest.period_label}</p>}
          </div>
          <Button asChild variant="gold"><Link to="/upload"><Upload className="h-4 w-4" /> New analysis</Link></Button>
        </div>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-6">
          {kpis.map(k => (
            <Card key={k.label} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{k.label}</p>
                <k.icon className="h-4 w-4 text-gold" />
              </div>
              <p className="font-display text-2xl mt-2">{k.value}</p>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Total reports</p><FileText className="h-4 w-4 text-gold" /></div>
            <p className="font-display text-3xl mt-2">{analyses.length}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Completed</p><TrendingUp className="h-4 w-4 text-gold" /></div>
            <p className="font-display text-3xl mt-2">{completed.length}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Avg risk score</p><ShieldAlert className="h-4 w-4 text-gold" /></div>
            <p className="font-display text-3xl mt-2">{avgRisk ? avgRisk.toFixed(1) : "—"}</p>
          </Card>
        </div>

        {latest && (
          <div className="grid gap-4 lg:grid-cols-2 mb-6">
            <RevenueVsNetIncomeChart data={revenueVsNI} />
            {aj.expense_breakdown && aj.expense_breakdown.length > 0
              ? <ExpenseBreakdownChart data={aj.expense_breakdown} />
              : <Card className="p-6 flex items-center justify-center text-muted-foreground text-sm">Revenue composition will appear after analysis completes with detailed breakdown.</Card>}
          </div>
        )}

        {trendData.length >= 2 && (
          <div className="grid gap-4 lg:grid-cols-2 mb-6">
            <TrendChart data={trendData} />
            {riskTrend.length >= 2 && <RiskTrendChart data={riskTrend} />}
          </div>
        )}

        <Card className="p-6">
          <h2 className="font-display text-2xl mb-4">Recent reports</h2>
          {analyses.length === 0 ? (
            <p className="text-muted-foreground text-sm">No analyses yet. <Link to="/upload" className="text-gold underline">Upload a statement</Link> to begin.</p>
          ) : (
            <div className="divide-y divide-border">
              {analyses.map(a => (
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
