export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
}

export interface LLMConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

export interface LLMClient {
  chat(messages: LLMMessage[], config: LLMConfig): AsyncGenerator<LLMStreamChunk>;
}

export function createOpenAICompatibleClient(): LLMClient {
  return {
    async *chat(messages, config) {
      const response = await fetch(`${config.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`LLM API error ${response.status}: ${err}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            yield { content: "", done: true };
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
            if (content) yield { content, done: false };
          } catch {
            // skip malformed chunks
          }
        }
      }
      yield { content: "", done: true };
    },
  };
}

export const llmClient: LLMClient = createOpenAICompatibleClient();
