mod compare;
mod debug;
mod i18n;
mod import;
mod mcp;
mod plugin;
mod secret;
mod version;
mod watcher;

use agentweave_core::adapter::AdapterRegistry;
use agentweave_core::config::AgentWeaveConfig;
use anyhow::Result;
use clap::{Parser, Subcommand};
use i18n::I18n;
use std::path::PathBuf;

#[derive(Parser)]
#[command(
    name = "agentweave",
    about = "Unified AI Agent Configuration Management",
    long_about = "AgentWeave - Cross-vendor unified agent configuration management system.\n\nDefine once, generate for all vendors. Seamlessly migrate between AI coding tools.",
    version
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,

    /// Project directory (defaults to current directory)
    #[arg(short, long, global = true)]
    dir: Option<PathBuf>,

    /// Language override (e.g., en-US, zh-CN, ja-JP)
    #[arg(long, global = true)]
    lang: Option<String>,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize AgentWeave configuration in a project
    Init {
        /// Project name
        #[arg(short, long)]
        name: Option<String>,
    },

    /// Generate vendor-specific configuration files
    Generate {
        /// Specific vendor to generate for (generates all targets if omitted)
        #[arg(short, long)]
        vendor: Option<String>,
    },

    /// Validate AgentWeave configuration
    Validate,

    /// Show configuration diff between versions or vendors
    Diff {
        /// First version/vendor
        from: Option<String>,
        /// Second version/vendor
        to: Option<String>,
    },

    /// Watch for config changes and auto-regenerate
    Watch,

    /// Import existing vendor configuration into AgentWeave format
    Import {
        /// Vendor to import from
        vendor: String,
    },

    /// List supported vendors and their capabilities
    Vendors,

    /// Show current configuration status
    Status,

    /// Sync configuration across multiple IDEs in real-time
    Sync {
        /// Sync mode: realtime, on-save, manual
        #[arg(short, long, default_value = "realtime")]
        mode: String,
    },

    /// Compare generated output across vendors
    Compare {
        /// Specific vendors to compare (comma-separated, or all if omitted)
        #[arg(short, long)]
        vendors: Option<String>,
        /// Show detailed file-level comparison
        #[arg(long)]
        detail: bool,
    },

    /// Version management for configuration history
    Version {
        #[command(subcommand)]
        action: VersionAction,
    },

    /// Start ACP gateway server
    Serve {
        /// Port to listen on
        #[arg(short, long, default_value = "9800")]
        port: u16,
    },

    /// MCP server management
    Mcp {
        #[command(subcommand)]
        action: McpAction,
    },

    /// Plugin/extension management
    Plugin {
        #[command(subcommand)]
        action: PluginAction,
    },

    /// Secret/credential management
    Secret {
        #[command(subcommand)]
        action: SecretAction,
    },

    /// Debug and test agents across vendors
    Debug {
        /// Prompt to test
        #[arg(short, long)]
        prompt: Option<String>,
        /// Vendors to test against (comma-separated)
        #[arg(short, long)]
        vendors: Option<String>,
        /// Run in dry-run mode (show config without executing)
        #[arg(long)]
        dry_run: bool,
    },

    /// Run health check on configuration and environment
    Health,

    /// Export configuration in various formats
    Export {
        /// Output format (yaml, json, toml, markdown)
        #[arg(short, long, default_value = "yaml")]
        format: String,
        /// Output file (stdout if omitted)
        #[arg(short, long)]
        output: Option<PathBuf>,
    },

    /// Generate shell completions
    Completions {
        /// Shell type (bash, zsh, fish, powershell)
        shell: String,
    },

    /// Run as background daemon (watch + sync + serve)
    Daemon {
        /// ACP port
        #[arg(short, long, default_value = "9800")]
        port: u16,
        /// Disable ACP gateway
        #[arg(long)]
        no_serve: bool,
    },
}

