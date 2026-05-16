import { useState, useCallback } from "react";
import { Button } from "../../components/ui/button";
import { useLLM } from "../../hooks/useLLM";
import { buildTitleOptimizePrompt } from "../../services/prompts/title-optimize";
import { OptimizeResultCard } from "./components/OptimizeResultCard";
import { REGIONS, PLATFORMS } from "../../types";
import { useTranslateStore } from "../../stores/translate";
import { useTitleStore } from "../../stores/title";

export function TitleOptimizePage() {
  const { llmConfig } = useTranslateStore();
  const { streamChat } = useLLM();
  const { getStyleProfile } = useTitleStore();

  const [originalTitle, setOriginalTitle] = useState("");
  const [region, setRegion] = useState("us");
  const [platform, setPlatform] = useState("Amazon");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = useCallback(async () => {
    if (!originalTitle.trim() || !llmConfig) return;
    setIsLoading(true);
    setError(null);

    try {
      const userStyle = getStyleProfile(region, platform);
      const { system, user } = buildTitleOptimizePrompt(
        originalTitle, region, platform, userStyle
      );
      let fullText = "";
      for await (const chunk of streamChat(system, user, llmConfig)) {
        if (chunk.content) fullText += chunk.content;
      }
      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        setResults(JSON.parse(jsonMatch[0]));
      } else {
        setResults([
          { title: fullText, seoScore: 0, keywords: [], reason: "无法解析结构化结果" },
        ]);
      }
    } catch (e: any) {
      setError(e.message || "优化失败");
    } finally {
      setIsLoading(false);
    }
  }, [originalTitle, region, platform, llmConfig, streamChat, getStyleProfile]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">标题优化</h2>
        <p className="text-sm text-muted-foreground mt-1">
          输入商品标题，选择目标市场与平台，生成 SEO 优化方案
        </p>
      </div>

      {!llmConfig && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
          请先在「设置」中配置 API Key
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">原标题</label>
        <textarea
          value={originalTitle}
          onChange={(e) => setOriginalTitle(e.target.value)}
          placeholder="输入要优化的商品标题..."
          className="w-full h-24 p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
        />
      </div>

      <div className="flex gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">目标地区</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="text-sm border rounded px-2 py-1 bg-background"
          >
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">目标平台</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="text-sm border rounded px-2 py-1 bg-background"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <Button onClick={handleOptimize} disabled={!originalTitle.trim() || !llmConfig || isLoading}>
        {isLoading ? "优化中..." : "开始优化"}
      </Button>

      {error && <div className="text-sm text-destructive">{error}</div>}

      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium">优化结果</h3>
          {results.map((r, i) => (
            <OptimizeResultCard key={i} result={r} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
