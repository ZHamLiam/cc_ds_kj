mod commands;
mod floating;

use commands::AppState;
use std::sync::Mutex;
use tauri::Emitter;

struct TrayHolder(pub Mutex<Option<tauri::tray::TrayIcon>>);

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
            close_behavior: Mutex::new(commands::CloseBehavior::default()),
        })
        .manage(TrayHolder(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            commands::get_cursor_position,
            commands::sync_llm_config,
            commands::get_llm_config,
            commands::hide_popup,
            commands::update_shortcut,
            commands::load_settings,
            commands::save_settings,
            commands::set_clipboard_auto_popup,
            commands::minimize_to_tray,
            commands::close_app,
            commands::set_close_behavior,
        ])
        .setup(|app| {
            let handle = app.handle().clone();

            // Read settings.json once for all restoration
            let settings_path: Option<std::path::PathBuf> = app
                .path()
                .app_data_dir()
                .ok()
                .map(|d| d.join("settings.json"));
            let settings_content: Option<String> = settings_path
                .as_ref()
                .and_then(|p| std::fs::read_to_string(p).ok());
            let settings_json: Option<serde_json::Value> = settings_content
                .as_ref()
                .and_then(|s| serde_json::from_str(s).ok());

            // Restore clipboard_auto_popup
            let auto_popup = settings_json
                .as_ref()
                .and_then(|v| v.get("clipboardAutoPopup")?.as_bool())
                .unwrap_or(true);
            if let Some(state) = app.try_state::<AppState>() {
                if let Ok(mut flag) = state.clipboard_auto_popup.lock() {
                    *flag = auto_popup;
                }
            }

            // Restore close_behavior
            let saved_close_behavior = settings_json
                .as_ref()
                .and_then(|v| v.get("closeBehavior"))
                .and_then(|v| serde_json::from_value::<commands::CloseBehavior>(v.clone()).ok())
                .unwrap_or_default();
            if let Some(state) = app.try_state::<AppState>() {
                if let Ok(mut cb) = state.close_behavior.lock() {
                    *cb = saved_close_behavior;
                }
            }

            floating::start_clipboard_monitor(handle.clone());

            // Register default shortcut
            if let Some(parsed) = floating::parse_shortcut_string("Ctrl+Shift+Space").ok() {
                if let Err(e) = app.global_shortcut().register(parsed) {
                    eprintln!("Failed to register global shortcut: {}", e);
                }
            }

            // ========== System Tray & Close Interception ==========

            // Build tray icon
            let icon = app
                .default_window_icon()
                .ok_or_else(|| Box::<dyn std::error::Error>::from("missing default window icon"))
                .unwrap()
                .clone();

            let quit_item = tauri::menu::MenuItemBuilder::with_id("quit", "退出")
                .build(&handle)
                .unwrap();

            let tray_menu = tauri::menu::MenuBuilder::new(&handle)
                .item(&quit_item)
                .build()
                .unwrap();

            let tray = tauri::tray::TrayIconBuilder::new()
                .icon(icon)
                .menu(&tray_menu)
                .tooltip("跨境电商助手")
                .on_menu_event(|app, event| {
                    if event.id() == "quit" {
                        app.exit(0);
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    let should_show = matches!(
                        event,
                        tauri::tray::TrayIconEvent::Click {
                            button: tauri::tray::MouseButton::Left,
                            button_state: tauri::tray::MouseButtonState::Up,
                            ..
                        }
                    );
                    if should_show {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(&handle)
                .unwrap();

            if let Some(holder) = app.try_state::<TrayHolder>() {
                holder.0.lock().unwrap().replace(tray);
            }

            // Intercept close on main window
            if let Some(main_win) = app.get_webview_window("main") {
                let main_win_clone = main_win.clone();
                main_win.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = main_win_clone.emit("close-requested", ());
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
