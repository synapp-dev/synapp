mod attestation;
mod game;
mod scan;
mod secrets;

use attestation::Environment;
use scan::SystemInventory;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WindowEvent,
};
use tauri_plugin_deep_link::DeepLinkExt;

/// Bring the main window back from the tray.
fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

/// Read the host environment attestation (TPM / Secure Boot / IOMMU / VBS / OS build).
#[tauri::command]
fn get_environment() -> Environment {
    attestation::read_environment()
}

/// Whether CS2 is currently running (system process list; never touches the game).
#[tauri::command]
fn detect_game() -> bool {
    game::detect_game()
}

/// Full system-scoped scan: processes (+ on-disk hashes) and loaded drivers (P5).
#[tauri::command]
fn scan_system() -> SystemInventory {
    scan::scan_system()
}

#[tauri::command]
fn save_device_token(token: String) -> Result<(), String> {
    secrets::save_token(&token)
}

#[tauri::command]
fn get_device_token() -> Option<String> {
    secrets::get_token()
}

#[tauri::command]
fn clear_device_token() -> Result<(), String> {
    secrets::clear_token()
}

/// The deep-link URL the app was launched with, if any (cold-start pairing). The
/// frontend polls this on mount so a deep link that *starts* the app isn't lost to a
/// race with the JS listener (the warm case is handled by on_open_url/single-instance).
#[tauri::command]
fn get_launch_url(app: tauri::AppHandle) -> Option<String> {
    app.deep_link()
        .get_current()
        .ok()
        .flatten()
        .and_then(|urls| urls.into_iter().next().map(|u| u.to_string()))
}

/// Open an http(s) URL in the user's default browser (for the "Pair / Authenticate"
/// flow → intradark.com/settings). Restricted to web schemes — never shell-exec
/// arbitrary protocols.
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("invalid url".into());
    }
    let mut cmd = std::process::Command::new("cmd");
    cmd.args(["/C", "start", "", &url]);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(attestation::CREATE_NO_WINDOW);
    }
    cmd.spawn().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Single-instance MUST be registered first. On Windows a deep link launches
        // a second process; this forwards its argv (incl. the intradark-ac:// URL)
        // to the already-running instance and focuses it.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
            if let Some(url) = argv.iter().find(|a| a.starts_with("intradark-ac://")) {
                let _ = app.emit("deep-link", url.clone());
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            // Register the intradark-ac:// scheme with the OS so the browser can hand
            // off the pairing deep link. Needed when running from dev or the raw exe
            // (the NSIS installer registers it too). Writes HKCU — no admin required.
            #[cfg(desktop)]
            {
                let _ = app.deep_link().register_all();
            }

            // System tray: closing the window hides to tray (the AC keeps running in
            // the background). Left-click the tray icon reopens; the menu has Quit.
            let show_i = MenuItem::with_id(app, "show", "Open Veritas AC", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;
            TrayIconBuilder::with_id("veritas-tray")
                .icon(app.default_window_icon().cloned().expect("window icon"))
                .tooltip("Veritas AC by intradark")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main(tray.app_handle());
                    }
                })
                .build(app)?;

            // Cold-start (app launched by the deep link) + warm forwarding.
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                if let Some(url) = event.urls().first() {
                    let _ = handle.emit("deep-link", url.to_string());
                }
            });
            Ok(())
        })
        // Close button → hide to tray instead of quitting (AC keeps running).
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_environment,
            detect_game,
            scan_system,
            save_device_token,
            get_device_token,
            clear_device_token,
            open_url,
            get_launch_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running Veritas AC by intradark");
}
