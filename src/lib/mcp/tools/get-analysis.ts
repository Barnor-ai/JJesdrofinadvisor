import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_analysis",
  title: "Get analysis",
  description: "Fetch a single FinScope analysis in full, including the AI-generated report JSON (executive summary, ratios, YoY P&L, red flags, recommendations, strategic advice).",
  inputSchema: {
    id: z.string().uuid().describe("Analysis id (from list_analyses)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("analyses")
      .select("id, title, period_label, status, risk_score, company_id, analysis, extracted_data, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Not found" }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { analysis: data },
    };
  },
});
