# 配置持久化 & 弹窗开关 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 API Key 等设置持久化到本地 `settings.json`，并增加复制弹窗自动触发的开关控制。

**Architecture:** Rust 端负责文件 I/O 和剪贴板监听的状态控制；前端 zustand store 管理 UI 状态，App.tsx 通过 debounce 桥接前后端持久化。新增 `load_settings` / `save_settings` / `set_clipboard_auto_popup` 三个 Tauri command。

**Tech Stack:** Tauri v2, Rust, React + Zustand, TypeScript

---

### Task 1: Rust — commands.rs 新增字段和命令

**Files:**
- Modify: `src-tauri/src/commands.rs`

- [ ] **Step 1: 更新 AppState，新增 set_clipboard_auto_popup 命令和 settings 读写命令**

将 `src-tauri/src/commands.rs` 替换为以下内容：

```rust
use std::sync::Mutex;
use enigo::Mouse;
use tauri::Manager;
use tauri::State;

pub struct AppState {
    pub last_clipboard: Mutex<String>,
    pub llm_config: Mutex<String>,
    pub popup_visible: Mutex<bool>,
    pub current_shortcut: Mutex<String>,
    pub clipboard_auto_popup: Mutex<bool>,
}

#[tauri::command]
pub fn get_cursor_position() -> Result<(i32, i32), String> {
    let enigo = enigo::Enigo::new(&enigo::Settings::default())
        .map_err(|e| format!("Failed to init enigo: {}", e))?;
    enigo
        .location()
        .map_err(|e| format!("Failed to get cursor: {}", e))
}

#[tauri::command]
pub fn sync_llm_config(state: State<AppState>, config_json: String) -> Result<(), String> {
    let mut config = state.llm_config.lock().map_err(|e| e.to_string())?;
    *config = config_json;
    Ok(())
}

#[tauri::command]
pub fn get_llm_config(state: State<AppState>) -> Result<String, String> {
    state
        .llm_config
        .lock()
        .map(|c| c.clone())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_shortcut(
    app_handle: tauri::AppHandle,
    state: State<AppState>,
    shortcut: String,
) -> Result<(), String> {
    let parsed = crate::floating::parse_shortcut_string(&shortcut)
        .map_err(|e| e.to_string())?;
    let mut current = state.current_shortcut.lock().map_err(|e| e.to_string())?;
    if !current.is_empty() {
        if let Some(old) = crate::floating::parse_shortcut_string(&current).ok() {
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            let _ = app_handle.global_shortcut().unregister(old);
        }
    }
    use tauri_plugin_global_shortcut::GlobalShortcutExt;
    app_handle
        .global_shortcut()
        .register(parsed)
        .map_err(|e| e.to_string())?;
    *current = shortcut;
    Ok(())
}

#[tauri::command]
pub fn hide_popup(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(popup) = app_handle.get_webview_window("popup") {
        popup.hide().map_err(|e| e.to_string())?;
        if let Some(state) = app_handle.try_state::<AppState>() {
            if let Ok(mut v) = state.popup_visible.lock() {
                *v = false;
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub fn set_clipboard_auto_popup(
    state: State<AppState>,
    enabled: bool,
) -> Result<(), String> {
    let mut flag = state.clipboard_auto_popup.lock().map_err(|e| e.to_string())?;
    *flag = enabled;
    Ok(())
}

fn settings_path(app_handle: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("settings.json"))
}

#[tauri::command]
pub fn load_settings(app_handle: tauri::AppHandle) -> Result<String, String> {
    let path = settings_path(&app_handle)?;
    if !path.exists() {
        return Ok("{}".into());
    }
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_settings(
    app_handle: tauri::AppHandle,
    settings_json: String,
) -> Result<(), String> {
    let path = settings_path(&app_handle)?;
    std::fs::write(&path, &settings_json).map_err(|e| e.to_string())
}
```

- [ ] **Step 2: 编译检查**

```bash
cd src-tauri && cargo check 2>&1
```

Expected: 编译通过，无新增错误。

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands.rs
git commit -m "feat: add load_settings, save_settings, set_clipboard_auto_popup commands"
```

---

### Task 2: Rust — floating.rs 监听循环检查开关

**Files:**
- Modify: `src-tauri/src/floating.rs`

- [ ] **Step 1: 在剪贴板监听循环中增加 clipboard_auto_popup 判断**

将 `start_clipboard_monitor` 函数中的弹窗触发部分增加条件判断。找到该函数内的这两行附近：

```rust
                if let Ok(enigo) = enigo::Enigo::new(&enigo::Settings::default()) {
                    if let Ok((x, y)) = enigo.location() {
                        show_popup(&app_handle, &text, x, y);
                    }
                }
