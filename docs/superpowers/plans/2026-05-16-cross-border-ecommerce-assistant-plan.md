# 跨境电商助手 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一款 Tauri 桌面应用，为跨境电商卖家提供标题优化、翻译、选品分析、定价模板和划词翻译功能。

**Architecture:** 分层架构 — React UI 组件 → Hooks → Zustand Store → Service 层 → Tauri invoke → Rust 后端 → LLM API。Rust 后端仅处理存储、剪贴板、窗口管理。每个功能模块独立在 `src/features/` 下。

**Tech Stack:** Tauri 2.x, React 18 + TypeScript, shadcn/ui + Tailwind CSS, Zustand, SQLite (tauri-plugin-sql), OpenAI-compatible LLM API

**设计规格:** `docs/superpowers/specs/2026-05-16-cross-border-ecommerce-assistant-design.md`

---

## 文件结构总览

```
cc_ds_kj/
├── src/                              # React 前端
│   ├── main.tsx                      # 入口
│   ├── App.tsx                       # 根组件（路由）
│   ├── index.css                     # Tailwind 基础样式
│   ├── components/                   
│   │   ├── ui/                       # shadcn/ui 组件
│   │   ├── layout/                   # AppLayout, Sidebar, TitleBar
│   │   └── floating-translate/       # 划词翻译浮窗组件
│   ├── features/                     
│   │   ├── title-optimize/           # 标题优化
│   │   │   ├── TitleOptimizePage.tsx
│   │   │   └── components/
│   │   ├── title-translate/          # 标题翻译
│   │   │   ├── TitleTranslatePage.tsx
│   │   │   └── components/
│   │   ├── translate-popup/          # 划词翻译浮窗页面
│   │   │   ├── TranslatePopupPage.tsx
│   │   │   └── components/
│   │   ├── pricing/                  # 定价模板
│   │   │   ├── PricingPage.tsx
│   │   │   └── components/
│   │   ├── product-analysis/         # 选品分析
│   │   │   ├── ProductAnalysisPage.tsx
│   │   │   └── components/
│   │   └── settings/                 # 设置页
│   │       ├── SettingsPage.tsx
│   │       └── components/
│   ├── services/                     
│   │   ├── llm-client.ts             # 统一 LLM 接口
│   │   ├── providers/                # DeepSeek / Qwen / GLM 适配
│   │   │   ├── openai-compatible.ts
│   │   │   ├── deepseek.ts
│   │   │   ├── qwen.ts
│   │   │   └── glm4.ts
│   │   └── prompts/                  # Prompt 模板
│   │       ├── title-optimize.ts
│   │       ├── title-translate.ts
│   │       └── product-analysis.ts
│   ├── stores/                       # Zustand
│   │   ├── app.ts
│   │   ├── title.ts
│   │   ├── translate.ts
│   │   ├── pricing.ts
│   │   └── settings.ts
│   ├── hooks/                        # 共享 hooks
│   │   ├── useLLM.ts
│   │   ├── useClipboard.ts
│   │   └── useKeyboardShortcut.ts
│   ├── lib/                          # 工具函数
│   │   ├── utils.ts                  # cn() 等
│   │   ├── storage.ts                # 前端存储工具
│   │   └── languages.ts              # 语言列表常量
│   └── types/                        
│       └── index.ts                  # 共享类型定义
├── src-tauri/                        # Rust 后端
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── storage.rs
│   │   │   ├── clipboard.rs
│   │   │   └── window.rs
│   │   └── crypto.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── postcss.config.js
```

---

## Phase 0: 项目脚手架

### Task 0.1: 初始化 Tauri 项目

**Files:**
- Create: 整个项目骨架

- [ ] **Step 1: 使用 Tauri CLI 创建项目**

```bash
npm create tauri-app@latest cc_ds_kj -- --template react-ts --manager npm
```

预期：在 `cc_ds_kj/` 下生成 `src/`, `src-tauri/`, `package.json` 等文件。

注意：可能在 `E:/files/` 下执行，项目名需要与当前目录一致。如果目录已存在，先手动创建脚手架。

- [ ] **Step 2: 进入项目目录安装依赖**

```bash
cd E:/files/cc_ds_kj
npm install
```

- [ ] **Step 3: 验证 Tauri 开发环境**

```bash
npx tauri info
```

检查输出确保所有依赖就绪（Rust、WebView2 等）。

- [ ] **Step 4: 验证项目可编译运行**

```bash
npx tauri dev
```

预期：打开一个 Tauri 窗口，显示默认 React 页面。然后关闭。

- [ ] **Step 5: 安装前端依赖**

```bash
npm install zustand openai-fetch
npm install -D tailwindcss@3 postcss autoprefixer @types/node
npx tailwindcss init -p
```

- [ ] **Step 6: 配置 Tailwind CSS**

修改 `tailwind.config.js`：

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 7: 替换 `src/index.css` 为 Tailwind + CSS 变量**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }
}
```

- [ ] **Step 8: 安装 shadcn/ui 依赖并初始化**

```bash
npm install class-variance-authority clsx tailwind-merge lucide-react
npx shadcn-ui@latest init
```

配置选项：TypeScript: yes, Style: Default, Base color: Neutral, CSS variables: yes（已经配置好）。

- [ ] **Step 9: 验证项目仍可编译**

```bash
npx tauri dev
```

预期：能打开窗口，无编译错误。关闭。

- [ ] **Step 10: 创建共享工具文件 `src/lib/utils.ts`**

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Task 0.2: 创建基础布局和路由

**Files:**
- Create: `src/types/index.ts`
- Create: `src/stores/app.ts`
- Create: `src/components/layout/AppLayout.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建共享类型 `src/types/index.ts`**

```typescript
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
```

- [ ] **Step 2: 创建全局 Zustand store `src/stores/app.ts`**

