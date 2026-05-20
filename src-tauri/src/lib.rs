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
            clipboard_auto_popup: Mutex::new(false),
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_cursor_position,
            commands::sync_llm_config,
            commands::get_llm_config,
            commands::hide_popup,
            commands::update_shortcut,
            commands::set_clipboard_auto_popup,
            commands::load_settings,
            commands::save_settings,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            floating::start_clipboard_monitor(handle);

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
