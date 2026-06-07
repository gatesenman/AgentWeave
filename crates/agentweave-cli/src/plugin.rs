use crate::PluginAction;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Default)]
struct PluginRegistry {
    plugins: Vec<PluginEntry>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct PluginEntry {
    name: String,
    version: String,
    source: String,
    #[serde(default)]
    description: String,
    #[serde(default)]
    adapter_type: Option<String>,
    #[serde(default)]
    installed_at: String,
}

pub fn cmd_plugin(project_dir: &PathBuf, action: PluginAction) -> Result<()> {
    let plugin_file = project_dir.join(".agentweave").join("plugins.yaml");

    match action {
        PluginAction::List => {
            let registry = load_registry(&plugin_file)?;
            if registry.plugins.is_empty() {
                println!("No plugins installed.");
                println!("  Use 'agentweave plugin install <source>' to add one.");
                return Ok(());
            }
            println!("Installed Plugins:\n");
            println!("┌──────────────────────────┬─────────┬────────────────────────────┐");
            println!("│ Name                     │ Version │ Source                     │");
            println!("├──────────────────────────┼─────────┼────────────────────────────┤");
            for plugin in &registry.plugins {
                println!(
                    "│ {:<24} │ {:<7} │ {:<26} │",
                    plugin.name, plugin.version, truncate(&plugin.source, 26)
                );
            }
            println!("└──────────────────────────┴─────────┴────────────────────────────┘");
            println!("\n  Total: {} plugin(s)", registry.plugins.len());
        }
        PluginAction::Install { source } => {
            let mut registry = load_registry(&plugin_file)?;
            let plugins_dir = project_dir.join(".agentweave").join("plugins");
            std::fs::create_dir_all(&plugins_dir)?;

            // Determine plugin metadata from source
            let (name, version) = parse_plugin_source(&source);

            if registry.plugins.iter().any(|p| p.name == name) {
                anyhow::bail!("Plugin '{}' already installed. Remove it first to reinstall.", name);
            }

            // If source is a local path, copy it
            let source_path = PathBuf::from(&source);
            if source_path.exists() {
                let dest = plugins_dir.join(&name);
                if source_path.is_dir() {
                    copy_dir_recursive(&source_path, &dest)?;
                } else {
                    std::fs::copy(&source_path, &dest)?;
                }
                println!("  Installed from local path: {}", source);
            } else {
                // Registry-based install (placeholder for future registry support)
                let manifest = plugins_dir.join(format!("{}.json", name));
                let content = serde_json::json!({
                    "name": name,
                    "version": version,
                    "source": source,
                    "status": "installed"
                });
                std::fs::write(&manifest, serde_json::to_string_pretty(&content)?)?;
                println!("  Registered plugin: {}", source);
            }

            let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
            registry.plugins.push(PluginEntry {
                name: name.clone(),
                version: version.clone(),
                source,
                description: String::new(),
                adapter_type: None,
                installed_at: now,
            });
            save_registry(&plugin_file, &registry)?;
            println!("Plugin '{}' v{} installed successfully", name, version);
        }
        PluginAction::Remove { name } => {
            let mut registry = load_registry(&plugin_file)?;
            let before = registry.plugins.len();
            registry.plugins.retain(|p| p.name != name);
            if registry.plugins.len() == before {
                anyhow::bail!("Plugin '{}' not found", name);
            }

            // Remove plugin files
            let plugins_dir = project_dir.join(".agentweave").join("plugins");
            let manifest = plugins_dir.join(format!("{}.json", name));
            let _ = std::fs::remove_file(&manifest);
            let dir = plugins_dir.join(&name);
            let _ = std::fs::remove_dir_all(&dir);

            save_registry(&plugin_file, &registry)?;
            println!("Plugin '{}' removed", name);
        }
        PluginAction::Info { name } => {
            let registry = load_registry(&plugin_file)?;
            let plugin = registry.plugins.iter().find(|p| p.name == name);
            match plugin {
                Some(p) => {
                    println!("Plugin: {}", p.name);
                    println!("  Version:     {}", p.version);
                    println!("  Source:      {}", p.source);
                    println!("  Installed:   {}", p.installed_at);
                    if !p.description.is_empty() {
                        println!("  Description: {}", p.description);
                    }
                    if let Some(ref adapter) = p.adapter_type {
                        println!("  Adapter:     {}", adapter);
                    }
                }
                None => {
                    anyhow::bail!("Plugin '{}' not found", name);
                }
            }
        }
    }
    Ok(())
}

fn load_registry(path: &PathBuf) -> Result<PluginRegistry> {
    if path.exists() {
        let content = std::fs::read_to_string(path)?;
        Ok(serde_yaml::from_str(&content).unwrap_or_default())
    } else {
        Ok(PluginRegistry::default())
    }
}

fn save_registry(path: &PathBuf, registry: &PluginRegistry) -> Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let content = serde_yaml::to_string(registry)?;
    std::fs::write(path, content)?;
    Ok(())
}

fn parse_plugin_source(source: &str) -> (String, String) {
    // Support formats: "name@version", "name", "path/to/plugin"
    if source.contains('@') {
        let parts: Vec<&str> = source.splitn(2, '@').collect();
        (parts[0].to_string(), parts[1].to_string())
    } else {
        let name = PathBuf::from(source)
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| source.to_string());
        (name, "0.1.0".to_string())
    }
}

fn copy_dir_recursive(src: &PathBuf, dst: &PathBuf) -> Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let dest_path = dst.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir_recursive(&entry.path(), &dest_path)?;
        } else {
            std::fs::copy(entry.path(), &dest_path)?;
        }
    }
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

    #[test]
    fn test_parse_plugin_source() {
        let (name, version) = parse_plugin_source("my-adapter@1.2.3");
        assert_eq!(name, "my-adapter");
        assert_eq!(version, "1.2.3");

        let (name, version) = parse_plugin_source("simple-plugin");
        assert_eq!(name, "simple-plugin");
        assert_eq!(version, "0.1.0");
    }
}
