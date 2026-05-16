import type { LLMConfig } from "../llm-client";

export function createQwenConfig(apiKey: string, model = "qwen-plus"): LLMConfig {
  return {
    apiKey,
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model,
  };
}
