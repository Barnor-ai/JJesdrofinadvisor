import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Send, FileDown, FileSpreadsheet, FileText, Sparkles, AlertTriangle, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { exportAnalysisPDF, exportAnalysisExcel, exportAnalysisWord } from "@/lib/export";
import { YoyTable, type YoyRow } from "@/components/yoy-table";
import { TrendChart } from "@/components/dashboard-charts";

export const Route = createFileRoute("/_authenticated/analyses/$id")({
  head: () => ({ meta: [{ title: "Report — FinScope" }] }),
  component: AnalysisPage,
});

type Analysis = {
  id: string; title: string; period_label: string | null; status: string;
  risk_score: number | null; error_message: string | null;
  analysis: Record<string, unknown> | null;
  companies?: { name: string; industry?: string | null; location?: string | null; currency?: string | null } | null;
};

function AnalysisPage() {
  const { id } = Route.useParams();
  const { data, refetch } = useQuery({
    queryKey: ["analysis", id],
    queryFn: async (): Promise<Analysis | null> => {
      const { data } = await supabase.from("analyses").select("*, companies(name,industry,location,currency)").eq("id", id).single();
      return data as Analysis | null;
    },
    refetchInterval: (q) => {
      const s = (q.state.data as Analysis | null)?.status;
      return s === "processing" || s === "pending" ? 3000 : false;
    },
  });

  if (!data) return <AppShell><div className="p-10">Loading…</div></AppShell>;
  if (data.status === "processing" || data.status === "pending") {
    return <AppShell><div className="p-10 max-w-2xl mx-auto text-center">
      <Sparkles className="h-10 w-10 text-gold mx-auto animate-pulse" />
      <h1 className="font-display text-3xl mt-4">Analyzing your statement</h1>
      <p className="text-muted-foreground mt-2">FinScope is reading the document, extracting numbers, computing ratios and drafting commentary. This typically takes 30–90 seconds.</p>
      <Button variant="outline" className="mt-6" onClick={() => refetch()}>Refresh</Button>
    </div></AppShell>;
  }
  if (data.status === "failed") {
    return <AppShell><div className="p-10 max-w-2xl mx-auto text-center">
      <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
      <h1 className="font-display text-3xl mt-4">Analysis failed</h1>
      <p className="text-muted-foreground mt-2 text-sm">{data.error_message ?? "Unknown error"}</p>
      <Button asChild className="mt-6"><Link to="/upload">Try another file</Link></Button>
    </div></AppShell>;
  }

  return <ReportView analysis={data} />;
}

type AnalysisJSON = {
  executive_summary?: string; financial_health_score?: number; risk_score?: number;
  company_summary?: string; profitability_analysis?: string; liquidity_analysis?: string;
  cash_flow_analysis?: string; debt_risk_analysis?: string; investor_commentary?: string;
  conclusion?: string;
  ratios?: Array<{ name: string; value: string; formula?: string; computation?: string; interpretation: string; status: string }>;
  red_flags?: Array<{ severity: string; issue: string; evidence: string }>;
  recommendations?: string[]; strategic_advice?: string[]; cost_savings?: string[];
  trends?: Array<{ metric: string; direction: string; comment: string }>;
  assumptions?: string[];
  extracted?: Record<string, unknown>;
  yoy_pl?: YoyRow[];
  trend_series?: { labels?: string[]; revenue?: Array<number | null>; gross_profit?: Array<number | null>; net_income?: Array<number | null> };
};

