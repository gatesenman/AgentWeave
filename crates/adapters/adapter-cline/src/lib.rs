use agentweave_core::adapter::{AdapterOutput, Concept, DiffEntry, VendorAdapter};
use agentweave_core::config::AgentWeaveConfig;
use agentweave_core::error::Result;
use agentweave_core::schema::TargetVendor;
use std::collections::HashMap;
use std::path::Path;

/// Adapter for Cline
///
/// Generates `.clinerules/` directory with markdown rule files.
/// Each rule becomes a separate `.md` file under `.clinerules/`.
pub struct ClineAdapter;

impl ClineAdapter {
    pub fn new() -> Self {
        Self
    }

    fn generate_rule_md(rule: &agentweave_core::schema::RuleDef) -> String {
        let mut content = String::new();
        content.push_str(&format!("# {}\n\n", rule.name));
        if let Some(desc) = &rule.description {
            content.push_str(&format!("> {}\n\n", desc));
        }
        content.push_str(&rule.content);
        content.push('\n');
        content
    }

    fn generate_global_rules_md(config: &AgentWeaveConfig) -> String {
        let mut content = String::new();
        content.push_str(&format!("# {} - Cline Rules\n\n", config.metadata.name));

        if let Some(desc) = &config.metadata.description {
            content.push_str(&format!("{}\n\n", desc));
        }

        // Agent instructions as rules
        for agent in &config.agents {
            if let Some(prompt) = &agent.system_prompt {
                content.push_str(&format!("## Agent: {}\n\n", agent.name));
                content.push_str(prompt);
                content.push_str("\n\n");
            }
        }

        // Permission rules
        if let Some(perms) = &config.permissions {
            content.push_str("## Permissions\n\n");
            if !perms.allow.is_empty() {
                content.push_str("### Allowed\n\n");
                for a in &perms.allow {
                    content.push_str(&format!("- {}\n", a));
                }
                content.push('\n');
            }
            if !perms.deny.is_empty() {
                content.push_str("### Denied\n\n");
                for d in &perms.deny {
                    content.push_str(&format!("- {}\n", d));
                }
                content.push('\n');
            }
        }

        content
    }
}

impl Default for ClineAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl VendorAdapter for ClineAdapter {
    fn vendor_id(&self) -> TargetVendor {
        TargetVendor::Cline
    }
    fn display_name(&self) -> &str {
        "Cline"
    }

    fn generate(&self, config: &AgentWeaveConfig, _project_root: &Path) -> Result<AdapterOutput> {
        let mut files = HashMap::new();

        // Global rules file
        files.insert(
            ".clinerules/README.md".to_string(),
            Self::generate_global_rules_md(config),
        );

        // Individual rule files
        for rule in &config.rules {
            let filename = rule.name.replace(' ', "-").to_lowercase();
            let path = format!(".clinerules/{}.md", filename);
            files.insert(path, Self::generate_rule_md(rule));
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
            targets: vec![TargetVendor::Cline],
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

#[cfg(test)]
mod tests {
    use super::*;
    use agentweave_core::config::ProjectMetadata;
    use agentweave_core::schema::*;
    use std::path::PathBuf;

    fn sample_config() -> AgentWeaveConfig {
        AgentWeaveConfig {
            metadata: ProjectMetadata {
                name: "test-project".to_string(),
                version: None,
                description: Some("Test desc".to_string()),
                authors: Vec::new(),
            },
            default_model: None,
            targets: vec![TargetVendor::Cline],
            agents: vec![AgentDef {
                name: "assistant".to_string(),
                description: None,
                role: None,
                system_prompt: Some("Help the user.".to_string()),
                model: None,
                tools: None,
                skills: Vec::new(),
                sub_agents: Vec::new(),
                memory: None,
                max_turns: None,
                isolation: None,
            }],
            rules: vec![
                RuleDef {
                    name: "code-style".to_string(),
                    description: Some("Code style rules".to_string()),
                    activation: RuleActivation {
                        activation_type: ActivationType::Always,
                        globs: Vec::new(),
                        description: None,
                    },
                    content: "Use 4-space indentation.".to_string(),
                },
                RuleDef {
                    name: "testing".to_string(),
                    description: None,
                    activation: RuleActivation {
                        activation_type: ActivationType::Glob,
                        globs: vec!["*.test.ts".to_string()],
                        description: None,
                    },
                    content: "Write tests for all functions.".to_string(),
                },
            ],
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
        }
    }

    #[test]
    fn test_generate_creates_readme() {
        let adapter = ClineAdapter::new();
        let config = sample_config();
        let output = adapter.generate(&config, &PathBuf::from("/tmp")).unwrap();

        assert!(output.files.contains_key(".clinerules/README.md"));
        let readme = output.files.get(".clinerules/README.md").unwrap();
        assert!(readme.contains("test-project"));
    }

    #[test]
    fn test_generate_creates_rule_files() {
        let adapter = ClineAdapter::new();
        let config = sample_config();
        let output = adapter.generate(&config, &PathBuf::from("/tmp")).unwrap();

        assert!(output.files.contains_key(".clinerules/code-style.md"));
        assert!(output.files.contains_key(".clinerules/testing.md"));

        let style = output.files.get(".clinerules/code-style.md").unwrap();
        assert!(style.contains("# code-style"));
        assert!(style.contains("4-space indentation"));
    }

    #[test]
    fn test_empty_config_generates_readme() {
        let adapter = ClineAdapter::new();
        let config = AgentWeaveConfig {
            metadata: ProjectMetadata {
                name: "empty".to_string(),
                version: None,
                description: None,
                authors: Vec::new(),
            },
            default_model: None,
            targets: vec![],
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
        };
        let output = adapter.generate(&config, &PathBuf::from("/tmp")).unwrap();
        assert!(output.files.contains_key(".clinerules/README.md"));
    }
}
