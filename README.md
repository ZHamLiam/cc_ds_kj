# 跨境电商助手

一款基于 Tauri 2.x 的桌面应用，面向跨境电商卖家，集成标题优化、多语种翻译、选品分析、定价计算等 AI 辅助功能。支持 DeepSeek、通义千问、GLM-4 多模型及版本切换，可按功能独立配置模型。

## 功能模块

| 模块 | 说明 |
|------|------|
| 全局浮动弹窗 | 电脑任意位置选中文本后 Ctrl+C 自动弹出，支持翻译和标题优化，可自定义全局快捷键 |
| 标题优化 | 根据目标平台和地区生成 SEO 优化的商品标题，支持批量输入，可设定字数限制 |
| 标题翻译 | 将商品标题批量翻译为多语种（按平台自动匹配目标地区语言），支持专有名词保护 |
| 选品分析 | 基于品类、平台、地区分析市场趋势与选品建议 |
| 定价模板 | 成本项配置、费率计算、运费规则、利润预估 |
| 划词翻译 | 输入文本快速翻译，支持多目标语言，泰语自动中转英语优化质量 |

### 高级选项

翻译和标题优化模块支持可折叠的高级选项面板：
- **专有名词保护**：指定品牌名/专有名词保持原文不直译（翻译模块）
- **字数限制**：设定优化后标题的最大字符数（优化模块）
- **自定义要求**：自由添加额外约束，如语气风格、关键词偏好等

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面框架 | Tauri 2.x（Rust 后端 + 系统 WebView） |
| 前端框架 | React 18 + TypeScript |
| UI 组件 | shadcn/ui + Tailwind CSS |
| 状态管理 | Zustand |
| LLM 接入 | DeepSeek / 通义千问 (Qwen) / GLM-4（均兼容 OpenAI 接口格式） |

## 模型支持

| 供应商 | 可选模型版本 |
|--------|-------------|
| DeepSeek | V3、V4 Flash、V4 Pro |
| 通义千问 | Plus、Max、Turbo |
| GLM-4 | Flash、4.7 Flash、Plus |

可在设置中为不同功能独立指定模型供应商和版本，未指定的功能回退到默认模型。

## 平台与地区

| 平台 | 运营地区 |
|------|----------|
| Amazon | 美国 |
| Shopee | 台湾、泰国、菲律宾、马来西亚 |
| Lazada | 台湾、泰国、菲律宾、马来西亚 |
| TikTok Shop | 台湾、泰国、菲律宾、马来西亚 |

选择平台后自动过滤对应的目标地区，避免不合理组合。

## 环境要求

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/) >= 1.70
- Windows / macOS / Linux

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发环境

```bash
npm run tauri dev
```

该命令会同时启动 Vite 开发服务器和 Tauri 桌面窗口。首次启动 Tauri 会编译 Rust 后端，可能需要几分钟。

### 3. 构建生产包

```bash
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`。

## 配置 API Key

启动应用后，进入 **设置** 页面：

1. 填入所需模型的 API Key（DeepSeek、通义千问、GLM-4）
2. 选择默认模型供应商和版本
3. 可单独为各功能覆盖不同的模型

### API Key 获取地址

- **DeepSeek：** [platform.deepseek.com](https://platform.deepseek.com/)
- **通义千问：** [dashscope.aliyun.com](https://dashscope.aliyun.com/)
- **GLM-4：** [open.bigmodel.cn](https://open.bigmodel.cn/)

API Key 加密存储在本地，不会上传至任何服务器。

## 项目结构

```
cc_ds_kj/
├── src/                        # React 前端
│   ├── components/             # 通用 UI 组件
│   │   ├── ui/                 # shadcn/ui 基础组件
│   │   └── layout/             # 布局（侧边栏、页面路由）
│   ├── features/               # 功能模块
│   │   ├── floating-popup/     # 全局浮动弹窗
│   │   ├── title-optimize/     # 标题优化
│   │   ├── title-translate/    # 标题翻译
│   │   ├── translate-popup/    # 划词翻译
│   │   ├── pricing/            # 定价模板
│   │   ├── product-analysis/   # 选品分析
│   │   └── settings/           # 设置页（含快捷键录制）
│   ├── services/               # LLM 调用封装
│   │   ├── llm-client.ts       # 统一接口
│   │   ├── providers/          # DeepSeek / Qwen / GLM 适配
│   │   └── prompts/            # 各功能 Prompt 模板
│   ├── stores/                 # Zustand 状态管理
│   ├── hooks/                  # 共享 Hooks
│   ├── lib/                    # 工具函数
│   └── types/                  # 类型定义
├── popup.html                  # 浮动弹窗 HTML 入口
├── src-tauri/                  # Tauri Rust 后端
│   ├── src/
│   │   ├── lib.rs              # 插件注册、状态管理
│   │   ├── main.rs
│   │   ├── commands.rs         # Tauri commands（LLM 配置、快捷键同步）
│   │   └── floating.rs         # 剪贴板监听、全局快捷键、弹窗管理
│   └── Cargo.toml
├── package.json
└── tailwind.config.ts
```

## 架构

```
UI(shadcn/ui) → Hooks → Zustand Store → Service → Tauri invoke → Rust → LLM API
```

- UI 组件只负责渲染，不包含业务逻辑
- 业务逻辑在 hooks 中
- 全局状态通过 Zustand store 管理
- LLM 调用封装在 service 层，新增模型只需在 `providers/` 下添加适配文件
- Rust 后端负责存储、剪贴板和窗口管理

## 开发命令

```bash
npm run dev        # 仅启动前端开发服务器（浏览器访问）
npm run build      # TypeScript 检查 + Vite 构建
npm run preview    # 预览生产构建
npm run tauri dev  # Tauri 开发模式（含桌面窗口）
```
