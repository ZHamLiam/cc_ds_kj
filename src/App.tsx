import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppLayout } from "./components/layout/AppLayout";
import { useSettingsStore } from "./stores/settings";

function App() {
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const defaultSelection = useSettingsStore((s) => s.defaultSelection);
  const popupShortcut = useSettingsStore((s) => s.popupShortcut);
  const clipboardAutoPopup = useSettingsStore((s) => s.clipboardAutoPopup);
  const featureSelections = useSettingsStore((s) => s.featureSelections);
  const hydrateFromJson = useSettingsStore((s) => s.hydrateFromJson);
  const loadedRef = useRef(false);

  // Load settings from disk on startup
  useEffect(() => {
    invoke<string>("load_settings")
      .then((json) => {
        hydrateFromJson(json);
      })
      .catch(console.error)
      .finally(() => {
        loadedRef.current = true;
      });
  }, []);

  // Sync LLM config to Rust backend whenever settings change
  useEffect(() => {
    if (defaultSelection) {
      const apiKey = apiKeys[defaultSelection.provider];
      if (apiKey) {
        const config = {
          provider: defaultSelection.provider,
          apiKey,
          model: defaultSelection.model,
        };
        invoke("sync_llm_config", { configJson: JSON.stringify(config) }).catch(
          console.error,
        );
      }
    }
  }, [apiKeys, defaultSelection]);

  // Sync shortcut to Rust backend on change
  useEffect(() => {
    if (popupShortcut) {
      invoke("update_shortcut", { shortcut: popupShortcut }).catch(console.error);
    }
  }, [popupShortcut]);

  // Sync clipboard auto-popup to Rust backend on change
  useEffect(() => {
    invoke("set_clipboard_auto_popup", { enabled: clipboardAutoPopup }).catch(
      console.error,
    );
  }, [clipboardAutoPopup]);

  // Debounced save to disk when settings change (skip initial load)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!loadedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const state = useSettingsStore.getState();
      const payload = {
        apiKeys: state.apiKeys,
        defaultSelection: state.defaultSelection,
        featureSelections: state.featureSelections,
        popupShortcut: state.popupShortcut,
        clipboardAutoPopup: state.clipboardAutoPopup,
      };
      invoke("save_settings", { settingsJson: JSON.stringify(payload) }).catch(
        console.error,
      );
    }, 500);
  }, [apiKeys, defaultSelection, popupShortcut, clipboardAutoPopup, featureSelections]);

  return <AppLayout />;
}

export default App;
