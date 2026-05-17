use std::thread;
use std::time::Duration;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use enigo::{Keyboard, Mouse};

use crate::commands::AppState;

#[derive(Serialize, Clone)]
struct PopupPayload {
    text: String,
    config: String,
}

pub fn start_clipboard_monitor(app_handle: AppHandle) {
    thread::spawn(move || {
        let mut last_content = String::new();
        loop {
            thread::sleep(Duration::from_millis(300));

            // Skip when main window is focused (avoid self-trigger on app-internal copy)
            if let Some(main) = app_handle.get_webview_window("main") {
                if main.is_focused().unwrap_or(false) {
                    continue;
                }
            }

            // Skip when popup is already visible
            if let Some(state) = app_handle.try_state::<AppState>() {
                if let Ok(visible) = state.popup_visible.lock() {
                    if *visible {
                        // Still track clipboard to avoid re-trigger after close
                        if let Some(text) = get_clipboard_text() {
                            last_content = text;
                        }
                        continue;
                    }
                }
            }

            let text = match get_clipboard_text() {
                Some(t) => t,
                None => continue,
            };

            if !text.is_empty() && text != last_content {
                last_content = text.clone();

                if let Ok(enigo) = enigo::Enigo::new(&enigo::Settings::default()) {
                    if let Ok((x, y)) = enigo.location() {
                        show_popup(&app_handle, &text, x, y);
                    }
                }
            }
        }
    });
}

fn get_clipboard_text() -> Option<String> {
    arboard::Clipboard::new().ok().and_then(|mut c| c.get_text().ok())
}

fn get_llm_config(app_handle: &AppHandle) -> String {
    app_handle
        .try_state::<AppState>()
        .and_then(|state| state.llm_config.lock().ok().map(|c| c.clone()))
        .unwrap_or_default()
}

fn show_popup(app_handle: &AppHandle, text: &str, x: i32, y: i32) {
    let text = text.trim().to_string();
    if text.is_empty() {
        return;
    }

    let config = get_llm_config(app_handle);
    let payload = PopupPayload {
        text: text.clone(),
        config,
    };

    if let Some(popup) = app_handle.get_webview_window("popup") {
        let _ = popup.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(
            x + 10,
            (y + 10).max(0),
        )));
        let _ = popup.emit("popup-text", &payload);
        let _ = popup.show();
        let _ = popup.set_focus();
        if let Some(state) = app_handle.try_state::<AppState>() {
            if let Ok(mut v) = state.popup_visible.lock() {
                *v = true;
            }
        }
    } else {
        let handle = app_handle.clone();
        match WebviewWindowBuilder::new(app_handle, "popup", WebviewUrl::App("popup.html".into()))
            .inner_size(380.0, 400.0)
            .position(x as f64 + 10.0, (y as f64 + 10.0).max(0.0))
            .decorations(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .visible(false)
            .build()
        {
            Ok(window) => {
                let w = window.clone();
                let payload_clone = payload.clone();
                let h = handle.clone();

                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        let w2 = w.clone();
                        let h2 = h.clone();
                        thread::spawn(move || {
                            thread::sleep(Duration::from_millis(200));
                            if !w2.is_focused().unwrap_or(true) && w2.is_visible().unwrap_or(false) {
                                let _ = w2.hide();
                                if let Some(state) = h2.try_state::<AppState>() {
                                    if let Ok(mut v) = state.popup_visible.lock() {
                                        *v = false;
                                    }
                                }
                            }
                        });
                    }
                });

                thread::spawn(move || {
                    thread::sleep(Duration::from_millis(600));
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.emit("popup-text", &payload_clone);
                    if let Some(state) = handle.try_state::<AppState>() {
                        if let Ok(mut v) = state.popup_visible.lock() {
                            *v = true;
                        }
                    }
                });
            }
            Err(e) => {
                eprintln!("Failed to create popup window: {}", e);
            }
        }
    }
}

