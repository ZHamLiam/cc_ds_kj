import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../../components/ui/button";
import { useSettingsStore } from "../../stores/settings";
import type { LLMProvider, FeatureKey } from "../../types";
import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  PROVIDER_NAMES,
  MODEL_OPTIONS,
  getDefaultModel,
} from "../../types";

const PROVIDER_DESC: Record<LLMProvider, string> = {
  deepseek: "OpenAI 兼容接口",
  qwen: "阿里 DashScope API",
  glm4: "智谱 API",
};

const PROVIDERS = (Object.keys(PROVIDER_NAMES) as LLMProvider[]).map((id) => ({
  id,
  name: PROVIDER_NAMES[id],
  description: PROVIDER_DESC[id],
}));

const FEATURE_HINTS: Partial<Record<FeatureKey, string>> = {
  "product-analysis": "建议使用支持联网搜索的模型以获得时效性数据",
};

export function SettingsPage() {
  const {
    apiKeys, setApiKey, clearAllKeys,
    defaultSelection, setDefaultSelection,
    featureSelections, setFeatureSelection,
    popupShortcut, setPopupShortcut,
  } = useSettingsStore();

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  const toggleShowKey = (p: string) =>
    setShowKeys((s) => ({ ...s, [p]: !s[p] }));

  const handleSaveKey = (provider: LLMProvider, key: string) => {
    setApiKey(provider, key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSetDefaultProvider = (provider: LLMProvider) => {
    if (!apiKeys[provider]) return;
    const model = defaultSelection?.provider === provider
      ? defaultSelection.model
      : getDefaultModel(provider);
    setDefaultSelection({ provider, model });
  };

  const handleSetDefaultModel = (model: string) => {
    if (!defaultSelection) return;
    setDefaultSelection({ ...defaultSelection, model });
  };

  const handleOverrideProvider = (feature: string, provider: string) => {
    if (provider === "__default__") {
      setFeatureSelection(feature, null);
    } else {
      const prov = provider as LLMProvider;
      const existing = featureSelections[feature];
      const model = existing?.provider === prov ? existing.model : getDefaultModel(prov);
      setFeatureSelection(feature, { provider: prov, model });
    }
  };

  const handleOverrideModel = (feature: string, model: string) => {
    const existing = featureSelections[feature];
    if (!existing) return;
    setFeatureSelection(feature, { ...existing, model });
  };

  const configuredProviders = PROVIDERS.filter((p) => apiKeys[p.id]);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">设置</h2>
        <p className="text-sm text-muted-foreground mt-1">
          管理 API Key 和模型配置
        </p>
      </div>

      {/* API Key 管理 */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm">API Key</h3>
        {PROVIDERS.map((prov) => (
          <div key={prov.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{prov.name}</h4>
                <p className="text-xs text-muted-foreground">{prov.description}</p>
              </div>
              {apiKeys[prov.id] && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  已配置
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showKeys[prov.id] ? "text" : "password"}
                  placeholder="输入 API Key..."
                  value={apiKeys[prov.id] || ""}
                  onChange={(e) => handleSaveKey(prov.id, e.target.value)}
                  className="w-full border rounded px-3 py-1.5 text-sm pr-10 bg-background"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                  onClick={() => toggleShowKey(prov.id)}
                >
                  {showKeys[prov.id] ? "隐藏" : "显示"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {saved && <div className="text-sm text-green-600">API Key 已保存</div>}

      {/* 默认模型 */}
      {configuredProviders.length > 0 && (
        <div className="border-t pt-6 space-y-4">
          <div>
            <h3 className="font-medium text-sm">默认模型</h3>
            <p className="text-xs text-muted-foreground mt-1">
              未单独指定模型的功能将使用此配置
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {configuredProviders.map((prov) => (
              <Button
                key={prov.id}
                variant={defaultSelection?.provider === prov.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleSetDefaultProvider(prov.id)}
              >
                {prov.name}
                {defaultSelection?.provider === prov.id && " ✓"}
              </Button>
            ))}
          </div>
          {defaultSelection && (
            <ModelSelect
              provider={defaultSelection.provider}
              value={defaultSelection.model}
              onChange={handleSetDefaultModel}
            />
          )}
        </div>
      )}

      {/* 各功能模型覆盖 */}
      {configuredProviders.length > 0 && defaultSelection && (
        <div className="border-t pt-6 space-y-4">
          <div>
            <h3 className="font-medium text-sm">功能模型设置</h3>
            <p className="text-xs text-muted-foreground mt-1">
              为不同功能单独指定使用的模型供应商和版本
            </p>
          </div>
          <div className="space-y-4">
            {FEATURE_KEYS.map((feature) => {
              const sel = featureSelections[feature];
              return (
                <div key={feature} className="border rounded-lg p-3 space-y-2">
                  <div>
                    <span className="text-sm font-medium">{FEATURE_LABELS[feature as FeatureKey]}</span>
                    {FEATURE_HINTS[feature] && (
                      <p className="text-xs text-muted-foreground mt-0.5">{FEATURE_HINTS[feature]}</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <select
                      value={sel?.provider || "__default__"}
                      onChange={(e) => handleOverrideProvider(feature, e.target.value)}
                      className="text-sm border rounded px-2 py-1.5 bg-background"
                    >
                      <option value="__default__">跟随默认</option>
                      {configuredProviders.map((prov) => (
                        <option key={prov.id} value={prov.id}>
                          {prov.name}
                        </option>
                      ))}
                    </select>
                    {sel && (
                      <ModelSelect
                        provider={sel.provider}
                        value={sel.model}
                        onChange={(m) => handleOverrideModel(feature, m)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 弹出框快捷键 */}
      <div className="border-t pt-6 space-y-4">
        <div>
          <h3 className="font-medium text-sm">弹出框快捷键</h3>
          <p className="text-xs text-muted-foreground mt-1">
            选中文本后按下快捷键可触发浮动弹窗
          </p>
        </div>
        <ShortcutRecorder
          value={popupShortcut}
          onChange={(s) => {
            setPopupShortcut(s);
            invoke("update_shortcut", { shortcut: s }).catch(console.error);
          }}
        />
      </div>

      <div className="pt-4 border-t">
        <Button variant="outline" onClick={clearAllKeys} className="text-destructive">
          清除所有 Key
        </Button>
      </div>
    </div>
  );
}

function ShortcutRecorder({
  value,
  onChange,
}: {
  value: string;
  onChange: (shortcut: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleStartRecord = useCallback(() => {
    setRecording(true);
    // Focus a hidden handler
    setTimeout(() => btnRef.current?.focus(), 50);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!recording) return;
      e.preventDefault();
      e.stopPropagation();

      const parts: string[] = [];
      if (e.ctrlKey) parts.push("Ctrl");
      if (e.altKey) parts.push("Alt");
      if (e.shiftKey) parts.push("Shift");
      if (e.metaKey) parts.push("Meta");

      // Map event.code to readable key name
      const code = e.code;
      let key = "";
      if (code.startsWith("Key")) {
        key = code.slice(3); // e.g., "KeyA" → "A"
      } else if (code.startsWith("Digit")) {
        key = code.slice(5); // e.g., "Digit1" → "1"
      } else if (code === "Space") {
        key = "Space";
      } else if (code.startsWith("F") && code.length <= 4) {
        key = code; // e.g., "F1", "F12"
      } else {
        key = code;
      }

      // Don't record if only modifier keys pressed
      if (["ControlLeft","ControlRight","ShiftLeft","ShiftRight","AltLeft","AltRight","MetaLeft","MetaRight"].includes(code)) {
        return;
      }

      if (parts.length === 0 || !key) return;

      parts.push(key);
      onChange(parts.join("+"));
      setRecording(false);
    },
    [recording, onChange],
  );

  return (
    <div className="flex items-center gap-3">
      <button
        ref={btnRef}
        onClick={handleStartRecord}
        onKeyDown={handleKeyDown}
        onBlur={() => setRecording(false)}
        className={`px-4 py-2 rounded-md border text-sm font-mono min-w-[180px] text-center transition-colors ${
          recording
            ? "border-primary bg-primary/5 text-primary animate-pulse"
            : "bg-muted hover:bg-muted/80"
        }`}
      >
        {recording ? "请按下快捷键..." : value || "未设置"}
      </button>
      <span className="text-xs text-muted-foreground">
        {recording ? "按下组合键完成录制" : "点击按钮后按下新快捷键"}
      </span>
    </div>
  );
}

function ModelSelect({
  provider,
  value,
  onChange,
}: {
  provider: LLMProvider;
  value: string;
  onChange: (model: string) => void;
}) {
  const options = MODEL_OPTIONS[provider];
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm border rounded px-2 py-1.5 bg-background"
    >
      {options.map((opt) => (
        <option key={opt.model} value={opt.model}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
