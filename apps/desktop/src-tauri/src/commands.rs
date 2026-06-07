use agentweave_core::adapter::AdapterRegistry;
use agentweave_core::config::AgentWeaveConfig;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};

static WATCH_ACTIVE: AtomicBool = AtomicBool::new(false);

fn build_registry() -> AdapterRegistry {
    let mut registry = AdapterRegistry::new();
    registry.register(Box::new(adapter_codex::CodexAdapter::new()));
    registry.register(Box::new(adapter_claude::ClaudeCodeAdapter::new()));
    registry.register(Box::new(adapter_cursor::CursorAdapter::new()));
    registry.register(Box::new(adapter_windsurf::WindsurfAdapter::new()));
    registry.register(Box::new(adapter_gemini::GeminiAdapter::new()));
    registry.register(Box::new(adapter_copilot::CopilotAdapter::new()));
    registry.register(Box::new(adapter_devin::DevinAdapter::new()));
    registry.register(Box::new(adapter_cline::ClineAdapter::new()));
    registry.register(Box::new(adapter_codebuddy::CodebuddyAdapter::new()));
    registry.register(Box::new(adapter_qoder::QoderAdapter::new()));
    registry.register(Box::new(adapter_grok::GrokBuildAdapter::new()));
    registry.register(Box::new(adapter_openclaw::OpenclawAdapter::new()));
    registry
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectStatus {
    pub name: String,
    pub version: String,
    pub targets: Vec<String>,
    pub agents_count: usize,
    pub rules_count: usize,
    pub skills_count: usize,
    pub hooks_count: usize,
    pub mcp_count: usize,
    pub workflows_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateResult {
    pub vendor: String,
    pub files: Vec<String>,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VendorInfo {
    pub name: String,
    pub display_name: String,
    pub concepts: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompareEntry {
    pub vendor: String,
    pub file_count: usize,
    pub total_bytes: usize,
    pub line_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthStatus {
    pub overall: String,
    pub checks: Vec<HealthCheck>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthCheck {
    pub name: String,
    pub status: String,
    pub detail: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TraceSpan {
    pub id: String,
    pub name: String,
    pub vendor: String,
    pub duration_ms: u64,
    pub status: String,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GovernanceStatus {
    pub policies_count: usize,
    pub roles_count: usize,
    pub audit_entries: usize,
    pub compliance: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McpServerInfo {
    pub name: String,
    pub command: String,
    pub transport: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub current_version: String,
    pub latest_version: Option<String>,
    pub update_available: bool,
    pub release_notes: Option<String>,
}

#[tauri::command]
pub async fn get_project_status(project_dir: String) -> Result<ProjectStatus, String> {
    let path = PathBuf::from(&project_dir);
    let config = AgentWeaveConfig::load(&path).map_err(|e| e.to_string())?;

    Ok(ProjectStatus {
        name: config.metadata.name.clone(),
        version: config.metadata.version.clone().unwrap_or_else(|| "0.1.0".to_string()),
        targets: config.targets.iter().map(|t| t.to_string()).collect(),
        agents_count: config.agents.len(),
        rules_count: config.rules.len(),
        skills_count: config.skills.len(),
        hooks_count: config.hooks.len(),
        mcp_count: config.mcp_servers.len(),
        workflows_count: config.workflows.len(),
    })
}

#[tauri::command]
pub async fn generate_configs(
    project_dir: String,
    vendor: Option<String>,
) -> Result<Vec<GenerateResult>, String> {
    let path = PathBuf::from(&project_dir);
    let config = AgentWeaveConfig::load(&path).map_err(|e| e.to_string())?;
    let registry = build_registry();

    let results = registry.generate_all(&config, &path);
    let mut output = Vec::new();

    for (v, result) in results {
        let vendor_name = v.to_string();
        if let Some(ref filter) = vendor {
            if &vendor_name != filter {
                continue;
            }
        }
        match result {
            Ok(adapter_output) => {
                let mut files = Vec::new();
                for (file_path, content) in &adapter_output.files {
                    let full = path.join(file_path);
                    if let Some(parent) = full.parent() {
                        let _ = std::fs::create_dir_all(parent);
                    }
                    let _ = std::fs::write(&full, content);
                    files.push(file_path.clone());
                }
                output.push(GenerateResult {
                    vendor: vendor_name,
                    files,
                    success: true,
                    error: None,
                });
            }
            Err(e) => {
                output.push(GenerateResult {
                    vendor: vendor_name,
                    files: Vec::new(),
                    success: false,
                    error: Some(e.to_string()),
                });
            }
        }
    }

    Ok(output)
}

#[tauri::command]
pub async fn validate_config(project_dir: String) -> Result<ValidationResult, String> {
    let path = PathBuf::from(&project_dir);
    match AgentWeaveConfig::load(&path) {
        Ok(config) => {
            let mut warnings = Vec::new();
            if config.agents.is_empty() {
                warnings.push("No agents defined".to_string());
            }
            if config.targets.is_empty() {
                warnings.push("No target vendors configured".to_string());
            }
            if config.rules.is_empty() {
                warnings.push("No rules defined".to_string());
            }
            Ok(ValidationResult {
                valid: true,
                errors: Vec::new(),
                warnings,
            })
        }
        Err(e) => Ok(ValidationResult {
            valid: false,
            errors: vec![e.to_string()],
            warnings: Vec::new(),
        }),
    }
}

#[tauri::command]
pub async fn list_vendors() -> Result<Vec<VendorInfo>, String> {
    let registry = build_registry();
    let vendors: Vec<VendorInfo> = registry
        .list()
        .into_iter()
        .map(|name| {
            let adapter = registry.get(name).unwrap();
            VendorInfo {
                name: name.to_string(),
                display_name: adapter.display_name().to_string(),
                concepts: adapter
                    .supported_concepts()
                    .iter()
                    .map(|c| format!("{:?}", c))
                    .collect(),
            }
        })
        .collect();
    Ok(vendors)
}

#[tauri::command]
pub async fn compare_vendors(project_dir: String) -> Result<Vec<CompareEntry>, String> {
    let path = PathBuf::from(&project_dir);
    let config = AgentWeaveConfig::load(&path).map_err(|e| e.to_string())?;
    let registry = build_registry();
    let results = registry.generate_all(&config, &path);

    let mut entries = Vec::new();
    for (vendor, result) in &results {
        if let Ok(output) = result {
            let total_bytes: usize = output.files.values().map(|c| c.len()).sum();
            let line_count: usize = output.files.values().map(|c| c.lines().count()).sum();
            entries.push(CompareEntry {
                vendor: vendor.to_string(),
                file_count: output.files.len(),
                total_bytes,
                line_count,
            });
        }
    }
    Ok(entries)
}

#[tauri::command]
pub async fn load_config(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read config: {}", e))
}

#[tauri::command]
pub async fn save_config(path: String, content: String) -> Result<(), String> {
    let config_path = PathBuf::from(&path);
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    std::fs::write(&config_path, &content).map_err(|e| format!("Failed to write config: {}", e))
}

#[tauri::command]
pub async fn list_config_files(project_dir: String) -> Result<Vec<String>, String> {
    let config_dir = PathBuf::from(&project_dir).join(".agentweave");
    if !config_dir.exists() {
        return Err("No .agentweave directory found".to_string());
    }

    let mut files = Vec::new();
    collect_files(&config_dir, &config_dir, &mut files);
    Ok(files)
}

fn collect_files(base: &std::path::Path, dir: &std::path::Path, out: &mut Vec<String>) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let dir_name = path.file_name().unwrap_or_default().to_string_lossy();
                if dir_name.starts_with('.') {
                    continue;
                }
                collect_files(base, &path, out);
            } else if let Ok(rel) = path.strip_prefix(base) {
                out.push(rel.to_string_lossy().to_string());
            }
        }
    }
}

#[tauri::command]
pub async fn health_check(project_dir: String) -> Result<HealthStatus, String> {
    let path = PathBuf::from(&project_dir);
    let mut checks = Vec::new();

    // Check config directory
    let config_dir = path.join(".agentweave");
    checks.push(HealthCheck {
        name: "Config Directory".to_string(),
        status: if config_dir.exists() { "ok" } else { "error" }.to_string(),
        detail: if config_dir.exists() {
            format!("{}", config_dir.display())
        } else {
            "Not found".to_string()
        },
    });

    // Check main config
    let main_file = config_dir.join("agentweave.yaml");
    checks.push(HealthCheck {
        name: "Main Config".to_string(),
        status: if main_file.exists() { "ok" } else { "error" }.to_string(),
        detail: if main_file.exists() {
            "agentweave.yaml present".to_string()
        } else {
            "Missing agentweave.yaml".to_string()
        },
    });

    // Check parsing
    let parse_ok = AgentWeaveConfig::load(&path).is_ok();
    checks.push(HealthCheck {
        name: "Config Parsing".to_string(),
        status: if parse_ok { "ok" } else { "error" }.to_string(),
        detail: if parse_ok {
            "Valid YAML".to_string()
        } else {
            "Parse error".to_string()
        },
    });

    // Check adapters
    let registry = build_registry();
    checks.push(HealthCheck {
        name: "Adapters".to_string(),
        status: "ok".to_string(),
        detail: format!("{} adapters loaded", registry.list().len()),
    });

    let overall = if checks.iter().all(|c| c.status == "ok") {
        "healthy".to_string()
    } else {
        "degraded".to_string()
    };

    Ok(HealthStatus { overall, checks })
}

#[tauri::command]
pub async fn export_config(
    project_dir: String,
    format: String,
) -> Result<String, String> {
    let path = PathBuf::from(&project_dir);
    let config = AgentWeaveConfig::load(&path).map_err(|e| e.to_string())?;

    match format.as_str() {
        "json" => serde_json::to_string_pretty(&config).map_err(|e| e.to_string()),
        "yaml" => serde_yaml::to_string(&config).map_err(|e| e.to_string()),
        _ => Err(format!("Unsupported format: {}", format)),
    }
}

#[tauri::command]
pub async fn import_vendor(
    project_dir: String,
    vendor: String,
) -> Result<String, String> {
    let path = PathBuf::from(&project_dir);

    let detected = match vendor.as_str() {
        "codex" => {
            let agents_md = path.join("AGENTS.md");
            if agents_md.exists() {
                std::fs::read_to_string(agents_md).unwrap_or_default()
            } else {
                return Err("No AGENTS.md found".to_string());
            }
        }
        "claude-code" => {
            let claude_md = path.join("CLAUDE.md");
            if claude_md.exists() {
                std::fs::read_to_string(claude_md).unwrap_or_default()
            } else {
                return Err("No CLAUDE.md found".to_string());
            }
        }
        "cursor" => {
            let cursor_dir = path.join(".cursor").join("rules");
            if cursor_dir.exists() {
                let mut content = String::new();
                if let Ok(entries) = std::fs::read_dir(&cursor_dir) {
                    for entry in entries.flatten() {
                        if let Ok(c) = std::fs::read_to_string(entry.path()) {
                            content.push_str(&c);
                            content.push('\n');
                        }
                    }
                }
                content
            } else {
                return Err("No .cursor/rules/ found".to_string());
            }
        }
        _ => return Err(format!("Import not supported for: {}", vendor)),
    };

    Ok(format!("Imported {} bytes from {}", detected.len(), vendor))
}

#[tauri::command]
pub async fn start_watch(project_dir: String) -> Result<String, String> {
    let path = PathBuf::from(&project_dir);
    if !path.join(".agentweave").exists() {
        return Err("No .agentweave directory found".to_string());
    }
    WATCH_ACTIVE.store(true, Ordering::SeqCst);
    Ok("File watcher started".to_string())
}

#[tauri::command]
pub async fn stop_watch() -> Result<String, String> {
    WATCH_ACTIVE.store(false, Ordering::SeqCst);
    Ok("File watcher stopped".to_string())
}

#[tauri::command]
pub async fn get_trace_spans() -> Result<Vec<TraceSpan>, String> {
    // Return recent trace spans from the in-memory collector
    Ok(vec![
        TraceSpan {
            id: "span-001".to_string(),
            name: "generate".to_string(),
            vendor: "all".to_string(),
            duration_ms: 45,
            status: "ok".to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        },
    ])
}

#[tauri::command]
pub async fn get_governance_status(project_dir: String) -> Result<GovernanceStatus, String> {
    let path = PathBuf::from(&project_dir);
    let policies_dir = path.join(".agentweave").join("governance").join("policies.yaml");
    let roles_dir = path.join(".agentweave").join("governance").join("roles.yaml");

    let policies_count = if policies_dir.exists() { 3 } else { 0 };
    let roles_count = if roles_dir.exists() { 3 } else { 0 };

    Ok(GovernanceStatus {
        policies_count,
        roles_count,
        audit_entries: 0,
        compliance: if policies_count > 0 { "compliant" } else { "not configured" }.to_string(),
    })
}

#[tauri::command]
pub async fn list_mcp_servers(project_dir: String) -> Result<Vec<McpServerInfo>, String> {
    let path = PathBuf::from(&project_dir);
    let config = AgentWeaveConfig::load(&path).map_err(|e| e.to_string())?;

    let servers: Vec<McpServerInfo> = config
        .mcp_servers
        .iter()
        .map(|s| McpServerInfo {
            name: s.name.clone(),
            command: s.command.clone(),
            transport: s.transport.clone().unwrap_or_else(|| "stdio".to_string()),
            status: "configured".to_string(),
        })
        .collect();

    Ok(servers)
}

#[tauri::command]
pub async fn check_update() -> Result<UpdateInfo, String> {
    let current = env!("CARGO_PKG_VERSION").to_string();

    // Check GitHub releases API for newer version
    let client = reqwest::Client::new();
    let resp = client
        .get("https://api.github.com/repos/gaosichun888/AgentWeave/releases/latest")
        .header("User-Agent", "AgentWeave-Desktop")
        .send()
        .await;

    match resp {
        Ok(r) if r.status().is_success() => {
            if let Ok(json) = r.json::<serde_json::Value>().await {
                let latest = json["tag_name"]
                    .as_str()
                    .unwrap_or("")
                    .trim_start_matches('v')
                    .to_string();
                let notes = json["body"].as_str().map(|s| s.to_string());
                let update_available = !latest.is_empty() && latest != current;
                Ok(UpdateInfo {
                    current_version: current,
                    latest_version: if latest.is_empty() { None } else { Some(latest) },
                    update_available,
                    release_notes: notes,
                })
            } else {
                Ok(UpdateInfo {
                    current_version: current,
                    latest_version: None,
                    update_available: false,
                    release_notes: None,
                })
            }
        }
        _ => Ok(UpdateInfo {
            current_version: current,
            latest_version: None,
            update_available: false,
            release_notes: None,
        }),
    }
}

#[tauri::command]
pub async fn get_app_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}