```

改为：

```rust
                // Check clipboard auto-popup toggle
                let auto_popup = app_handle
                    .try_state::<AppState>()
                    .and_then(|s| s.clipboard_auto_popup.lock().ok().map(|v| *v))
                    .unwrap_or(true);

                if auto_popup {
                    if let Ok(enigo) = enigo::Enigo::new(&enigo::Settings::default()) {
                        if let Ok((x, y)) = enigo.location() {
                            show_popup(&app_handle, &text, x, y);
                        }
                    }
                }
```

- [ ] **Step 2: 编译检查**

```bash
cd src-tauri && cargo check 2>&1
```

Expected: 编译通过。

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/floating.rs
git commit -m "feat: respect clipboard_auto_popup flag in clipboard monitor"
```

---

### Task 3: Rust — lib.rs 注册新命令，启动时初始化 clipboard_auto_popup

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 注册新命令，启动时从 settings 恢复 clipboard_auto_popup**

将 `src-tauri/src/lib.rs` 替换为以下内容：

```rust
mod commands;
mod floating;

use commands::AppState;
use std::sync::Mutex;

pub fn run() {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        floating::handle_shortcut_pressed(app);
                    }
                })
                .build(),
        )
        .manage(AppState {
            last_clipboard: Mutex::new(String::new()),
            llm_config: Mutex::new(String::new()),
            popup_visible: Mutex::new(false),
            current_shortcut: Mutex::new("Ctrl+Shift+Space".into()),
            clipboard_auto_popup: Mutex::new(true),
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_cursor_position,
            commands::sync_llm_config,
            commands::get_llm_config,
            commands::hide_popup,
            commands::update_shortcut,
            commands::load_settings,
            commands::save_settings,
            commands::set_clipboard_auto_popup,
        ])
        .setup(|app| {
            let handle = app.handle().clone();

            // Restore clipboard_auto_popup from saved settings
            let auto_popup = {
                let settings_path = app
                    .path()
                    .app_data_dir()
                    .ok()
                    .map(|d| d.join("settings.json"));
                let default_val = true;
                settings_path
                    .and_then(|p| std::fs::read_to_string(&p).ok())
                    .and_then(|s| {
                        serde_json::from_str::<serde_json::Value>(&s).ok()
                    })
                    .and_then(|v| v.get("clipboardAutoPopup")?.as_bool())
                    .unwrap_or(default_val)
            };
            if let Some(state) = app.try_state::<AppState>() {
                if let Ok(mut flag) = state.clipboard_auto_popup.lock() {
                    *flag = auto_popup;
                }
            }

            floating::start_clipboard_monitor(handle.clone());

            // Register default shortcut
            if let Some(parsed) = floating::parse_shortcut_string("Ctrl+Shift+Space").ok() {
                if let Err(e) = app.global_shortcut().register(parsed) {
                    eprintln!("Failed to register global shortcut: {}", e);
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 2: 编译检查**

```bash
cd src-tauri && cargo check 2>&1
```

Expected: 编译通过。

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: register new commands and restore clipboard_auto_popup from settings on startup"
```

---

### Task 4: Frontend — settings store 新增字段和 hydrateFromJson

**Files:**
- Modify: `src/stores/settings.ts`

- [ ] **Step 1: 更新 settings store**

将 `src/stores/settings.ts` 替换为以下内容：

