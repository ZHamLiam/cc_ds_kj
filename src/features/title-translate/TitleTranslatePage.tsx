import { useState, useCallback } from "react";
import { Button } from "../../components/ui/button";
import { useLLM } from "../../hooks/useLLM";
import { buildTitleTranslatePrompt } from "../../services/prompts/title-translate";
import { RegionTranslationCard } from "./components/RegionTranslationCard";
import { REGIONS, TRANSLATE_LANGUAGES } from "../../types";
import { useTranslateStore } from "../../stores/translate";

export function TitleTranslatePage() {
  const { llmConfig } = useTranslateStore();
  const { streamChat } = useLLM();

  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceLang, setSourceLang] = useState("zh-CN");
  const [selectedRegions, setSelectedRegions] = useState<string[]>(["us"]);
  const [results, setResults] = useState<Record<string, { text: string; loading: boolean }>>({});
  const [error, setError] = useState<string | null>(null);

  const toggleRegion = (code: string) => {
    setSelectedRegions((prev) =>
      prev.includes(code) ? prev.filter((r) => r !== code) : [...prev, code]
    );
  };

  const handleTranslate = useCallback(async () => {
    if (!sourceTitle.trim() || !llmConfig) return;
    setError(null);

    const newResults: Record<string, { text: string; loading: boolean }> = {};
    for (const r of selectedRegions) {
      newResults[r] = { text: "", loading: true };
    }
    setResults(newResults);

    const sourceLangName = TRANSLATE_LANGUAGES.find((l) => l.code === sourceLang)?.name || sourceLang;

    for (const regionCode of selectedRegions) {
      const regionInfo = REGIONS.find((r) => r.code === regionCode)!;
      try {
        const { system, user } = buildTitleTranslatePrompt(
          sourceTitle, sourceLangName, regionInfo.name, regionInfo.lang
        );
        let fullText = "";
        for await (const chunk of streamChat(system, user, llmConfig)) {
          if (chunk.content) {
            fullText += chunk.content;
            setResults((prev) => ({
              ...prev,
              [regionCode]: { text: fullText, loading: false },
            }));
          }
        }
      } catch (e: any) {
        setResults((prev) => ({
          ...prev,
          [regionCode]: { text: `错误: ${e.message}`, loading: false },
        }));
      }
    }
  }, [sourceTitle, sourceLang, selectedRegions, llmConfig, streamChat]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">标题翻译</h2>
        <p className="text-sm text-muted-foreground mt-1">
          输入商品标题，选择目标市场，生成多地区翻译结果
        </p>
      </div>

      {!llmConfig && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
          请先在「设置」中配置 API Key
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">商品标题</label>
          <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} className="text-sm border rounded px-2 py-1 bg-background">
            {TRANSLATE_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>
        <textarea
          value={sourceTitle}
          onChange={(e) => setSourceTitle(e.target.value)}
          placeholder="输入商品原标题..."
          className="w-full h-24 p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
        />
      </div>

      <div>
        <label className="text-sm font-medium">目标地区</label>
        <div className="flex gap-2 mt-2 flex-wrap">
          {REGIONS.map((r) => (
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

      <Button onClick={handleTranslate} disabled={!sourceTitle.trim() || !llmConfig || selectedRegions.length === 0}>
        翻译
      </Button>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {selectedRegions.map((code) => {
          const region = REGIONS.find((r) => r.code === code)!;
          const result = results[code];
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
}
