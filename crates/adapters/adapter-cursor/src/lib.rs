use agentweave_core::adapter::{AdapterOutput, Concept, DiffEntry, VendorAdapter};
use agentweave_core::config::AgentWeaveConfig;
use agentweave_core::error::Result;
use agentweave_core::schema::{ActivationType, TargetVendor};
use std::collections::HashMap;
use std::path::Path;

/// Adapter for Cursor IDE
///
/// Cursor uses:
/// - .cursor/rules/*.mdc (with YAML frontmatter: alwaysApply, description, globs)
/// - .cursorrules (legacy, plain text)
pub struct CursorAdapter;

impl CursorAdapter {
    pub fn new() -> Self {
        Self
    }

    fn generate_mdc_file(rule: &agentweave_core::schema::RuleDef) -> String {
        let mut content = String::new();

        // YAML frontmatter
        content.push_str("---\n");
        match rule.activation.activation_type {
            ActivationType::Always => {
                content.push_str("alwaysApply: true\n");
            }
            ActivationType::Glob => {
                content.push_str("alwaysApply: false\n");
                if !rule.activation.globs.is_empty() {
                    content.push_str(&format!("globs: {}\n", rule.activation.globs.join(", ")));
                }
            }
            ActivationType::Description => {
                content.push_str("alwaysApply: false\n");
                if let Some(desc) = &rule.activation.description {
                    content.push_str(&format!("description: \"{}\"\n", desc));
                } else if let Some(desc) = &rule.description {
                    content.push_str(&format!("description: \"{}\"\n", desc));
                }
            }
            ActivationType::Manual => {
                content.push_str("alwaysApply: false\n");
            }
        }
        content.push_str("---\n\n");

        // Rule content
        content.push_str(&rule.content);

        content
    }

    fn generate_cursorrules(config: &AgentWeaveConfig) -> String {
        let mut content = String::new();

        // Aggregate all always-apply rules into legacy .cursorrules
        for rule in &config.rules {
            if rule.activation.activation_type == ActivationType::Always {
                content.push_str(&rule.content);
                content.push('\n');
                content.push('\n');
            }
        }

        // Add agent instructions
        if let Some(agent) = config.agents.first() {
            if let Some(prompt) = &agent.system_prompt {
                content.push_str(prompt);
                content.push('\n');
            }
        }

        content
    }
}

impl Default for CursorAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl VendorAdapter for CursorAdapter {
    fn vendor_id(&self) -> TargetVendor {
        TargetVendor::Cursor
    }

    fn display_name(&self) -> &str {
        "Cursor IDE"
    }

    fn generate(&self, config: &AgentWeaveConfig, _project_root: &Path) -> Result<AdapterOutput> {
        let mut files = HashMap::new();

        // Generate .cursor/rules/*.mdc for each rule
        for rule in &config.rules {
            let filename = format!(".cursor/rules/{}.mdc", rule.name);
            files.insert(filename, Self::generate_mdc_file(rule));
        }

        // Also generate legacy .cursorrules for backward compat
        let cursorrules = Self::generate_cursorrules(config);
        if !cursorrules.trim().is_empty() {
            files.insert(".cursorrules".to_string(), cursorrules);
        }

        Ok(AdapterOutput { files })
    }

    fn parse(&self, project_root: &Path) -> Result<AgentWeaveConfig> {
        let cursorrules_path = project_root.join(".cursorrules");
        let _content = if cursorrules_path.exists() {
            std::fs::read_to_string(&cursorrules_path)?
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
            targets: vec![TargetVendor::Cursor],
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
        vec![Concept::Rule, Concept::Agent]
    }

    fn diff(&self, _config: &AgentWeaveConfig, _project_root: &Path) -> Result<Vec<DiffEntry>> {
        Ok(Vec::new())
    }
}