```typescript
import { create } from "zustand";
import type { LLMProvider, ProviderSelection } from "../types";
import type { LLMConfig } from "../services/llm-client";
import { buildLLMConfig } from "../lib/llm-config";

interface SettingsState {
  apiKeys: Record<string, string>;
  defaultSelection: ProviderSelection | null;
  featureSelections: Partial<Record<string, ProviderSelection>>;
  popupShortcut: string;
  clipboardAutoPopup: boolean;
  setApiKey: (provider: LLMProvider, key: string) => void;
  getApiKey: (provider: LLMProvider) => string;
  clearAllKeys: () => void;
  setDefaultSelection: (sel: ProviderSelection | null) => void;
  setFeatureSelection: (feature: string, sel: ProviderSelection | null) => void;
  getLLMConfig: (feature: string) => LLMConfig | null;
  setPopupShortcut: (shortcut: string) => void;
  setClipboardAutoPopup: (enabled: boolean) => void;
  hydrateFromJson: (json: string) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiKeys: {},
  defaultSelection: null,
  featureSelections: {},
  popupShortcut: "Ctrl+Shift+Space",
  clipboardAutoPopup: true,
  setApiKey: (provider, key) =>
    set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: key } })),
  getApiKey: (provider) => get().apiKeys[provider] || "",
  clearAllKeys: () =>
    set({ apiKeys: {}, defaultSelection: null, featureSelections: {} }),
  setDefaultSelection: (sel) => set({ defaultSelection: sel }),
  setFeatureSelection: (feature, sel) =>
    set((s) => {
      const next = { ...s.featureSelections };
      if (sel === null) {
        delete next[feature];
      } else {
        next[feature] = sel;
      }
      return { featureSelections: next };
    }),
  getLLMConfig: (feature) => {
    const state = get();
    const sel = state.featureSelections[feature] || state.defaultSelection;
    if (!sel) return null;
    const key = state.apiKeys[sel.provider];
    if (!key) return null;
    return buildLLMConfig(sel.provider, key, sel.model);
  },
  setPopupShortcut: (shortcut) => set({ popupShortcut: shortcut }),
  setClipboardAutoPopup: (enabled) => set({ clipboardAutoPopup: enabled }),
  hydrateFromJson: (json) => {
    try {
      const parsed = JSON.parse(json);
      const patch: Partial<SettingsState> = {};
      if (parsed.apiKeys && typeof parsed.apiKeys === "object") {
        patch.apiKeys = parsed.apiKeys;
      }
      if (parsed.defaultSelection && typeof parsed.defaultSelection === "object") {
        patch.defaultSelection = parsed.defaultSelection;
      }
      if (parsed.featureSelections && typeof parsed.featureSelections === "object") {
        patch.featureSelections = parsed.featureSelections;
      }
      if (typeof parsed.popupShortcut === "string") {
        patch.popupShortcut = parsed.popupShortcut;
      }
      if (typeof parsed.clipboardAutoPopup === "boolean") {
        patch.clipboardAutoPopup = parsed.clipboardAutoPopup;
      }
      set(patch);
    } catch {
      // Ignore parse errors, use defaults
    }
  },
}));
```

- [ ] **Step 2: 编译检查**

```bash
npx tsc --noEmit 2>&1
```

Expected: 类型检查通过。

- [ ] **Step 3: Commit**

```bash
git add src/stores/settings.ts
git commit -m "feat: add clipboardAutoPopup state and hydrateFromJson to settings store"
```

---

### Task 5: Frontend — App.tsx 启动加载 + 自动保存

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: 更新 App.tsx，增加启动加载和 debounce 自动保存**

将 `src/App.tsx` 替换为以下内容：

```typescript
import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppLayout } from "./components/layout/AppLayout";
import { useSettingsStore } from "./stores/settings";

function App() {
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const defaultSelection = useSettingsStore((s) => s.defaultSelection);
  const popupShortcut = useSettingsStore((s) => s.popupShortcut);
  const clipboardAutoPopup = useSettingsStore((s) => s.clipboardAutoPopup);
  const featureSelections = useSettingsStore((s) => s.featureSelections);
  const hydrateFromJson = useSettingsStore((s) => s.hydrateFromJson);
  const loadedRef = useRef(false);

  // Load settings from disk on startup
  useEffect(() => {
    invoke<string>("load_settings")
      .then((json) => {
        hydrateFromJson(json);
      })
      .catch(console.error)
      .finally(() => {
        loadedRef.current = true;
      });
  }, []);

  // Sync LLM config to Rust backend whenever settings change
  useEffect(() => {
    if (defaultSelection) {
      const apiKey = apiKeys[defaultSelection.provider];
      if (apiKey) {
        const config = {
          provider: defaultSelection.provider,
          apiKey,
          model: defaultSelection.model,
        };
        invoke("sync_llm_config", { configJson: JSON.stringify(config) }).catch(
          console.error,
        );
      }
    }
  }, [apiKeys, defaultSelection]);

  // Sync shortcut to Rust backend on change
  useEffect(() => {
    if (popupShortcut) {
      invoke("update_shortcut", { shortcut: popupShortcut }).catch(console.error);
    }
  }, [popupShortcut]);

  // Sync clipboard auto-popup to Rust backend on change
  useEffect(() => {
    invoke("set_clipboard_auto_popup", { enabled: clipboardAutoPopup }).catch(
      console.error,
    );
  }, [clipboardAutoPopup]);

  // Debounced save to disk when settings change (skip initial load)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!loadedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const state = useSettingsStore.getState();
      const payload = {
        apiKeys: state.apiKeys,
        defaultSelection: state.defaultSelection,
        featureSelections: state.featureSelections,
        popupShortcut: state.popupShortcut,
        clipboardAutoPopup: state.clipboardAutoPopup,
      };
      invoke("save_settings", { settingsJson: JSON.stringify(payload) }).catch(
        console.error,
      );
    }, 500);
  }, [apiKeys, defaultSelection, popupShortcut, clipboardAutoPopup, featureSelections]);

  return <AppLayout />;
}

export default App;
```

