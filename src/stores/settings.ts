import { create } from "zustand";
import type { LLMProvider, ProviderSelection } from "../types";
import type { LLMConfig } from "../services/llm-client";
import { buildLLMConfig } from "../lib/llm-config";

interface SettingsState {
  apiKeys: Record<string, string>;
  defaultSelection: ProviderSelection | null;
  featureSelections: Partial<Record<string, ProviderSelection>>;
  popupShortcut: string;
  setApiKey: (provider: LLMProvider, key: string) => void;
  getApiKey: (provider: LLMProvider) => string;
  clearAllKeys: () => void;
  setDefaultSelection: (sel: ProviderSelection | null) => void;
  setFeatureSelection: (feature: string, sel: ProviderSelection | null) => void;
  getLLMConfig: (feature: string) => LLMConfig | null;
  setPopupShortcut: (shortcut: string) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiKeys: {},
  defaultSelection: null,
  featureSelections: {},
  popupShortcut: "Ctrl+Shift+Space",
  setApiKey: (provider, key) =>
    set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: key } })),
  getApiKey: (provider) => get().apiKeys[provider] || "",
  clearAllKeys: () =>
    set({ apiKeys: {}, defaultSelection: null, featureSelections: {} }),
  setDefaultSelection: (sel) => set({ defaultSelection: sel }),
  setFeatureSelection: (feature, sel) =>
    set((s) => {
      const next = { ...s.featureSelections };
      if (sel === null) {
        delete next[feature];
      } else {
        next[feature] = sel;
      }
      return { featureSelections: next };
    }),
  getLLMConfig: (feature) => {
    const state = get();
    const sel = state.featureSelections[feature] || state.defaultSelection;
    if (!sel) return null;
    const key = state.apiKeys[sel.provider];
    if (!key) return null;
    return buildLLMConfig(sel.provider, key, sel.model);
  },
  setPopupShortcut: (shortcut) => set({ popupShortcut: shortcut }),
}));
