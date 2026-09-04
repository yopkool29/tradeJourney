#[cfg(all(not(debug_assertions), feature = "desktop-production", target_os = "linux"))]
mod desktop;
#[cfg(all(not(debug_assertions), feature = "desktop-production", target_os = "windows"))]
mod desktop_windows;

// Workarounds WebKitGTK sur NVIDIA (voir tauri-apps/tauri#9394)
// Sur NVIDIA, le DMABUF renderer peut causer des fenêtres blanches ou des crashes
#[cfg(target_os = "linux")]
fn enable_gpu_acceleration() {
    // Désactiver le DMABUF renderer (problématique sur NVIDIA)
    if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
    // Fixer le crash Wayland Error 71 sur NVIDIA
    if std::env::var("__NV_DISABLE_EXPLICIT_SYNC").is_err() {
        std::env::set_var("__NV_DISABLE_EXPLICIT_SYNC", "1");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    enable_gpu_acceleration();

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            // Focus la fenêtre existante si on tente de relancer l'app
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            #[cfg(all(not(debug_assertions), feature = "desktop-production", target_os = "linux"))]
            desktop::start(app)?;
            #[cfg(all(not(debug_assertions), feature = "desktop-production", target_os = "windows"))]
            desktop_windows::start(app)?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");
    app.run(|app, event| {
        #[cfg(all(not(debug_assertions), feature = "desktop-production", target_os = "linux"))]
        if matches!(event, tauri::RunEvent::ExitRequested { .. }) {
            desktop::stop(app);
        }
        #[cfg(all(not(debug_assertions), feature = "desktop-production", target_os = "windows"))]
        if matches!(event, tauri::RunEvent::ExitRequested { .. }) {
            desktop_windows::stop(app);
        }
        #[cfg(not(all(not(debug_assertions), feature = "desktop-production")))]
        let _ = (app, event);
    });
}