- [ ] **Step 2: 编译检查**

```bash
npx tsc --noEmit 2>&1
```

Expected: 类型检查通过。

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: load settings on startup and auto-save with 500ms debounce"
```

---

### Task 6: Frontend — SettingsPage.tsx 新增弹窗开关 UI

**Files:**
- Modify: `src/features/settings/SettingsPage.tsx`

- [ ] **Step 1: 在快捷键设置区域下方增加弹窗自动触发开关**

在 `SettingsPage` 组件的 return 中，在快捷键设置的 `</div>` 结束标签之后、"清除所有 Key" 按钮之前，插入以下代码块。

**定位方法**：找到 `{/* 弹出框快捷键 */}` 注释后面的整个 `<div className="border-t pt-6 space-y-4">` 区域。在该区域的闭合 `</div>` 之后添加：

```tsx
      {/* 弹窗自动触发开关 */}
      <div className="border-t pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm">复制时自动弹窗</h3>
            <p className="text-xs text-muted-foreground mt-1">
              关闭后仍可通过快捷键手动触发弹窗
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={clipboardAutoPopup}
            onClick={() => {
              setClipboardAutoPopup(!clipboardAutoPopup);
              invoke("set_clipboard_auto_popup", { enabled: !clipboardAutoPopup }).catch(
                console.error,
              );
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              clipboardAutoPopup ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                clipboardAutoPopup ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
```

同时需要在组件解构中添加 `clipboardAutoPopup` 和 `setClipboardAutoPopup`。找到 `useSettingsStore()` 的解构行，修改为：

（修改前）：
```typescript
  const {
    apiKeys, setApiKey, clearAllKeys,
    defaultSelection, setDefaultSelection,
    featureSelections, setFeatureSelection,
    popupShortcut, setPopupShortcut,
  } = useSettingsStore();
```

（修改后）：
```typescript
  const {
    apiKeys, setApiKey, clearAllKeys,
    defaultSelection, setDefaultSelection,
    featureSelections, setFeatureSelection,
    popupShortcut, setPopupShortcut,
    clipboardAutoPopup, setClipboardAutoPopup,
  } = useSettingsStore();
```

- [ ] **Step 2: 编译检查**

```bash
npx tsc --noEmit 2>&1
```

Expected: 类型检查通过。

- [ ] **Step 3: Commit**

```bash
git add src/features/settings/SettingsPage.tsx
git commit -m "feat: add clipboard auto-popup toggle to settings page"
```

---

### Task 7: 端到端验证

- [ ] **Step 1: 构建检查（Rust + Frontend）**

```bash
cd src-tauri && cargo check 2>&1 && cd .. && npx tsc --noEmit 2>&1
```

Expected: 两端编译/类型检查均通过。

- [ ] **Step 2: 完整构建**

```bash
cd src-tauri && cargo build 2>&1
```

Expected: 构建成功。

- [ ] **Step 3: 功能验证清单（手动）**

启动应用后验证：
1. 在设置页面填入 API Key，关闭应用后重新打开 → API Key 仍然存在
2. 更改快捷键，重启应用 → 快捷键保持
3. 关闭"复制时自动弹窗"开关，去外部复制文本 → 不弹出窗口
4. 在开关关闭状态下按快捷键 → 仍能弹出窗口
5. 重新打开"复制时自动弹窗"开关，去外部复制文本 → 恢复正常弹出
```