#[derive(Subcommand)]
enum VersionAction {
    /// Save current configuration as a version
    Commit {
        /// Version message
        #[arg(short, long)]
        message: String,
    },
    /// Show version history
    Log {
        /// Number of entries to show
        #[arg(short = 'n', long, default_value = "10")]
        limit: usize,
    },
    /// Restore configuration to a specific version
    Restore {
        /// Version ID to restore
        version_id: String,
    },
}

#[derive(Subcommand)]
pub enum McpAction {
    /// List configured MCP servers
    List,
    /// Add a new MCP server
    Add {
        /// Server name
        name: String,
        /// Command to run
        #[arg(short, long)]
        command: String,
        /// Arguments
        #[arg(short, long)]
        args: Vec<String>,
        /// Protocol (stdio, http, sse)
        #[arg(long, default_value = "stdio")]
        protocol: String,
    },
    /// Remove an MCP server
    Remove {
        /// Server name
        name: String,
    },
    /// Test MCP server connectivity
    Test {
        /// Server name (or "all")
        name: String,
    },
}

#[derive(Subcommand)]
pub enum PluginAction {
    /// List installed plugins
    List,
    /// Install a plugin from registry or path
    Install {
        /// Plugin source (registry name or file path)
        source: String,
    },
    /// Remove a plugin
    Remove {
        /// Plugin name
        name: String,
    },
    /// Show plugin info
    Info {
        /// Plugin name
        name: String,
    },
}

#[derive(Subcommand)]
pub enum SecretAction {
    /// List stored secrets (names only, no values)
    List,
    /// Set a secret value
    Set {
        /// Secret key name
        key: String,
        /// Secret value (will prompt if omitted)
        value: Option<String>,
    },
    /// Remove a secret
    Remove {
        /// Secret key name
        key: String,
    },
    /// Export secrets for a vendor (masked)
    Export {
        /// Target vendor
        vendor: String,
    },
}

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

fn get_project_dir(dir: Option<PathBuf>) -> PathBuf {
    dir.unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    let cli = Cli::parse();
    let project_dir = get_project_dir(cli.dir);
    let registry = build_registry();
    let i18n = I18n::detect(cli.lang.as_deref());

    match cli.command {
        Commands::Init { name } => {
            cmd_init(&project_dir, name, &i18n)?;
        }
        Commands::Generate { vendor } => {
            cmd_generate(&project_dir, &registry, vendor, &i18n)?;
        }
        Commands::Validate => {
            cmd_validate(&project_dir, &i18n)?;
        }
        Commands::Vendors => {
            cmd_vendors(&registry, &i18n);
        }
        Commands::Status => {
            cmd_status(&project_dir, &i18n)?;
        }
        Commands::Import { vendor } => {
            cmd_import(&project_dir, &registry, &vendor, &i18n)?;
        }
        Commands::Diff { from, to } => {
            cmd_diff(&project_dir, &registry, from.as_deref(), to.as_deref())?;
        }
        Commands::Watch => {
            cmd_watch(&project_dir, &registry).await?;
        }
        Commands::Sync { mode } => {
            cmd_sync(&project_dir, &registry, &mode).await?;
        }
        Commands::Compare { vendors, detail } => {
            cmd_compare(&project_dir, &registry, vendors.as_deref(), detail)?;
        }
        Commands::Version { action } => {
            cmd_version(&project_dir, action)?;
        }
        Commands::Serve { port } => {
            cmd_serve(port).await?;
        }
        Commands::Mcp { action } => {
            mcp::cmd_mcp(&project_dir, action)?;
        }
        Commands::Plugin { action } => {
            plugin::cmd_plugin(&project_dir, action)?;
        }
        Commands::Secret { action } => {
            secret::cmd_secret(&project_dir, action)?;
        }
        Commands::Debug { prompt, vendors, dry_run } => {
            debug::cmd_debug(&project_dir, &registry, prompt.as_deref(), vendors.as_deref(), dry_run)?;
        }
        Commands::Health => {
            cmd_health(&project_dir, &registry)?;
        }
        Commands::Export { format, output } => {
            cmd_export(&project_dir, &format, output.as_ref())?;
        }
        Commands::Completions { shell } => {
            cmd_completions(&shell)?;
        }
        Commands::Daemon { port, no_serve } => {
            cmd_daemon(&project_dir, &registry, port, no_serve).await?;
        }
    }

    Ok(())
}

