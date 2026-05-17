import { useState, useCallback, useMemo } from "react";
import { Button } from "../../components/ui/button";
import { useTranslateStore } from "../../stores/translate";
import { useSettingsStore } from "../../stores/settings";
import { useLLM } from "../../hooks/useLLM";
import { buildLLMConfig } from "../../lib/llm-config";
import {
  buildTranslatePrompt,
  buildEnglishPivotPrompt,
  buildEnglishToThaiPrompt,
} from "../../services/prompts/translate";
import { TranslationResult } from "./components/TranslationResult";
import { TRANSLATE_LANGUAGES, PROVIDER_NAMES } from "../../types";
import { ChevronDown, ChevronRight } from "lucide-react";

export function TranslatePopupPage() {
  const {
    sourceText, setSourceText,
    translatedText, setTranslatedText,
    isTranslating, setTranslating,
    error, setError,
  } = useTranslateStore();

  const featureSelection = useSettingsStore(
    (s) => s.featureSelections["translate-popup"] || s.defaultSelection || null
  );
  const featureApiKey = useSettingsStore((s) => {
    const sel = s.featureSelections["translate-popup"] || s.defaultSelection;
    return sel ? s.apiKeys[sel.provider] || null : null;
  });
  const llmConfig = useMemo(
    () => (featureSelection && featureApiKey
      ? buildLLMConfig(featureSelection.provider, featureApiKey, featureSelection.model)
      : null),
    [featureSelection, featureApiKey]
  );

  const { streamChat } = useLLM();
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("zh-CN");
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

  const streamToText = async (system: string, user: string) => {
    let fullText = "";
    for await (const chunk of streamChat(system, user, llmConfig!)) {
      if (chunk.content) fullText += chunk.content;
    }
    return fullText;
  };

  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim() || !llmConfig) return;
    setTranslating(true);
    setError(null);
    setTranslatedText("");

    try {
      const sourceLangLabel = sourceLang === "auto"
        ? "自动检测"
        : TRANSLATE_LANGUAGES.find(l => l.code === sourceLang)?.name || sourceLang;
      const targetLangLabel = TRANSLATE_LANGUAGES.find(l => l.code === targetLang)?.name || targetLang;

      let result: string;

      const rules = buildCustomRules() || undefined;

      if (targetLang === "th") {
        // 泰语：先翻译成英语，再从英语翻译为泰语
        const { system: s1, user: u1 } = buildEnglishPivotPrompt(sourceText, sourceLangLabel, rules);
        const englishText = await streamToText(s1, u1);
        setTranslatedText("");

        const { system: s2, user: u2 } = buildEnglishToThaiPrompt(englishText, rules);
        result = await streamToText(s2, u2);
      } else {
        const { system, user } = buildTranslatePrompt(sourceText, sourceLangLabel, targetLangLabel, rules);
        result = await streamToText(system, user);
      }

      setTranslatedText(result);
    } catch (e: any) {
      setError(e.message || "翻译失败");
    } finally {
      setTranslating(false);
    }
  }, [sourceText, sourceLang, targetLang, llmConfig, streamChat, setTranslating, setError, setTranslatedText, buildCustomRules]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">划词翻译</h2>
        <p className="text-sm text-muted-foreground mt-1">
          输入或粘贴文本，选择目标语言进行翻译
        </p>
        {llmConfig && featureSelection && (
          <p className="text-xs text-muted-foreground mt-1">
            当前模型：{PROVIDER_NAMES[featureSelection.provider]} / {featureSelection.model}
          </p>
        )}
      </div>

      {!llmConfig && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
          请先在「设置」中配置 API Key，才能使用翻译功能
        </div>
      )}

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

      <div className="flex gap-4 items-start">
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">源语言</label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="text-sm border rounded px-2 py-1 bg-background"
            >
              <option value="auto">自动检测</option>
              {TRANSLATE_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="输入或粘贴要翻译的文本..."
            className="w-full h-32 p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
          />
        </div>

        <div className="flex flex-col items-center gap-2 pt-8">
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="text-sm border rounded px-2 py-1 bg-background"
          >
            {TRANSLATE_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
          <Button
            onClick={handleTranslate}
            disabled={!sourceText.trim() || !llmConfig || isTranslating}
          >
            翻译
          </Button>
        </div>

        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium">翻译结果</label>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>
          )}
          <TranslationResult text={translatedText} isLoading={isTranslating} />
        </div>
      </div>
    </div>
  );
}
