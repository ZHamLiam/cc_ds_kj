import { useState, useCallback } from "react";
import { Button } from "../../components/ui/button";
import { useLLM } from "../../hooks/useLLM";
import { buildProductAnalysisPrompt } from "../../services/prompts/product-analysis";
import { useTranslateStore } from "../../stores/translate";
import { REGIONS, PLATFORMS } from "../../types";

interface AnalysisResult {
  trend: string;
  demandScore: number;
  suggestions: string[];
  keywords: string[];
}

export function ProductAnalysisPage() {
  const { llmConfig } = useTranslateStore();
  const { streamChat } = useLLM();

  const [category, setCategory] = useState("");
  const [region, setRegion] = useState("us");
  const [platform, setPlatform] = useState("Amazon");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!category.trim() || !llmConfig) return;
    setIsLoading(true);
    setError(null);

    try {
      const { system, user } = buildProductAnalysisPrompt(category, region, platform);
      let fullText = "";
      for await (const chunk of streamChat(system, user, llmConfig)) {
        if (chunk.content) fullText += chunk.content;
      }
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          setResult(JSON.parse(jsonMatch[0]));
        } catch {
          setResult({
            trend: fullText,
            demandScore: 0,
            suggestions: [],
            keywords: [],
          });
        }
      } else {
        setResult({
          trend: fullText,
          demandScore: 0,
          suggestions: [],
          keywords: [],
        });
      }
    } catch (e: any) {
      setError(e.message || "分析失败");
    } finally {
      setIsLoading(false);
    }
  }, [category, region, platform, llmConfig, streamChat]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">选品分析</h2>
        <p className="text-sm text-muted-foreground mt-1">
          输入目标品类，AI 综合分析市场趋势与选品建议
        </p>
      </div>

      {!llmConfig && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
          请先在「设置」中配置 API Key
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">目标品类</label>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="例如：瑜伽服、蓝牙耳机、宠物用品..."
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
        />
      </div>

      <div className="flex gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">目标地区</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)} className="text-sm border rounded px-2 py-1 bg-background">
            {REGIONS.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">目标平台</label>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="text-sm border rounded px-2 py-1 bg-background">
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <Button onClick={handleAnalyze} disabled={!category.trim() || !llmConfig || isLoading}>
        {isLoading ? "分析中..." : "开始分析"}
      </Button>

      {error && <div className="text-sm text-destructive">{error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-sm mb-2">市场趋势</h3>
            <p className="text-sm text-muted-foreground">{result.trend}</p>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-sm mb-2">需求热度</h3>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                {result.demandScore}
                <span className="text-sm text-muted-foreground">/10</span>
              </div>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${result.demandScore * 10}%` }}
                />
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-sm mb-2">选品建议</h3>
            <ul className="list-disc list-inside space-y-1">
              {result.suggestions.map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground">{s}</li>
              ))}
            </ul>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-sm mb-2">推荐关键词</h3>
            <div className="flex gap-1 flex-wrap">
              {result.keywords.map((kw) => (
                <span key={kw} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
