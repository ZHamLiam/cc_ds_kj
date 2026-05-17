use std::sync::Mutex;
use enigo::Mouse;
use tauri::Manager;
use tauri::State;

pub struct AppState {
    #[allow(dead_code)]
    pub last_clipboard: Mutex<String>,
    pub llm_config: Mutex<String>,
    pub popup_visible: Mutex<bool>,
    pub current_shortcut: Mutex<String>,
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
    // Unregister old shortcut
    if !current.is_empty() {
        if let Some(old) = crate::floating::parse_shortcut_string(&current).ok() {
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            let _ = app_handle.global_shortcut().unregister(old);
        }
    }
    // Register new shortcut
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