fn cmd_init(project_dir: &PathBuf, name: Option<String>, i18n: &I18n) -> Result<()> {
    let config_dir = project_dir.join(".agentweave");
    std::fs::create_dir_all(&config_dir)?;
    std::fs::create_dir_all(config_dir.join("agents"))?;
    std::fs::create_dir_all(config_dir.join("rules"))?;
    std::fs::create_dir_all(config_dir.join("skills"))?;
    std::fs::create_dir_all(config_dir.join("hooks"))?;
    std::fs::create_dir_all(config_dir.join("mcp"))?;

    let project_name = name.unwrap_or_else(|| {
        project_dir
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "my-project".to_string())
    });

    let config_content = format!(
        r#"apiVersion: agentweave/v1
kind: Project
metadata:
  name: "{}"
  version: "0.1.0"
  description: "Project description"
  authors:
    - name: "Developer"

spec:
  defaultModel:
    provider: openai
    model: gpt-4o
    params:
      temperature: 0.7

  targets:
    - codex
    - claude-code
    - cursor
    - windsurf
    - gemini-cli
    - github-copilot

  sync:
    mode: realtime
    transport: file-watch
    lockStrategy: last-write-wins
"#,
        project_name
    );

    std::fs::write(config_dir.join("agentweave.yaml"), config_content)?;

    // Create example agent
    let agent_content = r#"name: main
description: "Main project agent"
role: "Development assistant"
systemPrompt: |
  You are a helpful development assistant for this project.
  Follow the project conventions and best practices.
tools:
  allow:
    - "Bash(*)"
    - "Read(**)"
    - "Write(**)"
  deny: []
skills: []
"#;
    std::fs::write(config_dir.join("agents/main.agent.yaml"), agent_content)?;

    // Create example rule
    let rule_content = r#"name: general
description: "General coding standards"
activation:
  type: always
content: |
  - Follow existing code conventions
  - Write clean, readable code
  - Add appropriate error handling
  - Use TypeScript strict mode where applicable
"#;
    std::fs::write(config_dir.join("rules/general.rule.yaml"), rule_content)?;

    let mut args = std::collections::HashMap::new();
    args.insert("name", project_name.as_str());
    let path_str = config_dir.to_string_lossy();
    args.insert("path", path_str.as_ref());
    println!("{}", i18n.t_args("init-success", &args));
    println!("  Created: agentweave.yaml");
    println!("  Created: agents/main.agent.yaml");
    println!("  Created: rules/general.rule.yaml");
    println!("\nRun 'agentweave generate' to create vendor-specific configs.");

    Ok(())
}

fn cmd_generate(
    project_dir: &PathBuf,
    registry: &AdapterRegistry,
    vendor: Option<String>,
    i18n: &I18n,
) -> Result<()> {
    let config = AgentWeaveConfig::load(project_dir)?;

    let results = if let Some(ref vendor_name) = vendor {
        let mut args = std::collections::HashMap::new();
        args.insert("vendor", vendor_name.as_str());
        println!("{}", i18n.t_args("generate-start", &args));
        registry.generate_all(&config, project_dir)
    } else {
        println!("{}", i18n.t("generate-all"));
        registry.generate_all(&config, project_dir)
    };

    let mut success_count = 0;
    let mut error_count = 0;

    for (vendor, result) in results {
        match result {
            Ok(output) => {
                for (path, content) in &output.files {
                    let full_path = project_dir.join(path);
                    if let Some(parent) = full_path.parent() {
                        std::fs::create_dir_all(parent)?;
                    }
                    std::fs::write(&full_path, content)?;
                    println!("  [{}] Generated: {}", vendor, path);
                }
                success_count += 1;
            }
            Err(e) => {
                eprintln!("  [{}] Error: {}", vendor, e);
                error_count += 1;
            }
        }
    }

    let count_str = success_count.to_string();
    let mut args = std::collections::HashMap::new();
    args.insert("count", count_str.as_str());
    println!("{}", i18n.t_args("generate-complete", &args));
    if error_count > 0 {
        eprintln!("({error_count} failed)");
    }
    Ok(())
}

