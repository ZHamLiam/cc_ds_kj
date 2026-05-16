import { useState, useCallback } from "react";
import { Button } from "../../components/ui/button";
import { useTranslateStore } from "../../stores/translate";
import { useLLM } from "../../hooks/useLLM";
import { buildTranslatePrompt } from "../../services/prompts/translate";
import { TranslationResult } from "./components/TranslationResult";
import { TRANSLATE_LANGUAGES } from "../../types";

export function TranslatePopupPage() {
  const {
    sourceText, setSourceText,
    translatedText, setTranslatedText,
    isTranslating, setTranslating,
    error, setError,
    llmConfig,
  } = useTranslateStore();

  const { streamChat } = useLLM();
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("zh-CN");

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

      const { system, user } = buildTranslatePrompt(sourceText, sourceLangLabel, targetLangLabel);

      let fullText = "";
      for await (const chunk of streamChat(system, user, llmConfig)) {
        if (chunk.content) {
          fullText += chunk.content;
          setTranslatedText(fullText);
        }
      }
    } catch (e: any) {
      setError(e.message || "翻译失败");
    } finally {
      setTranslating(false);
    }
  }, [sourceText, sourceLang, targetLang, llmConfig, streamChat, setTranslating, setError, setTranslatedText]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">划词翻译</h2>
        <p className="text-sm text-muted-foreground mt-1">
          输入或粘贴文本，选择目标语言进行翻译
        </p>
      </div>

      {!llmConfig && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
          请先在「设置」中配置 API Key，才能使用翻译功能
        </div>
      )}

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
