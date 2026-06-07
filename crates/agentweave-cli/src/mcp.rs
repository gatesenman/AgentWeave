use crate::McpAction;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Default)]
struct McpConfig {
    servers: Vec<McpServer>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct McpServer {
    name: String,
    protocol: String,
    command: String,
    #[serde(default)]
    args: Vec<String>,
    #[serde(default)]
    env: std::collections::HashMap<String, String>,
    #[serde(default)]
    capabilities: Vec<String>,
}

pub fn cmd_mcp(project_dir: &PathBuf, action: McpAction) -> Result<()> {
    let mcp_file = project_dir.join(".agentweave").join("mcp-servers.yaml");

    match action {
        McpAction::List => {
            let config = load_mcp_config(&mcp_file)?;
            if config.servers.is_empty() {
                println!("No MCP servers configured.");
                println!("  Use 'agentweave mcp add' to add a server.");
                return Ok(());
            }
            println!("Configured MCP Servers:\n");
            println!("┌──────────────────┬──────────┬──────────────────────────────┐");
            println!("│ Name             │ Protocol │ Command                      │");
            println!("├──────────────────┼──────────┼──────────────────────────────┤");
            for server in &config.servers {
                let cmd_display = if server.args.is_empty() {
                    server.command.clone()
                } else {
                    format!("{} {}", server.command, server.args.join(" "))
                };
                println!(
                    "│ {:<16} │ {:<8} │ {:<28} │",
                    server.name,
                    server.protocol,
                    truncate(&cmd_display, 28)
                );
            }
            println!("└──────────────────┴──────────┴──────────────────────────────┘");
            println!("\n  Total: {} server(s)", config.servers.len());
        }
        McpAction::Add { name, command, args, protocol } => {
            let mut config = load_mcp_config(&mcp_file)?;

            if config.servers.iter().any(|s| s.name == name) {
                anyhow::bail!("MCP server '{}' already exists. Remove it first.", name);
            }

            let server = McpServer {
                name: name.clone(),
                protocol,
                command,
                args,
                env: std::collections::HashMap::new(),
                capabilities: Vec::new(),
            };
            config.servers.push(server);
            save_mcp_config(&mcp_file, &config)?;
            println!("Added MCP server '{}'", name);

            // Also write vendor-specific mcp yaml
            let mcp_dir = project_dir.join(".agentweave").join("mcp");
            std::fs::create_dir_all(&mcp_dir)?;
            let mcp_yaml = mcp_dir.join(format!("{}.mcp.yaml", name));
            let content = format!(
                "name: {}\nprotocol: {}\ncommand: {}\nargs: {:?}\n",
                name,
                config.servers.last().unwrap().protocol,
                config.servers.last().unwrap().command,
                config.servers.last().unwrap().args,
            );
            std::fs::write(&mcp_yaml, content)?;
            println!("  Created: .agentweave/mcp/{}.mcp.yaml", name);
        }
        McpAction::Remove { name } => {
            let mut config = load_mcp_config(&mcp_file)?;
            let before = config.servers.len();
            config.servers.retain(|s| s.name != name);
            if config.servers.len() == before {
                anyhow::bail!("MCP server '{}' not found", name);
            }
            save_mcp_config(&mcp_file, &config)?;

            // Remove mcp yaml file if exists
            let mcp_yaml = project_dir.join(".agentweave").join("mcp").join(format!("{}.mcp.yaml", name));
            let _ = std::fs::remove_file(&mcp_yaml);

            println!("Removed MCP server '{}'", name);
        }
        McpAction::Test { name } => {
            let config = load_mcp_config(&mcp_file)?;

            let servers: Vec<_> = if name == "all" {
                config.servers.iter().collect()
            } else {
                config.servers.iter().filter(|s| s.name == name).collect()
            };

            if servers.is_empty() {
                if name == "all" {
                    println!("No MCP servers configured.");
                } else {
                    anyhow::bail!("MCP server '{}' not found", name);
                }
                return Ok(());
            }

            println!("Testing MCP server connectivity...\n");
            for server in &servers {
                print!("  {} ({})... ", server.name, server.protocol);
                // Test by checking if command exists
                let result = std::process::Command::new("which")
                    .arg(&server.command)
                    .output();
                match result {
                    Ok(output) if output.status.success() => {
                        println!("OK (command found)");
                    }
                    _ => {
                        // Try direct execution test
                        let result = std::process::Command::new(&server.command)
                            .args(&["--version"])
                            .output();
                        match result {
                            Ok(_) => println!("OK"),
                            Err(_) => println!("WARN: command '{}' not found in PATH", server.command),
                        }
                    }
                }
            }
        }
    }
    Ok(())
}

fn load_mcp_config(path: &PathBuf) -> Result<McpConfig> {
    if path.exists() {
        let content = std::fs::read_to_string(path)?;
        Ok(serde_yaml::from_str(&content).unwrap_or_default())
    } else {
        Ok(McpConfig::default())
    }
}

fn save_mcp_config(path: &PathBuf, config: &McpConfig) -> Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let content = serde_yaml::to_string(config)?;
    std::fs::write(path, content)?;
    Ok(())
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
    use std::fs;
    use tempfile::TempDir;

    fn setup() -> (TempDir, PathBuf) {
        let dir = TempDir::new().unwrap();
        let project = dir.path().to_path_buf();
        fs::create_dir_all(project.join(".agentweave")).unwrap();
        (dir, project)
    }

    #[test]
    fn test_mcp_add_list_remove() {
        let (_dir, project) = setup();
        cmd_mcp(&project, McpAction::Add {
            name: "test-server".to_string(),
            command: "npx".to_string(),
            args: vec!["-y".to_string(), "@modelcontextprotocol/test".to_string()],
            protocol: "stdio".to_string(),
        }).unwrap();

        let mcp_file = project.join(".agentweave").join("mcp-servers.yaml");
        let config = load_mcp_config(&mcp_file).unwrap();
        assert_eq!(config.servers.len(), 1);
        assert_eq!(config.servers[0].name, "test-server");

        cmd_mcp(&project, McpAction::Remove { name: "test-server".to_string() }).unwrap();
        let config = load_mcp_config(&mcp_file).unwrap();
        assert_eq!(config.servers.len(), 0);
    }
}
