import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, FileSpreadsheet, Gauge, ShieldAlert, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FinScope — AI Financial Statement Analyzer & Advisor" },
      { name: "description", content: "Upload your financials and receive a boardroom-grade analysis: ratios, risk score, red flags and strategic advice from an AI senior consultant." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(!!data.user);
      setChecked(true);
    });
  }, []);

  if (checked && authed) return <Navigate to="/dashboard" />;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-gold text-navy font-display text-lg font-bold">F</div>
            <span className="font-display text-xl tracking-tight">FinScope</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/auth" className="text-sm text-navy-foreground/80 hover:text-gold">Sign in</Link>
            <Button asChild variant="gold" size="sm">
              <Link to="/auth">Get started <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-navy text-navy-foreground">
        <div className="absolute inset-0 opacity-[0.06] [background:radial-gradient(circle_at_20%_20%,_var(--color-gold),transparent_40%),radial-gradient(circle_at_80%_80%,_var(--color-gold),transparent_50%)]" />
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32 relative">
          <div className="max-w-3xl">
            <p className="text-xs tracking-[0.4em] text-gold uppercase mb-6">AI Financial Analyst</p>
            <h1 className="font-display text-5xl md:text-7xl leading-[1.05]">
              Your financial statements,<br /> read by a <span className="text-gradient-gold">senior consultant</span>.
            </h1>
            <p className="mt-6 text-lg text-navy-foreground/75 max-w-2xl">
              Upload an income statement, balance sheet or cash flow report. FinScope returns a full executive briefing in minutes — ratios, trends, red flags, a 1–10 risk score and strategic advice.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild variant="gold" size="lg">
                <Link to="/auth">Start free analysis <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-navy-foreground/30 text-navy-foreground hover:bg-navy-foreground/10">
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: FileSpreadsheet, title: "Upload anything", body: "PDF, Excel or CSV — management accounts to audited statements." },
            { icon: Gauge, title: "Instant ratios", body: "Gross & net margin, current, quick, D/E, ROA, ROE, operating margin, cash conversion." },
            { icon: ShieldAlert, title: "Risk score 1–10", body: "Liquidity, solvency and operational red flags surfaced and explained." },
            { icon: BarChart3, title: "Trend detection", body: "Monthly & yearly patterns, budget vs actual variance." },
            { icon: Sparkles, title: "AI advisor chat", body: "Ask follow-up questions and get investor-style commentary." },
            { icon: ArrowRight, title: "Export anywhere", body: "Download the full report as PDF, Excel or Word." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6 shadow-card">
              <f.icon className="h-6 w-6 text-gold" />
              <h3 className="mt-4 font-display text-xl">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-6 py-8 text-sm text-muted-foreground flex justify-between">
          <span>© {new Date().getFullYear()} FinScope</span>
          <span>Powered by Lovable AI</span>
        </div>
      </footer>
    </main>
  );
}
