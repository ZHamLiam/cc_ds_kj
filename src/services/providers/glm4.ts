import type { LLMConfig } from "../llm-client";

export function createGLM4Config(apiKey: string, model = "glm-4"): LLMConfig {
  return {
    apiKey,
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    model,
  };
}
