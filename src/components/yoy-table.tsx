import { Fragment, useMemo } from "react";
import { Card } from "@/components/ui/card";

export type YoyRow = {
  line_item: string;
  current: number | null;
  previous: number | null;
  change: number | null;
  change_pct: number | null;
  note?: string;
  narration?: string;
};

function fmt(n: number | null, currency = "USD") {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return n.toLocaleString();
  }
}

function pct(n: number | null) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function YoyTable({ rows, currency = "USD", title = "Year-over-Year Profitability" }: { rows: YoyRow[]; currency?: string; title?: string }) {
  const totalRevenue = useMemo(() => rows.find(r => /revenue|sales|turnover/i.test(r.line_item))?.current ?? null, [rows]);

  return (
    <Card className="p-6 overflow-x-auto">
      <h3 className="font-display text-2xl mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground mb-4">Line-by-line comparison of the current period against the prior period.</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2">Line item</th>
            <th className="text-right">Current</th>
            <th className="text-right">Previous</th>
            <th className="text-right">Change</th>
            <th className="text-right">% Change</th>
            <th className="text-right">% of revenue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const positive = (r.change ?? 0) > 0;
            const negative = (r.change ?? 0) < 0;
            const isProfitLike = /profit|income|margin|revenue/i.test(r.line_item);
            const isCostLike = /cost|expense|cogs|tax/i.test(r.line_item);
            const goodChange = (isProfitLike && positive) || (isCostLike && negative);
            const badChange = (isProfitLike && negative) || (isCostLike && positive);
            const tone = goodChange ? "text-success" : badChange ? "text-destructive" : "text-foreground";
            const ofRev = totalRevenue && r.current ? `${((r.current / totalRevenue) * 100).toFixed(1)}%` : "—";
            return (
              <>
                <tr key={i} className="border-b border-border/40">
                  <td className="py-2 font-medium">{r.line_item}</td>
                  <td className="py-2 text-right font-display">{fmt(r.current, currency)}</td>
                  <td className="py-2 text-right text-muted-foreground">{fmt(r.previous, currency)}</td>
                  <td className={`py-2 text-right ${tone}`}>{fmt(r.change, currency)}</td>
                  <td className={`py-2 text-right ${tone}`}>{pct(r.change_pct)}</td>
                  <td className="py-2 text-right text-muted-foreground">{ofRev}</td>
                </tr>
                {(r.narration || r.note) && (
                  <tr key={`${i}-n`} className="border-b border-border/40 bg-muted/30">
                    <td colSpan={6} className="py-2 px-3 text-xs text-muted-foreground italic">
                      <span className="font-semibold not-italic text-foreground/70">Why: </span>{r.narration || r.note}
                    </td>
                  </tr>
                )}
              </>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No comparative data available.</td></tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
