#[cfg(all(not(debug_assertions), feature = "desktop-production"))]
mod desktop;

// Active l'accélération GPU dans WebKitGTK pour des transitions plus fluides
#[cfg(target_os = "linux")]
fn enable_gpu_acceleration() {
    // Forcer le compositing GPU plutôt que le compositing logiciel
    if std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").is_err() {
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "0");
    }
    // Activer le renderer DMA-BUF pour de meilleures performances GPU
    if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "0");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    enable_gpu_acceleration();

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            #[cfg(all(not(debug_assertions), feature = "desktop-production"))]
            desktop::start(app)?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");
    app.run(|app, event| {
        #[cfg(all(not(debug_assertions), feature = "desktop-production"))]
        if matches!(event, tauri::RunEvent::ExitRequested { .. }) {
            desktop::stop(app);
        }
        #[cfg(not(all(not(debug_assertions), feature = "desktop-production")))]
        let _ = (app, event);
    });
}
