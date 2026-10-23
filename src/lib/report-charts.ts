export type ReportSection = "profitability" | "liquidity" | "cashflow" | "risk" | "ratios";
export type ReportChart = {
  title: string; section: ReportSection; kind: "bar" | "line" | "pie";
  labels: string[]; unit: "currency" | "percent" | "ratio" | "score";
  series: Array<{ name: string; values: Array<number | null> }>;
};
export type ChartAnalysis = {
  extracted?: Record<string, unknown>;
  summary_metrics?: Record<string, unknown>;
  expense_breakdown?: Array<{ name: string; value: number }>;
  revenue_breakdown?: Array<{ name: string; value: number }>;
  trend_series?: { labels?: string[]; revenue?: Array<number | null>; gross_profit?: Array<number | null>; net_income?: Array<number | null> };
  yoy_pl?: Array<{ line_item: string; current: number | null; previous: number | null }>;
  ratios?: Array<{ name: string; value: string }>;
  risk_score?: number;
};
const finite = (v: unknown): number | null => typeof v === "number" && Number.isFinite(v) ? v : null;
const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};

/** Presentation only: no ratio calculations or inferred financial figures. */
export function buildReportCharts(j: ChartAnalysis, period = "Current period"): ReportChart[] {
  const charts: ReportChart[] = [];
  const extracted = j.extracted ?? {};
  const income = record(extracted.income_statement);
  const prior = record(extracted.prior_income_statement);
  const balance = record(extracted.balance_sheet);
  const cash = record(extracted.cash_flow);
  const metrics = j.summary_metrics ?? {};
  const currentLabel = typeof income.period === "string" ? income.period : period;
  const previousLabel = typeof prior.period === "string" ? prior.period : "Previous year";
  const incomeValue = (key: string, previous: boolean) => {
    const source = previous ? prior : income;
    const value = finite(source[key]);
    if (value !== null) return value;
    const match = { revenue: /^revenue$|^total revenue$|^sales$/i, gross_profit: /^gross profit$/i, net_income: /^net (income|profit|loss)/i }[key];
    const row = match ? j.yoy_pl?.find(r => match.test(r.line_item.trim())) : undefined;
    return finite(previous ? row?.previous : row?.current);
  };
  const add = (chart: ReportChart) => {
    const series = chart.series.filter(s => s.values.some(v => finite(v) !== null));
    if (series.length && chart.labels.length) charts.push({ ...chart, series });
  };
  for (const [key, name] of [["net_income", "Net Income"], ["gross_profit", "Gross Profit"]]) {
    if (incomeValue("revenue", false) === null || incomeValue(key, false) === null) continue;
    const hasPrior = incomeValue("revenue", true) !== null && incomeValue(key, true) !== null;
    add({ title: `Revenue vs ${name}`, section: "profitability", kind: "bar", unit: "currency",
      labels: hasPrior ? [previousLabel, currentLabel] : [currentLabel],
      series: [["revenue", "Revenue"], [key, name]].map(([k, n]) => ({ name: n, values: hasPrior ? [incomeValue(k, true), incomeValue(k, false)] : [incomeValue(k, false)] })) });
  }
  const yoy = (j.yoy_pl ?? []).filter(r => finite(r.current) !== null && finite(r.previous) !== null);
  // Small groups keep long statements readable in fixed-size exported charts.
  for (let i = 0; i < yoy.length; i += 5) {
    const rows = yoy.slice(i, i + 5);
    add({ title: `Year-over-Year Performance${yoy.length > 5 ? ` (${i / 5 + 1})` : ""}`, section: "profitability", kind: "bar", unit: "currency", labels: rows.map(r => r.line_item), series: [{ name: previousLabel, values: rows.map(r => r.previous) }, { name: currentLabel, values: rows.map(r => r.current) }] });
  }
  const composition = j.revenue_breakdown?.length ? j.revenue_breakdown : j.expense_breakdown;
  // Negative components cannot be represented honestly in a pie: omit it instead of silently dropping losses.
  if (composition && composition.length > 1 && composition.every(r => finite(r.value) !== null && r.value >= 0) && composition.some(r => r.value > 0)) {
    const title = j.revenue_breakdown?.length ? "Revenue Composition" : "Expense / Revenue Allocation";
    add({ title, section: "profitability", kind: "pie", unit: "currency", labels: composition.map(r => r.name), series: [{ name: title, values: composition.map(r => r.value) }] });
  }
  const trend = j.trend_series;
  if (trend?.labels && trend.labels.length >= 2) {
    const series = [["Revenue", trend.revenue], ["Gross Profit", trend.gross_profit], ["Net Income", trend.net_income]] as const;
    add({ title: "Financial Trend Analysis", section: "profitability", kind: "line", unit: "currency", labels: trend.labels,
      series: series.map(([name, values]) => ({ name, values: trend.labels?.map((_, i) => finite(values?.[i])) ?? [] })).filter(s => s.values.filter(v => v !== null).length >= 2) });
  }
  const bars = (title: string, section: ReportSection, source: Record<string, unknown>, fields: Array<[string, string]>) => {
    const available = fields.map(([key, label]) => ({ label, value: finite(source[key]) })).filter(r => r.value !== null);
    if (available.length) add({ title, section, kind: "bar", unit: "currency", labels: available.map(r => r.label), series: [{ name: title, values: available.map(r => r.value) }] });
  };
  if (finite(balance.current_assets) !== null && finite(balance.current_liabilities) !== null) bars("Current Assets vs Current Liabilities", "liquidity", balance, [["current_assets", "Current Assets"], ["current_liabilities", "Current Liabilities"]]);
  bars("Cash and Working Capital", "liquidity", balance, [["cash", "Cash"], ["working_capital", "Working Capital"]]);
  bars("Cash Flow Analysis", "cashflow", cash, [["operating_cf", "Operating"], ["investing_cf", "Investing"], ["financing_cf", "Financing"]]);
  bars("Free Cash Flow", "cashflow", cash, [["free_cash_flow", "Free Cash Flow"]]);
  const ratioFields: Array<[string, string, RegExp, "ratio" | "percent"]> = [
    ["current_ratio", "Current Ratio", /^current ratio$/i, "ratio"],
    ["debt_to_equity", "Debt-to-Equity", /^debt[\s-]*to[\s-]*equity(?: ratio)?$/i, "ratio"],
    ["gross_margin_pct", "Gross Profit Margin", /^gross (profit )?margin$/i, "percent"],
    ["net_margin_pct", "Net Profit Margin", /^net (profit )?margin$/i, "percent"],
    ["roe", "Return on Equity", /^return on equity(?: \(ROE\))?$|^ROE$/i, "percent"],
  ];
  const ratios = ratioFields.map(([key, label, pattern, unit]) => {
    let value = finite(metrics[key]);
    if (value === null) {
      const raw = j.ratios?.find(r => pattern.test(r.name.trim()))?.value.trim();
      // Reject prose, ranges, missing values and ambiguous percentage units.
      if (raw && (unit === "percent" ? /^-?\d+(?:\.\d+)?\s*%$/ : /^-?\d+(?:\.\d+)?(?:\s*(?:x|:1))?$/i).test(raw)) value = Number.parseFloat(raw);
    }
    return { label, unit, value };
  });
  for (const unit of ["percent", "ratio"] as const) {
    const rows = ratios.filter(r => r.unit === unit && r.value !== null);
    if (rows.length) add({ title: unit === "percent" ? "Profitability and Return Ratios (%)" : "Liquidity and Leverage Ratios", section: "ratios", kind: "bar", unit, labels: rows.map(r => r.label), series: [{ name: unit === "percent" ? "Percent" : "Ratio", values: rows.map(r => r.value) }] });
    if (unit === "percent") {
      const margins = rows.filter(r => r.label.includes("Margin"));
      if (margins.length) add({ title: "Gross and Net Profit Margins (%)", section: "profitability", kind: "bar", unit, labels: margins.map(r => r.label), series: [{ name: "Margin (%)", values: margins.map(r => r.value) }] });
    }
  }
  const risk = finite(j.risk_score);
  if (risk !== null && risk >= 1 && risk <= 10) add({ title: "Financial Risk Score (1–10)", section: "risk", kind: "bar", unit: "score", labels: ["Risk score"], series: [{ name: "Risk", values: [risk] }] });
  return charts;
}

