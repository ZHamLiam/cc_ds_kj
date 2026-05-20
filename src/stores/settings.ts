import { create } from "zustand";
import type { LLMProvider, ProviderSelection } from "../types";
import type { LLMConfig } from "../services/llm-client";
import { buildLLMConfig } from "../lib/llm-config";

export interface CloseBehavior {
  behavior: "minimize_to_tray" | "close_app";
  skipDialog: boolean;
}

interface SettingsState {
  apiKeys: Record<string, string>;
  defaultSelection: ProviderSelection | null;
  featureSelections: Partial<Record<string, ProviderSelection>>;
  popupShortcut: string;
  clipboardAutoPopup: boolean;
  setApiKey: (provider: LLMProvider, key: string) => void;
  getApiKey: (provider: LLMProvider) => string;
  clearAllKeys: () => void;
  setDefaultSelection: (sel: ProviderSelection | null) => void;
  setFeatureSelection: (feature: string, sel: ProviderSelection | null) => void;
  getLLMConfig: (feature: string) => LLMConfig | null;
  setPopupShortcut: (shortcut: string) => void;
  setClipboardAutoPopup: (enabled: boolean) => void;
  closeBehavior: CloseBehavior;
  setCloseBehavior: (cb: CloseBehavior) => void;
  hydrateFromJson: (json: string) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiKeys: {},
  defaultSelection: null,
  featureSelections: {},
  popupShortcut: "Ctrl+Shift+Space",
  clipboardAutoPopup: true,
  closeBehavior: { behavior: "minimize_to_tray", skipDialog: false },
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
  setClipboardAutoPopup: (enabled) => set({ clipboardAutoPopup: enabled }),
  setCloseBehavior: (cb) => set({ closeBehavior: cb }),
  hydrateFromJson: (json) => {
    try {
      const parsed = JSON.parse(json);
      const patch: Partial<SettingsState> = {};
      if (parsed.apiKeys && typeof parsed.apiKeys === "object") {
        patch.apiKeys = parsed.apiKeys;
      }
      if (parsed.defaultSelection && typeof parsed.defaultSelection === "object") {
        patch.defaultSelection = parsed.defaultSelection;
      }
      if (parsed.featureSelections && typeof parsed.featureSelections === "object") {
        patch.featureSelections = parsed.featureSelections;
      }
      if (typeof parsed.popupShortcut === "string") {
        patch.popupShortcut = parsed.popupShortcut;
      }
      if (typeof parsed.clipboardAutoPopup === "boolean") {
        patch.clipboardAutoPopup = parsed.clipboardAutoPopup;
      }
      if (parsed.closeBehavior && typeof parsed.closeBehavior === "object") {
        const { behavior, skipDialog } = parsed.closeBehavior;
        if (
          (behavior === "minimize_to_tray" || behavior === "close_app") &&
          typeof skipDialog === "boolean"
        ) {
          patch.closeBehavior = { behavior, skipDialog };
        }
      }
      set(patch);
    } catch {
      // Ignore parse errors, use defaults
    }
  },
}));
