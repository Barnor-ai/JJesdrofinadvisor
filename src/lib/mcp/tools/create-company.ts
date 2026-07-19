import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_company",
  title: "Create company",
  description: "Create a new FinScope company profile for the signed-in user.",
  inputSchema: {
    name: z.string().trim().min(1).describe("Company name."),
    industry: z.string().trim().min(1).optional(),
    location: z.string().trim().min(1).optional(),
    currency: z.string().trim().min(3).max(3).optional().describe("ISO currency code, e.g. USD."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ name, industry, location, currency }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("companies")
      .insert({ name, industry, location, currency: currency ?? "USD", user_id: ctx.getUserId() })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { company: data },
    };
  },
});
