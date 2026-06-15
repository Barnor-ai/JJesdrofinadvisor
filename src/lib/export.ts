import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { saveAs } from "file-saver";

type Analysis = {
  id: string; title: string; period_label: string | null;
  risk_score: number | null;
  companies?: { name: string; industry?: string | null; location?: string | null; currency?: string | null } | null;
};
type AJ = {
  executive_summary?: string; financial_health_score?: number; risk_score?: number;
  profitability_analysis?: string; liquidity_analysis?: string; cash_flow_analysis?: string;
  debt_risk_analysis?: string; investor_commentary?: string; conclusion?: string;
  ratios?: Array<{ name: string; value: string; interpretation: string; status: string }>;
  red_flags?: Array<{ severity: string; issue: string; evidence: string }>;
  recommendations?: string[]; strategic_advice?: string[]; cost_savings?: string[];
};

function fileBase(a: Analysis) {
  return `${(a.companies?.name ?? "FinScope").replace(/[^a-z0-9]+/gi, "_")}_${a.title.replace(/[^a-z0-9]+/gi, "_")}`;
}

export function exportAnalysisPDF(a: Analysis, j: AJ) {
  const doc = new jsPDF();
  const navy: [number, number, number] = [11, 30, 63];
  const gold: [number, number, number] = [201, 169, 97];
  doc.setFillColor(...navy); doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(...gold); doc.setFontSize(18); doc.text("FinScope", 14, 14);
  doc.setTextColor(255); doc.setFontSize(10); doc.text(`${a.companies?.name ?? ""} · ${a.title} · ${a.period_label ?? ""}`, 14, 23);
  doc.setTextColor(0); let y = 40;
  const section = (title: string, body?: string) => {
    if (!body) return;
    doc.setFontSize(13); doc.setTextColor(...navy); doc.text(title, 14, y); y += 6;
    doc.setFontSize(10); doc.setTextColor(50);
    const lines = doc.splitTextToSize(body, 180);
    if (y + lines.length * 5 > 280) { doc.addPage(); y = 20; }
    doc.text(lines, 14, y); y += lines.length * 5 + 4;
  };
  doc.setFontSize(11); doc.text(`Financial Health: ${j.financial_health_score ?? "—"}/10  ·  Risk: ${j.risk_score ?? a.risk_score ?? "—"}/10`, 14, y); y += 8;
  section("Executive Summary", j.executive_summary);
  section("Profitability Analysis", j.profitability_analysis);
  section("Liquidity Analysis", j.liquidity_analysis);
  section("Cash Flow Analysis", j.cash_flow_analysis);
  section("Debt & Risk Analysis", j.debt_risk_analysis);

  if (j.ratios?.length) {
    doc.addPage(); y = 20;
    doc.setFontSize(14); doc.setTextColor(...navy); doc.text("Key Ratios", 14, y); y += 4;
    autoTable(doc, { startY: y + 2, head: [["Ratio", "Value", "Interpretation", "Status"]], body: j.ratios.map(r => [r.name, r.value, r.interpretation, r.status]), headStyles: { fillColor: navy } });
  }
  if (j.red_flags?.length) {
    autoTable(doc, { head: [["Severity", "Issue", "Evidence"]], body: j.red_flags.map(f => [f.severity, f.issue, f.evidence]), headStyles: { fillColor: navy } });
  }
  const bullets = (title: string, arr?: string[]) => {
    if (!arr?.length) return;
    autoTable(doc, { head: [[title]], body: arr.map(x => [x]), headStyles: { fillColor: gold, textColor: navy } });
  };
  bullets("Recommendations", j.recommendations);
  bullets("Strategic Advice", j.strategic_advice);
  bullets("Cost-Saving Opportunities", j.cost_savings);
  section("Investor Commentary", j.investor_commentary);
  section("Conclusion", j.conclusion);
  doc.save(`${fileBase(a)}.pdf`);
}

export function exportAnalysisExcel(a: Analysis, j: AJ) {
  const wb = XLSX.utils.book_new();
  const summary = [
    ["FinScope Analysis"],
    ["Company", a.companies?.name ?? ""],
    ["Title", a.title],
    ["Period", a.period_label ?? ""],
    ["Financial Health Score", j.financial_health_score ?? ""],
    ["Risk Score", j.risk_score ?? a.risk_score ?? ""],
    [],
    ["Executive Summary"], [j.executive_summary ?? ""],
    [], ["Profitability"], [j.profitability_analysis ?? ""],
    [], ["Liquidity"], [j.liquidity_analysis ?? ""],
    [], ["Cash Flow"], [j.cash_flow_analysis ?? ""],
    [], ["Debt & Risk"], [j.debt_risk_analysis ?? ""],
    [], ["Conclusion"], [j.conclusion ?? ""],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");
  if (j.ratios?.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(j.ratios), "Ratios");
  }
  if (j.red_flags?.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(j.red_flags), "Red Flags");
  }
  const advice = [
    ...["Recommendations", ...(j.recommendations ?? [])].map(x => [x]),
    [""],
    ...["Strategic Advice", ...(j.strategic_advice ?? [])].map(x => [x]),
    [""],
    ...["Cost Savings", ...(j.cost_savings ?? [])].map(x => [x]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(advice), "Advice");
  XLSX.writeFile(wb, `${fileBase(a)}.xlsx`);
}

export async function exportAnalysisWord(a: Analysis, j: AJ) {
  const para = (text: string) => new Paragraph({ children: [new TextRun(text)] });
  const h = (text: string, level: typeof HeadingLevel.HEADING_1 = HeadingLevel.HEADING_1) => new Paragraph({ heading: level, children: [new TextRun(text)] });
  const bullet = (text: string) => new Paragraph({ bullet: { level: 0 }, children: [new TextRun(text)] });

  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(`FinScope — ${a.title}`)] }),
    para(`${a.companies?.name ?? ""} · ${a.period_label ?? ""}`),
    para(`Financial Health: ${j.financial_health_score ?? "—"}/10  ·  Risk: ${j.risk_score ?? a.risk_score ?? "—"}/10`),
    h("Executive Summary"), para(j.executive_summary ?? ""),
    h("Profitability Analysis"), para(j.profitability_analysis ?? ""),
    h("Liquidity Analysis"), para(j.liquidity_analysis ?? ""),
    h("Cash Flow Analysis"), para(j.cash_flow_analysis ?? ""),
    h("Debt & Risk Analysis"), para(j.debt_risk_analysis ?? ""),
    h("Key Ratios", HeadingLevel.HEADING_2),
    ...(j.ratios ?? []).map(r => para(`${r.name}: ${r.value} — ${r.interpretation} (${r.status})`)),
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
  ];

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileBase(a)}.docx`);
}
