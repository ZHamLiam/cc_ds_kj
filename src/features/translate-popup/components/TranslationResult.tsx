import { Button } from "../../../components/ui/button";
import { Copy } from "lucide-react";

interface TranslationResultProps {
  text: string;
  isLoading: boolean;
}

export function TranslationResult({ text, isLoading }: TranslationResultProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <span className="animate-pulse">翻译中...</span>
      </div>
    );
  }

  if (!text) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        在下方输入文本，点击翻译按钮获取翻译结果
      </div>
    );
  }

  return (
    <div className="relative border rounded-lg p-4 bg-muted/20">
      <p className="pr-8 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7"
        onClick={handleCopy}
        title="复制"
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
