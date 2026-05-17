import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppLayout } from "./components/layout/AppLayout";
import { useSettingsStore } from "./stores/settings";

function App() {
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const defaultSelection = useSettingsStore((s) => s.defaultSelection);
  const popupShortcut = useSettingsStore((s) => s.popupShortcut);

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

  // Sync shortcut to Rust backend on startup and change
  useEffect(() => {
    if (popupShortcut) {
      invoke("update_shortcut", { shortcut: popupShortcut }).catch(console.error);
    }
  }, [popupShortcut]);

  return <AppLayout />;
}

export default App;