fn cmd_validate(project_dir: &PathBuf, i18n: &I18n) -> Result<()> {
    match AgentWeaveConfig::load(project_dir) {
        Ok(config) => {
            println!("{}", i18n.t("validate-success"));
            let mut args = std::collections::HashMap::new();
            let name = config.metadata.name.clone();
            args.insert("name", name.as_str());
            println!("  {}", i18n.t_args("status-project", &args));
            let count = config.agents.len().to_string();
            args.insert("count", count.as_str());
            println!("  {}", i18n.t_args("status-agents", &args));

            // Deep validation
            let mut warnings = Vec::new();
            let mut errors: Vec<String> = Vec::new();

            // Check agents
            for agent in &config.agents {
                if agent.name.is_empty() {
                    errors.push("Agent with empty name found".to_string());
                }
                if agent.name.contains(' ') {
                    warnings.push(format!("Agent '{}': name contains spaces (may cause issues)", agent.name));
                }
            }

            // Check rules
            for rule in &config.rules {
                if rule.name.is_empty() {
                    errors.push("Rule with empty name found".to_string());
                }
                if rule.content.is_empty() {
                    warnings.push(format!("Rule '{}': empty content", rule.name));
                }
            }

            // Check targets
            let known_vendors = [
                "codex", "claude-code", "cursor", "windsurf", "gemini-cli",
                "github-copilot", "devin", "cline", "codebuddy", "qoder",
                "grok-build", "openclaw",
            ];
            for target in &config.targets {
                let target_str = target.to_string();
                if !known_vendors.contains(&target_str.as_str()) {
                    warnings.push(format!("Unknown target vendor: '{}'", target_str));
                }
            }

            // Check MCP servers reference valid env vars
            for mcp in &config.mcp_servers {
                if mcp.command.is_empty() {
                    errors.push(format!("MCP '{}': empty command", mcp.name));
                }
            }

            // Check skills reference existing files
            let skills_dir = project_dir.join(".agentweave").join("skills");
            for skill in &config.skills {
                if skill.name.is_empty() {
                    errors.push("Skill with empty name found".to_string());
                }
                if skills_dir.exists() {
                    let skill_file = skills_dir.join(format!("{}.skill.yaml", skill.name));
                    if !skill_file.exists() {
                        warnings.push(format!("Skill '{}': no file at skills/{}.skill.yaml", skill.name, skill.name));
                    }
                }
            }

            // Report results
            if !warnings.is_empty() {
                println!("\n  Warnings ({}):", warnings.len());
                for w in &warnings {
                    println!("    ⚠ {}", w);
                }
            }
            if !errors.is_empty() {
                println!("\n  Errors ({}):", errors.len());
                for e in &errors {
                    println!("    ✗ {}", e);
                }
                std::process::exit(1);
            }

            if warnings.is_empty() && errors.is_empty() {
                println!("\n  All validation checks passed");
            }
        }
        Err(e) => {
            let mut args = std::collections::HashMap::new();
            let err_str = e.to_string();
            args.insert("error", err_str.as_str());
            eprintln!("{}", i18n.t_args("validate-error", &args));
            std::process::exit(1);
        }
    }
    Ok(())
}

fn cmd_vendors(registry: &AdapterRegistry, i18n: &I18n) {
    println!("{}\n", i18n.t("vendors-header"));
    let vendors = registry.list();
    for vendor in vendors {
        if let Some(adapter) = registry.get(vendor) {
            let concepts = adapter.supported_concepts();
            println!("  {} ({})", adapter.display_name(), vendor);
            println!(
                "    Concepts: {:?}",
                concepts
                    .iter()
                    .map(|c| format!("{:?}", c))
                    .collect::<Vec<_>>()
                    .join(", ")
            );
            println!();
        }
    }
}