pub fn parse_shortcut_string(
    s: &str,
) -> Result<tauri_plugin_global_shortcut::Shortcut, String> {
    use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut};

    let parts: Vec<&str> = s.split('+').collect();
    if parts.is_empty() {
        return Err("Empty shortcut".into());
    }

    let key_str = parts[parts.len() - 1];
    let mut modifiers = Modifiers::empty();
    for i in 0..parts.len().saturating_sub(1) {
        match parts[i] {
            "Ctrl" => modifiers |= Modifiers::CONTROL,
            "Shift" => modifiers |= Modifiers::SHIFT,
            "Alt" => modifiers |= Modifiers::ALT,
            "Meta" | "Win" => modifiers |= Modifiers::META,
            _ => {}
        }
    }

    let code = match key_str {
        "Space" => Code::Space,
        "Enter" => Code::Enter,
        "Tab" => Code::Tab,
        "Escape" => Code::Escape,
        "Backspace" => Code::Backspace,
        "Delete" => Code::Delete,
        "Up" => Code::ArrowUp,
        "Down" => Code::ArrowDown,
        "Left" => Code::ArrowLeft,
        "Right" => Code::ArrowRight,
        s if s.len() == 1 => {
            let ch = s.chars().next().unwrap();
            match ch {
                'A' => Code::KeyA,
                'B' => Code::KeyB,
                'C' => Code::KeyC,
                'D' => Code::KeyD,
                'E' => Code::KeyE,
                'F' => Code::KeyF,
                'G' => Code::KeyG,
                'H' => Code::KeyH,
                'I' => Code::KeyI,
                'J' => Code::KeyJ,
                'K' => Code::KeyK,
                'L' => Code::KeyL,
                'M' => Code::KeyM,
                'N' => Code::KeyN,
                'O' => Code::KeyO,
                'P' => Code::KeyP,
                'Q' => Code::KeyQ,
                'R' => Code::KeyR,
                'S' => Code::KeyS,
                'T' => Code::KeyT,
                'U' => Code::KeyU,
                'V' => Code::KeyV,
                'W' => Code::KeyW,
                'X' => Code::KeyX,
                'Y' => Code::KeyY,
                'Z' => Code::KeyZ,
                _ => match ch {
                    '0' => Code::Digit0,
                    '1' => Code::Digit1,
                    '2' => Code::Digit2,
                    '3' => Code::Digit3,
                    '4' => Code::Digit4,
                    '5' => Code::Digit5,
                    '6' => Code::Digit6,
                    '7' => Code::Digit7,
                    '8' => Code::Digit8,
                    '9' => Code::Digit9,
                    _ => return Err(format!("Unsupported key: {}", ch)),
                },
            }
        }
        s if s.starts_with('F') => match s {
            "F1" => Code::F1,
            "F2" => Code::F2,
            "F3" => Code::F3,
            "F4" => Code::F4,
            "F5" => Code::F5,
            "F6" => Code::F6,
            "F7" => Code::F7,
            "F8" => Code::F8,
            "F9" => Code::F9,
            "F10" => Code::F10,
            "F11" => Code::F11,
            "F12" => Code::F12,
            _ => return Err(format!("Unsupported key: {}", s)),
        },
        _ => return Err(format!("Unsupported key: {}", key_str)),
    };

    Ok(Shortcut::new(Some(modifiers), code))
}

pub fn handle_shortcut_pressed(app_handle: &AppHandle) {
    // Toggle: if popup visible, hide it
    if let Some(popup) = app_handle.get_webview_window("popup") {
        let visible = app_handle
            .try_state::<AppState>()
            .map(|s| s.popup_visible.lock().map(|v| *v).unwrap_or(false))
            .unwrap_or(false);
        if visible {
            let _ = popup.hide();
            if let Some(state) = app_handle.try_state::<AppState>() {
                if let Ok(mut v) = state.popup_visible.lock() {
                    *v = false;
                }
            }
            return;
        }
    }

    // Simulate Ctrl+C to get selected text
    if let Ok(mut enigo) = enigo::Enigo::new(&enigo::Settings::default()) {
        let _ = enigo.key(enigo::Key::Control, enigo::Direction::Press);
        thread::sleep(Duration::from_millis(30));
        let _ = enigo.key(enigo::Key::Unicode('c'), enigo::Direction::Click);
        thread::sleep(Duration::from_millis(30));
        let _ = enigo.key(enigo::Key::Control, enigo::Direction::Release);

        thread::sleep(Duration::from_millis(120));

        let clipboard_text = get_clipboard_text();
        let cursor_pos = enigo.location();
        if let Some(text) = clipboard_text {
            if let Ok((x, y)) = cursor_pos {
                show_popup(app_handle, &text, x, y);
            }
        }
    }
}
