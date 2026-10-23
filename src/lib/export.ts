import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { buildReportCharts, renderReportCharts, type ChartAnalysis, type ReportSection } from "./report-charts";
import { Document, Packer, Paragraph, HeadingLevel, TextRun, ImageRun } from "docx";
import { saveAs } from "file-saver";

type Analysis = {
  id: string; title: string; period_label: string | null;
  risk_score: number | null;
  companies?: { name: string; industry?: string | null; location?: string | null; currency?: string | null } | null;
};
type AJ = ChartAnalysis & {
  executive_summary?: string; financial_health_score?: number; risk_score?: number;
  profitability_analysis?: string; liquidity_analysis?: string; cash_flow_analysis?: string;
  debt_risk_analysis?: string; investor_commentary?: string; conclusion?: string;
  ratios?: Array<{ name: string; value: string; formula?: string; computation?: string; interpretation: string; status: string }>;
  red_flags?: Array<{ severity: string; issue: string; evidence: string }>;
  assumptions?: string[]; recommendations?: string[]; strategic_advice?: string[]; cost_savings?: string[];
  yoy_pl?: Array<{ line_item: string; current: number | null; previous: number | null; change: number | null; change_pct: number | null }>;
};

function fileBase(a: Analysis) {
  return `${(a.companies?.name ?? "FinScope").replace(/[^a-z0-9]+/gi, "_")}_${a.title.replace(/[^a-z0-9]+/gi, "_")}`;
}

export async function exportAnalysisPDF(a: Analysis, j: AJ) {
  const charts = await renderReportCharts(buildReportCharts({ ...j, risk_score: j.risk_score ?? a.risk_score ?? undefined }, a.period_label ?? undefined), a.companies?.currency ?? "USD");
  const doc = new jsPDF();
  const navy: [number, number, number] = [11, 30, 63];
  const gold: [number, number, number] = [201, 169, 97];
  doc.setFillColor(...navy); doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(...gold); doc.setFontSize(18); doc.text("FinScope", 14, 14);
  doc.setTextColor(255); doc.setFontSize(10); doc.text(`${a.companies?.name ?? ""} · ${a.title} · ${a.period_label ?? ""}`, 14, 23);
  doc.setTextColor(0); let y = 40;
  const ensureSpace = (height: number) => { if (y + height > 280) { doc.addPage(); y = 20; } };
  const addCharts = (group: ReportSection) => {
    for (const chart of charts.filter(c => c.section === group)) {
      ensureSpace(110);
      doc.addImage(chart.png, "PNG", 14, y, 182, 103);
      y += 110;
    }
  };
  const section = (title: string, body?: string, group?: ReportSection) => {
    if (!body && !group) return;
    ensureSpace(18);
    doc.setFontSize(13); doc.setTextColor(...navy); doc.text(title, 14, y); y += 7;
    doc.setFontSize(10); doc.setTextColor(50);
    const lines: string[] = body ? doc.splitTextToSize(body, 180) : [];
    for (const line of lines) { ensureSpace(5); doc.text(line, 14, y); y += 5; }
    y += 4;
    if (group) addCharts(group);
  };
  const tableEnd = () => {
    const last = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
    if (last) y = last.finalY + 10;
  };
  doc.setFontSize(11); doc.text(`Financial Health: ${j.financial_health_score ?? "—"}/10  ·  Risk: ${j.risk_score ?? a.risk_score ?? "—"}/10`, 14, y); y += 8;
  section("Executive Summary", j.executive_summary);
  section("Profitability Analysis", j.profitability_analysis, "profitability");
  section("Liquidity Analysis", j.liquidity_analysis, "liquidity");
  section("Cash Flow Analysis", j.cash_flow_analysis, "cashflow");
  section("Debt & Risk Analysis", j.debt_risk_analysis, "risk");

  if (j.yoy_pl?.length) {
    doc.addPage(); y = 20;
    doc.setFontSize(14); doc.setTextColor(...navy); doc.text("Year-over-Year Profitability", 14, y); y += 4;
    autoTable(doc, {
      startY: y + 2,
      head: [["Line item", "Current", "Previous", "Change", "% Change"]],
      body: j.yoy_pl.map(r => [r.line_item, r.current?.toLocaleString() ?? "—", r.previous?.toLocaleString() ?? "—", r.change?.toLocaleString() ?? "—", r.change_pct !== null && r.change_pct !== undefined ? `${r.change_pct.toFixed(1)}%` : "—"]),
      headStyles: { fillColor: navy },
    });
    tableEnd();
  }
  if (j.ratios?.length) {
    doc.addPage(); y = 20;
    doc.setFontSize(14); doc.setTextColor(...navy); doc.text("Key Ratios", 14, y); y += 4;
    autoTable(doc, {
      startY: y + 2,
      head: [["Ratio", "Value", "Formula", "Computation", "Interpretation", "Status"]],
      body: j.ratios.map(r => [r.name, r.value, r.formula ?? "—", r.computation ?? "—", r.interpretation, r.status]),
      headStyles: { fillColor: navy },
      styles: { fontSize: 8 },
    });
    tableEnd();
  }
  addCharts("ratios");
  if (j.red_flags?.length) {
    autoTable(doc, { startY: y, head: [["Severity", "Issue", "Evidence"]], body: j.red_flags.map(f => [f.severity, f.issue, f.evidence]), headStyles: { fillColor: navy } });
    tableEnd();
  }
  const bullets = (title: string, arr?: string[]) => {
    if (!arr?.length) return;
    ensureSpace(20);
    autoTable(doc, { startY: y, head: [[title]], body: arr.map(x => [x]), headStyles: { fillColor: gold, textColor: navy } });
    tableEnd();
  };
  bullets("Recommendations", j.recommendations);
  bullets("Strategic Advice", j.strategic_advice);
  bullets("Cost-Saving Opportunities", j.cost_savings);
  section("Investor Commentary", j.investor_commentary);
  section("Conclusion", j.conclusion);
  section("Assumptions", j.assumptions?.join("\n"));
  doc.save(`${fileBase(a)}.pdf`);
}

