#[cfg(all(not(debug_assertions), feature = "desktop-production", target_os = "linux"))]
mod desktop;
#[cfg(all(not(debug_assertions), feature = "desktop-production", target_os = "windows"))]
mod desktop_windows;
#[cfg(all(not(debug_assertions), feature = "desktop-production", any(target_os = "linux", target_os = "windows")))]
mod desktop_common;

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

// Ferme le splashscreen et montre la fenêtre principale
// Appelée par le frontend quand le DOM est prêt
#[tauri::command]
fn close_splashscreen(app: tauri::AppHandle) {
    use tauri::Manager;
    if let Some(splash) = app.get_webview_window("splashscreen") {
        let _ = splash.close();
    }
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        let _ = main.set_focus();
    }
}

// Langue courante de l'app, mise à jour par le frontend via set_app_language
struct AppLanguage(std::sync::Mutex<String>);

// Messages de confirmation de fermeture par langue
fn close_confirm_messages(lang: &str) -> (&'static str, &'static str) {
    match lang {
        "fr" => ("Voulez-vous vraiment quitter PnlTracker ?", "Confirmation"),
        _ => ("Are you sure you want to quit PnlTracker?", "Confirmation"),
    }
}

// Commande appelée par le frontend pour synchroniser la langue courante
#[tauri::command]
fn set_app_language(lang: String, state: tauri::State<AppLanguage>) {
    if let Ok(mut current) = state.0.lock() {
        *current = lang;
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
        .manage(AppLanguage(std::sync::Mutex::new("en".to_string())))
        .on_window_event(|window, event| {
            // Confirmation avant fermeture de la fenêtre principale
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    use tauri::Manager;
                    use tauri_plugin_dialog::DialogExt;
                    let lang = window
                        .app_handle()
                        .try_state::<AppLanguage>()
                        .and_then(|state| state.0.lock().ok().map(|l| l.clone()))
                        .unwrap_or_else(|| "en".to_string());
                    let (message, title) = close_confirm_messages(&lang);
                    // Empêcher la fermeture par défaut
                    api.prevent_close();
                    let app_handle = window.app_handle().clone();
                    window
                        .dialog()
                        .message(message)
                        .title(title)
                        .kind(tauri_plugin_dialog::MessageDialogKind::Warning)
                        .buttons(tauri_plugin_dialog::MessageDialogButtons::YesNo)
                        .show(move |confirmed| {
                            if confirmed {
                                // Arrêter les services backend avant de fermer
                                #[cfg(all(not(debug_assertions), feature = "desktop-production", target_os = "linux"))]
                                desktop::stop(&app_handle);
                                #[cfg(all(not(debug_assertions), feature = "desktop-production", target_os = "windows"))]
                                desktop_windows::stop(&app_handle);
                                // Fermer l'application
                                app_handle.exit(0);
                            }
                        });
                }
            }
        })
        .invoke_handler(tauri::generate_handler![close_splashscreen, set_app_language])
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