function ReportView({ analysis }: { analysis: Analysis }) {
  const a = (analysis.analysis ?? {}) as AnalysisJSON;
  const currency = analysis.companies?.currency ?? "USD";

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"><ArrowLeft className="h-3 w-3" /> Back</Link>
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <div>
            <p className="text-xs tracking-[0.3em] text-gold uppercase">{analysis.companies?.name ?? "Report"} · {analysis.period_label}</p>
            <h1 className="font-display text-4xl mt-2">{analysis.title}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportAnalysisPDF(analysis, a)}><FileDown className="h-4 w-4" /> PDF</Button>
            <Button variant="outline" size="sm" onClick={() => exportAnalysisExcel(analysis, a)}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
            <Button variant="outline" size="sm" onClick={() => exportAnalysisWord(analysis, a)}><FileText className="h-4 w-4" /> Word</Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <ScoreCard label="Financial health" value={a.financial_health_score ?? "—"} tone="good" />
          <ScoreCard label="Risk score" value={a.risk_score ?? analysis.risk_score ?? "—"} tone="risk" />
          <Card className="p-6"><p className="text-sm text-muted-foreground">Currency</p><p className="font-display text-4xl mt-2">{currency}</p></Card>
        </div>

        <Tabs defaultValue="report">
          <TabsList className="mb-4 flex-wrap h-auto">
            <TabsTrigger value="report">Report</TabsTrigger>
            <TabsTrigger value="profitability">Profitability</TabsTrigger>
            <TabsTrigger value="ratios">Ratios</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="flags">Red flags</TabsTrigger>
            <TabsTrigger value="advice">Advice</TabsTrigger>
            <TabsTrigger value="chat">Ask AI</TabsTrigger>
          </TabsList>

          <TabsContent value="report" className="space-y-6">
            <Section title="Executive Summary" body={a.executive_summary} />
            <Section title="Profitability Analysis" body={a.profitability_analysis} />
            <Section title="Liquidity Analysis" body={a.liquidity_analysis} />
            <Section title="Cash Flow Analysis" body={a.cash_flow_analysis} />
            <Section title="Debt & Risk Analysis" body={a.debt_risk_analysis} />
            <Section title="Investor Commentary" body={a.investor_commentary} />
            <Section title="Conclusion" body={a.conclusion} />
            {a.assumptions && a.assumptions.length > 0 && (
              <Card className="p-6"><h3 className="font-display text-xl mb-2">Assumptions</h3><ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">{a.assumptions.map((x, i) => <li key={i}>{x}</li>)}</ul></Card>
            )}
          </TabsContent>

          <TabsContent value="profitability">
            <YoyTable rows={a.yoy_pl ?? []} currency={currency} />
          </TabsContent>

          <TabsContent value="ratios">
            <Card className="p-6">
              <h3 className="font-display text-2xl mb-4">Key Financial Ratios</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-2">Ratio</th><th>Value</th><th>Formula</th><th>Computation</th><th>Interpretation</th><th>Status</th></tr></thead>
                  <tbody>
                    {(a.ratios ?? []).map((r, i) => (
                      <tr key={i} className="border-b border-border/50 align-top">
                        <td className="py-3 font-medium">{r.name}</td>
                        <td className="py-3 font-display">{r.value}</td>
                        <td className="py-3 text-xs text-muted-foreground">{r.formula ?? "—"}</td>
                        <td className="py-3 text-xs text-muted-foreground font-mono">{r.computation ?? "—"}</td>
                        <td className="py-3 text-muted-foreground">{r.interpretation}</td>
                        <td className="py-3"><span className={`text-xs px-2 py-1 rounded ${r.status === "good" ? "bg-success/15 text-success" : r.status === "bad" ? "bg-destructive/15 text-destructive" : r.status === "warning" ? "bg-warning/15 text-warning-foreground" : "bg-muted"}`}>{r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="trends">
            {a.trend_series?.labels && a.trend_series.labels.length >= 2 ? (
              <TrendChart data={a.trend_series.labels.map((label, i) => ({
                label,
                revenue: a.trend_series?.revenue?.[i] ?? null,
                grossProfit: a.trend_series?.gross_profit?.[i] ?? null,
                netIncome: a.trend_series?.net_income?.[i] ?? null,
              }))} />
            ) : <Card className="p-6 text-center text-muted-foreground text-sm">No multi-period trend data extracted from this statement.</Card>}
            {a.trends && a.trends.length > 0 && (
              <Card className="p-6 mt-4"><h3 className="font-display text-2xl mb-4">Notable trends</h3>
                <ul className="space-y-2">{a.trends.map((t, i) => <li key={i} className="text-sm"><span className="font-medium">{t.metric}</span> — <span className="text-muted-foreground">{t.direction}</span> · {t.comment}</li>)}</ul>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="flags">
            <Card className="p-6">
              <h3 className="font-display text-2xl mb-4">Red Flags & Warnings</h3>
              <div className="space-y-3">
                {(a.red_flags ?? []).map((f, i) => (
                  <div key={i} className={`border-l-4 pl-4 py-2 ${f.severity === "high" ? "border-destructive" : f.severity === "medium" ? "border-warning" : "border-muted"}`}>
                    <p className="font-medium">{f.issue} <span className="text-xs uppercase ml-2 text-muted-foreground">{f.severity}</span></p>
                    <p className="text-sm text-muted-foreground mt-1">{f.evidence}</p>
                  </div>
                ))}
                {(!a.red_flags || a.red_flags.length === 0) && <p className="text-muted-foreground text-sm">No significant red flags detected.</p>}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="advice" className="space-y-4">
            <BulletCard title="Strategic Advice" items={a.strategic_advice ?? []} />
            <BulletCard title="Recommendations" items={a.recommendations ?? []} />
            <BulletCard title="Cost-Saving Opportunities" items={a.cost_savings ?? []} />
          </TabsContent>

          <TabsContent value="chat">
            <ChatPanel analysisId={analysis.id} analysisJSON={a} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function Section({ title, body }: { title: string; body?: string }) {
  if (!body) return null;
  return <Card className="p-6"><h3 className="font-display text-2xl mb-3">{title}</h3><div className="prose prose-sm max-w-none text-foreground"><ReactMarkdown>{body}</ReactMarkdown></div></Card>;
}
function BulletCard({ title, items }: { title: string; items: string[] }) {
  return <Card className="p-6"><h3 className="font-display text-2xl mb-3">{title}</h3>{items.length === 0 ? <p className="text-muted-foreground text-sm">—</p> : <ul className="list-disc pl-5 space-y-2">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>}</Card>;
}
function ScoreCard({ label, value, tone }: { label: string; value: number | string; tone: "good" | "risk" }) {
  const num = typeof value === "number" ? value : null;
  const color = tone === "risk"
    ? (num && num >= 7 ? "text-destructive" : num && num >= 4 ? "text-warning-foreground" : "text-success")
    : (num && num >= 7 ? "text-success" : num && num >= 4 ? "text-warning-foreground" : "text-destructive");
  return (
    <Card className="p-6"><p className="text-sm text-muted-foreground">{label}</p>
      <p className={`font-display text-5xl mt-2 ${color}`}>{value}{typeof value === "number" && <span className="text-xl text-muted-foreground">/10</span>}</p>
    </Card>
  );
}

function ChatPanel({ analysisId, analysisJSON }: { analysisId: string; analysisJSON: AnalysisJSON }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const ctx = JSON.stringify({
    summary: analysisJSON.executive_summary, ratios: analysisJSON.ratios,
    red_flags: analysisJSON.red_flags, conclusion: analysisJSON.conclusion,
    risk_score: analysisJSON.risk_score, extracted: analysisJSON.extracted,
  }).slice(0, 8000);

  const { messages, sendMessage, status } = useChat({
    id: analysisId,
    transport: new DefaultChatTransport({ api: "/api/chat", body: { analysisContext: ctx } }),
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);
  const busy = status === "submitted" || status === "streaming";

  return (
    <Card className="p-0 overflow-hidden flex flex-col h-[600px]">
      <div className="p-4 border-b border-border bg-navy text-navy-foreground flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-gold" />
        <div><p className="font-display">FinScope Advisor</p><p className="text-xs text-navy-foreground/70">Ask anything about this report</p></div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && <p className="text-sm text-muted-foreground text-center mt-12">Try: "What's the biggest risk?" · "How can we improve cash flow?" · "Is the company solvent?"</p>}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${m.role === "user" ? "bg-navy text-navy-foreground" : "bg-muted"}`}>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{m.parts.map(p => p.type === "text" ? p.text : "").join("")}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {busy && <div className="text-sm text-muted-foreground">Thinking…</div>}
      </div>
      <form onSubmit={e => { e.preventDefault(); if (input.trim() && !busy) { sendMessage({ text: input }); setInput(""); } }} className="p-3 border-t border-border flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about this analysis…" disabled={busy} />
        <Button type="submit" variant="gold" disabled={busy || !input.trim()}><Send className="h-4 w-4" /></Button>
      </form>
    </Card>
  );
}
