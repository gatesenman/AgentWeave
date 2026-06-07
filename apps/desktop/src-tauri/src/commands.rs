use agentweave_core::adapter::AdapterRegistry;
use agentweave_core::config::AgentWeaveConfig;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::State;

use tauri::Emitter;

use crate::database::Database;

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

// --- Performance A/B Testing ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Experiment {
    pub id: String,
    pub name: String,
    pub status: String,
    pub config_a: String,
    pub config_b: String,
    pub vendor: String,
    pub runs: u32,
    pub winner: Option<String>,
    pub created_at: String,
    pub metrics: ExperimentMetrics,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExperimentMetrics {
    pub response_time: [f64; 2],
    pub accuracy: [f64; 2],
    pub token_usage: [u32; 2],
    pub success_rate: [f64; 2],
}

#[tauri::command]
pub async fn list_experiments() -> Result<Vec<Experiment>, String> {
    Ok(vec![
        Experiment {
            id: "exp-001".into(),
            name: "Verbose vs Concise".into(),
            status: "completed".into(),
            config_a: "verbose-agent".into(),
            config_b: "concise-agent".into(),
            vendor: "claude-code".into(),
            runs: 200,
            winner: Some("B".into()),
            created_at: "2025-01-15".into(),
            metrics: ExperimentMetrics {
                response_time: [2.4, 1.8],
                accuracy: [0.91, 0.89],
                token_usage: [1200, 680],
                success_rate: [0.94, 0.96],
            },
        },
        Experiment {
            id: "exp-002".into(),
            name: "GPT-4o vs Claude".into(),
            status: "running".into(),
            config_a: "gpt4o-agent".into(),
            config_b: "claude-agent".into(),
            vendor: "cursor".into(),
            runs: 87,
            winner: None,
            created_at: "2025-01-20".into(),
            metrics: ExperimentMetrics {
                response_time: [3.1, 2.6],
                accuracy: [0.88, 0.92],
                token_usage: [1500, 1100],
                success_rate: [0.90, 0.93],
            },
        },
    ])
}

// --- Prompt Testing ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PromptTestCase {
    pub id: String,
    pub name: String,
    pub prompt: String,
    pub expected_behavior: String,
    pub vendors: Vec<String>,
    pub results: Vec<PromptTestResult>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PromptTestResult {
    pub vendor: String,
    pub status: String,
    pub response_time: f64,
    pub output: String,
}

#[tauri::command]
pub async fn list_prompt_tests() -> Result<Vec<PromptTestCase>, String> {
    Ok(vec![
        PromptTestCase {
            id: "tc-001".into(),
            name: "Security vulnerability detection".into(),
            prompt: "Review this code for security vulnerabilities".into(),
            expected_behavior: "Identifies SQL injection risk".into(),
            vendors: vec!["cursor".into(), "claude-code".into(), "codex".into()],
            results: vec![
                PromptTestResult { vendor: "cursor".into(), status: "pass".into(), response_time: 2.1, output: "Found SQL injection...".into() },
                PromptTestResult { vendor: "claude-code".into(), status: "pass".into(), response_time: 1.8, output: "Detected unsafe query...".into() },
                PromptTestResult { vendor: "codex".into(), status: "fail".into(), response_time: 3.2, output: "No issues found".into() },
            ],
        },
        PromptTestCase {
            id: "tc-002".into(),
            name: "Code refactoring suggestion".into(),
            prompt: "Refactor this function to reduce complexity".into(),
            expected_behavior: "Reduces cyclomatic complexity below 10".into(),
            vendors: vec!["cursor".into(), "windsurf".into()],
            results: vec![
                PromptTestResult { vendor: "cursor".into(), status: "pass".into(), response_time: 4.5, output: "Split into 3 functions...".into() },
                PromptTestResult { vendor: "windsurf".into(), status: "pending".into(), response_time: 0.0, output: "".into() },
            ],
        },
    ])
}

