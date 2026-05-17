export type LLMProvider = "deepseek" | "qwen" | "glm4";

export const PROVIDER_NAMES: Record<LLMProvider, string> = {
  deepseek: "DeepSeek",
  qwen: "通义千问",
  glm4: "GLM-4",
};

export interface ProviderSelection {
  provider: LLMProvider;
  model: string;
}

export const MODEL_OPTIONS: Record<LLMProvider, { model: string; label: string }[]> = {
  deepseek: [
    { model: "deepseek-chat", label: "DeepSeek V3" },
    { model: "deepseek-v4-flash", label: "DeepSeek V4 Flash" },
    { model: "deepseek-v4-pro", label: "DeepSeek V4 Pro" },
  ],
  qwen: [
    { model: "qwen-plus", label: "Qwen Plus" },
    { model: "qwen-max", label: "Qwen Max" },
    { model: "qwen-turbo", label: "Qwen Turbo" },
  ],
  glm4: [
    { model: "glm-4-flash", label: "GLM-4 Flash" },
    { model: "glm-4.7-flash", label: "GLM-4.7 Flash" },
    { model: "glm-4-plus", label: "GLM-4 Plus" },
  ],
};

export function getDefaultModel(provider: LLMProvider): string {
  return MODEL_OPTIONS[provider][0].model;
}

export const FEATURE_KEYS = [
  "translate-popup",
  "title-translate",
  "title-optimize",
  "product-analysis",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  "translate-popup": "划词翻译",
  "title-translate": "标题翻译",
  "title-optimize": "标题优化",
  "product-analysis": "选品分析",
};

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
  { code: "ph", name: "菲律宾", lang: "en" },
  { code: "my", name: "马来西亚", lang: "en" },
] as const;

export type Region = (typeof REGIONS)[number]["code"];

export const PLATFORMS = ["Amazon", "Shopee", "Lazada", "TikTok Shop"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_REGIONS: Record<Platform, Region[]> = {
  Amazon: ["us"],
  Shopee: ["tw", "th", "ph", "my"],
  Lazada: ["tw", "th", "ph", "my"],
  "TikTok Shop": ["tw", "th", "ph", "my"],
};

export function getRegionsForPlatform(platform: Platform) {
  return REGIONS.filter((r) => PLATFORM_REGIONS[platform].includes(r.code as Region));
}

const REGION_MAP = Object.fromEntries(REGIONS.map((r) => [r.code, r])) as Record<Region, (typeof REGIONS)[number]>;

export function getRegionInfo(code: Region) {
  return REGION_MAP[code];
}

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
