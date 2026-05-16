import { create } from "zustand";
import type { LLMConfig } from "../services/llm-client";

interface TranslateState {
  sourceText: string;
  translatedText: string;
  isTranslating: boolean;
  error: string | null;
  llmConfig: LLMConfig | null;
  setSourceText: (text: string) => void;
  setTranslatedText: (text: string) => void;
  setTranslating: (v: boolean) => void;
  setError: (e: string | null) => void;
  setLLMConfig: (c: LLMConfig | null) => void;
}

export const useTranslateStore = create<TranslateState>((set) => ({
  sourceText: "",
  translatedText: "",
  isTranslating: false,
  error: null,
  llmConfig: null,
  setSourceText: (text) => set({ sourceText: text }),
  setTranslatedText: (text) => set({ translatedText: text }),
  setTranslating: (v) => set({ isTranslating: v }),
  setError: (e) => set({ error: e }),
  setLLMConfig: (c) => set({ llmConfig: c }),
}));
