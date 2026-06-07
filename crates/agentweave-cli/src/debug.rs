use agentweave_core::adapter::AdapterRegistry;
use agentweave_core::config::AgentWeaveConfig;
use anyhow::Result;
use std::path::PathBuf;

pub fn cmd_debug(
    project_dir: &PathBuf,
    registry: &AdapterRegistry,
    prompt: Option<&str>,
    vendors_filter: Option<&str>,
    dry_run: bool,
) -> Result<()> {
    let config = AgentWeaveConfig::load(project_dir)?;

    let test_prompt = prompt.unwrap_or("Explain what this project does in one sentence.");
    let filter: Vec<&str> = vendors_filter
        .map(|v| v.split(',').map(|s| s.trim()).collect())
        .unwrap_or_default();

    println!("AgentWeave Debug Mode");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("  Project:  {}", config.metadata.name);
    println!("  Prompt:   {}", test_prompt);
    println!("  Vendors:  {}", if filter.is_empty() { "all" } else { vendors_filter.unwrap_or("all") });
    println!("  Dry-run:  {}", dry_run);
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Generate configs for all target vendors
    let results = registry.generate_all(&config, project_dir);

    let mut debug_results = Vec::new();

    for (vendor, result) in &results {
        let vendor_name = vendor.to_string();
        if !filter.is_empty() && !filter.contains(&vendor_name.as_str()) {
            continue;
        }

        print!("  [{:<16}] ", vendor_name);

        match result {
            Ok(output) => {
                let total_bytes: usize = output.files.values().map(|c| c.len()).sum();
                let file_count = output.files.len();

                if dry_run {
                    println!("READY  ({} files, {} bytes)", file_count, total_bytes);
                    for (path, _) in &output.files {
                        println!("                     → {}", path);
                    }
                } else {
                    // Write files to disk
                    for (path, content) in &output.files {
                        let full = project_dir.join(path);
                        if let Some(parent) = full.parent() {
                            std::fs::create_dir_all(parent)?;
                        }
                        std::fs::write(&full, content)?;
                    }
                    println!("OK     ({} files, {} bytes)", file_count, total_bytes);
                }

                debug_results.push(DebugEntry {
                    vendor: vendor_name,
                    status: DebugStatus::Success,
                    file_count,
                    total_bytes,
                    agent_context: extract_agent_context(output),
                });
            }
            Err(e) => {
                println!("FAIL   ({})", e);
                debug_results.push(DebugEntry {
                    vendor: vendor_name,
                    status: DebugStatus::Failed(e.to_string()),
                    file_count: 0,
                    total_bytes: 0,
                    agent_context: None,
                });
            }
        }
    }

    // Print summary
    println!("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("Debug Summary:");
    let success = debug_results.iter().filter(|r| matches!(r.status, DebugStatus::Success)).count();
    let failed = debug_results.iter().filter(|r| matches!(r.status, DebugStatus::Failed(_))).count();
    println!("  Success: {}  Failed: {}  Total: {}", success, failed, debug_results.len());

    // Show agent context comparison
    if !dry_run && debug_results.iter().any(|r| r.agent_context.is_some()) {
        println!("\nAgent Context Delivery:");
        println!("┌──────────────────┬──────────────┬──────────────────────────────────┐");
        println!("│ Vendor           │ Format       │ Agent Instructions               │");
        println!("├──────────────────┼──────────────┼──────────────────────────────────┤");
        for entry in &debug_results {
            if let Some(ref ctx) = entry.agent_context {
                println!(
                    "│ {:<16} │ {:<12} │ {:<32} │",
                    entry.vendor,
                    ctx.format,
                    truncate(&ctx.preview, 32),
                );
            }
        }
        println!("└──────────────────┴──────────────┴──────────────────────────────────┘");
    }

    // Validation check
    println!("\nValidation:");
    let mut issues = Vec::new();
    if config.agents.is_empty() {
        issues.push("  ⚠ No agents defined (using default)");
    }
    if config.rules.is_empty() {
        issues.push("  ⚠ No rules defined");
    }
    if config.mcp_servers.is_empty() {
        issues.push("  ⚠ No MCP servers configured");
    }
    if issues.is_empty() {
        println!("  All checks passed");
    } else {
        for issue in &issues {
            println!("{}", issue);
        }
    }

    Ok(())
}

#[derive(Debug)]
#[allow(dead_code)]
struct DebugEntry {
    vendor: String,
    status: DebugStatus,
    file_count: usize,
    total_bytes: usize,
    agent_context: Option<AgentContext>,
}

#[derive(Debug)]
#[allow(dead_code)]
enum DebugStatus {
    Success,
    Failed(String),
}

#[derive(Debug)]
struct AgentContext {
    format: String,
    preview: String,
}

fn extract_agent_context(output: &agentweave_core::adapter::AdapterOutput) -> Option<AgentContext> {
    // Find the primary config file and extract agent context
    for (path, content) in &output.files {
        let format = if path.ends_with(".md") {
            "Markdown"
        } else if path.ends_with(".json") {
            "JSON"
        } else if path.ends_with(".mdc") {
            "MDC"
        } else if path.ends_with(".toml") {
            "TOML"
        } else {
            "Text"
        };

        let preview = content
            .lines()
            .find(|l| !l.is_empty() && !l.starts_with('#') && !l.starts_with("---"))
            .unwrap_or("(empty)")
            .to_string();

        return Some(AgentContext {
            format: format.to_string(),
            preview,
        });
    }
    None
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}...", &s[..max - 3])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_debug_no_config() {
        let dir = PathBuf::from("/tmp/nonexistent-debug-test");
        let registry = AdapterRegistry::new();
        let result = cmd_debug(&dir, &registry, None, None, true);
        assert!(result.is_err());
    }
}
