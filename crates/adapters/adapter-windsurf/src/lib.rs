use agentweave_core::adapter::{AdapterOutput, Concept, DiffEntry, VendorAdapter};
use agentweave_core::config::AgentWeaveConfig;
use agentweave_core::error::Result;
use agentweave_core::schema::{ActivationType, TargetVendor};
use std::collections::HashMap;
use std::path::Path;

/// Adapter for Windsurf IDE
/// Uses: .windsurf/rules/, global_rules.md, .windsurfrules
pub struct WindsurfAdapter;

impl WindsurfAdapter {
    pub fn new() -> Self {
        Self
    }
}
impl Default for WindsurfAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl VendorAdapter for WindsurfAdapter {
    fn vendor_id(&self) -> TargetVendor {
        TargetVendor::Windsurf
    }
    fn display_name(&self) -> &str {
        "Windsurf IDE"
    }

    fn generate(&self, config: &AgentWeaveConfig, _project_root: &Path) -> Result<AdapterOutput> {
        let mut files = HashMap::new();
        let mut windsurfrules = String::new();

        for rule in &config.rules {
            if rule.activation.activation_type == ActivationType::Always {
                windsurfrules.push_str(&rule.content);
                windsurfrules.push_str("\n\n");
            }
            // Also generate individual rule files
            let filename = format!(".windsurf/rules/{}.md", rule.name);
            files.insert(filename, rule.content.clone());
        }

        if let Some(agent) = config.agents.first() {
            if let Some(prompt) = &agent.system_prompt {
                windsurfrules.push_str(prompt);
                windsurfrules.push('\n');
            }
        }

        if !windsurfrules.trim().is_empty() {
            files.insert(".windsurfrules".to_string(), windsurfrules);
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
            targets: vec![TargetVendor::Windsurf],
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
        vec![Concept::Rule, Concept::Agent, Concept::Memory]
    }
    fn diff(&self, _config: &AgentWeaveConfig, _project_root: &Path) -> Result<Vec<DiffEntry>> {
        Ok(Vec::new())
    }
}
