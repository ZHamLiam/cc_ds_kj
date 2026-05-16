import { Button } from "../../../components/ui/button";
import { Copy } from "lucide-react";

interface RegionTranslationCardProps {
  regionName: string;
  regionCode: string;
  text: string;
  isLoading: boolean;
}

export function RegionTranslationCard({ regionName, regionCode, text, isLoading }: RegionTranslationCardProps) {
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">
          {regionName} <span className="text-muted-foreground">({regionCode})</span>
        </h3>
        {text && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigator.clipboard.writeText(text)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground animate-pulse">翻译中...</div>
      ) : text ? (
        <p className="text-sm whitespace-pre-wrap">{text}</p>
      ) : (
        <div className="text-sm text-muted-foreground">等待翻译</div>
      )}
    </div>
  );
}
