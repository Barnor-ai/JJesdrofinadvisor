import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_analyses",
  title: "List analyses",
  description: "List the signed-in user's financial statement analyses (title, period, status, risk score). Optionally filter by company.",
  inputSchema: {
    company_id: z.string().uuid().optional().describe("Filter to a single company."),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ company_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("analyses")
      .select("id, title, period_label, status, risk_score, company_id, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (company_id) q = q.eq("company_id", company_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { analyses: data ?? [] },
    };
  },
});
