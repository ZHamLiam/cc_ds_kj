import type { LLMConfig } from "../services/llm-client";
import type { LLMProvider } from "../types";
import { createDeepSeekConfig } from "../services/providers/deepseek";
import { createQwenConfig } from "../services/providers/qwen";
import { createGLM4Config } from "../services/providers/glm4";

export function buildLLMConfig(provider: LLMProvider, apiKey: string, model?: string): LLMConfig {
  switch (provider) {
    case "deepseek":
      return createDeepSeekConfig(apiKey, model);
    case "qwen":
      return createQwenConfig(apiKey, model);
    case "glm4":
      return createGLM4Config(apiKey, model);
  }
}
