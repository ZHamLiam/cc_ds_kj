interface PricePreviewProps {
  sellingPrice: number | null;
  profit: number | null;
  profitMargin: number | null;
}

export function PricePreview({ sellingPrice, profit, profitMargin }: PricePreviewProps) {
  if (sellingPrice === null) {
    return (
      <div className="text-sm text-muted-foreground">请在左侧填写成本和费率信息</div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div className="bg-muted/30 p-3 rounded-lg">
        <span className="text-muted-foreground">建议售价</span>
        <p className="text-xl font-bold text-green-600">${sellingPrice.toFixed(2)}</p>
      </div>
      <div className="bg-muted/30 p-3 rounded-lg">
        <span className="text-muted-foreground">单品利润</span>
        <p className="text-xl font-bold text-blue-600">${(profit || 0).toFixed(2)}</p>
      </div>
      <div className="bg-muted/30 p-3 rounded-lg col-span-2">
        <span className="text-muted-foreground">利润率</span>
        <p className="text-lg font-semibold">{((profitMargin || 0) * 100).toFixed(1)}%</p>
      </div>
    </div>
  );
}