export async function exportAnalysisExcel(a: Analysis, j: AJ) {
  const { Workbook } = await import("exceljs");
  const wb = new Workbook();
  wb.creator = "FinScope";
  const charts = await renderReportCharts(buildReportCharts({ ...j, risk_score: j.risk_score ?? a.risk_score ?? undefined }, a.period_label ?? undefined), a.companies?.currency ?? "USD");
  const sheet = (name: string, rows: unknown[][], group?: ReportSection) => {
    const ws = wb.addWorksheet(name);
    ws.columns = Array.from({ length: 6 }, () => ({ width: 22 }));
    for (const row of rows) {
      const r = ws.addRow(row);
      r.alignment = { wrapText: true, vertical: "top" };
      if (row.length === 1) { ws.mergeCells(r.number, 1, r.number, 6); r.height = Math.max(24, Math.ceil(String(row[0] ?? "").length / 120) * 17); }
    }
    ws.getRow(1).font = { bold: true, size: 16 };
    for (const chart of charts.filter(c => c.section === group)) {
      const top = ws.rowCount + 2;
      const image = wb.addImage({ base64: chart.png, extension: "png" });
      ws.addImage(image, { tl: { col: 0, row: top - 1 }, ext: { width: 900, height: 510 } });
      for (let i = 0; i < 27; i++) ws.addRow([]).height = 20;
      ws.addRow([chart.title]);
      // Keep all source values editable alongside the embedded graph.
      ws.addRow(["Category", ...chart.series.map(s => s.name)]);
      chart.labels.forEach((label, i) => ws.addRow([label, ...chart.series.map(s => s.values[i])]));
    }
    return ws;
  };
  sheet("Summary", [["FinScope Analysis"], ["Company", a.companies?.name ?? ""], ["Title", a.title], ["Period", a.period_label ?? ""], ["Currency", a.companies?.currency ?? "USD"], ["Financial Health Score", j.financial_health_score ?? ""], ["Risk Score", j.risk_score ?? a.risk_score ?? ""], ["Executive Summary"], [j.executive_summary ?? ""], ["Conclusion"], [j.conclusion ?? ""], ["Assumptions"], ...(j.assumptions ?? []).map(x => [x])]);
  sheet("Profitability", [["Profitability Analysis"], [j.profitability_analysis ?? ""]], "profitability");
  sheet("Liquidity", [["Liquidity Analysis"], [j.liquidity_analysis ?? ""]], "liquidity");
  sheet("Cash Flow", [["Cash Flow Analysis"], [j.cash_flow_analysis ?? ""]], "cashflow");
  sheet("Debt & Risk", [["Debt & Risk Analysis"], [j.debt_risk_analysis ?? ""]], "risk");
  sheet("YoY Profitability", [["Line item", "Current", "Previous", "Change", "% Change"], ...(j.yoy_pl ?? []).map(r => [r.line_item, r.current, r.previous, r.change, r.change_pct])]);
  sheet("Ratios", [["Ratio", "Value", "Formula", "Computation", "Interpretation", "Status"], ...(j.ratios ?? []).map(r => [r.name, r.value, r.formula, r.computation, r.interpretation, r.status])], "ratios");
  sheet("Red Flags", [["Severity", "Issue", "Evidence"], ...(j.red_flags ?? []).map(f => [f.severity, f.issue, f.evidence])]);
  sheet("Advice", [["Recommendations"], ...(j.recommendations ?? []).map(x => [x]), ["Strategic Advice"], ...(j.strategic_advice ?? []).map(x => [x]), ["Cost Savings"], ...(j.cost_savings ?? []).map(x => [x]), ["Investor Commentary"], [j.investor_commentary ?? ""]]);
  const bytes = await wb.xlsx.writeBuffer();
  saveAs(new Blob([new Uint8Array(bytes)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${fileBase(a)}.xlsx`);
}

export async function exportAnalysisWord(a: Analysis, j: AJ) {
  const charts = await renderReportCharts(buildReportCharts({ ...j, risk_score: j.risk_score ?? a.risk_score ?? undefined }, a.period_label ?? undefined), a.companies?.currency ?? "USD");
  const images = (group: ReportSection) => charts.filter(c => c.section === group).map(c => new Paragraph({ keepNext: false, children: [new ImageRun({ type: "png", data: Uint8Array.from(atob(c.png.split(",")[1]), ch => ch.charCodeAt(0)), transformation: { width: 600, height: 340 }, altText: { title: c.title, description: c.title, name: c.title } })] }));
  const para = (text: string) => new Paragraph({ children: [new TextRun(text)] });
  const h = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1) => new Paragraph({ heading: level, children: [new TextRun(text)] });
  const bullet = (text: string) => new Paragraph({ bullet: { level: 0 }, children: [new TextRun(text)] });

  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(`FinScope — ${a.title}`)] }),
    para(`${a.companies?.name ?? ""} · ${a.period_label ?? ""}`),
    para(`Financial Health: ${j.financial_health_score ?? "—"}/10  ·  Risk: ${j.risk_score ?? a.risk_score ?? "—"}/10`),
    h("Executive Summary"), para(j.executive_summary ?? ""),
    h("Profitability Analysis"), para(j.profitability_analysis ?? ""), ...images("profitability"),
    h("Liquidity Analysis"), para(j.liquidity_analysis ?? ""), ...images("liquidity"),
    h("Cash Flow Analysis"), para(j.cash_flow_analysis ?? ""), ...images("cashflow"),
    h("Debt & Risk Analysis"), para(j.debt_risk_analysis ?? ""), ...images("risk"),
    h("Year-over-Year Profitability", HeadingLevel.HEADING_2),
    ...(j.yoy_pl ?? []).map(r => para(`${r.line_item}: ${r.current ?? "—"} vs ${r.previous ?? "—"} | Δ ${r.change ?? "—"} (${r.change_pct !== null && r.change_pct !== undefined ? r.change_pct.toFixed(1) + "%" : "—"})`)),
    h("Key Ratios", HeadingLevel.HEADING_2),
    ...(j.ratios ?? []).map(r => para(`${r.name}: ${r.value} — ${r.formula ?? ""} = ${r.computation ?? ""} — ${r.interpretation} (${r.status})`)),
    ...images("ratios"),
    h("Red Flags", HeadingLevel.HEADING_2),
    ...(j.red_flags ?? []).map(f => para(`[${f.severity.toUpperCase()}] ${f.issue} — ${f.evidence}`)),
    h("Recommendations", HeadingLevel.HEADING_2),
    ...(j.recommendations ?? []).map(bullet),
    h("Strategic Advice", HeadingLevel.HEADING_2),
    ...(j.strategic_advice ?? []).map(bullet),
    h("Cost-Saving Opportunities", HeadingLevel.HEADING_2),
    ...(j.cost_savings ?? []).map(bullet),
    h("Investor Commentary"), para(j.investor_commentary ?? ""),
    h("Conclusion"), para(j.conclusion ?? ""),
    h("Assumptions"), ...(j.assumptions ?? []).map(bullet),
  ];

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileBase(a)}.docx`);
}
