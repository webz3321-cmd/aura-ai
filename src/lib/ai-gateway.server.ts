import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": apiKey,
    },
  });
}

export const AVAILABLE_MODELS = [
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", provider: "Google" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "Google" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google" },
  { id: "openai/gpt-5", label: "GPT-5", provider: "OpenAI" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", provider: "OpenAI" },
  { id: "openai/gpt-5-nano", label: "GPT-5 Nano", provider: "OpenAI" },
] as const;

export type ModelId = (typeof AVAILABLE_MODELS)[number]["id"];