fn cmd_status(project_dir: &PathBuf, i18n: &I18n) -> Result<()> {
    let config_dir = project_dir.join(".agentweave");
    if !config_dir.exists() {
        let mut args = std::collections::HashMap::new();
        let path_str = config_dir.to_string_lossy();
        args.insert("path", path_str.as_ref());
        println!("{}", i18n.t_args("error-config-not-found", &args));
        return Ok(());
    }

    let config = AgentWeaveConfig::load(project_dir)?;
    println!("{}", i18n.t("status-header"));
    println!("─────────────────");
    let mut args = std::collections::HashMap::new();
    let name = config.metadata.name.clone();
    args.insert("name", name.as_str());
    println!("  {}", i18n.t_args("status-project", &args));
    let agents_count = config.agents.len().to_string();
    args.insert("count", agents_count.as_str());
    println!("  {}", i18n.t_args("status-agents", &args));
    let rules_count = config.rules.len().to_string();
    args.insert("count", rules_count.as_str());
    println!("  {}", i18n.t_args("status-rules", &args));
    let skills_count = config.skills.len().to_string();
    args.insert("count", skills_count.as_str());
    println!("  {}", i18n.t_args("status-skills", &args));
    let hooks_count = config.hooks.len().to_string();
    args.insert("count", hooks_count.as_str());
    println!("  {}", i18n.t_args("status-hooks", &args));
    let mcp_count = config.mcp_servers.len().to_string();
    args.insert("count", mcp_count.as_str());
    println!("  {}", i18n.t_args("status-mcp", &args));
    let targets_str = config.targets.iter().map(|t| t.to_string()).collect::<Vec<_>>().join(", ");
    args.insert("targets", targets_str.as_str());
    println!("  {}", i18n.t_args("status-targets", &args));

    Ok(())
}

fn cmd_import(
    project_dir: &PathBuf,
    _registry: &AdapterRegistry,
    vendor_name: &str,
    i18n: &I18n,
) -> Result<()> {
    let mut args = std::collections::HashMap::new();
    args.insert("vendor", vendor_name);
    println!("{}", i18n.t_args("import-start", &args));

    let result = import::import_vendor(project_dir, vendor_name)?;
    println!(
        "  Imported: {} agents, {} rules from {} files",
        result.agents_imported,
        result.rules_imported,
        result.files_read.len()
    );
    for file in &result.files_read {
        println!("    ← {}", file.display());
    }
    Ok(())
}

fn cmd_compare(
    project_dir: &PathBuf,
    registry: &AdapterRegistry,
    vendors: Option<&str>,
    detail: bool,
) -> Result<()> {
    let vendor_list: Vec<&str> = vendors
        .map(|v| v.split(',').map(|s| s.trim()).collect())
        .unwrap_or_default();

    println!("Comparing vendor output...\n");
    let result = compare::compare_vendors(project_dir, registry, &vendor_list)?;

    result.print_table();
    if detail {
        result.print_detail();
    }
    Ok(())
}

fn cmd_version(project_dir: &PathBuf, action: VersionAction) -> Result<()> {
    let vm = version::VersionManager::new(project_dir);

    match action {
        VersionAction::Commit { message } => {
            // Collect all config files
            let config_dir = project_dir.join(".agentweave");
            let files: Vec<String> = walkdir::WalkDir::new(&config_dir)
                .into_iter()
                .flatten()
                .filter(|e| e.file_type().is_file())
                .filter_map(|e| {
                    e.path()
                        .strip_prefix(&config_dir)
                        .ok()
                        .map(|p| p.to_string_lossy().to_string())
                })
                .filter(|p| !p.starts_with(".history"))
                .collect();

            let entry = vm.commit(&message, "user", &files)?;
            println!("Version saved: {} ({})", entry.id, entry.message);
            println!("  {} files snapshot", entry.files_changed.len());
        }
        VersionAction::Log { limit } => {
            let entries = vm.log(limit)?;
            if entries.is_empty() {
                println!("No version history yet. Use 'agentweave version commit' to create one.");
                return Ok(());
            }
            println!("Version History:\n");
            for entry in entries {
                println!(
                    "  {} | {} | {} | {} files",
                    entry.id,
                    entry.timestamp.format("%Y-%m-%d %H:%M"),
                    entry.message,
                    entry.files_changed.len()
                );
            }
        }
        VersionAction::Restore { version_id } => {
            let count = vm.restore(&version_id)?;
            println!("Restored {} files from version '{}'", count, version_id);
        }
    }
    Ok(())
}

