import { useState, useCallback, useMemo } from "react";
import { Button } from "../../components/ui/button";
import { useLLM } from "../../hooks/useLLM";
import { buildTitleOptimizePrompt } from "../../services/prompts/title-optimize";
import { OptimizeResultCard } from "./components/OptimizeResultCard";
import { getRegionsForPlatform, PLATFORMS, PROVIDER_NAMES, type Platform } from "../../types";
import { useSettingsStore } from "../../stores/settings";
import { useTitleStore } from "../../stores/title";
import { splitLines } from "../../lib/utils";
import { buildLLMConfig } from "../../lib/llm-config";

type OptimizeResult = { title: string; seoScore: number; keywords: string[]; reason: string };
type BatchResults = Record<string, OptimizeResult[]>;

export function TitleOptimizePage() {
  const featureSelection = useSettingsStore(
    (s) => s.featureSelections["title-optimize"] || s.defaultSelection || null
  );
  const featureApiKey = useSettingsStore((s) => {
    const sel = s.featureSelections["title-optimize"] || s.defaultSelection;
    return sel ? s.apiKeys[sel.provider] || null : null;
  });
  const llmConfig = useMemo(
    () => (featureSelection && featureApiKey
      ? buildLLMConfig(featureSelection.provider, featureApiKey, featureSelection.model)
      : null),
    [featureSelection, featureApiKey]
  );
  const { streamChat } = useLLM();
  const { getStyleProfile } = useTitleStore();

  const [originalTitles, setOriginalTitles] = useState("");
  const [region, setRegion] = useState("us");
  const [platform, setPlatform] = useState("Amazon");
  const [batchResults, setBatchResults] = useState<BatchResults>({});
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const streamToText = async (system: string, user: string) => {
    let fullText = "";
    for await (const chunk of streamChat(system, user, llmConfig!)) {
      if (chunk.content) fullText += chunk.content;
    }
    return fullText;
  };

  const parseResults = (text: string): OptimizeResult[] => {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return [{ title: text, seoScore: 0, keywords: [], reason: "JSON 解析失败，显示原始结果" }];
      }
    }
    return [{ title: text, seoScore: 0, keywords: [], reason: "无法解析结构化结果" }];
  };

  const handleOptimize = useCallback(async () => {
    if (!originalTitles.trim() || !llmConfig) return;
    setError(null);
    setBatchResults({});

    const titles = splitLines(originalTitles);
    if (titles.length === 0) return;

    setBatchProgress({ current: 0, total: titles.length });

    for (let i = 0; i < titles.length; i++) {
      setBatchProgress({ current: i + 1, total: titles.length });
      const title = titles[i];
      try {
        const userStyle = getStyleProfile(region, platform);
        const { system, user } = buildTitleOptimizePrompt(title, region, platform, userStyle);
        const fullText = await streamToText(system, user);
        const results = parseResults(fullText);
        setBatchResults((prev) => ({ ...prev, [title]: results }));
      } catch (e: any) {
        setBatchResults((prev) => ({
          ...prev,
          [title]: [{ title: `错误: ${e.message}`, seoScore: 0, keywords: [], reason: "" }],
        }));
      }
    }

    setBatchProgress(null);
  }, [originalTitles, region, platform, llmConfig, streamChat, getStyleProfile]);

  const titles = splitLines(originalTitles);
  const isBatch = titles.length > 1;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">标题优化</h2>
        <p className="text-sm text-muted-foreground mt-1">
          输入商品标题（每行一个），选择目标市场与平台，生成 SEO 优化方案
        </p>
        {llmConfig && featureSelection && (
          <p className="text-xs text-muted-foreground mt-1">
            当前模型：{PROVIDER_NAMES[featureSelection.provider]} / {featureSelection.model}
          </p>
        )}
      </div>

      {!llmConfig && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
          请先在「设置」中配置 API Key
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">
          原标题 {titles.length > 0 && <span className="text-muted-foreground">({titles.length} 条)</span>}
        </label>
        <textarea
          value={originalTitles}
          onChange={(e) => setOriginalTitles(e.target.value)}
          placeholder="输入要优化的商品标题，每行一个..."
          className="w-full h-32 p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
        />
      </div>

      <div className="flex gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">目标平台</label>
          <select
            value={platform}
            onChange={(e) => {
              const p = e.target.value as Platform;
              setPlatform(p);
              setRegion(getRegionsForPlatform(p)[0].code);
            }}
            className="text-sm border rounded px-2 py-1 bg-background"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">目标地区</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="text-sm border rounded px-2 py-1 bg-background"
          >
            {getRegionsForPlatform(platform as Platform).map((r) => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button onClick={handleOptimize} disabled={!originalTitles.trim() || !llmConfig}>
          {isBatch ? "批量优化" : "开始优化"}
        </Button>
        {batchProgress && (
          <span className="text-sm text-muted-foreground">
            正在处理 {batchProgress.current}/{batchProgress.total}...
          </span>
        )}
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      {titles.length > 0 && Object.keys(batchResults).length > 0 && (
        <div className="space-y-6">
          {titles.map((title, idx) => {
            const results = batchResults[title];
            if (!results) return null;
            return (
              <div key={idx} className="space-y-3">
                {isBatch && (
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                    标题 {idx + 1}: {title}
                  </h3>
                )}
                {results.map((r, i) => (
                  <OptimizeResultCard key={i} result={r} index={i} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
