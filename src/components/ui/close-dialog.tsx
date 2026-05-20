import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "./button";
import { useSettingsStore } from "../../stores/settings";

interface CloseDialogProps {
  onClose: () => void;
}

export function CloseDialog({ onClose }: CloseDialogProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const setCloseBehavior = useSettingsStore((s) => s.setCloseBehavior);

  const handleMinimizeToTray = async () => {
    if (dontAskAgain) {
      setCloseBehavior({ behavior: "minimize_to_tray", skipDialog: true });
      invoke("set_close_behavior", {
        behavior: "minimize_to_tray",
        skipDialog: true,
      }).catch(() => {});
    }
    await invoke("minimize_to_tray");
    onClose();
  };

  const handleCloseApp = async () => {
    if (dontAskAgain) {
      setCloseBehavior({ behavior: "close_app", skipDialog: true });
    }
    const state = useSettingsStore.getState();
    const payload = {
      apiKeys: state.apiKeys,
      defaultSelection: state.defaultSelection,
      featureSelections: state.featureSelections,
      popupShortcut: state.popupShortcut,
      clipboardAutoPopup: state.clipboardAutoPopup,
      closeBehavior: dontAskAgain
        ? { behavior: "close_app" as const, skipDialog: true }
        : state.closeBehavior,
    };
    await invoke("save_settings", { settingsJson: JSON.stringify(payload) });
    await invoke("close_app");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border rounded-lg shadow-xl p-6 w-[360px] space-y-4">
        <h3 className="text-lg font-semibold">关闭跨境电商助手</h3>
        <p className="text-sm text-muted-foreground">
          请选择关闭方式
        </p>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleMinimizeToTray}
          >
            最小化到托盘
          </Button>
          <Button
            variant="default"
            className="flex-1"
            onClick={handleCloseApp}
          >
            直接关闭
          </Button>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dontAskAgain}
            onChange={(e) => setDontAskAgain(e.target.checked)}
            className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
          />
          <span className="text-sm text-muted-foreground">下次不再提示</span>
        </label>
      </div>
    </div>
  );
}