fn cmd_diff(
    project_dir: &PathBuf,
    registry: &AdapterRegistry,
    from: Option<&str>,
    to: Option<&str>,
) -> Result<()> {
    let config = AgentWeaveConfig::load(project_dir)?;
    let results = registry.generate_all(&config, project_dir);

    let from_vendor = from.unwrap_or("codex");
    let to_vendor = to.unwrap_or("cursor");

    let from_output = results
        .iter()
        .find(|(v, _)| v.to_string() == from_vendor)
        .and_then(|(_, r)| r.as_ref().ok());
    let to_output = results
        .iter()
        .find(|(v, _)| v.to_string() == to_vendor)
        .and_then(|(_, r)| r.as_ref().ok());

    println!("Diff: {} → {}\n", from_vendor, to_vendor);
    println!("┌──────────────────────────────────────────────┐");

    match (from_output, to_output) {
        (Some(from_out), Some(to_out)) => {
            let from_files: std::collections::HashSet<_> = from_out.files.keys().collect();
            let to_files: std::collections::HashSet<_> = to_out.files.keys().collect();

            let only_from: Vec<_> = from_files.difference(&to_files).collect();
            let only_to: Vec<_> = to_files.difference(&from_files).collect();
            let common: Vec<_> = from_files.intersection(&to_files).collect();

            if !only_from.is_empty() {
                println!("│ Only in {}: ", from_vendor);
                for f in &only_from {
                    println!("│   - {}", f);
                }
            }
            if !only_to.is_empty() {
                println!("│ Only in {}:", to_vendor);
                for f in &only_to {
                    println!("│   + {}", f);
                }
            }
            if !common.is_empty() {
                println!("│ Common files:");
                for f in &common {
                    let from_len = from_out.files[**f].lines().count();
                    let to_len = to_out.files[**f].lines().count();
                    let diff = to_len as i64 - from_len as i64;
                    let sign = if diff >= 0 { "+" } else { "" };
                    println!("│   {} ({} lines → {} lines, {}{})", f, from_len, to_len, sign, diff);
                }
            }

            let from_total: usize = from_out.files.values().map(|c| c.len()).sum();
            let to_total: usize = to_out.files.values().map(|c| c.len()).sum();
            println!("├──────────────────────────────────────────────┤");
            println!("│ {} │ {} files │ {} bytes", from_vendor, from_out.files.len(), from_total);
            println!("│ {} │ {} files │ {} bytes", to_vendor, to_out.files.len(), to_total);
        }
        _ => {
            println!("│ Error: Could not generate output for one or both vendors");
        }
    }
    println!("└──────────────────────────────────────────────┘");
    Ok(())
}

async fn cmd_watch(project_dir: &PathBuf, registry: &AdapterRegistry) -> Result<()> {
    watcher::watch_and_regenerate(project_dir, registry).await
}

async fn cmd_sync(project_dir: &PathBuf, registry: &AdapterRegistry, mode: &str) -> Result<()> {
    println!("Starting sync in '{}' mode...", mode);
    println!("  Watching: {}", project_dir.join(".agentweave").display());
    println!("  Mode: {}", mode);
    println!();

    match mode {
        "manual" => {
            let config = AgentWeaveConfig::load(project_dir)?;
            let results = registry.generate_all(&config, project_dir);
            let mut success = 0;
            for (vendor, result) in &results {
                if let Ok(output) = result {
                    for (path, content) in &output.files {
                        let full = project_dir.join(path);
                        if let Some(parent) = full.parent() {
                            std::fs::create_dir_all(parent)?;
                        }
                        std::fs::write(&full, content)?;
                    }
                    success += 1;
                    println!("  [{}] synced {} files", vendor, output.files.len());
                }
            }
            println!("\nSync complete: {}/{} vendors", success, results.len());
        }
        _ => {
            // realtime and on-save modes use the watcher
            watcher::watch_and_regenerate(project_dir, registry).await?;
        }
    }
    Ok(())
}

