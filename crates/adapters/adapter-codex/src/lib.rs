use agentweave_core::adapter::{AdapterOutput, Concept, DiffEntry, VendorAdapter};
use agentweave_core::config::AgentWeaveConfig;
use agentweave_core::error::Result;
use agentweave_core::schema::TargetVendor;
use std::collections::HashMap;
use std::path::Path;

/// Adapter for OpenAI Codex CLI
///
/// Codex uses:
/// - AGENTS.md (hierarchical: global → project → directory)
/// - ~/.codex/skills/ (reusable workflows)
/// - MCP configuration
/// - Memories (auto-learned context)
pub struct CodexAdapter;

impl CodexAdapter {
    pub fn new() -> Self {
        Self
    }

    fn generate_agents_md(config: &AgentWeaveConfig) -> String {
        let mut content = String::new();

        // Project header
        content.push_str(&format!("# {}\n\n", config.metadata.name));

        if let Some(desc) = &config.metadata.description {
            content.push_str(&format!("{}\n\n", desc));
        }

        // Rules (always-apply type)
        let always_rules: Vec<_> = config
            .rules
            .iter()
            .filter(|r| {
                r.activation.activation_type == agentweave_core::schema::ActivationType::Always
            })
            .collect();

        if !always_rules.is_empty() {
            content.push_str("## Guidelines\n\n");
            for rule in always_rules {
                content.push_str(&rule.content);
                content.push('\n');
                content.push('\n');
            }
        }

        // Agent system prompt
        if let Some(agent) = config.agents.first() {
            if let Some(prompt) = &agent.system_prompt {
                content.push_str("## Agent Instructions\n\n");
                content.push_str(prompt);
                content.push('\n');
                content.push('\n');
            }
        }

        // Memory / manual instructions
        if let Some(memory) = &config.memory {
            if let Some(instructions) = &memory.manual_instructions {
                content.push_str("## Context\n\n");
                content.push_str(instructions);
                content.push('\n');
                content.push('\n');
            }
        }

        // Tools / permissions
        if let Some(perms) = &config.permissions {
            if !perms.deny.is_empty() {
                content.push_str("## Restrictions\n\n");
                for deny in &perms.deny {
                    content.push_str(&format!("- Never use: {}\n", deny));
                }
                content.push('\n');
            }
        }

        content
    }
}

impl Default for CodexAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl VendorAdapter for CodexAdapter {
    fn vendor_id(&self) -> TargetVendor {
        TargetVendor::Codex
    }

    fn display_name(&self) -> &str {
        "OpenAI Codex CLI"
    }

    fn generate(&self, config: &AgentWeaveConfig, _project_root: &Path) -> Result<AdapterOutput> {
        let mut files = HashMap::new();

        // Generate AGENTS.md
        let agents_md = Self::generate_agents_md(config);
        files.insert("AGENTS.md".to_string(), agents_md);

        Ok(AdapterOutput { files })
    }

    fn parse(&self, project_root: &Path) -> Result<AgentWeaveConfig> {
        let agents_md_path = project_root.join("AGENTS.md");
        let _content = if agents_md_path.exists() {
            std::fs::read_to_string(&agents_md_path)?
        } else {
            String::new()
        };

        // Basic parsing - create a minimal config from AGENTS.md
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
            targets: vec![TargetVendor::Codex],
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
            Concept::Memory,
            Concept::McpServer,
            Concept::Tool,
        ]
    }

    fn diff(&self, _config: &AgentWeaveConfig, _project_root: &Path) -> Result<Vec<DiffEntry>> {
        Ok(Vec::new())
    }
}
