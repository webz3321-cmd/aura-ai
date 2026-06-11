import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type ChatRequestBody = {
  messages?: unknown;
  model?: unknown;
  threadId?: unknown;
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice(7);

        const { messages, model, threadId } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("messages required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;

        // Validate token & get user
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimErr } = await supabase.auth.getClaims(token);
        if (claimErr || !claims?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = claims.claims.sub;

        const modelId = typeof model === "string" ? model : "google/gemini-3-flash-preview";
        const gateway = createLovableAiGatewayProvider(key);

        const result = streamText({
          model: gateway(modelId),
          system:
            "You are a helpful, knowledgeable AI assistant. Respond clearly using markdown when useful. Be concise but thorough.",
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
          onFinish: async ({ messages: finalMessages }) => {
            if (typeof threadId !== "string") return;
            try {
              // Save only the last user message and the assistant reply
              const lastUser = [...(messages as UIMessage[])].reverse().find((m) => m.role === "user");
              const lastAssistant = [...finalMessages].reverse().find((m) => m.role === "assistant");
              const rows = [];
              if (lastUser) {
                rows.push({
                  thread_id: threadId,
                  user_id: userId,
                  role: "user",
                  parts: lastUser.parts as unknown as object,
                });
              }
              if (lastAssistant) {
                rows.push({
                  thread_id: threadId,
                  user_id: userId,
                  role: "assistant",
                  parts: lastAssistant.parts as unknown as object,
                });
              }
              if (rows.length) {
                await supabase.from("messages").insert(rows);
                await supabase
                  .from("threads")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", threadId);
              }
            } catch (e) {
              console.error("Failed to persist messages", e);
            }
          },
        });
      },
    },
  },
});