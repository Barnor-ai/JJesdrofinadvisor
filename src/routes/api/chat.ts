import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const MAX_MESSAGES = 50;
const MAX_MESSAGE_CHARS = 4000;
const MAX_CTX_CHARS = 10_000;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // --- Auth: require a valid Supabase bearer token ---
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.startsWith("Bearer ")
          ? authHeader.slice("Bearer ".length)
          : null;
        if (!token) return new Response("Unauthorized", { status: 401 });

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Server misconfigured", { status: 500 });
        }
        const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: claimsData, error: claimsErr } = await sb.auth.getClaims(token);
        if (claimsErr || !claimsData?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }

        // --- Input validation + size limits ---
        const body = (await request.json()) as { messages?: UIMessage[]; analysisContext?: string };
        if (!Array.isArray(body.messages)) return new Response("Bad request", { status: 400 });
        if (body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
          return new Response(`Message count must be between 1 and ${MAX_MESSAGES}`, { status: 400 });
        }
        for (const m of body.messages) {
          const text = JSON.stringify((m as { parts?: unknown; content?: unknown }).parts ?? (m as { content?: unknown }).content ?? "");
          if (text.length > MAX_MESSAGE_CHARS) {
            return new Response(`Message exceeds ${MAX_MESSAGE_CHARS} characters`, { status: 400 });
          }
        }

        const rawCtx = typeof body.analysisContext === "string" ? body.analysisContext : "";
        let analysisContext = rawCtx.slice(0, MAX_CTX_CHARS);
        // Lightweight prompt-injection guard
        if (/ignore (all |the )?previous (instructions|messages|prompt)/i.test(analysisContext)) {
          analysisContext = analysisContext.replace(
            /ignore (all |the )?previous (instructions|messages|prompt)[^\n]*/gi,
            "[removed: suspicious instruction]",
          );
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing key", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const system = `You are FinScope, a senior financial advisor. Discuss the user's financial analysis with investor-grade clarity. Use plain language, give concrete numbers, and be honest about uncertainty.\n\nAnalysis context:\n${analysisContext || "(no context provided)"}`;

        const result = streamText({
          model: gateway("google/gemini-2.5-flash"),
          system,
          messages: await convertToModelMessages(body.messages),
        });
        return result.toUIMessageStreamResponse({ originalMessages: body.messages });
      },
    },
  },
});
