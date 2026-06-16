import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RunInput = z.object({
  analysisId: z.string().uuid(),
});

const SYSTEM_PROMPT = `You are a senior financial consultant and CFA-level analyst. You analyze financial statements (Income Statement, Balance Sheet, Cash Flow), compute ratios with their formulas, perform line-by-line year-over-year comparison (current vs previous period), detect red flags, score risk 1-10, and write investor-grade commentary in professional but plain business English. Output STRICT JSON only — no prose outside JSON.

When the statement provides a prior period (comparative figures), always extract BOTH periods and build the year-over-year P&L breakdown. When only one period is available, set previous values to null and note it under assumptions.`;

const ANALYSIS_SCHEMA = `{
  "company_summary": string,
  "executive_summary": string,
  "financial_health_score": number (1-10),
  "risk_score": number (1-10),
  "extracted": {
    "income_statement": { "revenue": number|null, "cogs": number|null, "gross_profit": number|null, "operating_expenses": number|null, "operating_income": number|null, "net_income": number|null, "period": string|null },
    "prior_income_statement": { "revenue": number|null, "cogs": number|null, "gross_profit": number|null, "operating_expenses": number|null, "operating_income": number|null, "net_income": number|null, "period": string|null },
    "balance_sheet": { "current_assets": number|null, "total_assets": number|null, "current_liabilities": number|null, "total_liabilities": number|null, "inventory": number|null, "equity": number|null, "cash": number|null, "accounts_receivable": number|null, "accounts_payable": number|null },
    "cash_flow": { "operating_cf": number|null, "investing_cf": number|null, "financing_cf": number|null, "free_cash_flow": number|null },
    "currency": string,
    "period_label": string
  },
  "summary_metrics": {
    "revenue": number|null,
    "accounts_receivable": number|null,
    "accounts_payable": number|null,
    "current_ratio": number|null,
    "equity_ratio": number|null,
    "gross_margin_pct": number|null,
    "net_margin_pct": number|null,
    "debt_to_equity": number|null
  },
  "yoy_pl": [
    { "line_item": string, "current": number|null, "previous": number|null, "change": number|null, "change_pct": number|null, "note": string }
  ],
  "ratios": [ { "name": string, "value": string, "formula": string, "computation": string, "interpretation": string, "status": "good"|"warning"|"bad"|"neutral" } ],
  "trend_series": {
    "labels": [string],
    "revenue": [number|null],
    "gross_profit": [number|null],
    "net_income": [number|null],
    "operating_cash_flow": [number|null]
  },
  "expense_breakdown": [ { "name": string, "value": number } ],
  "profitability_analysis": string,
  "liquidity_analysis": string,
  "cash_flow_analysis": string,
  "debt_risk_analysis": string,
  "trends": [ { "metric": string, "direction": "up"|"down"|"flat", "comment": string } ],
  "red_flags": [ { "severity": "low"|"medium"|"high", "issue": string, "evidence": string } ],
  "recommendations": [ string ],
  "strategic_advice": [ string ],
  "cost_savings": [ string ],
  "investor_commentary": string,
  "conclusion": string,
  "assumptions": [ string ]
}

REQUIREMENTS:
- yoy_pl MUST cover at minimum: Revenue, Cost of Goods Sold, Gross Profit, Operating Expenses, Operating Income, Other Income/Expense, Tax, Net Income / (Loss). Break out OpEx sub-lines (Salaries, Marketing, R&D, G&A, Depreciation) when present.
- change = current - previous (null if either is null). change_pct = ((current-previous)/abs(previous))*100, rounded to 1 decimal, or null.
- Every ratio MUST include both the textbook formula AND the actual computation with the numbers used (e.g. formula: "Current Assets / Current Liabilities", computation: "1,250,000 / 800,000 = 1.56").
- trend_series provides at least 2 data points (prior + current) and more if multi-period data is available.
- expense_breakdown items should sum to revenue and include COGS, Operating Expenses (or sub-lines), Tax, Net Income (positive only).`;

export const runAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RunInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: analysis, error } = await supabase
      .from("analyses").select("*, companies(*)").eq("id", data.analysisId).single();
    if (error || !analysis) throw new Error("Analysis not found");

    // Get signed URL for file
    let fileBlob: { mime: string; b64: string } | null = null;
    if (analysis.file_url) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // file_url stores the storage path
      const { data: dl } = await supabaseAdmin.storage.from("statements").download(analysis.file_url);
      if (dl) {
        const ab = await dl.arrayBuffer();
        const b64 = Buffer.from(ab).toString("base64");
        fileBlob = { mime: dl.type || "application/octet-stream", b64 };
      }
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing AI key");

    const company = (analysis as { companies?: { name?: string; industry?: string; location?: string; currency?: string } }).companies;
    const ctx = `Company: ${company?.name ?? "Unknown"} | Industry: ${company?.industry ?? "N/A"} | Location: ${company?.location ?? "N/A"} | Currency: ${company?.currency ?? "USD"}`;

    const userParts: Array<Record<string, unknown>> = [
      { type: "text", text: `${ctx}\n\nPeriod label: ${analysis.period_label ?? "Not specified"}\n\nAnalyze the attached financial statement. Compute all standard ratios. Identify trends, red flags, risk. Provide strategic advice. Return ONLY JSON matching this schema:\n${ANALYSIS_SCHEMA}` },
    ];
    if (fileBlob) {
      if (fileBlob.mime.startsWith("image/")) {
        userParts.push({ type: "image_url", image_url: { url: `data:${fileBlob.mime};base64,${fileBlob.b64}` } });
      } else {
        userParts.push({ type: "file", file: { filename: analysis.file_name ?? "statement", file_data: `data:${fileBlob.mime || "application/pdf"};base64,${fileBlob.b64}` } });
      }
    }

    // Direct gateway call (multimodal file)
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userParts },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      await supabase.from("analyses").update({ status: "failed", error_message: t.slice(0, 500) }).eq("id", data.analysisId);
      throw new Error(`AI gateway error ${resp.status}: ${t.slice(0, 200)}`);
    }
    const json = await resp.json() as { choices: Array<{ message: { content: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }

    const riskScore = typeof parsed.risk_score === "number" ? parsed.risk_score : null;

    const { error: upErr } = await supabase.from("analyses").update({
      status: "completed",
      analysis: parsed as never,
      extracted_data: (parsed.extracted ?? null) as never,
      risk_score: riskScore,
      updated_at: new Date().toISOString(),
    }).eq("id", data.analysisId).eq("user_id", userId);
    if (upErr) throw upErr;

    return { ok: true };
  });

const FallbackInput = z.object({ analysisId: z.string().uuid() });
export const ensureProcessed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => FallbackInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: a } = await supabase.from("analyses").select("status").eq("id", data.analysisId).single();
    return { status: a?.status ?? "unknown" };
  });