```typescript
import { create } from "zustand";
import type { LLMProvider } from "../types";

interface AppState {
  sidebarOpen: boolean;
  currentPage: string;
  currentModel: string;
  currentProvider: LLMProvider | null;
  setSidebarOpen: (open: boolean) => void;
  setCurrentPage: (page: string) => void;
  setCurrentModel: (model: string) => void;
  setCurrentProvider: (provider: LLMProvider | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  currentPage: "translate-popup",
  currentModel: "deepseek-chat",
  currentProvider: null,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setCurrentModel: (model) => set({ currentModel: model }),
  setCurrentProvider: (provider) => set({ currentProvider: provider }),
}));
```

- [ ] **Step 3: 创建侧边栏 `src/components/layout/Sidebar.tsx`**

```typescript
import { useAppStore } from "../../stores/app";
import { cn } from "../../lib/utils";

const navItems = [
  { id: "translate-popup", label: "划词翻译", icon: "Languages" },
  { id: "title-translate", label: "标题翻译", icon: "Globe" },
  { id: "title-optimize", label: "标题优化", icon: "Sparkles" },
  { id: "pricing", label: "定价模板", icon: "Calculator" },
  { id: "product-analysis", label: "选品分析", icon: "TrendingUp" },
  { id: "settings", label: "设置", icon: "Settings" },
];

export function Sidebar() {
  const { currentPage, setCurrentPage } = useAppStore();

  return (
    <aside className="w-56 border-r bg-muted/30 h-screen flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold">跨境电商助手</h1>
        <p className="text-xs text-muted-foreground">Cross-Border E-Commerce</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
              currentPage === item.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t text-xs text-muted-foreground">
        v0.1.0
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: 创建布局组件 `src/components/layout/AppLayout.tsx`**

```typescript
import { Sidebar } from "./Sidebar";
import { useAppStore } from "../../stores/app";
import { TranslatePopupPage } from "../../features/translate-popup/TranslatePopupPage";

export function AppLayout() {
  const { currentPage } = useAppStore();

  const renderPage = () => {
    switch (currentPage) {
      case "translate-popup":
        return <TranslatePopupPage />;
      case "title-translate":
        return <div className="p-6">标题翻译（待实现）</div>;
      case "title-optimize":
        return <div className="p-6">标题优化（待实现）</div>;
      case "pricing":
        return <div className="p-6">定价模板（待实现）</div>;
      case "product-analysis":
        return <div className="p-6">选品分析（待实现）</div>;
      case "settings":
        return <div className="p-6">设置（待实现）</div>;
      default:
        return <TranslatePopupPage />;
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">{renderPage()}</main>
    </div>
  );
}
```

- [ ] **Step 5: 替换 `src/App.tsx`**

```typescript
import { AppLayout } from "./components/layout/AppLayout";

function App() {
  return <AppLayout />;
}

export default App;
```

- [ ] **Step 6: 添加 shadcn/ui Button 组件**

```bash
npx shadcn-ui@latest add button
```

- [ ] **Step 7: 验证编译**

```bash
npx tauri dev
```

预期：窗口显示侧边栏导航和占位页面，可点击切换。关闭。

---

## Phase 1: LLM 服务层

### Task 1.1: 实现统一 LLM 客户端

**Files:**
- Create: `src/services/llm-client.ts`
- Create: `src/services/providers/deepseek.ts`
- Create: `src/services/providers/qwen.ts`
- Create: `src/services/providers/glm4.ts`

- [ ] **Step 1: 创建 LLM 客户端类型和统一接口 `src/services/llm-client.ts`**

```typescript
export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
}

export interface LLMConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

export interface LLMClient {
  chat(messages: LLMMessage[], config: LLMConfig): AsyncGenerator<LLMStreamChunk>;
}

export function createOpenAICompatibleClient(): LLMClient {
  return {
    async *chat(messages, config) {
      const response = await fetch(`${config.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`LLM API error ${response.status}: ${err}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            yield { content: "", done: true };
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
            if (content) yield { content, done: false };
          } catch {
            // skip malformed chunks
          }
        }
      }
      yield { content: "", done: true };
    },
  };
}

export const llmClient: LLMClient = createOpenAICompatibleClient();
```

- [ ] **Step 2: 创建 DeepSeek provider `src/services/providers/deepseek.ts`**

```typescript
import type { LLMConfig } from "../llm-client";

export function createDeepSeekConfig(apiKey: string, model = "deepseek-chat"): LLMConfig {
  return {
    apiKey,
    baseURL: "https://api.deepseek.com/v1",
    model,
  };
}
```

- [ ] **Step 3: 创建通义千问 provider `src/services/providers/qwen.ts`**

```typescript
import type { LLMConfig } from "../llm-client";

export function createQwenConfig(apiKey: string, model = "qwen-plus"): LLMConfig {
  return {
    apiKey,
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model,
  };
}
```

- [ ] **Step 4: 创建 GLM-4 provider `src/services/providers/glm4.ts`**

```typescript
import type { LLMConfig } from "../llm-client";

export function createGLM4Config(apiKey: string, model = "glm-4"): LLMConfig {
  return {
    apiKey,
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    model,
  };
}
```

- [ ] **Step 5: 验证编译**

```bash
npx tauri build --debug
```

---

## Phase 2: 划词翻译浮窗（开发第1位）

这是第一个功能模块，用户 Ctrl+C 复制文本 → 快捷键 Alt+T → 弹出浮窗翻译。

### Task 2.1: 创建翻译 store 和 LLM 调用

**Files:**
- Create: `src/stores/translate.ts`
- Create: `src/services/prompts/translate.ts`
- Create: `src/hooks/useLLM.ts`

- [ ] **Step 1: 创建翻译 store `src/stores/translate.ts`**

```typescript
import { create } from "zustand";
import type { LLMConfig } from "../services/llm-client";

interface TranslateState {
  sourceText: string;
  translatedText: string;
  isTranslating: boolean;
  error: string | null;
  llmConfig: LLMConfig | null;
  setSourceText: (text: string) => void;
  setTranslatedText: (text: string) => void;
  setTranslating: (v: boolean) => void;
  setError: (e: string | null) => void;
  setLLMConfig: (c: LLMConfig | null) => void;
}

