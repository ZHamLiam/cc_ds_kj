import { useCallback } from "react";
import { llmClient, type LLMConfig } from "../services/llm-client";

export function useLLM() {
  const streamChat = useCallback(
    async function* (systemPrompt: string, userMessage: string, config: LLMConfig) {
      for await (const chunk of llmClient.chat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        config
      )) {
        yield chunk;
      }
    },
    []
  );

  return { streamChat };
}
