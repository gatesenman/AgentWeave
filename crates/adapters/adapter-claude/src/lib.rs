use agentweave_core::adapter::{AdapterOutput, Concept, DiffEntry, VendorAdapter};
use agentweave_core::config::AgentWeaveConfig;
use agentweave_core::error::Result;
use agentweave_core::schema::TargetVendor;
use std::collections::HashMap;
use std::path::Path;

/// Adapter for Anthropic Claude Code
///
/// Claude Code uses:
/// - CLAUDE.md (project instructions)
/// - .claude/settings.json (permissions, hooks, env)
/// - .claude/skills/*/SKILL.md
/// - .claude/agents/*.md (subagents)
/// - .claude/workflows/*.js (dynamic workflows)
/// - .mcp.json (MCP server config)
pub struct ClaudeCodeAdapter;

impl ClaudeCodeAdapter {
    pub fn new() -> Self {
        Self
    }

    fn generate_claude_md(config: &AgentWeaveConfig) -> String {
        let mut content = String::new();

        // Project header
        content.push_str(&format!("# {}\n\n", config.metadata.name));

        if let Some(desc) = &config.metadata.description {
            content.push_str(&format!("{}\n\n", desc));
        }

        // Rules
        let always_rules: Vec<_> = config
            .rules
            .iter()
            .filter(|r| {
                r.activation.activation_type == agentweave_core::schema::ActivationType::Always
            })
            .collect();

        if !always_rules.is_empty() {
            content.push_str("## Rules\n\n");
            for rule in &always_rules {
                content.push_str(&rule.content);
                content.push('\n');
                content.push('\n');
            }
        }

        // Agent instructions
        if let Some(agent) = config.agents.first() {
            if let Some(prompt) = &agent.system_prompt {
                content.push_str("## Instructions\n\n");
                content.push_str(prompt);
                content.push('\n');
                content.push('\n');
            }
        }

        // Memory
        if let Some(memory) = &config.memory {
            if let Some(instructions) = &memory.manual_instructions {
                content.push_str("## Memory\n\n");
                content.push_str(instructions);
                content.push('\n');
                content.push('\n');
            }
        }

        content
    }

    fn generate_settings_json(config: &AgentWeaveConfig) -> String {
        let mut settings = serde_json::Map::new();

        // Permissions
        if let Some(perms) = &config.permissions {
            let mut permissions = serde_json::Map::new();
            if !perms.allow.is_empty() {
                permissions.insert("allow".to_string(), serde_json::json!(perms.allow));
            }
            if !perms.deny.is_empty() {
                permissions.insert("deny".to_string(), serde_json::json!(perms.deny));
            }
            settings.insert(
                "permissions".to_string(),
                serde_json::Value::Object(permissions),
            );
        }

        // Environment variables
        if !config.env.is_empty() {
            settings.insert("env".to_string(), serde_json::json!(config.env));
        }

        // Hooks
        if !config.hooks.is_empty() {
            let hooks: Vec<serde_json::Value> = config
                .hooks
                .iter()
                .map(|h| {
                    serde_json::json!({
                        "event": format!("{:?}", h.event).to_lowercase(),
                        "command": h.command,
                    })
                })
                .collect();
            settings.insert("hooks".to_string(), serde_json::Value::Array(hooks));
        }

        serde_json::to_string_pretty(&serde_json::Value::Object(settings)).unwrap_or_default()
    }

    fn generate_mcp_json(config: &AgentWeaveConfig) -> Option<String> {
        if config.mcp_servers.is_empty() {
            return None;
        }

        let mut servers = serde_json::Map::new();
        for server in &config.mcp_servers {
            let mut entry = serde_json::Map::new();
            entry.insert("command".to_string(), serde_json::json!(server.command));
            if !server.args.is_empty() {
                entry.insert("args".to_string(), serde_json::json!(server.args));
            }
            if !server.env.is_empty() {
                entry.insert("env".to_string(), serde_json::json!(server.env));
            }
            servers.insert(server.name.clone(), serde_json::Value::Object(entry));
        }

        let wrapper = serde_json::json!({ "mcpServers": servers });
        Some(serde_json::to_string_pretty(&wrapper).unwrap_or_default())
    }
}

impl Default for ClaudeCodeAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl VendorAdapter for ClaudeCodeAdapter {
    fn vendor_id(&self) -> TargetVendor {
        TargetVendor::ClaudeCode
    }

    fn display_name(&self) -> &str {
        "Anthropic Claude Code"
    }

    fn generate(&self, config: &AgentWeaveConfig, _project_root: &Path) -> Result<AdapterOutput> {
        let mut files = HashMap::new();

        // CLAUDE.md
        files.insert("CLAUDE.md".to_string(), Self::generate_claude_md(config));

        // .claude/settings.json
        let settings = Self::generate_settings_json(config);
        if settings != "{}" {
            files.insert(".claude/settings.json".to_string(), settings);
        }

        // .mcp.json
        if let Some(mcp) = Self::generate_mcp_json(config) {
            files.insert(".mcp.json".to_string(), mcp);
        }

        Ok(AdapterOutput { files })
    }

    fn parse(&self, project_root: &Path) -> Result<AgentWeaveConfig> {
        let claude_md_path = project_root.join("CLAUDE.md");
        let _content = if claude_md_path.exists() {
            std::fs::read_to_string(&claude_md_path)?
        } else {
            String::new()
        };

        Ok(AgentWeaveConfig {
            metadata: agentweave_core::config::ProjectMetadata {
                name: project_root
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| "unknown".to_string()),
                version: None,
                description: None,
                authors: Vec::new(),
            },
            default_model: None,
            targets: vec![TargetVendor::ClaudeCode],
            agents: Vec::new(),
            rules: Vec::new(),
            skills: Vec::new(),
            workflows: Vec::new(),
            hooks: Vec::new(),
            memory: None,
            mcp_servers: Vec::new(),
            context: None,
            tools: Vec::new(),
            permissions: None,
            prompts: Vec::new(),
            output_styles: Vec::new(),
            env: HashMap::new(),
            schedules: Vec::new(),
            automations: Vec::new(),
            sync: None,
            observability: None,
            governance: None,
        })
    }

    fn supported_concepts(&self) -> Vec<Concept> {
        vec![
            Concept::Agent,
            Concept::SubAgent,
            Concept::Rule,
            Concept::Skill,
            Concept::Workflow,
            Concept::Hook,
            Concept::Memory,
            Concept::McpServer,
            Concept::Tool,
            Concept::Permission,
            Concept::OutputStyle,
        ]
    }

    fn diff(&self, _config: &AgentWeaveConfig, _project_root: &Path) -> Result<Vec<DiffEntry>> {
        Ok(Vec::new())
    }
}
