#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use tauri::Manager;
use tauri::GlobalShortcutManager;

#[tauri::command]
fn capture_screen() -> Result<String, String> {
    let output = Command::new("screencapture")
        .args(["-x", "-t", "png", "/tmp/linearcue_screen.png"])
        .output()
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err("Screen capture failed".to_string());
    }
    Ok("captured".to_string())
}

#[tauri::command]
fn extract_text_from_screen() -> Result<String, String> {
    let home = std::env::var("HOME").unwrap_or_default();
    let ocr_path = format!("{}/Desktop/linearcue/scripts/ocr_fast", home);
    let output = Command::new(&ocr_path)
        .args(["/tmp/linearcue_screen.png"])
        .output()
        .map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&output.stdout).to_string();
    let filtered: Vec<&str> = text.lines().filter(|line| {
        !line.contains("gsk_") &&
        !line.contains("sk-") &&
        !line.to_lowercase().contains("api_key") &&
        !line.to_lowercase().contains("password")
    }).collect();
    Ok(filtered.join("\n"))
}

#[tauri::command]
fn record_audio() -> Result<String, String> {
    let output = Command::new("sox")
        .args(["-d", "-r", "16000", "-c", "1", "-b", "16",
               "/tmp/linearcue_audio.wav", "trim", "0", "5"])
        .output()
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err("Recording failed".to_string());
    }
    Ok("recorded".to_string())
}

#[tauri::command]
fn transcribe_audio() -> Result<String, String> {
    let _ = std::fs::remove_file("/tmp/linearcue_audio.txt");
    let output = Command::new("whisper")
        .args(["/tmp/linearcue_audio.wav",
               "--model", "tiny",
               "--language", "en",
               "--output_format", "txt",
               "--output_dir", "/tmp",
               "--fp16", "False"])
        .output()
        .map_err(|e| e.to_string())?;
    let txt_path = "/tmp/linearcue_audio.txt";
    if std::path::Path::new(txt_path).exists() {
        let text = std::fs::read_to_string(txt_path)
            .map_err(|e| e.to_string())?;
        return Ok(text.trim().to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn main() {
    tauri_plugin_deep_link::prepare("com.linearcue.app");

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            capture_screen,
            extract_text_from_screen,
            record_audio,
            transcribe_audio
        ])
        .setup(|app| {
            let window = app.get_window("main").unwrap();

            #[cfg(target_os = "macos")]
            {
                let ns_win = window.ns_window().unwrap();
                unsafe {
                    let _: () = objc2::msg_send![
                        ns_win as *mut objc2::runtime::AnyObject,
                        setSharingType: 0u64
                    ];
                }
            }

            let w = window.clone();
            let mut sm = app.global_shortcut_manager();
            sm.register("CmdOrCtrl+Shift+Space", move || {
                if w.is_visible().unwrap_or(false) {
                    let _ = w.hide();
                } else {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }).unwrap();

            let window_clone = app.get_window("main").unwrap();
            tauri_plugin_deep_link::register("linearcue", move |request| {
                println!("Deep link: {}", request);
                window_clone.show().unwrap();
                window_clone.set_focus().unwrap();
                window_clone.emit("deep-link", request).unwrap();
            }).unwrap();

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running LinearCue");
}
