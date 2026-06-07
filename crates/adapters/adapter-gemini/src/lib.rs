use agentweave_core::adapter::{AdapterOutput, Concept, DiffEntry, VendorAdapter};
use agentweave_core::config::AgentWeaveConfig;
use agentweave_core::error::Result;
use agentweave_core::schema::{ActivationType, TargetVendor};
use std::collections::HashMap;
use std::path::Path;

/// Adapter for Google Gemini CLI
/// Uses: GEMINI.md (hierarchical), .gemini/settings.json
pub struct GeminiAdapter;

impl GeminiAdapter {
    pub fn new() -> Self {
        Self
    }
}
impl Default for GeminiAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl VendorAdapter for GeminiAdapter {
    fn vendor_id(&self) -> TargetVendor {
        TargetVendor::GeminiCli
    }
    fn display_name(&self) -> &str {
        "Google Gemini CLI"
    }

    fn generate(&self, config: &AgentWeaveConfig, _project_root: &Path) -> Result<AdapterOutput> {
        let mut files = HashMap::new();
        let mut gemini_md = String::new();

        gemini_md.push_str(&format!("# {}\n\n", config.metadata.name));
        if let Some(desc) = &config.metadata.description {
            gemini_md.push_str(&format!("{}\n\n", desc));
        }

        for rule in &config.rules {
            if rule.activation.activation_type == ActivationType::Always {
                gemini_md.push_str(&rule.content);
                gemini_md.push_str("\n\n");
            }
        }

        if let Some(agent) = config.agents.first() {
            if let Some(prompt) = &agent.system_prompt {
                gemini_md.push_str(prompt);
                gemini_md.push('\n');
            }
        }

        files.insert("GEMINI.md".to_string(), gemini_md);
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
            targets: vec![TargetVendor::GeminiCli],
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
            Concept::Rule,
            Concept::Agent,
            Concept::Memory,
            Concept::McpServer,
            Concept::Model,
        ]
    }
    fn diff(&self, _config: &AgentWeaveConfig, _project_root: &Path) -> Result<Vec<DiffEntry>> {
        Ok(Vec::new())
    }
}
