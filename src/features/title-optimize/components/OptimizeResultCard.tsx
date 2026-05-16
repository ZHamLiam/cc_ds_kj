import { Copy } from "lucide-react";
import { Button } from "../../../components/ui/button";

interface OptimizeResult {
  title: string;
  seoScore: number;
  keywords: string[];
  reason: string;
}

interface OptimizeResultCardProps {
  result: OptimizeResult;
  index: number;
}

export function OptimizeResultCard({ result, index }: OptimizeResultCardProps) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">方案 {index + 1}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              result.seoScore >= 7
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            SEO {result.seoScore}/10
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => navigator.clipboard.writeText(result.title)}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="text-sm font-medium">{result.title}</p>
      <div className="flex gap-1 flex-wrap">
        {result.keywords.map((kw) => (
          <span key={kw} className="text-xs bg-muted px-1.5 py-0.5 rounded">
            {kw}
          </span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{result.reason}</p>
    </div>
  );
}