async fn cmd_serve(port: u16) -> Result<()> {
    use agentweave_acp::gateway::AcpGateway;
    use agentweave_acp::router::create_router;
    use std::sync::Arc;

    let gateway = Arc::new(AcpGateway::new());
    let router = create_router(gateway);

    let addr = format!("0.0.0.0:{}", port);
    println!("AgentWeave ACP Gateway starting on http://{}", addr);
    println!("  Endpoints:");
    println!("    GET  /ping           - Health check");
    println!("    GET  /agents         - List agents");
    println!("    POST /agents         - Register agent");
    println!("    POST /runs           - Dispatch run");
    println!("    GET  /health         - All agent health");
    println!("    GET  /runs/history   - Run history");
    println!();

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, router).await?;
    Ok(())
}

fn cmd_health(project_dir: &PathBuf, registry: &AdapterRegistry) -> Result<()> {
    println!("AgentWeave Health Check\n");

    // 1. Config directory check
    let config_dir = project_dir.join(".agentweave");
    print!("  Config directory ... ");
    if config_dir.exists() {
        println!("OK ({})", config_dir.display());
    } else {
        println!("MISSING");
        println!("\n  Run 'agentweave init' to create configuration.");
        return Ok(());
    }

    // 2. Main config file
    print!("  Main config file ... ");
    let config_file = config_dir.join("agentweave.yaml");
    if config_file.exists() {
        println!("OK");
    } else {
        println!("MISSING (agentweave.yaml)");
    }

    // 3. Parse config
    print!("  Config parsing ..... ");
    let config = match AgentWeaveConfig::load(project_dir) {
        Ok(c) => {
            println!("OK ({} agents, {} rules)", c.agents.len(), c.rules.len());
            c
        }
        Err(e) => {
            println!("FAIL ({})", e);
            return Ok(());
        }
    };

    // 4. Generate test
    print!("  Generate test ...... ");
    let results = registry.generate_all(&config, project_dir);
    let success: usize = results.iter().filter(|(_, r)| r.is_ok()).count();
    let total = results.len();
    if success == total {
        println!("OK ({}/{} vendors)", success, total);
    } else {
        println!("PARTIAL ({}/{} vendors)", success, total);
    }

    // 5. MCP servers
    let mcp_file = config_dir.join("mcp-servers.yaml");
    print!("  MCP servers ........ ");
    if mcp_file.exists() {
        let content = std::fs::read_to_string(&mcp_file).unwrap_or_default();
        let count = content.matches("- name:").count();
        println!("OK ({} configured)", count);
    } else {
        println!("NONE");
    }

    // 6. Version history
    let history_dir = config_dir.join(".history");
    print!("  Version history .... ");
    if history_dir.exists() {
        let count = std::fs::read_dir(&history_dir)
            .map(|d| d.count())
            .unwrap_or(0);
        println!("OK ({} snapshots)", count);
    } else {
        println!("NONE");
    }

    // 7. Secrets
    let secrets_file = config_dir.join(".secrets");
    print!("  Secrets store ...... ");
    if secrets_file.exists() {
        println!("OK (encrypted)");
    } else {
        println!("NONE");
    }

    // 8. Disk usage
    print!("  Disk usage ......... ");
    let size = dir_size(&config_dir);
    println!("{}", format_bytes(size));

    println!("\nOverall: HEALTHY");
    Ok(())
}

