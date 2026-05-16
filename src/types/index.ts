export type LLMProvider = "deepseek" | "qwen" | "glm4";

export interface ModelConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  baseURL: string;
}

export interface AppSettings {
  currentModel: ModelConfig | null;
  language: string;
}

export const REGIONS = [
  { code: "us", name: "美国", lang: "en" },
  { code: "cn", name: "中国大陆", lang: "zh-CN" },
  { code: "tw", name: "台湾", lang: "zh-TW" },
  { code: "th", name: "泰国", lang: "th" },
] as const;

export type Region = (typeof REGIONS)[number]["code"];

export const PLATFORMS = ["Amazon", "Shopee", "Lazada", "TikTok Shop"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const TRANSLATE_LANGUAGES = [
  { code: "en", name: "英语" },
  { code: "zh-CN", name: "简体中文" },
  { code: "zh-TW", name: "繁体中文" },
  { code: "th", name: "泰文" },
] as const;

export interface TranslateRequest {
  sourceText: string;
  sourceLang: string;
  targetLangs: string[];
}

export interface TitleOptimizeRequest {
  originalTitle: string;
  region: string;
  platform: string;
}

export interface PricingTemplate {
  id: string;
  name: string;
  region: string;
  platform: string;
  costItems: { name: string; amount: number }[];
  feeRate: number;
  paymentRate: number;
  shippingRules: ShippingRule;
  targetProfitRate: number;
}

export interface ShippingRule {
  baseWeight: number;
  basePrice: number;
  extraPerKg: number;
}

export interface AnalysisReport {
  id: string;
  category: string;
  region: string;
  platform: string;
  trend: string;
  demandScore: number;
  suggestions: string[];
  keywords: string[];
  createdAt: number;
}

export interface UserStyleProfile {
  region: string;
  platform: string;
  customRules: string;
  goodExamples: string[];
  updatedAt: number;
}

export interface TitleRecord {
  id: string;
  original: string;
  region: string;
  platform: string;
  results: string[];
  createdAt: number;
}
