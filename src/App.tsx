import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { AppLayout } from "./components/layout/AppLayout";
import { CloseDialog } from "./components/ui/close-dialog";
import { useSettingsStore } from "./stores/settings";

function App() {
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const defaultSelection = useSettingsStore((s) => s.defaultSelection);
  const popupShortcut = useSettingsStore((s) => s.popupShortcut);
  const clipboardAutoPopup = useSettingsStore((s) => s.clipboardAutoPopup);
  const featureSelections = useSettingsStore((s) => s.featureSelections);
  const hydrateFromJson = useSettingsStore((s) => s.hydrateFromJson);
  const closeBehavior = useSettingsStore((s) => s.closeBehavior);
  const loadedRef = useRef(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

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

  // Intercept window close → show dialog or follow saved behavior
  useEffect(() => {
    const setup = async () => {
      const unlisten = await listen("close-requested", () => {
        const state = useSettingsStore.getState();
        const { behavior, skipDialog } = state.closeBehavior;
        if (skipDialog) {
          if (behavior === "minimize_to_tray") {
            invoke("minimize_to_tray").catch(console.error);
          } else {
            const s = useSettingsStore.getState();
            const payload = {
              apiKeys: s.apiKeys,
              defaultSelection: s.defaultSelection,
              featureSelections: s.featureSelections,
              popupShortcut: s.popupShortcut,
              clipboardAutoPopup: s.clipboardAutoPopup,
              closeBehavior: s.closeBehavior,
            };
            invoke("save_settings", { settingsJson: JSON.stringify(payload) })
              .then(() => invoke("close_app"))
              .catch(console.error);
          }
        } else {
          setShowCloseDialog(true);
        }
      });
      return unlisten;
    };
    const unlistenPromise = setup();
    return () => {
      unlistenPromise.then((fn) => fn());
    };
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
        closeBehavior: state.closeBehavior,
      };
      invoke("save_settings", { settingsJson: JSON.stringify(payload) }).catch(
        console.error,
      );
    }, 500);
  }, [apiKeys, defaultSelection, popupShortcut, clipboardAutoPopup, featureSelections, closeBehavior]);

  return (
    <>
      <AppLayout />
      {showCloseDialog && (
        <CloseDialog onClose={() => setShowCloseDialog(false)} />
      )}
    </>
  );
}

export default App;
