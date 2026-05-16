import type { LLMConfig } from "../llm-client";

export function createDeepSeekConfig(apiKey: string, model = "deepseek-chat"): LLMConfig {
  return {
    apiKey,
    baseURL: "https://api.deepseek.com/v1",
    model,
  };
}