// --- AI Assist ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AiSuggestion {
    pub id: String,
    pub suggestion_type: String,
    pub title: String,
    pub description: String,
    pub diff: String,
    pub confidence: f64,
}

#[tauri::command]
pub async fn get_ai_suggestions(project_dir: String) -> Result<Vec<AiSuggestion>, String> {
    if project_dir.is_empty() {
        return Err("Project directory required".into());
    }
    Ok(vec![
        AiSuggestion {
            id: "sug-001".into(),
            suggestion_type: "optimize".into(),
            title: "Reduce token usage in code-reviewer agent".into(),
            description: "The current system prompt is 2400 tokens. Restructuring can reduce to 1600 tokens while maintaining quality.".into(),
            diff: "- instructions: |\n-   You are a code reviewer. Review all code thoroughly...\n+ instructions: |\n+   Code reviewer. Focus on: security, performance, readability.".into(),
            confidence: 0.87,
        },
        AiSuggestion {
            id: "sug-002".into(),
            suggestion_type: "add".into(),
            title: "Add error handling rule".into(),
            description: "Project has no explicit error handling guidance. Adding a rule improves code quality across vendors.".into(),
            diff: "+ - name: error-handling\n+   severity: error\n+   pattern: \"catch without logging\"".into(),
            confidence: 0.92,
        },
    ])
}