export const useTranslateStore = create<TranslateState>((set) => ({
  sourceText: "",
  translatedText: "",
  isTranslating: false,
  error: null,
  llmConfig: null,
  setSourceText: (text) => set({ sourceText: text }),
  setTranslatedText: (text) => set({ translatedText: text }),
  setTranslating: (v) => set({ isTranslating: v }),
  setError: (e) => set({ error: e }),
  setLLMConfig: (c) => set({ llmConfig: c }),
}));
```

- [ ] **Step 2: 创建翻译 prompt 模板 `src/services/prompts/translate.ts`**

```typescript
export function buildTranslatePrompt(
  sourceText: string,
  sourceLang: string,
  targetLang: string
): { system: string; user: string } {
  return {
    system: `你是一个专业电商翻译助手。将用户提供的文本从${sourceLang}翻译为${targetLang}。
翻译要求：
1. 翻译结果需符合电商标题规范（简洁、吸引人、包含关键词）
2. 同一个词在同一标题中重复不超过2次
3. 保持原文的营销意图和语气
4. 只输出翻译结果，不要解释`,
    user: sourceText,
  };
}
```

- [ ] **Step 3: 创建 LLM hook `src/hooks/useLLM.ts`**

```typescript
import { useCallback } from "react";
import { llmClient, type LLMConfig, type LLMMessage } from "../services/llm-client";

export function useLLM() {
  const streamChat = useCallback(
    async function* (systemPrompt: string, userMessage: string, config: LLMConfig) {
      const messages: LLMMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ];

      for await (const chunk of llmClient.chat(messages, config)) {
        yield chunk;
      }
    },
    []
  );

  return { streamChat };
}
```

### Task 2.2: 实现划词翻译页面

**Files:**
- Create: `src/components/floating-translate/TranslatePopup.tsx`
- Create: `src/features/translate-popup/TranslatePopupPage.tsx`
- Create: `src/features/translate-popup/components/TranslationResult.tsx`

- [ ] **Step 1: 创建翻译结果展示组件 `src/features/translate-popup/components/TranslationResult.tsx`**

```typescript
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
```

- [ ] **Step 2: 创建划词翻译主页面 `src/features/translate-popup/TranslatePopupPage.tsx`**

```typescript
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
      const { system, user } = buildTranslatePrompt(
        sourceText,
        sourceLang === "auto" ? "自动检测" : TRANSLATE_LANGUAGES.find(l => l.code === sourceLang)?.name || sourceLang,
        TRANSLATE_LANGUAGES.find(l => l.code === targetLang)?.name || targetLang
      );

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

      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">源语言</label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="text-sm border rounded px-2 py-1"
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
            className="w-full h-32 p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-col justify-center gap-2">
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="text-sm border rounded px-2 py-1"
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
```

- [ ] **Step 3: 添加 shadcn 组件**

```bash
npx shadcn-ui@latest add textarea select
```

- [ ] **Step 4: 验证编译**

```bash
npx tauri dev
```

预期：侧边栏可切换到「划词翻译」页面，看到输入框、语言选择和翻译按钮。无 API key 时显示警告。

---

## Phase 3: 标题翻译（开发第2位）

与标题优化共享 LLM 链路。多地区独立生成翻译结果。

### Task 3.1: 创建标题翻译 store 和 prompt

**Files:**
- Create: `src/stores/title.ts`
- Create: `src/services/prompts/title-translate.ts`

- [ ] **Step 1: 创建标题 store `src/stores/title.ts`**

```typescript
import { create } from "zustand";
import type { TitleRecord, UserStyleProfile } from "../types";

interface TitleState {
  titleRecords: TitleRecord[];
  styleProfiles: UserStyleProfile[];
  addTitleRecord: (record: TitleRecord) => void;
  addStyleProfile: (profile: UserStyleProfile) => void;
  updateStyleProfile: (region: string, platform: string, profile: Partial<UserStyleProfile>) => void;
  getStyleProfile: (region: string, platform: string) => UserStyleProfile | undefined;
}

export const useTitleStore = create<TitleState>((set, get) => ({
  titleRecords: [],
  styleProfiles: [],
  addTitleRecord: (record) =>
    set((s) => ({ titleRecords: [record, ...s.titleRecords] })),
  addStyleProfile: (profile) =>
    set((s) => ({ styleProfiles: [...s.styleProfiles, profile] })),
  updateStyleProfile: (region, platform, updates) =>
    set((s) => ({
      styleProfiles: s.styleProfiles.map((p) =>
        p.region === region && p.platform === platform ? { ...p, ...updates, updatedAt: Date.now() } : p
      ),
    })),
  getStyleProfile: (region, platform) =>
    get().styleProfiles.find((p) => p.region === region && p.platform === platform),
}));
```

- [ ] **Step 2: 创建标题翻译 prompt `src/services/prompts/title-translate.ts`**

```typescript
export function buildTitleTranslatePrompt(
  sourceTitle: string,
  sourceLang: string,
  targetRegion: string,
  targetLang: string
): { system: string; user: string } {
  return {
    system: `你是一个专业的跨境电商标题翻译助手。将商品标题从${sourceLang}翻译为${targetLang}（${targetRegion}市场）。

翻译规范：
1. 符合${targetRegion}地区电商平台的标题风格
2. 包含当地用户常用的搜索关键词
3. 同一个词重复不超过2次
4. 标题长度控制在合理范围内（根据不同平台要求）
5. 保持原意的同时突出卖点
6. 只输出翻译结果，不要解释`,
    user: sourceTitle,
  };
}
```

### Task 3.2: 创建标题翻译页面

**Files:**
- Create: `src/features/title-translate/TitleTranslatePage.tsx`
- Create: `src/features/title-translate/components/RegionTranslationCard.tsx`

- [ ] **Step 1: 创建地区翻译卡片 `src/features/title-translate/components/RegionTranslationCard.tsx`**

```typescript
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
        <h3 className="font-medium text-sm">{regionName} <span className="text-muted-foreground">({regionCode})</span></h3>
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
```

- [ ] **Step 2: 创建标题翻译页面 `src/features/title-translate/TitleTranslatePage.tsx`**

```typescript
import { useState, useCallback } from "react";
import { Button } from "../../components/ui/button";
import { useLLM } from "../../hooks/useLLM";
import { buildTitleTranslatePrompt } from "../../services/prompts/title-translate";
import { RegionTranslationCard } from "./components/RegionTranslationCard";
import { REGIONS, TRANSLATE_LANGUAGES } from "../../types";
import { useTranslateStore } from "../../stores/translate";

