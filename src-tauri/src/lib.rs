mod commands;
mod floating;

use commands::AppState;
use std::sync::Mutex;

pub fn run() {
    use tauri::Manager;
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
                let settings_path: Option<std::path::PathBuf> = app
                    .path()
                    .app_data_dir()
                    .ok()
                    .map(|d| d.join("settings.json"));
                let default_val = true;
                let content: Option<String> = settings_path
                    .and_then(|p| std::fs::read_to_string(&p).ok());
                let parsed: Option<serde_json::Value> = content
                    .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok());
                let flag: Option<bool> = parsed
                    .and_then(|v| v.get("clipboardAutoPopup").and_then(|val| val.as_bool()));
                flag.unwrap_or(default_val)
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
