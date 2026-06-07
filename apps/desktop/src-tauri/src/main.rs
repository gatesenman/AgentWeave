#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod database;
mod tray;

fn main() {
    let db = database::Database::new().expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .manage(std::sync::Arc::new(db))
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
            // Core project commands
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
            commands::list_mcp_servers,
            commands::check_update,
            commands::get_app_version,
            // Trace spans (persisted)
            commands::get_trace_spans,
            commands::add_trace_span_cmd,
            // Governance (persisted)
            commands::get_governance_status,
            commands::list_governance_policies,
            commands::create_governance_policy,
            commands::toggle_governance_policy_cmd,
            commands::delete_governance_policy_cmd,
            commands::list_governance_roles,
            commands::create_governance_role,
            commands::delete_governance_role_cmd,
            // Experiments (persisted)
            commands::list_experiments,
            commands::create_experiment,
            commands::update_experiment_status,
            commands::delete_experiment,
            // Prompt tests (persisted)
            commands::list_prompt_tests,
            commands::create_prompt_test,
            commands::delete_prompt_test,
            // AI suggestions (real analysis)
            commands::get_ai_suggestions,
            // Config analytics (real analysis)
            commands::get_config_analytics,
            // Environments (persisted)
            commands::list_environments,
            commands::create_environment,
            commands::activate_environment,
            commands::delete_environment,
            // Inheritance (real config)
            commands::get_inheritance_tree,
            // Templates (persisted)
            commands::list_templates,
            commands::create_template,
            commands::delete_template,
            // Team (persisted)
            commands::list_team_members,
            commands::add_team_member,
            commands::update_team_member_role,
            commands::delete_team_member,
            // Webhooks (persisted)
            commands::list_webhooks,
            commands::create_webhook,
            commands::toggle_webhook,
            commands::delete_webhook,
            // Lint rules (persisted)
            commands::list_lint_rules,
            commands::create_lint_rule,
            commands::toggle_lint_rule,
            commands::delete_lint_rule,
            // Snapshots / Backup (persisted)
            commands::list_snapshots,
            commands::create_snapshot,
            commands::delete_snapshot,
            commands::export_project_zip,
            commands::import_project_zip,
            // Cost records (persisted)
            commands::list_cost_records,
            commands::add_cost_record,
            // Conflicts (persisted)
            commands::list_conflicts,
            commands::resolve_conflict,
            // Recent projects & persistence
            commands::add_recent_project,
            commands::list_recent_projects,
            commands::get_audit_log,
            commands::log_audit_event,
            commands::set_preference,
            commands::get_preference,
            // Config hub
            commands::get_config_concepts,
            // Events
            commands::emit_config_changed,
            commands::emit_watch_event,
            // Additional commands
            commands::delete_cost_record,
            commands::get_dry_run_preview,
            commands::get_context_optimization,
            commands::start_migration,
            commands::get_migration_status,
            commands::get_config_analytics_ex,
            commands::detect_vendor_configs,
            commands::get_vendor_preview,
            commands::get_vendor_support_matrix,
        ])
        .run(tauri::generate_context!())
        .expect("error while running AgentWeave desktop app");
}
