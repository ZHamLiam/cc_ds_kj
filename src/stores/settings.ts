import { create } from "zustand";
import type { LLMProvider } from "../types";

interface SettingsState {
  apiKeys: Record<string, string>;
  setApiKey: (provider: LLMProvider, key: string) => void;
  getApiKey: (provider: LLMProvider) => string;
  clearAllKeys: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiKeys: {},
  setApiKey: (provider, key) =>
    set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: key } })),
  getApiKey: (provider) => get().apiKeys[provider] || "",
  clearAllKeys: () => set({ apiKeys: {} }),
}));
