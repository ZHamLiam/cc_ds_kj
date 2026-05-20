# 配置持久化 & 弹窗开关 设计方案

**日期**: 2026-05-21
**状态**: 已批准

## 概述

解决两个用户体验问题：
1. API Key 重启后丢失 → 持久化到本地文件
2. 复制文本自动弹窗无法关闭 → 增加开关控制

---

## 1. 配置持久化

### 存储格式

文件路径：`{app_data_dir}/settings.json`（Windows: `%APPDATA%\com.ccds.kj\settings.json`）

```json
{
  "apiKeys": { "deepseek": "sk-xxx", "qwen": "..." },
  "defaultSelection": { "provider": "deepseek", "model": "deepseek-chat" },
  "featureSelections": {},
  "popupShortcut": "Ctrl+Shift+Space",
  "clipboardAutoPopup": true
}
```

### 数据流

```
启动 → Rust 读取 settings.json → 前端 invoke("load_settings") → 初始化 zustand
变更 → zustand set → App.tsx useEffect debounce 500ms → invoke("save_settings") → Rust 写文件
```

### Rust 端新增命令

- `load_settings` — 从 `app_data_dir/settings.json` 读取并返回 JSON 字符串，文件不存在则返回 `{}`
- `save_settings(settings_json: String)` — 写入文件

### 前端改动

- `src/App.tsx`: 启动时调用 `load_settings` 初始化 store；监听 store 关键字段变更，debounce 500ms 后调用 `save_settings`
- `src/stores/settings.ts`: 新增 `hydrateFromJson(json)` action，用于批量恢复状态

---

## 2. 弹窗自动触发开关

### 行为

- 开关 **开启**（默认）：剪贴板变化自动弹出浮动窗口
- 开关 **关闭**：剪贴板监听仍在运行但不弹窗；快捷键 `Ctrl+Shift+Space` 仍可手动触发弹窗

### Rust 端

- `AppState` 新增 `clipboard_auto_popup: Mutex<bool>`（默认 `true`）
- `floating.rs` 监听循环中，在弹窗前检查此标志
- 新增 `set_clipboard_auto_popup(enabled: bool)` 命令
- `save_settings` / `load_settings` 中包含此字段
- `AppState` 移除 `#[allow(dead_code)]`（现在 `last_clipboard` 仍需要保留，但 lint 清理可顺手做）

### 前端

- `src/stores/settings.ts`: 新增 `clipboardAutoPopup: boolean` 状态及 setter
- `src/features/settings/SettingsPage.tsx`: 在快捷键设置下方新增 Toggle 开关
- `src/App.tsx`: 启动时从持久化数据恢复此字段；变更时同步到 Rust 并持久化

---

## 涉及文件清单

| 文件 | 改动 |
|------|------|
| `src-tauri/src/commands.rs` | 新增 `load_settings` / `save_settings` / `set_clipboard_auto_popup` 命令；`AppState` 新增字段 |
| `src-tauri/src/floating.rs` | 监听循环增加 `clipboard_auto_popup` 判断 |
| `src-tauri/src/lib.rs` | 注册新命令；启动时加载设置初始化 `clipboard_auto_popup` |
| `src/App.tsx` | 启动加载 + 变更自动保存（debounce） |
| `src/stores/settings.ts` | 新增 `clipboardAutoPopup` 状态、`hydrateFromJson` action |
| `src/features/settings/SettingsPage.tsx` | 新增弹窗开关 UI |

---

## 错误处理

- 文件读取失败（不存在/损坏）：使用默认空配置，不阻塞启动
- 文件写入失败：console.error 打印，不影响正常使用
- JSON 解析失败：等同于空配置

## 不做的

- 不加密 API Key
- 不提供多设备同步
- 弹窗开关关闭时不停止剪贴板监听线程（开销极小，无需复杂的线程生命周期管理）
