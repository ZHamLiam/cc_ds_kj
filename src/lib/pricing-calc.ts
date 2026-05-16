import type { PricingTemplate, ShippingRule } from "../types";

export function calculateShippingCost(weight: number, rules: ShippingRule): number {
  if (weight <= rules.baseWeight) return rules.basePrice;
  const extraKg = Math.ceil(weight - rules.baseWeight);
  return rules.basePrice + extraKg * rules.extraPerKg;
}

export function calculateSellingPrice(template: PricingTemplate, shippingSubsidy = 0): number {
  const totalCost = template.costItems.reduce((sum, item) => sum + item.amount, 0);
  const denominator = 1 - template.feeRate - template.paymentRate - template.targetProfitRate;
  if (denominator <= 0) throw new Error("费率总和不能超过100%");
  return (totalCost + shippingSubsidy) / denominator;
}

export function calculateProfit(
  sellingPrice: number,
  template: PricingTemplate,
  actualShipping: number
): number {
  const totalCost = template.costItems.reduce((sum, item) => sum + item.amount, 0);
  const fees = sellingPrice * (template.feeRate + template.paymentRate);
  return sellingPrice - totalCost - actualShipping - fees;
}

export const DEFAULT_FEE_RATES: Record<string, { fee: number; payment: number }> = {
  "Amazon-us": { fee: 0.15, payment: 0.029 },
  "Amazon-cn": { fee: 0.15, payment: 0.029 },
  "Shopee-us": { fee: 0.06, payment: 0.02 },
  "Shopee-th": { fee: 0.05, payment: 0.02 },
  "Lazada-th": { fee: 0.04, payment: 0.025 },
  "TikTok Shop-us": { fee: 0.08, payment: 0.029 },
};

export function getDefaultFeeRate(
  platform: string,
  region: string
): { fee: number; payment: number } {
  const key = `${platform}-${region}`;
  return DEFAULT_FEE_RATES[key] || { fee: 0.10, payment: 0.025 };
}
