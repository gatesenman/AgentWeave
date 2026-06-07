use agentweave_core::adapter::{AdapterOutput, Concept, DiffEntry, VendorAdapter};
use agentweave_core::config::AgentWeaveConfig;
use agentweave_core::error::Result;
use agentweave_core::schema::{ActivationType, TargetVendor};
use std::collections::HashMap;
use std::path::Path;

/// Adapter for GitHub Copilot
/// Uses: .github/copilot-instructions.md, .github/instructions/*.instructions.md
pub struct CopilotAdapter;

impl CopilotAdapter {
    pub fn new() -> Self {
        Self
    }
}
impl Default for CopilotAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl VendorAdapter for CopilotAdapter {
    fn vendor_id(&self) -> TargetVendor {
        TargetVendor::GithubCopilot
    }
    fn display_name(&self) -> &str {
        "GitHub Copilot"
    }

    fn generate(&self, config: &AgentWeaveConfig, _project_root: &Path) -> Result<AdapterOutput> {
        let mut files = HashMap::new();
        let mut instructions = String::new();

        for rule in &config.rules {
            if rule.activation.activation_type == ActivationType::Always {
                instructions.push_str(&rule.content);
                instructions.push_str("\n\n");
            }
        }

        if let Some(agent) = config.agents.first() {
            if let Some(prompt) = &agent.system_prompt {
                instructions.push_str(prompt);
                instructions.push('\n');
            }
        }

        files.insert(".github/copilot-instructions.md".to_string(), instructions);

        // Glob-scoped rules as individual .instructions.md files
        for rule in &config.rules {
            if rule.activation.activation_type == ActivationType::Glob
                && !rule.activation.globs.is_empty()
            {
                let mut content = String::new();
                content.push_str("---\n");
                content.push_str(&format!(
                    "applyTo: \"{}\"\n",
                    rule.activation.globs.join(", ")
                ));
                content.push_str("---\n\n");
                content.push_str(&rule.content);
                let filename = format!(".github/instructions/{}.instructions.md", rule.name);
                files.insert(filename, content);
            }
        }

        Ok(AdapterOutput { files })
    }

    fn parse(&self, project_root: &Path) -> Result<AgentWeaveConfig> {
        Ok(agentweave_core::config::AgentWeaveConfig {
            metadata: agentweave_core::config::ProjectMetadata {
                name: project_root
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default(),
                version: None,
                description: None,
                authors: Vec::new(),
            },
            default_model: None,
            targets: vec![TargetVendor::GithubCopilot],
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