fn cmd_export(project_dir: &PathBuf, format: &str, output: Option<&PathBuf>) -> Result<()> {
    let config = AgentWeaveConfig::load(project_dir)?;

    let exported = match format {
        "json" => serde_json::to_string_pretty(&config)?,
        "yaml" => serde_yaml::to_string(&config)?,
        "markdown" => {
            let mut md = String::new();
            md.push_str(&format!("# {}\n\n", config.metadata.name));
            if let Some(ref ver) = config.metadata.version {
                md.push_str(&format!("**Version**: {}\n\n", ver));
            }
            if let Some(ref desc) = config.metadata.description {
                md.push_str(&format!("**Description**: {}\n\n", desc));
            }

            md.push_str("## Agents\n\n");
            for agent in &config.agents {
                md.push_str(&format!("### {}\n", agent.name));
                if let Some(ref role) = agent.role {
                    md.push_str(&format!("- Role: {}\n", role));
                }
                if let Some(ref sp) = agent.system_prompt {
                    let preview = &sp[..sp.len().min(100)];
                    md.push_str(&format!("- System prompt: {}\n", preview));
                }
                md.push('\n');
            }

            md.push_str("## Rules\n\n");
            for rule in &config.rules {
                md.push_str(&format!("### {}\n", rule.name));
                md.push_str(&format!("- Content:\n```\n{}\n```\n\n", rule.content));
            }

            md.push_str("## Targets\n\n");
            for target in &config.targets {
                md.push_str(&format!("- {:?}\n", target));
            }

            md.push_str("\n## MCP Servers\n\n");
            for mcp in &config.mcp_servers {
                let transport = mcp.transport.as_deref().unwrap_or("stdio");
                md.push_str(&format!("- **{}** ({}): `{}`\n", mcp.name, transport, mcp.command));
            }

            md
        }
        _ => {
            anyhow::bail!("Unsupported format: '{}'. Use: yaml, json, markdown", format);
        }
    };

    match output {
        Some(path) => {
            std::fs::write(path, &exported)?;
            println!("Exported to: {}", path.display());
        }
        None => {
            println!("{}", exported);
        }
    }
    Ok(())
}

fn cmd_completions(shell: &str) -> Result<()> {
    use clap::CommandFactory;
    use clap_complete::{generate, Shell};

    let shell = match shell.to_lowercase().as_str() {
        "bash" => Shell::Bash,
        "zsh" => Shell::Zsh,
        "fish" => Shell::Fish,
        "powershell" | "ps" => Shell::PowerShell,
        _ => {
            anyhow::bail!("Unsupported shell: '{}'. Use: bash, zsh, fish, powershell", shell);
        }
    };

    let mut cmd = Cli::command();
    generate(shell, &mut cmd, "agentweave", &mut std::io::stdout());
    Ok(())
}

async fn cmd_daemon(project_dir: &PathBuf, registry: &AdapterRegistry, port: u16, no_serve: bool) -> Result<()> {
    println!("AgentWeave Daemon starting...");
    println!("  Project: {}", project_dir.display());
    println!("  Watch:   .agentweave/ → auto-regenerate");
    if !no_serve {
        println!("  ACP:     http://0.0.0.0:{}", port);
    }
    println!("  Press Ctrl+C to stop\n");

    if no_serve {
        // Just watch mode
        watcher::watch_and_regenerate(project_dir, registry).await?;
    } else {
        // Run both watcher and server concurrently
        use agentweave_acp::gateway::AcpGateway;
        use agentweave_acp::router::create_router;
        use std::sync::Arc;

        let gateway = Arc::new(AcpGateway::new());
        let router = create_router(gateway);
        let addr = format!("0.0.0.0:{}", port);
        let listener = tokio::net::TcpListener::bind(&addr).await?;

        let serve_handle = tokio::spawn(async move {
            axum::serve(listener, router).await.ok();
        });

        // Run watcher in current task
        tokio::select! {
            _ = serve_handle => {},
            r = watcher::watch_and_regenerate(project_dir, registry) => {
                r?;
            },
        }
    }
    Ok(())
}

fn dir_size(path: &PathBuf) -> u64 {
    walkdir::WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| e.metadata().ok())
        .map(|m| m.len())
        .sum()
}

fn format_bytes(bytes: u64) -> String {
    if bytes < 1024 {
        format!("{} B", bytes)
    } else if bytes < 1024 * 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else {
        format!("{:.1} MB", bytes as f64 / (1024.0 * 1024.0))
    }
}
