import { useState } from "react";
import { Button } from "../../components/ui/button";
import { useSettingsStore } from "../../stores/settings";
import { useTranslateStore } from "../../stores/translate";
import { useAppStore } from "../../stores/app";
import type { LLMProvider } from "../../types";
import { createDeepSeekConfig } from "../../services/providers/deepseek";
import { createQwenConfig } from "../../services/providers/qwen";
import { createGLM4Config } from "../../services/providers/glm4";

const PROVIDERS: { id: LLMProvider; name: string; description: string }[] = [
  { id: "deepseek", name: "DeepSeek", description: "OpenAI 兼容接口" },
  { id: "qwen", name: "通义千问", description: "阿里 DashScope API" },
  { id: "glm4", name: "GLM-4", description: "智谱 API" },
];

export function SettingsPage() {
  const { apiKeys, setApiKey, clearAllKeys } = useSettingsStore();
  const { setLLMConfig } = useTranslateStore();
  const { setCurrentProvider, setCurrentModel } = useAppStore();
  const [activeProvider, setActiveProvider] = useState<LLMProvider>("deepseek");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  const toggleShowKey = (p: string) =>
    setShowKeys((s) => ({ ...s, [p]: !s[p] }));

  const handleSave = (provider: LLMProvider, key: string) => {
    setApiKey(provider, key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleActivate = (provider: LLMProvider) => {
    const key = apiKeys[provider];
    if (!key) return;

    let config;
    switch (provider) {
      case "deepseek":
        config = createDeepSeekConfig(key);
        break;
      case "qwen":
        config = createQwenConfig(key);
        break;
      case "glm4":
        config = createGLM4Config(key);
        break;
      default:
        return;
    }

    setLLMConfig(config);
    setCurrentProvider(provider);
    setCurrentModel(config.model);
    setActiveProvider(provider);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">设置</h2>
        <p className="text-sm text-muted-foreground mt-1">
          管理 API Key 和模型配置
        </p>
      </div>

      <div className="space-y-4">
        {PROVIDERS.map((prov) => (
          <div key={prov.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{prov.name}</h3>
                <p className="text-xs text-muted-foreground">{prov.description}</p>
              </div>
              <Button
                variant={activeProvider === prov.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveProvider(prov.id)}
              >
                {activeProvider === prov.id ? "当前" : "选择"}
              </Button>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showKeys[prov.id] ? "text" : "password"}
                  placeholder="输入 API Key..."
                  value={apiKeys[prov.id] || ""}
                  onChange={(e) => handleSave(prov.id, e.target.value)}
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
              <Button
                size="sm"
                disabled={!apiKeys[prov.id]}
                onClick={() => handleActivate(prov.id)}
              >
                启用
              </Button>
            </div>
          </div>
        ))}
      </div>

      {saved && (
        <div className="text-sm text-green-600">API Key 已保存</div>
      )}

      <div className="pt-4 border-t">
        <Button variant="outline" onClick={clearAllKeys} className="text-destructive">
          清除所有 Key
        </Button>
      </div>
    </div>
  );
}