export function TitleTranslatePage() {
  const { llmConfig } = useTranslateStore();
  const { streamChat } = useLLM();

  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceLang, setSourceLang] = useState("zh-CN");
  const [selectedRegions, setSelectedRegions] = useState<string[]>(["us"]);
  const [results, setResults] = useState<Record<string, { text: string; loading: boolean }>>({});
  const [error, setError] = useState<string | null>(null);

  const toggleRegion = (code: string) => {
    setSelectedRegions((prev) =>
      prev.includes(code) ? prev.filter((r) => r !== code) : [...prev, code]
    );
  };

  const handleTranslate = useCallback(async () => {
    if (!sourceTitle.trim() || !llmConfig) return;
    setError(null);

    const newResults: Record<string, { text: string; loading: boolean }> = {};
    for (const r of selectedRegions) {
      newResults[r] = { text: "", loading: true };
    }
    setResults(newResults);

    const region = REGIONS.find((r) => r.code === selectedRegions[0])!;
    const sourceLangName = TRANSLATE_LANGUAGES.find((l) => l.code === sourceLang)?.name || sourceLang;

    for (const regionCode of selectedRegions) {
      const regionInfo = REGIONS.find((r) => r.code === regionCode)!;
      try {
        const { system, user } = buildTitleTranslatePrompt(
          sourceTitle, sourceLangName, regionInfo.name, regionInfo.lang
        );
        let fullText = "";
        for await (const chunk of streamChat(system, user, llmConfig)) {
          if (chunk.content) {
            fullText += chunk.content;
            setResults((prev) => ({
              ...prev,
              [regionCode]: { text: fullText, loading: false },
            }));
          }
        }
      } catch (e: any) {
        setResults((prev) => ({
          ...prev,
          [regionCode]: { text: `错误: ${e.message}`, loading: false },
        }));
      }
    }
  }, [sourceTitle, sourceLang, selectedRegions, llmConfig, streamChat]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">标题翻译</h2>
        <p className="text-sm text-muted-foreground mt-1">
          输入商品标题，选择目标市场，生成多地区翻译结果
        </p>
      </div>

      {!llmConfig && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
          请先在「设置」中配置 API Key
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">商品标题</label>
          <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} className="text-sm border rounded px-2 py-1">
            {TRANSLATE_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>
        <textarea
          value={sourceTitle}
          onChange={(e) => setSourceTitle(e.target.value)}
          placeholder="输入商品原标题..."
          className="w-full h-24 p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <label className="text-sm font-medium">目标地区</label>
        <div className="flex gap-2 mt-2 flex-wrap">
          {REGIONS.map((r) => (
            <button
              key={r.code}
              onClick={() => toggleRegion(r.code)}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                selectedRegions.includes(r.code)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-accent"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleTranslate} disabled={!sourceTitle.trim() || !llmConfig || selectedRegions.length === 0}>
        翻译
      </Button>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {selectedRegions.map((code) => {
          const region = REGIONS.find((r) => r.code === code)!;
          const result = results[code];
          return (
            <RegionTranslationCard
              key={code}
              regionName={region.name}
              regionCode={code}
              text={result?.text || ""}
              isLoading={result?.loading || false}
            />
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 更新 AppLayout 加入标题翻译页面**

修改 `src/components/layout/AppLayout.tsx`，在导入和 switch 中添加：

```typescript
import { TitleTranslatePage } from "../../features/title-translate/TitleTranslatePage";

// 在 switch 的 case "title-translate" 中：
case "title-translate":
  return <TitleTranslatePage />;
```

- [ ] **Step 4: 验证编译**

```bash
npx tauri dev
```

预期：可切换到「标题翻译」页面，输入标题，选择地区，点击翻译。

---

## Phase 4: 标题优化（开发第2位，共享 LLM 链路）

### Task 4.1: 创建标题优化 prompt

**Files:**
- Create: `src/services/prompts/title-optimize.ts`

- [ ] **Step 1: 创建标题优化 prompt**

```typescript
import type { UserStyleProfile } from "../../types";

export function buildTitleOptimizePrompt(
  originalTitle: string,
  region: string,
  platform: string,
  userStyle?: UserStyleProfile
): { system: string; user: string } {
  let customRulesSection = "";
  let examplesSection = "";

  if (userStyle?.customRules) {
    customRulesSection = `\n\n用户自定义规则：\n${userStyle.customRules}`;
  }

  if (userStyle?.goodExamples && userStyle.goodExamples.length > 0) {
    examplesSection = `\n\n用户认为好的标题示例：\n${userStyle.goodExamples.map((e, i) => `${i + 1}. ${e}`).join("\n")}`;
  }

  return {
    system: `你是一个专业的跨境电商标题优化专家。针对${region}市场${platform}平台，优化用户提供的商品标题。

优化要求：
1. 生成3个优化方案，按SEO效果排序
2. 每个方案标注SEO得分（1-10分）
3. 考虑${region}地区用户的搜索习惯和偏好关键词
4. 标题要包含核心关键词、属性词、场景词
5. 符合${platform}平台的标题规范和长度限制
6. 同一个词重复不超过2次
7. 格式输出为 JSON 数组：[{"title": "...", "seoScore": 8, "keywords": ["..."], "reason": "优化理由"}]${customRulesSection}${examplesSection}`,
    user: `请优化以下商品标题：\n${originalTitle}`,
  };
}
```

### Task 4.2: 创建标题优化页面

**Files:**
- Create: `src/features/title-optimize/TitleOptimizePage.tsx`
- Create: `src/features/title-optimize/components/OptimizeResultCard.tsx`

- [ ] **Step 1: 创建优化结果卡片 `src/features/title-optimize/components/OptimizeResultCard.tsx`**

```typescript
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
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            result.seoScore >= 7 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}>
            SEO {result.seoScore}/10
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigator.clipboard.writeText(result.title)}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="text-sm font-medium">{result.title}</p>
      <div className="flex gap-1 flex-wrap">
        {result.keywords.map((kw) => (
          <span key={kw} className="text-xs bg-muted px-1.5 py-0.5 rounded">{kw}</span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{result.reason}</p>
    </div>
  );
}
```

- [ ] **Step 2: 创建标题优化页面 `src/features/title-optimize/TitleOptimizePage.tsx`**

```typescript
import { useState, useCallback } from "react";
import { Button } from "../../components/ui/button";
import { useLLM } from "../../hooks/useLLM";
import { buildTitleOptimizePrompt } from "../../services/prompts/title-optimize";
import { OptimizeResultCard } from "./components/OptimizeResultCard";
import { REGIONS, PLATFORMS } from "../../types";
import { useTranslateStore } from "../../stores/translate";
import { useTitleStore } from "../../stores/title";

export function TitleOptimizePage() {
  const { llmConfig } = useTranslateStore();
  const { streamChat } = useLLM();
  const { getStyleProfile } = useTitleStore();

  const [originalTitle, setOriginalTitle] = useState("");
  const [region, setRegion] = useState("us");
  const [platform, setPlatform] = useState("Amazon");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState("");

  const handleOptimize = useCallback(async () => {
    if (!originalTitle.trim() || !llmConfig) return;
    setIsLoading(true);
    setError(null);
    setRawResponse("");

    try {
      const userStyle = getStyleProfile(region, platform);
      const { system, user } = buildTitleOptimizePrompt(originalTitle, region, platform, userStyle);
      let fullText = "";
      for await (const chunk of streamChat(system, user, llmConfig)) {
        if (chunk.content) {
          fullText += chunk.content;
          setRawResponse(fullText);
        }
      }
      // 尝试解析 JSON
      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        setResults(JSON.parse(jsonMatch[0]));
      } else {
        setResults([{ title: fullText, seoScore: 0, keywords: [], reason: "无法解析结构化结果" }]);
      }
    } catch (e: any) {
      setError(e.message || "优化失败");
    } finally {
      setIsLoading(false);
    }
  }, [originalTitle, region, platform, llmConfig, streamChat, getStyleProfile]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">标题优化</h2>
        <p className="text-sm text-muted-foreground mt-1">
          输入商品标题，选择目标市场与平台，生成 SEO 优化方案
        </p>
      </div>

      {!llmConfig && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
          请先在「设置」中配置 API Key
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">原标题</label>
        <textarea
          value={originalTitle}
          onChange={(e) => setOriginalTitle(e.target.value)}
          placeholder="输入要优化的商品标题..."
          className="w-full h-24 p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">目标地区</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)} className="text-sm border rounded px-2 py-1">
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">目标平台</label>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="text-sm border rounded px-2 py-1">
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <Button onClick={handleOptimize} disabled={!originalTitle.trim() || !llmConfig || isLoading}>
        {isLoading ? "优化中..." : "开始优化"}
      </Button>

      {error && <div className="text-sm text-destructive">{error}</div>}

      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium">优化结果</h3>
          {results.map((r, i) => (
            <OptimizeResultCard key={i} result={r} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 更新 AppLayout 加入标题优化页面**

修改 `src/components/layout/AppLayout.tsx`：

```typescript
import { TitleOptimizePage } from "../../features/title-optimize/TitleOptimizePage";

// case "title-optimize":
case "title-optimize":
  return <TitleOptimizePage />;
```

- [ ] **Step 4: 验证编译**

```bash
npx tauri dev
```

---

## Phase 5: 定价模板（开发第3位，纯计算，无 LLM 依赖）

### Task 5.1: 创建定价 store 和计算逻辑

**Files:**
- Create: `src/stores/pricing.ts`
- Create: `src/lib/pricing-calc.ts`

- [ ] **Step 1: 创建定价计算逻辑 `src/lib/pricing-calc.ts`**

```typescript
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

export function calculateProfit(sellingPrice: number, template: PricingTemplate, actualShipping: number): number {
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

export function getDefaultFeeRate(platform: string, region: string): { fee: number; payment: number } {
  const key = `${platform}-${region}`;
  return DEFAULT_FEE_RATES[key] || { fee: 0.10, payment: 0.025 };
}
```

- [ ] **Step 2: 创建定价 store `src/stores/pricing.ts`**

```typescript
import { create } from "zustand";
import type { PricingTemplate } from "../types";

interface PricingState {
  templates: PricingTemplate[];
  currentTemplateId: string | null;
  addTemplate: (t: PricingTemplate) => void;
  updateTemplate: (id: string, updates: Partial<PricingTemplate>) => void;
  deleteTemplate: (id: string) => void;
  setCurrentTemplateId: (id: string | null) => void;
  getCurrentTemplate: () => PricingTemplate | undefined;
}

export const usePricingStore = create<PricingState>((set, get) => ({
  templates: [],
  currentTemplateId: null,
  addTemplate: (t) => set((s) => ({ templates: [...s.templates, t], currentTemplateId: t.id })),
  updateTemplate: (id, updates) =>
    set((s) => ({
      templates: s.templates.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  deleteTemplate: (id) =>
    set((s) => ({
      templates: s.templates.filter((t) => t.id !== id),
      currentTemplateId: s.currentTemplateId === id ? null : s.currentTemplateId,
    })),
  setCurrentTemplateId: (id) => set({ currentTemplateId: id }),
  getCurrentTemplate: () => {
    const { templates, currentTemplateId } = get();
    return templates.find((t) => t.id === currentTemplateId);
  },
}));
```

### Task 5.2: 创建定价模板页面

**Files:**
- Create: `src/features/pricing/PricingPage.tsx`
- Create: `src/features/pricing/components/TemplateForm.tsx`
- Create: `src/features/pricing/components/PricePreview.tsx`

- [ ] **Step 1: 创建定价预览组件 `src/features/pricing/components/PricePreview.tsx`**

```typescript
interface PricePreviewProps {
  sellingPrice: number | null;
  profit: number | null;
  profitMargin: number | null;
}

export function PricePreview({ sellingPrice, profit, profitMargin }: PricePreviewProps) {
  if (sellingPrice === null) {
    return <div className="text-sm text-muted-foreground">请在左侧填写成本和费率信息</div>;
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
```

- [ ] **Step 2: 创建定价模板表单 `src/features/pricing/components/TemplateForm.tsx`**

```typescript
import { useState, useMemo } from "react";
import { Button } from "../../../components/ui/button";
import type { PricingTemplate, ShippingRule } from "../../../types";
import { calculateSellingPrice, calculateProfit, calculateShippingCost, getDefaultFeeRate } from "../../../lib/pricing-calc";
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
  const [costItems, setCostItems] = useState(initial?.costItems || [{ name: "采购成本", amount: 0 }]);
  const [feeRate, setFeeRate] = useState(initial?.feeRate || getDefaultFeeRate("Amazon", "us").fee);
  const [paymentRate, setPaymentRate] = useState(initial?.paymentRate || getDefaultFeeRate("Amazon", "us").payment);
  const [targetProfitRate, setTargetProfitRate] = useState(initial?.targetProfitRate || 0.30);
  const [shipping, setShipping] = useState<ShippingRule>(initial?.shippingRules || { baseWeight: 1, basePrice: 30, extraPerKg: 15 });
  const [weight, setWeight] = useState(1);
  const [shippingSubsidy, setShippingSubsidy] = useState(0);

  const template: PricingTemplate = useMemo(() => ({
    id: initial?.id || crypto.randomUUID(),
    name: name || "未命名模板",
    region, platform,
    costItems,
    feeRate, paymentRate,
    shippingRules: shipping,
    targetProfitRate,
  }), [name, region, platform, costItems, feeRate, paymentRate, shipping, targetProfitRate, initial?.id]);

  const sellingPrice = useMemo(() => {
    try { return calculateSellingPrice(template, shippingSubsidy); }
    catch { return 0; }
  }, [template, shippingSubsidy]);

  const shippingCost = useMemo(() => calculateShippingCost(weight, shipping), [weight, shipping]);
  const profit = useMemo(() => calculateProfit(sellingPrice, template, shippingCost), [sellingPrice, template, shippingCost]);
  const profitMargin = useMemo(() => sellingPrice > 0 ? profit / sellingPrice : 0, [profit, sellingPrice]);

  const addCostItem = () => setCostItems([...costItems, { name: "", amount: 0 }]);
  const updateCostItem = (i: number, field: string, value: string | number) => {
    setCostItems(costItems.map((item, idx) => idx === i ? { ...item, [field]: field === "amount" ? Number(value) : value } : item));
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
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="模板名称" className="flex-1 border rounded px-3 py-1.5 text-sm" />
        </div>

        <div className="flex gap-2">
          <select value={region} onChange={(e) => handleRegionPlatformChange(e.target.value, platform)} className="border rounded px-2 py-1 text-sm flex-1">
            {REGIONS.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
          </select>
          <select value={platform} onChange={(e) => handleRegionPlatformChange(region, e.target.value)} className="border rounded px-2 py-1 text-sm flex-1">
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
              <input value={item.name} onChange={(e) => updateCostItem(i, "name", e.target.value)} placeholder="费用名称" className="flex-1 border rounded px-2 py-1 text-sm" />
              <input type="number" value={item.amount} onChange={(e) => updateCostItem(i, "amount", e.target.value)} placeholder="金额" className="w-24 border rounded px-2 py-1 text-sm" />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCostItem(i)}>×</Button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">手续费率 (%)</label>
            <input type="number" step="0.1" value={(feeRate * 100).toFixed(1)} onChange={(e) => setFeeRate(Number(e.target.value) / 100)} className="w-full border rounded px-2 py-1 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">支付费率 (%)</label>
            <input type="number" step="0.1" value={(paymentRate * 100).toFixed(1)} onChange={(e) => setPaymentRate(Number(e.target.value) / 100)} className="w-full border rounded px-2 py-1 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">目标利润率 (%)</label>
            <input type="number" step="1" value={(targetProfitRate * 100).toFixed(0)} onChange={(e) => setTargetProfitRate(Number(e.target.value) / 100)} className="w-full border rounded px-2 py-1 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">包裹重量 (kg)</label>
            <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">首重价格</label>
            <input type="number" value={shipping.basePrice} onChange={(e) => setShipping({ ...shipping, basePrice: Number(e.target.value) })} className="w-full border rounded px-2 py-1 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">续重/kg</label>
            <input type="number" value={shipping.extraPerKg} onChange={(e) => setShipping({ ...shipping, extraPerKg: Number(e.target.value) })} className="w-full border rounded px-2 py-1 text-sm" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">运费补贴</label>
          <input type="number" value={shippingSubsidy} onChange={(e) => setShippingSubsidy(Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm" />
        </div>

        <Button onClick={() => onSave(template)} className="w-full">保存模板</Button>
      </div>

      <div className="w-72 space-y-3">
        <h3 className="font-medium text-sm">价格预览</h3>
        <PricePreview sellingPrice={sellingPrice} profit={profit} profitMargin={profitMargin} />
        <div className="text-xs text-muted-foreground">
          <div className="flex justify-between"><span>运费估算</span><span>${shippingCost.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>总成本</span><span>${costItems.reduce((s, i) => s + i.amount, 0).toFixed(2)}</span></div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建定价模板页面 `src/features/pricing/PricingPage.tsx`**

```typescript
import { useState } from "react";
import { usePricingStore } from "../../stores/pricing";
import { TemplateForm } from "./components/TemplateForm";
import type { PricingTemplate } from "../../types";
import { Button } from "../../components/ui/button";

export function PricingPage() {
  const { templates, currentTemplateId, addTemplate, setCurrentTemplateId, deleteTemplate } = usePricingStore();
  const [showForm, setShowForm] = useState(false);

  const currentTemplate = templates.find((t) => t.id === currentTemplateId);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">定价模板</h2>
          <p className="text-sm text-muted-foreground mt-1">管理定价模板，自动计算建议售价和利润</p>
        </div>
        <Button onClick={() => setShowForm(true)}>新建模板</Button>
      </div>

      {templates.length === 0 && !showForm && (
        <div className="text-center py-12 text-muted-foreground">
          <p>还没有定价模板</p>
          <Button variant="outline" className="mt-2" onClick={() => setShowForm(true)}>创建第一个模板</Button>
        </div>
      )}

      {showForm && (
        <div className="border rounded-lg p-6">
          <TemplateForm
            initial={currentTemplate}
            onSave={(t) => { addTemplate(t); setShowForm(false); }}
          />
          <Button variant="ghost" className="mt-2" onClick={() => setShowForm(false)}>取消</Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map((t) => (
          <div
            key={t.id}
            className={`border rounded-lg p-4 cursor-pointer transition-colors hover:bg-accent ${
              currentTemplateId === t.id ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => { setCurrentTemplateId(t.id); setShowForm(true); }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">{t.name}</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}
              >×</Button>
            </div>
            <p className="text-xs text-muted-foreground">{t.platform} · {t.region}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 更新 AppLayout 加入定价页面**

```typescript
import { PricingPage } from "../../features/pricing/PricingPage";

case "pricing":
  return <PricingPage />;
```

- [ ] **Step 5: 验证编译**

```bash
npx tauri dev
```

---

## Phase 6: 选品分析（开发第4位，LLM + WebSearch）

### Task 6.1: 创建选品分析 prompt 和页面

**Files:**
- Create: `src/services/prompts/product-analysis.ts`
- Create: `src/stores/analysis.ts`
- Create: `src/features/product-analysis/ProductAnalysisPage.tsx`

- [ ] **Step 1: 创建选品分析 prompt `src/services/prompts/product-analysis.ts`**

```typescript
export function buildProductAnalysisPrompt(
  category: string,
  region: string,
  platform: string
): { system: string; user: string } {
  return {
    system: `你是一个专业的跨境电商选品分析师。基于你的训练数据，对以下条件进行选品分析。

分析要求：
1. 市场趋势：该品类在${region}市场${platform}平台的当前趋势和竞争格局
2. 需求热度：用1-10评分，说明理由
3. 选品建议：3-5个具体的产品方向建议
4. 推荐关键词：5-10个高价值搜索关键词

输出JSON格式：
{
  "trend": "市场趋势分析...",
  "demandScore": 8,
  "suggestions": ["建议1", "建议2", "建议3"],
  "keywords": ["关键词1", "关键词2"]
}`,
    user: `请分析以下选品条件：\n品类：${category}\n目标市场：${region}\n平台：${platform}`,
  };
}
```

- [ ] **Step 2: 创建选品分析页面 `src/features/product-analysis/ProductAnalysisPage.tsx`**

```typescript
import { useState, useCallback } from "react";
import { Button } from "../../components/ui/button";
import { useLLM } from "../../hooks/useLLM";
import { buildProductAnalysisPrompt } from "../../services/prompts/product-analysis";
import { useTranslateStore } from "../../stores/translate";
import { REGIONS, PLATFORMS } from "../../types";

interface AnalysisResult {
  trend: string;
  demandScore: number;
  suggestions: string[];
  keywords: string[];
}

export function ProductAnalysisPage() {
  const { llmConfig } = useTranslateStore();
  const { streamChat } = useLLM();

  const [category, setCategory] = useState("");
  const [region, setRegion] = useState("us");
  const [platform, setPlatform] = useState("Amazon");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!category.trim() || !llmConfig) return;
    setIsLoading(true);
    setError(null);

    try {
      const { system, user } = buildProductAnalysisPrompt(category, region, platform);
      let fullText = "";
      for await (const chunk of streamChat(system, user, llmConfig)) {
        if (chunk.content) fullText += chunk.content;
      }
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        setResult(JSON.parse(jsonMatch[0]));
      } else {
        setResult({ trend: fullText, demandScore: 0, suggestions: [], keywords: [] });
      }
    } catch (e: any) {
      setError(e.message || "分析失败");
    } finally {
      setIsLoading(false);
    }
  }, [category, region, platform, llmConfig, streamChat]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">选品分析</h2>
        <p className="text-sm text-muted-foreground mt-1">
          输入目标品类，AI 综合分析市场趋势与选品建议
        </p>
      </div>

      {!llmConfig && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
          请先在「设置」中配置 API Key
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">目标品类</label>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="例如：瑜伽服、蓝牙耳机、宠物用品..."
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">目标地区</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)} className="text-sm border rounded px-2 py-1">
            {REGIONS.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">目标平台</label>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="text-sm border rounded px-2 py-1">
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <Button onClick={handleAnalyze} disabled={!category.trim() || !llmConfig || isLoading}>
        {isLoading ? "分析中..." : "开始分析"}
      </Button>

      {error && <div className="text-sm text-destructive">{error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-sm mb-2">市场趋势</h3>
            <p className="text-sm text-muted-foreground">{result.trend}</p>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-sm mb-2">需求热度</h3>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{result.demandScore}<span className="text-sm text-muted-foreground">/10</span></div>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${result.demandScore * 10}%` }} />
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-sm mb-2">选品建议</h3>
            <ul className="list-disc list-inside space-y-1">
              {result.suggestions.map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground">{s}</li>
              ))}
            </ul>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-sm mb-2">推荐关键词</h3>
            <div className="flex gap-1 flex-wrap">
              {result.keywords.map((kw) => (
                <span key={kw} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{kw}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 更新 AppLayout 加入选品分析页面**

```typescript
import { ProductAnalysisPage } from "../../features/product-analysis/ProductAnalysisPage";

case "product-analysis":
  return <ProductAnalysisPage />;
```

- [ ] **Step 4: 验证编译**

```bash
npx tauri dev
```

---

## Phase 7: 设置页面（API Key 管理）

### Task 7.1: 创建设置页面和 store

**Files:**
- Create: `src/stores/settings.ts`
- Create: `src/features/settings/SettingsPage.tsx`

- [ ] **Step 1: 创建设置 store `src/stores/settings.ts`**

```typescript
import { create } from "zustand";
import type { LLMProvider } from "../types";

interface SettingsState {
  apiKeys: Record<string, string>;
  setApiKey: (provider: LLMProvider, key: string) => void;
  getApiKey: (provider: LLMProvider) => string;
  clearAllKeys: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiKeys: {},
  setApiKey: (provider, key) =>
    set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: key } })),
  getApiKey: (provider) => get().apiKeys[provider] || "",
  clearAllKeys: () => set({ apiKeys: {} }),
}));
```

- [ ] **Step 2: 创建设置页面 `src/features/settings/SettingsPage.tsx`**

```typescript
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { useSettingsStore } from "../../stores/settings";
import { useTranslateStore } from "../../stores/translate";
import { useAppStore } from "../../stores/app";
import type { LLMProvider } from "../../types";
import { createDeepSeekConfig } from "../../services/providers/deepseek";
import { createQwenConfig } from "../../services/providers/qwen";
import { createGLM4Config } from "../../services/providers/glm4";

const PROVIDERS: { id: LLMProvider; name: string; description: string }[] = [
  { id: "deepseek", name: "DeepSeek", description: "OpenAI 兼容接口，自定义 baseURL" },
  { id: "qwen", name: "通义千问", description: "阿里 DashScope API" },
  { id: "glm4", name: "GLM-4", description: "智谱 API" },
];

export function SettingsPage() {
  const { apiKeys, setApiKey, clearAllKeys } = useSettingsStore();
  const { setLLMConfig } = useTranslateStore();
  const { setCurrentProvider, setCurrentModel } = useAppStore();
  const [activeProvider, setActiveProvider] = useState<LLMProvider>("deepseek");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  const toggleShowKey = (p: string) => setShowKeys((s) => ({ ...s, [p]: !s[p] }));

  const handleSave = (provider: LLMProvider, key: string) => {
    setApiKey(provider, key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleActivate = (provider: LLMProvider) => {
    const key = apiKeys[provider];
    if (!key) return;

    let config;
    switch (provider) {
      case "deepseek":
        config = createDeepSeekConfig(key);
        break;
      case "qwen":
        config = createQwenConfig(key);
        break;
      case "glm4":
        config = createGLM4Config(key);
        break;
      default:
        return;
    }

    setLLMConfig(config);
    setCurrentProvider(provider);
    setCurrentModel(config.model);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">设置</h2>
        <p className="text-sm text-muted-foreground mt-1">管理 API Key 和模型配置</p>
      </div>

      <div className="space-y-4">
        {PROVIDERS.map((prov) => (
          <div key={prov.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{prov.name}</h3>
                <p className="text-xs text-muted-foreground">{prov.description}</p>
              </div>
              <Button
                variant={activeProvider === prov.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveProvider(prov.id)}
              >
                {activeProvider === prov.id ? "当前" : "选择"}
              </Button>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showKeys[prov.id] ? "text" : "password"}
                  placeholder="输入 API Key..."
                  value={apiKeys[prov.id] || ""}
                  onChange={(e) => handleSave(prov.id, e.target.value)}
                  className="w-full border rounded px-3 py-1.5 text-sm pr-10"
                />
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                  onClick={() => toggleShowKey(prov.id)}
                >
                  {showKeys[prov.id] ? "隐藏" : "显示"}
                </button>
              </div>
              <Button
                size="sm"
                disabled={!apiKeys[prov.id]}
                onClick={() => handleActivate(prov.id)}
              >
                启用
              </Button>
            </div>
          </div>
        ))}
      </div>

      {saved && (
        <div className="text-sm text-green-600">API Key 已保存</div>
      )}

      <div className="pt-4 border-t">
        <Button variant="outline" onClick={clearAllKeys} className="text-destructive">
          清除所有 Key
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 更新 AppLayout 加入设置页面**

```typescript
import { SettingsPage } from "../../features/settings/SettingsPage";

case "settings":
  return <SettingsPage />;
```

- [ ] **Step 4: 验证完整应用编译**

```bash
npx tauri dev
```

预期：完整应用可用，所有页面可通过侧边栏切换。

---

## 自审清单

**1. 规格覆盖:**
- ✅ 划词翻译浮窗 — Phase 2（V1 简化版，Ctrl+C + 手动翻译）
- ✅ 标题翻译 — Phase 3（多地区独立翻译结果）
- ✅ 标题优化 — Phase 4（3 个优化方案 + SEO 得分 + 用户风格学习基础接口）
- ✅ 定价模板 — Phase 5（纯计算，公式 `售价 = (总成本 + 运费补贴) / (1 - 手续费率 - 支付费率 - 利润率)`）
- ✅ 选品分析 — Phase 6（LLM 分析 + JSON 结构化输出）
- ✅ LLM 服务层 — Phase 1（统一接口 + 三个 provider）
- ✅ 多模型切换 + API Key 管理 — Phase 7

**2. 未覆盖项（本版本不包含）:**
- 浮窗快捷键 Alt+T 触发和屏幕坐标定位（需 Tauri Rust 端窗口管理，未在计划中细化 — 后续迭代）
- SQLite 持久化（各 store 当前为内存存储 — 后续加 Tauri SQL plugin）
- API Key 加密存储（需 Rust 端 crypto 实现 — 后续迭代）
- 用户风格学习完整功能（store 已定义但无 UI 编辑 — 后续迭代）

**3. 类型一致性:** store、service、component 之间的接口类型使用共享的 `src/types/index.ts` 定义，保持一致。
