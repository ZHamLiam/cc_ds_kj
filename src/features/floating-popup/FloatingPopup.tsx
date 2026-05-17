import { useState, useEffect, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useLLM } from "../../hooks/useLLM";
import {
  buildTranslatePrompt,
  buildEnglishPivotPrompt,
  buildEnglishToThaiPrompt,
} from "../../services/prompts/translate";
import { buildTitleOptimizePrompt } from "../../services/prompts/title-optimize";
import { buildLLMConfig } from "../../lib/llm-config";
import type { LLMConfig } from "../../services/llm-client";
import type { LLMProvider } from "../../types";
import { TRANSLATE_LANGUAGES } from "../../types";
import { X, Copy, Languages, Wand2, Loader2, Star, ChevronDown, ChevronRight } from "lucide-react";

interface SyncedConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
}

interface PopupPayload {
  text: string;
  config: string;
}

interface OptimizeItem {
  title: string;
  seoScore: number;
  keywords: string[];
  reason: string;
}

function parseConfig(json: string): LLMConfig | null {
  if (!json) return null;
  try {
    const parsed: SyncedConfig = JSON.parse(json);
    if (parsed.provider && parsed.apiKey) {
      return buildLLMConfig(parsed.provider, parsed.apiKey, parsed.model);
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

function tryParseOptimizeResult(raw: string): OptimizeItem[] | null {
  if (!raw) return null;
  try {
    let cleaned = raw.trim();
    // Strip markdown code fences if present
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "");
      cleaned = cleaned.replace(/\n?```\s*$/, "");
      cleaned = cleaned.trim();
    }
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title) {
      return parsed as OptimizeItem[];
    }
  } catch {
    // not valid JSON yet (still streaming) or malformed
  }
  return null;
}

export function FloatingPopup() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"translate" | "optimize" | null>(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(null);
  const [copied, setCopied] = useState(false);
  const [targetLang, setTargetLang] = useState("en");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxLength, setMaxLength] = useState("");
  const [glossary, setGlossary] = useState("");
  const [customNote, setCustomNote] = useState("");
  const { streamChat } = useLLM();

  const buildCustomRules = useCallback(
    (mode: "translate" | "optimize") => {
      const parts: string[] = [];
      if (mode === "translate" && glossary.trim()) {
        parts.push(`专有名词/品牌名必须保持原文不可直译：\n${glossary.trim()}`);
      }
      if (mode === "optimize" && maxLength.trim()) {
        const len = parseInt(maxLength, 10);
        if (!isNaN(len) && len > 0) {
          parts.push(`优化后的标题字数不得超过${len}个字符`);
        }
      }
      if (customNote.trim()) {
        parts.push(customNote.trim());
      }
      return parts.join("\n");
    },
    [glossary, maxLength, customNote],
  );

  useEffect(() => {
    const setup = async () => {
      const unlisten = await listen<PopupPayload>("popup-text", (event) => {
        const t = event.payload.text;
        setText(t);
        setMode(null);
        setResult("");

        // Auto-detect target language: if Chinese text, default to English; otherwise Chinese
        const hasChinese = /[一-鿿]/.test(t);
        setTargetLang(hasChinese ? "en" : "zh-CN");

        const config = parseConfig(event.payload.config);
        if (config) {
          setLlmConfig(config);
        }
      });
      return unlisten;
    };
    const unlistenPromise = setup();
    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, []);

  const streamToText = useCallback(
    async (system: string, user: string) => {
      let full = "";
      for await (const chunk of streamChat(system, user, llmConfig!)) {
        if (chunk.content) {
          full += chunk.content;
        }
      }
      return full;
    },
    [streamChat, llmConfig],
  );

  const handleTranslate = useCallback(async () => {
    if (!text || !llmConfig) return;
    setMode("translate");
    setLoading(true);
    setResult("");

    const hasChinese = /[一-鿿]/.test(text);
    const sourceLangName = hasChinese ? "中文" : "英语";
    const targetInfo = TRANSLATE_LANGUAGES.find((l) => l.code === targetLang);
    const targetLangName = targetInfo?.name || targetLang;
    const rules = buildCustomRules("translate");

    try {
      let full = "";
      if (targetLang === "th") {
        // Two-step pivot: source → English → Thai
        const { system: s1, user: u1 } = buildEnglishPivotPrompt(text, sourceLangName);
        const englishText = await streamToText(s1, u1);
        setResult("...");
        const { system: s2, user: u2 } = buildEnglishToThaiPrompt(englishText);
        for await (const chunk of streamChat(s2, u2, llmConfig)) {
          if (chunk.content) {
            full += chunk.content;
            setResult(full);
          }
        }
      } else {
        const { system, user } = buildTranslatePrompt(text, sourceLangName, targetLangName, rules || undefined);
        for await (const chunk of streamChat(system, user, llmConfig)) {
          if (chunk.content) {
            full += chunk.content;
            setResult(full);
          }
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setResult(`错误: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [text, targetLang, llmConfig, streamChat, streamToText, buildCustomRules]);

  const handleOptimize = useCallback(async () => {
    if (!text || !llmConfig) return;
    setMode("optimize");
    setLoading(true);
    setResult("");

    const hasChinese = /[一-鿿]/.test(text);
    const region = hasChinese ? "美国" : "中国大陆";
    const platform = "Amazon";
    const rules = buildCustomRules("optimize");

    const { system, user } = buildTitleOptimizePrompt(
      text,
      region,
      platform,
      rules ? { region, platform, customRules: rules, goodExamples: [], updatedAt: 0 } : undefined,
    );

    try {
      let full = "";
      for await (const chunk of streamChat(system, user, llmConfig)) {
        if (chunk.content) {
          full += chunk.content;
          setResult(full);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setResult(`错误: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [text, llmConfig, streamChat, buildCustomRules]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail; ignore
    }
  }, [result]);

  const handleClose = useCallback(() => {
    invoke("hide_popup").catch(() => {});
  }, []);

  const optimizeItems = useMemo(() => {
    if (mode !== "optimize") return null;
    return tryParseOptimizeResult(result);
  }, [mode, result]);

  if (!text) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm bg-background rounded-lg">
        等待选中文本...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background rounded-lg shadow-lg border overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2 border-b select-none flex-shrink-0"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <span className="text-xs font-medium text-muted-foreground">跨境电商助手</span>
        <button
          onClick={handleClose}
          className="p-1 rounded hover:bg-accent transition-colors"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-3 py-2 border-b bg-muted/30 flex-shrink-0">
        <p className="text-xs text-muted-foreground line-clamp-3 max-h-14 overflow-y-auto break-words">
          {text}
        </p>
      </div>

      {/* 高级选项可折叠面板 */}
      <div className="border-b flex-shrink-0">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 px-3 py-1.5 w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          高级选项
          {(glossary || maxLength || customNote) && (
            <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </button>
        {showAdvanced && (
          <div className="px-3 pb-2 space-y-2">
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
              <label className="text-[10px] text-muted-foreground">
                标题字数限制（仅优化时生效）
              </label>
              <input
                type="number"
                value={maxLength}
                onChange={(e) => setMaxLength(e.target.value)}
                placeholder="例：80"
                className="w-full mt-0.5 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 bg-background"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">
                自定义要求
              </label>
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

      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0">
        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="text-xs border rounded px-1.5 py-1 bg-background flex-shrink-0"
        >
          {TRANSLATE_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleTranslate}
          disabled={loading || !llmConfig}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {mode === "translate" && loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Languages className="w-3.5 h-3.5" />
          )}
          翻译
        </button>
        <button
          onClick={handleOptimize}
          disabled={loading || !llmConfig}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
        >
          {mode === "optimize" && loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Wand2 className="w-3.5 h-3.5" />
          )}
          优化标题
        </button>
      </div>

      <div className="flex-1 px-3 py-2 overflow-y-auto min-h-0">
        {loading && !result && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            正在生成...
          </div>
        )}
        {result && !optimizeItems && (
          <div className="space-y-2">
            <div className="flex items-center justify-between sticky top-0 bg-background py-1">
              <span className="text-xs font-medium text-muted-foreground">
                {mode === "translate" ? "翻译结果" : "优化方案"}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="w-3 h-3" />
                {copied ? "已复制" : "复制"}
              </button>
            </div>
            <div className="text-sm whitespace-pre-wrap break-words">{result}</div>
          </div>
        )}
        {optimizeItems && (
          <div className="space-y-3">
            <div className="flex items-center justify-between sticky top-0 bg-background py-1">
              <span className="text-xs font-medium text-muted-foreground">
                优化方案 ({optimizeItems.length})
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="w-3 h-3" />
                {copied ? "已复制" : "复制"}
              </button>
            </div>
            {optimizeItems.map((item, i) => (
              <div
                key={i}
                className="border rounded-md p-2.5 space-y-1.5 bg-muted/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium leading-snug flex-1">
                    {item.title}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600 whitespace-nowrap">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    {item.seoScore}
                  </span>
                </div>
                {item.keywords && item.keywords.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {item.keywords.map((kw, ki) => (
                      <span
                        key={ki}
                        className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
                {item.reason && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {item.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        {!loading && !result && !llmConfig && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs text-center px-4">
            请先在主窗口设置中配置 API Key
          </div>
        )}
      </div>
    </div>
  );
}
