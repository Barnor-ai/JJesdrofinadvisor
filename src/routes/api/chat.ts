import { createFileRoute } from "@tanstack/react-router";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: UIMessage[]; analysisContext?: string };
        if (!Array.isArray(body.messages)) return new Response("Bad request", { status: 400 });
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing key", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const system = `You are FinScope, a senior financial advisor. Discuss the user's financial analysis with investor-grade clarity. Use plain language, give concrete numbers, and be honest about uncertainty.\n\nAnalysis context:\n${body.analysisContext ?? "(no context provided)"}`;

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
