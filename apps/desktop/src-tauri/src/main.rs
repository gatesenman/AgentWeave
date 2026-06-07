#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod tray;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            tray::create_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_project_status,
            commands::generate_configs,
            commands::validate_config,
            commands::list_vendors,
            commands::compare_vendors,
            commands::load_config,
            commands::save_config,
            commands::list_config_files,
            commands::health_check,
            commands::export_config,
            commands::import_vendor,
            commands::start_watch,
            commands::stop_watch,
            commands::get_trace_spans,
            commands::get_governance_status,
            commands::list_mcp_servers,
            commands::check_update,
            commands::get_app_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running AgentWeave desktop app");
}
