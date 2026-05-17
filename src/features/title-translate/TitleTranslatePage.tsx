import { useState, useCallback, useMemo } from "react";
import { Button } from "../../components/ui/button";
import { useLLM } from "../../hooks/useLLM";
import {
  buildTitleTranslatePrompt,
  buildTitleEnglishPivotPrompt,
  buildEnglishTitleToThaiPrompt,
} from "../../services/prompts/title-translate";
import { RegionTranslationCard } from "./components/RegionTranslationCard";
import { getRegionsForPlatform, getRegionInfo, TRANSLATE_LANGUAGES, PROVIDER_NAMES, PLATFORMS, type Platform, type Region } from "../../types";
import { useSettingsStore } from "../../stores/settings";
import { splitLines } from "../../lib/utils";
import { buildLLMConfig } from "../../lib/llm-config";
import { ChevronDown, ChevronRight } from "lucide-react";

type RegionResult = { text: string; loading: boolean };
type BatchResults = Record<string, Record<string, RegionResult>>;

export function TitleTranslatePage() {
  const featureSelection = useSettingsStore(
    (s) => s.featureSelections["title-translate"] || s.defaultSelection || null
  );
  const featureApiKey = useSettingsStore((s) => {
    const sel = s.featureSelections["title-translate"] || s.defaultSelection;
    return sel ? s.apiKeys[sel.provider] || null : null;
  });
  const llmConfig = useMemo(
    () => (featureSelection && featureApiKey
      ? buildLLMConfig(featureSelection.provider, featureApiKey, featureSelection.model)
      : null),
    [featureSelection, featureApiKey]
  );
  const { streamChat } = useLLM();

  const [sourceTitles, setSourceTitles] = useState("");
  const [sourceLang, setSourceLang] = useState("zh-CN");
  const [platform, setPlatform] = useState<Platform>("Shopee");
  const [selectedRegions, setSelectedRegions] = useState<Region[]>(["tw"]);
  const [batchResults, setBatchResults] = useState<BatchResults>({});
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [glossary, setGlossary] = useState("");
  const [customNote, setCustomNote] = useState("");

  const buildCustomRules = useCallback(() => {
    const parts: string[] = [];
    if (glossary.trim()) {
      parts.push(`专有名词/品牌名必须保持原文不可直译：\n${glossary.trim()}`);
    }
    if (customNote.trim()) {
      parts.push(customNote.trim());
    }
    return parts.join("\n");
  }, [glossary, customNote]);

  const availableRegions = getRegionsForPlatform(platform);

  const toggleRegion = (code: Region) => {
    setSelectedRegions((prev) =>
      prev.includes(code) ? prev.filter((r) => r !== code) : [...prev, code]
    );
  };

  const streamToText = async (system: string, user: string) => {
    let fullText = "";
    for await (const chunk of streamChat(system, user, llmConfig!)) {
      if (chunk.content) fullText += chunk.content;
    }
    return fullText;
  };

  const translateTitle = async (title: string, sourceLangName: string, rules?: string): Promise<Record<string, RegionResult>> => {
    const regionResults: Record<string, RegionResult> = {};
    for (const r of selectedRegions) {
      regionResults[r] = { text: "", loading: true };
    }
    // 先设置 loading 状态
    setBatchResults((prev) => ({ ...prev, [title]: { ...regionResults } }));

    for (const regionCode of selectedRegions) {
      const regionInfo = getRegionInfo(regionCode as Region);
      try {
        let result: string;
        if (regionInfo.lang === "th") {
          const { system: s1, user: u1 } = buildTitleEnglishPivotPrompt(title, sourceLangName, rules);
          const englishTitle = await streamToText(s1, u1);
          const { system: s2, user: u2 } = buildEnglishTitleToThaiPrompt(englishTitle, rules);
          result = await streamToText(s2, u2);
        } else {
          const { system, user } = buildTitleTranslatePrompt(
            title, sourceLangName, regionInfo.name, regionInfo.lang, rules
          );
          result = await streamToText(system, user);
        }
        regionResults[regionCode] = { text: result, loading: false };
        setBatchResults((prev) => ({
          ...prev,
          [title]: { ...(prev[title] || {}), [regionCode]: { text: result, loading: false } },
        }));
      } catch (e: any) {
        regionResults[regionCode] = { text: `错误: ${e.message}`, loading: false };
        setBatchResults((prev) => ({
          ...prev,
          [title]: { ...(prev[title] || {}), [regionCode]: { text: `错误: ${e.message}`, loading: false } },
        }));
      }
    }
    return regionResults;
  };

  const handleTranslate = useCallback(async () => {
    if (!sourceTitles.trim() || !llmConfig) return;
    setError(null);
    setBatchResults({});

    const titles = splitLines(sourceTitles);
    if (titles.length === 0) return;

    setBatchProgress({ current: 0, total: titles.length });

    const sourceLangName = TRANSLATE_LANGUAGES.find((l) => l.code === sourceLang)?.name || sourceLang;
    const rules = buildCustomRules() || undefined;

    for (let i = 0; i < titles.length; i++) {
      setBatchProgress({ current: i + 1, total: titles.length });
      await translateTitle(titles[i], sourceLangName, rules);
    }

    setBatchProgress(null);
  }, [sourceTitles, sourceLang, selectedRegions, llmConfig, streamChat, buildCustomRules]);

  const titles = splitLines(sourceTitles);
  const isBatch = titles.length > 1;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">标题翻译</h2>
        <p className="text-sm text-muted-foreground mt-1">
          输入商品标题（每行一个），选择目标市场，生成多地区翻译结果
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
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            商品标题 {titles.length > 0 && <span className="text-muted-foreground">({titles.length} 条)</span>}
          </label>
          <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} className="text-sm border rounded px-2 py-1 bg-background">
            {TRANSLATE_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>
        <textarea
          value={sourceTitles}
          onChange={(e) => setSourceTitles(e.target.value)}
          placeholder="输入商品标题，每行一个..."
          className="w-full h-32 p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
        />
      </div>

      <div className="flex gap-4 items-end">
        <div className="space-y-1">
          <label className="text-sm font-medium">目标平台</label>
          <select
            value={platform}
            onChange={(e) => {
              const p = e.target.value as Platform;
              setPlatform(p);
              const validCodes = getRegionsForPlatform(p).map((r) => r.code);
              setSelectedRegions((prev) => prev.filter((c) => validCodes.includes(c)));
            }}
            className="text-sm border rounded px-2 py-1 bg-background"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">目标地区</label>
        <div className="flex gap-2 mt-2 flex-wrap">
          {availableRegions.map((r) => (
            <button
              key={r.code}
              onClick={() => toggleRegion(r.code)}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                selectedRegions.includes(r.code)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-accent"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {/* 高级选项可折叠面板 */}
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 px-3 py-1.5 w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          高级选项
          {(glossary || customNote) && (
            <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </button>
        {showAdvanced && (
          <div className="px-3 pb-3 space-y-2">
            <div>
              <label className="text-[10px] text-muted-foreground">
                专有名词（每行一个，格式：原文=译文）
              </label>
              <textarea
                value={glossary}
                onChange={(e) => setGlossary(e.target.value)}
                placeholder={"iPhone=iPhone\nNBA=NBA"}
                className="w-full h-12 mt-0.5 border rounded px-2 py-1 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/20 bg-background"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">自定义要求</label>
              <textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="例：语气要活泼、突出价格优势..."
                className="w-full h-12 mt-0.5 border rounded px-2 py-1 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/20 bg-background"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Button onClick={handleTranslate} disabled={!sourceTitles.trim() || !llmConfig || selectedRegions.length === 0}>
          {isBatch ? "批量翻译" : "翻译"}
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
            const titleResults = batchResults[title];
            if (!titleResults) return null;
            return (
              <div key={idx} className="space-y-2">
                {isBatch && (
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                    标题 {idx + 1}: {title}
                  </h3>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedRegions.map((code) => {
                    const region = getRegionInfo(code as Region);
                    const result = titleResults[code];
                    return (
                      <RegionTranslationCard
                        key={code}
                        regionName={region.name}
                        regionCode={code}
                        text={result?.text || ""}
                        isLoading={result?.loading || false}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
