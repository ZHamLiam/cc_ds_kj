# 跨境电商助手 — 设计规格书

**日期：** 2026-05-16
**状态：** 待审核

---

## 1. 概述

一款 Tauri 桌面应用，面向跨境电商卖家，提供标题优化、标题翻译、选品分析、定价模板、划词翻译等辅助功能。支持多模型切换。

## 2. 技术栈

| 层 | 选择 | 说明 |
|----|------|------|
| 桌面框架 | Tauri 2.x | Rust 后端，系统 WebView 渲染，包体 ~5-10MB |
| 前端框架 | React 18 + TypeScript | 生态成熟，适合复杂交互 |
| UI 组件 | shadcn/ui + Tailwind CSS | 无包依赖，源码可控，定制自由度高 |
| 状态管理 | Zustand | 轻量 (~1KB)，按功能拆分 store |
| 本地存储 | SQLite + JSON 文件 | 结构化数据走 SQLite，配置走 JSON；API Key 加密存储 |
| LLM 接入 | 纯云 API | 首批支持 DeepSeek、通义千问、GLM-4 |

## 3. 首批模型

- **DeepSeek** — OpenAI 兼容接口，自定义 baseURL
- **通义千问 (Qwen)** — 阿里 DashScope API
- **GLM-4** — 智谱 API

三个模型均兼容 OpenAI Chat Completions 格式，通过统一 `LLMService` 接口切换。新增模型只需在 `providers/` 下新增适配文件。

## 4. 项目结构

```
cc_ds_kj/
├── src/                          # React 前端
│   ├── components/               # 通用 UI 组件
│   │   ├── ui/                   # shadcn/ui 基础组件
│   │   ├── layout/               # 布局（侧边栏、标题栏）
│   │   └── floating-translate/   # 划词翻译浮窗
│   ├── features/                 # 功能模块
│   │   ├── title-optimize/       # ① 标题优化
│   │   ├── title-translate/      # ② 标题翻译
│   │   ├── translate-popup/      # ⑤ 划词翻译
│   │   ├── pricing/              # ④ 定价模板
│   │   └── product-analysis/     # ③ 选品分析
│   ├── services/                 # LLM 调用封装
│   │   ├── llm-client.ts         # 统一接口
│   │   ├── providers/            # DeepSeek / Qwen / GLM 适配
│   │   └── prompts/              # 各功能 prompt 模板
│   ├── stores/                   # Zustand
│   │   ├── app.ts                # 全局状态（模型、地区）
│   │   ├── title.ts              # 标题状态
│   │   ├── translate.ts          # 翻译状态
│   │   └── pricing.ts            # 定价状态
│   ├── hooks/                    # 共享 hooks
│   ├── lib/                      # 工具函数
│   └── types/                    # 类型定义
├── src-tauri/                    # Tauri Rust 后端
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/             # Tauri 命令
│   │   │   ├── storage.rs        # 加密存储
│   │   │   ├── clipboard.rs      # 剪贴板
│   │   │   └── window.rs         # 窗口管理
│   │   └── crypto.rs             # 简单加密
│   └── Cargo.toml
├── package.json
└── tailwind.config.ts
```

## 5. 架构模式

**分层架构：** UI(shadcn/ui) → Hooks → Zustand Store → Service → Tauri invoke → Rust → LLM API

- UI 组件只负责渲染
- 业务逻辑在 hooks 中
- 状态集中在 Zustand store
- LLM 调用封装在 service 层
- Rust 后端仅做存储、剪贴板、窗口管理

## 6. 功能模块

### 6.1 划词翻译浮窗（⑤，开发第1位）

- **V1 方案：** 用户 Ctrl+C 复制文本 → 快捷键 Alt+T → 弹出浮窗翻译
- **V1 固定语言：** 英语、简体中文、繁体中文、泰文
- **后续迭代：** 系统级选中监听自动弹出；用户可在设置中自定义目标语言列表
- **技术：** Tauri 无边框窗口 + 屏幕坐标定位，点击其他区域自动消失
- **翻译规范：** 自动去重（同词 ≤ 2 次），符合电商标题规范
- **输出：** 翻译结果可直接复制

### 6.2 标题翻译（②，开发第2位）

- 用户输入原文 + 选择源语言 + 选择目标地区（支持多选）
- 每个地区独立生成翻译结果
- 翻译规范化检查：重复词、字符数、禁用词
- 与标题优化共享 LLM 服务层和 prompt 模板

### 6.3 标题优化（①，开发第2位）

- 用户输入原文标题 + 选择目标地区 + 选择平台
- 生成 3 个优化方案，带 SEO 得分
- 地区差异化提示（不同地区用户偏好不同关键词）

**用户风格学习：**
- 用户可提供认为好的标题示例 + 自定义规则
- 存储为 `UserStyleProfile`（按地区+平台区分）
- 有自定义规则时拼入 system prompt，无则用默认规则
- 存储于本地 SQLite

### 6.4 定价模板（④，开发第3位）

- 纯计算模块，不依赖 LLM
- 内置各平台/地区默认费率（手续费、支付费、运费阶梯）
- 用户可覆盖默认值
- 公式：`售价 = (总成本 + 运费补贴) / (1 - 手续费率 - 支付费率 - 利润率)`
- 支持多套模板，存本地 SQLite

### 6.5 选品分析（③，开发第4位）

- 用户选择品类 + 目标地区 + 平台
- LLM 综合分析：市场趋势、需求热度（1-10 评分）、选品建议、推荐关键词
- 数据来源：LLM 训练数据 + WebSearch 能力
- 分析报告可导出，存历史记录

## 7. LLM 服务层设计

| 接口 | 说明 |
|------|------|
| `chat(messages, model, params)` | 流式聊天，返回 ReadableStream |
| `listModels()` | 返回可用模型列表 |
| `validateKey(model)` | 验证 API Key 是否有效 |

- 所有 provider 实现统一接口
- Prompt 模板按功能拆分，存放在 `services/prompts/`
- API Key 加密存储在 Tauri 后端，前端不直接持有

## 8. 数据模型（关键）

```typescript
interface UserStyleProfile {
  region: string
  platform: string
  customRules: string
  goodExamples: string[]
  updatedAt: number
}

interface TitleRecord {
  id: string
  original: string
  region: string
  platform: string
  results: string[]
  createdAt: number
}

interface PricingTemplate {
  id: string
  name: string
  region: string
  platform: string
  costItems: { name: string; amount: number }[]
  feeRate: number
  paymentRate: number
  shippingRules: ShippingRule
  targetProfitRate: number
}

interface AnalysisReport {
  id: string
  category: string
  region: string
  platform: string
  trend: string
  demandScore: number
  suggestions: string[]
  keywords: string[]
  createdAt: number
}
```

## 9. 开发顺序

| 顺序 | 模块 | LLM | 复杂度 | 预估 |
|------|------|-----|--------|------|
| 1 | 划词翻译浮窗 | ✓ | 中 | 先做 V1 简化版 |
| 2 | 标题翻译 + 标题优化 | ✓ | 低-中 | 共享 LLM 链路 |
| 3 | 定价模板 | ✗ | 低 | 纯前端计算 |
| 4 | 选品分析 | ✓ | 中 | 依赖 LLM 联网 |

## 10. 本版本不包含

- Ollama 等本地模型支持（首批仅云 API）
- 系统级选中监听自动弹出（V2 迭代）
- 多语言 UI 国际化
- 用户登录/账号系统
- 云端同步

## 11. 参考信息

- 无现有代码库约束，从零构建
- 目标用户：跨境电商卖家
- 跨平台目标：Windows / macOS / Linux