export type RenderedChart = ReportChart & { png: string };
export async function renderReportCharts(charts: ReportChart[], currency: string): Promise<RenderedChart[]> {
  const { Chart, registerables } = await import("chart.js");
  Chart.register(...registerables);
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();
  const colors = [token("--navy"), token("--gold"), token("--report-chart-blue"), token("--report-chart-green"), token("--report-chart-red"), token("--report-chart-gray")];
  const format = (value: number, unit: ReportChart["unit"]) => `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}${unit === "percent" ? "%" : unit === "ratio" ? "x" : ""}`;
  const output: RenderedChart[] = [];
  for (const spec of charts) {
    const canvas = document.createElement("canvas");
    canvas.width = 1200; canvas.height = 680;
    const total = spec.series[0]?.values.reduce<number>((sum, v) => sum + (v ?? 0), 0) ?? 0;
    const pieLabels = spec.labels.map((label, i) => `${label}: ${format(spec.series[0]?.values[i] ?? 0, spec.unit)} (${((spec.series[0]?.values[i] ?? 0) / total * 100).toFixed(1)}%)`);
    const chart = new Chart(canvas, {
      type: spec.kind,
      data: { labels: spec.kind === "pie" ? pieLabels : spec.labels,
        datasets: spec.series.map((s, i) => ({ label: s.name, data: s.values, backgroundColor: spec.kind === "pie" ? spec.labels.map((_, n) => colors[n % colors.length]) : colors[i % colors.length], borderColor: colors[i % colors.length], borderWidth: spec.kind === "line" ? 3 : 0, pointRadius: 5, spanGaps: false })) },
      options: { responsive: false, animation: false, devicePixelRatio: 1, layout: { padding: 24 }, color: token("--navy"),
        font: { family: "Arial", size: 16 },
        plugins: { title: { display: true, text: spec.title, font: { family: "Georgia", size: 26 }, padding: { bottom: 22 } }, legend: { position: "bottom", labels: { font: { size: 16 }, padding: 16 } }, tooltip: { enabled: false } },
        ...(spec.kind === "pie" ? {} : { scales: { y: { beginAtZero: true, ...(spec.unit === "score" ? { max: 10 } : {}), title: { display: true, text: spec.unit === "currency" ? currency : spec.unit === "percent" ? "%" : spec.unit === "ratio" ? "Ratio (x)" : "Score / 10" }, ticks: { callback: value => format(Number(value), spec.unit) } }, x: { ticks: { maxRotation: 30, autoSkip: false, callback: function(value) { const text = this.getLabelForValue(Number(value)); return text.length > 22 ? text.match(/.{1,22}(?:\s|$)|.{1,22}/g) ?? text : text; } }, grid: { display: false } } } }),
      },
      plugins: [{ id: "reportPaper", beforeDraw: c => { const ctx = c.ctx; ctx.save(); ctx.globalCompositeOperation = "destination-over"; ctx.fillStyle = token("--report-paper"); ctx.fillRect(0, 0, c.width, c.height); ctx.restore(); }, afterDatasetsDraw: c => {
        if (spec.kind === "pie") return;
        const ctx = c.ctx; ctx.save(); ctx.fillStyle = token("--navy"); ctx.font = "14px Arial"; ctx.textAlign = "center";
        c.data.datasets.forEach((d, di) => c.getDatasetMeta(di).data.forEach((element, i) => { const value = spec.series[di]?.values[i]; if (value === null || value === undefined) return; const p = element.tooltipPosition(true); ctx.fillText(format(value, spec.unit), p.x, p.y + (value < 0 ? 19 : -10)); })); ctx.restore();
      } }],
    });
    output.push({ ...spec, png: canvas.toDataURL("image/png") });
    chart.destroy(); canvas.remove();
  }
  return output;
}