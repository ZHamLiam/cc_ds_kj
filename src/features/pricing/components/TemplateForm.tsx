import { useState, useMemo } from "react";
import { Button } from "../../../components/ui/button";
import type { PricingTemplate, ShippingRule } from "../../../types";
import {
  calculateSellingPrice,
  calculateProfit,
  calculateShippingCost,
  getDefaultFeeRate,
} from "../../../lib/pricing-calc";
import { PricePreview } from "./PricePreview";
import { REGIONS, PLATFORMS } from "../../../types";

interface TemplateFormProps {
  initial?: PricingTemplate;
  onSave: (template: PricingTemplate) => void;
}

export function TemplateForm({ initial, onSave }: TemplateFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [region, setRegion] = useState(initial?.region || "us");
  const [platform, setPlatform] = useState(initial?.platform || "Amazon");
  const [costItems, setCostItems] = useState(
    initial?.costItems || [{ name: "采购成本", amount: 0 }]
  );
  const [feeRate, setFeeRate] = useState(
    initial?.feeRate || getDefaultFeeRate("Amazon", "us").fee
  );
  const [paymentRate, setPaymentRate] = useState(
    initial?.paymentRate || getDefaultFeeRate("Amazon", "us").payment
  );
  const [targetProfitRate, setTargetProfitRate] = useState(initial?.targetProfitRate || 0.3);
  const [shipping, setShipping] = useState<ShippingRule>(
    initial?.shippingRules || { baseWeight: 1, basePrice: 30, extraPerKg: 15 }
  );
  const [weight, setWeight] = useState(1);
  const [shippingSubsidy, setShippingSubsidy] = useState(0);

  const template: PricingTemplate = useMemo(
    () => ({
      id: initial?.id || crypto.randomUUID(),
      name: name || "未命名模板",
      region,
      platform,
      costItems,
      feeRate,
      paymentRate,
      shippingRules: shipping,
      targetProfitRate,
    }),
    [name, region, platform, costItems, feeRate, paymentRate, shipping, targetProfitRate, initial?.id]
  );

  const sellingPrice = useMemo(() => {
    try { return calculateSellingPrice(template, shippingSubsidy); }
    catch { return 0; }
  }, [template, shippingSubsidy]);

  const shippingCost = useMemo(
    () => calculateShippingCost(weight, shipping),
    [weight, shipping]
  );
  const profit = useMemo(
    () => calculateProfit(sellingPrice, template, shippingCost),
    [sellingPrice, template, shippingCost]
  );
  const profitMargin = useMemo(
    () => (sellingPrice > 0 ? profit / sellingPrice : 0),
    [profit, sellingPrice]
  );

  const addCostItem = () => setCostItems([...costItems, { name: "", amount: 0 }]);
  const updateCostItem = (i: number, field: string, value: string | number) => {
    setCostItems(
      costItems.map((item, idx) =>
        idx === i ? { ...item, [field]: field === "amount" ? Number(value) : value } : item
      )
    );
  };
  const removeCostItem = (i: number) => setCostItems(costItems.filter((_, idx) => idx !== i));

  const handleRegionPlatformChange = (r: string, p: string) => {
    setRegion(r);
    setPlatform(p);
    const defaults = getDefaultFeeRate(p, r);
    setFeeRate(defaults.fee);
    setPaymentRate(defaults.payment);
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="模板名称"
          className="w-full border rounded px-3 py-1.5 text-sm bg-background"
        />
        <div className="flex gap-2">
          <select value={region} onChange={(e) => handleRegionPlatformChange(e.target.value, platform)} className="border rounded px-2 py-1 text-sm flex-1 bg-background">
            {REGIONS.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
          </select>
          <select value={platform} onChange={(e) => handleRegionPlatformChange(region, e.target.value)} className="border rounded px-2 py-1 text-sm flex-1 bg-background">
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">成本明细</label>
            <Button variant="ghost" size="sm" onClick={addCostItem}>+ 添加</Button>
          </div>
          {costItems.map((item, i) => (
            <div key={i} className="flex gap-2 mb-1">
              <input value={item.name} onChange={(e) => updateCostItem(i, "name", e.target.value)} placeholder="费用名称" className="flex-1 border rounded px-2 py-1 text-sm bg-background" />
              <input type="number" value={item.amount} onChange={(e) => updateCostItem(i, "amount", e.target.value)} placeholder="金额" className="w-24 border rounded px-2 py-1 text-sm bg-background" />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCostItem(i)}>×</Button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">手续费率 (%)</label>
            <input type="number" step="0.1" value={(feeRate * 100).toFixed(1)} onChange={(e) => setFeeRate(Number(e.target.value) / 100)} className="w-full border rounded px-2 py-1 text-sm bg-background" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">支付费率 (%)</label>
            <input type="number" step="0.1" value={(paymentRate * 100).toFixed(1)} onChange={(e) => setPaymentRate(Number(e.target.value) / 100)} className="w-full border rounded px-2 py-1 text-sm bg-background" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">目标利润率 (%)</label>
            <input type="number" step="1" value={(targetProfitRate * 100).toFixed(0)} onChange={(e) => setTargetProfitRate(Number(e.target.value) / 100)} className="w-full border rounded px-2 py-1 text-sm bg-background" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">包裹重量 (kg)</label>
            <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm bg-background" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">首重价格</label>
            <input type="number" value={shipping.basePrice} onChange={(e) => setShipping({ ...shipping, basePrice: Number(e.target.value) })} className="w-full border rounded px-2 py-1 text-sm bg-background" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">续重/kg</label>
            <input type="number" value={shipping.extraPerKg} onChange={(e) => setShipping({ ...shipping, extraPerKg: Number(e.target.value) })} className="w-full border rounded px-2 py-1 text-sm bg-background" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">运费补贴</label>
          <input type="number" value={shippingSubsidy} onChange={(e) => setShippingSubsidy(Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm bg-background" />
        </div>
        <Button onClick={() => onSave(template)} className="w-full">保存模板</Button>
      </div>
      <div className="w-72 space-y-3">
        <h3 className="font-medium text-sm">价格预览</h3>
        <PricePreview sellingPrice={sellingPrice} profit={profit} profitMargin={profitMargin} />
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between"><span>运费估算</span><span>${shippingCost.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>总成本</span><span>${costItems.reduce((s, i) => s + i.amount, 0).toFixed(2)}</span></div>
        </div>
      </div>
    </div>
  );
}