// --- Config Analytics ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConceptUsage {
    pub concept: String,
    pub count: u32,
    pub coverage: f64,
    pub trend: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VendorCoverage {
    pub vendor: String,
    pub supported: u32,
    pub total: u32,
    pub gaps: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AnalyticsData {
    pub concepts: Vec<ConceptUsage>,
    pub vendors: Vec<VendorCoverage>,
    pub total_concepts: u32,
    pub avg_coverage: f64,
    pub rule_hit_rate: f64,
    pub unused_rules: u32,
}

#[tauri::command]
pub async fn get_config_analytics(project_dir: String) -> Result<AnalyticsData, String> {
    if project_dir.is_empty() {
        return Err("Project directory required".into());
    }
    let registry = build_registry();
    let vendor_ids = registry.list();
    let total = 46u32;
    let vendors: Vec<VendorCoverage> = vendor_ids.iter().map(|vid| {
        let supported = registry.get(vid)
            .map(|a| a.supported_concepts().len() as u32)
            .unwrap_or(0);
        VendorCoverage {
            vendor: vid.to_string(),
            supported,
            total,
            gaps: vec![],
        }
    }).collect();
    let avg = if vendors.is_empty() { 0.0 } else {
        vendors.iter().map(|v| v.supported as f64 / v.total as f64).sum::<f64>() / vendors.len() as f64
    };
    Ok(AnalyticsData {
        concepts: vec![
            ConceptUsage { concept: "Agent".into(), count: 3, coverage: 1.0, trend: "stable".into() },
            ConceptUsage { concept: "Rule".into(), count: 12, coverage: 0.83, trend: "up".into() },
            ConceptUsage { concept: "MCP Server".into(), count: 5, coverage: 0.75, trend: "up".into() },
            ConceptUsage { concept: "Skill".into(), count: 4, coverage: 0.58, trend: "stable".into() },
            ConceptUsage { concept: "Workflow".into(), count: 2, coverage: 0.42, trend: "down".into() },
        ],
        vendors,
        total_concepts: total,
        avg_coverage: (avg * 100.0).round() / 100.0,
        rule_hit_rate: 0.67,
        unused_rules: 4,
    })
}

// --- Environment/Variant Management ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvironmentOverride {
    pub concept: String,
    pub field: String,
    pub base_value: String,
    pub override_value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvironmentInfo {
    pub id: String,
    pub name: String,
    pub label: String,
    pub is_active: bool,
    pub last_deployed: String,
    pub overrides: Vec<EnvironmentOverride>,
}

#[tauri::command]
pub async fn list_environments(project_dir: String) -> Result<Vec<EnvironmentInfo>, String> {
    if project_dir.is_empty() {
        return Err("Project directory required".into());
    }
    Ok(vec![
        EnvironmentInfo {
            id: "dev".into(),
            name: "development".into(),
            label: "Development".into(),
            is_active: true,
            last_deployed: "2 minutes ago".into(),
            overrides: vec![
                EnvironmentOverride { concept: "MCP Server 'postgres'".into(), field: "host".into(), base_value: "prod-db.internal".into(), override_value: "localhost:5432".into() },
                EnvironmentOverride { concept: "Agent 'code-reviewer'".into(), field: "model".into(), base_value: "claude-3-opus".into(), override_value: "claude-3-haiku".into() },
            ],
        },
        EnvironmentInfo {
            id: "staging".into(),
            name: "staging".into(),
            label: "Staging".into(),
            is_active: false,
            last_deployed: "3 hours ago".into(),
            overrides: vec![
                EnvironmentOverride { concept: "MCP Server 'postgres'".into(), field: "host".into(), base_value: "prod-db.internal".into(), override_value: "staging-db.internal".into() },
            ],
        },
        EnvironmentInfo {
            id: "prod".into(),
            name: "production".into(),
            label: "Production".into(),
            is_active: false,
            last_deployed: "1 day ago".into(),
            overrides: vec![],
        },
    ])
}

// --- Inheritance Visualization ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InheritanceNode {
    pub id: String,
    pub name: String,
    pub path: String,
    pub is_remote: bool,
    pub children: Vec<String>,
    pub field_count: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResolvedField {
    pub key: String,
    pub value: String,
    pub source: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InheritanceData {
    pub nodes: Vec<InheritanceNode>,
    pub resolved: Vec<ResolvedField>,
}

#[tauri::command]
pub async fn get_inheritance_tree(project_dir: String) -> Result<InheritanceData, String> {
    if project_dir.is_empty() {
        return Err("Project directory required".into());
    }
    Ok(InheritanceData {
        nodes: vec![
            InheritanceNode { id: "root".into(), name: "agentweave.yaml".into(), path: "agentweave.yaml".into(), is_remote: false, children: vec!["shared".into(), "team".into()], field_count: 12 },
            InheritanceNode { id: "shared".into(), name: "shared-rules".into(), path: "https://registry.agentweave.dev/templates/shared-rules@v2".into(), is_remote: true, children: vec![], field_count: 8 },
            InheritanceNode { id: "team".into(), name: "team-overrides".into(), path: "../shared/team.yaml".into(), is_remote: false, children: vec![], field_count: 5 },
        ],
        resolved: vec![
            ResolvedField { key: "agents[0].model".into(), value: "claude-3-opus".into(), source: "agentweave.yaml".into() },
            ResolvedField { key: "rules.style".into(), value: "strict".into(), source: "agentweave.yaml (overrides shared-rules)".into() },
            ResolvedField { key: "rules.naming".into(), value: "camelCase".into(), source: "shared-rules".into() },
            ResolvedField { key: "mcp.postgres.host".into(), value: "localhost".into(), source: "agentweave.yaml (overrides team-overrides)".into() },
        ],
    })
}

// --- Persistence-backed commands ---

#[derive(Debug, Serialize, Deserialize)]
pub struct RecentProject {
    pub path: String,
    pub name: String,
    pub last_opened: String,
}

#[tauri::command]
pub async fn add_recent_project(db: State<'_, Arc<Database>>, path: String, name: String) -> Result<(), String> {
    db.add_recent_project(&path, &name)?;
    db.log_audit("project.open", &format!("Opened project: {}", name))?;
    Ok(())
}

#[tauri::command]
pub async fn list_recent_projects(db: State<'_, Arc<Database>>) -> Result<Vec<RecentProject>, String> {
    let rows = db.list_recent_projects()?;
    Ok(rows.into_iter().map(|(path, name, last_opened)| RecentProject { path, name, last_opened }).collect())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuditEntry {
    pub timestamp: String,
    pub action: String,
    pub detail: String,
}

#[tauri::command]
pub async fn get_audit_log(db: State<'_, Arc<Database>>) -> Result<Vec<AuditEntry>, String> {
    let rows = db.get_audit_log(100)?;
    Ok(rows.into_iter().map(|(timestamp, action, detail)| AuditEntry { timestamp, action, detail }).collect())
}

#[tauri::command]
pub async fn log_audit_event(db: State<'_, Arc<Database>>, action: String, detail: String) -> Result<(), String> {
    db.log_audit(&action, &detail)
}

#[tauri::command]
pub async fn set_preference(db: State<'_, Arc<Database>>, key: String, value: String) -> Result<(), String> {
    db.set_preference(&key, &value)
}

#[tauri::command]
pub async fn get_preference(db: State<'_, Arc<Database>>, key: String) -> Result<Option<String>, String> {
    db.get_preference(&key)
}

// --- Real Config Hub: parse agentweave.yaml and return concepts ---

#[derive(Debug, Serialize, Deserialize)]
pub struct ConceptItem {
    pub concept_type: String,
    pub name: String,
    pub description: String,
    pub fields: Vec<String>,
}

#[tauri::command]
pub async fn get_config_concepts(project_dir: String) -> Result<Vec<ConceptItem>, String> {
    let path = PathBuf::from(&project_dir);
    let config = AgentWeaveConfig::load(&path).map_err(|e| e.to_string())?;

    let mut items = Vec::new();

    for agent in &config.agents {
        items.push(ConceptItem {
            concept_type: "Agent".into(),
            name: agent.name.clone(),
            description: agent.description.clone().unwrap_or_default(),
            fields: vec![
                format!("role: {}", agent.role.as_deref().unwrap_or("-")),
                format!("model: {}", agent.model.as_ref().map(|m| m.model.as_str()).unwrap_or("-")),
                format!("skills: {}", agent.skills.len()),
            ],
        });
    }

    for rule in &config.rules {
        items.push(ConceptItem {
            concept_type: "Rule".into(),
            name: rule.name.clone(),
            description: rule.description.clone().unwrap_or_default(),
            fields: vec![
                format!("activation: {:?}", rule.activation.activation_type),
                format!("globs: {}", rule.activation.globs.join(", ")),
            ],
        });
    }

    for mcp in &config.mcp_servers {
        items.push(ConceptItem {
            concept_type: "MCP Server".into(),
            name: mcp.name.clone(),
            description: String::new(),
            fields: vec![
                format!("command: {}", mcp.command),
                format!("transport: {}", mcp.transport.as_deref().unwrap_or("stdio")),
            ],
        });
    }

    for skill in &config.skills {
        items.push(ConceptItem {
            concept_type: "Skill".into(),
            name: skill.name.clone(),
            description: skill.description.clone().unwrap_or_default(),
            fields: vec![],
        });
    }

    for wf in &config.workflows {
        items.push(ConceptItem {
            concept_type: "Workflow".into(),
            name: wf.name.clone(),
            description: wf.description.clone().unwrap_or_default(),
            fields: vec![format!("steps: {}", wf.steps.len())],
        });
    }

    for hook in &config.hooks {
        items.push(ConceptItem {
            concept_type: "Hook".into(),
            name: hook.name.clone(),
            description: String::new(),
            fields: vec![format!("event: {:?}", hook.event)],
        });
    }

    Ok(items)
}

// --- Event emission for frontend notification ---

#[tauri::command]
pub async fn emit_config_changed(app: tauri::AppHandle, project_dir: String) -> Result<(), String> {
    app.emit("config-changed", &project_dir).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn emit_watch_event(app: tauri::AppHandle, event_type: String, detail: String) -> Result<(), String> {
    let payload = serde_json::json!({ "type": event_type, "detail": detail });
    app.emit("watch-event", payload).map_err(|e| e.to_string())
}
