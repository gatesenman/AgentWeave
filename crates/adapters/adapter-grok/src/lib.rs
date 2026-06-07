use agentweave_core::adapter::{AdapterOutput, Concept, DiffEntry, VendorAdapter};
use agentweave_core::config::AgentWeaveConfig;
use agentweave_core::error::Result;
use agentweave_core::schema::TargetVendor;
use std::collections::HashMap;
use std::path::Path;

/// Adapter for Grok Build
///
/// Generates `.grok/config.toml` with agent, rule, skill, hook, MCP, and plugin config.
pub struct GrokBuildAdapter;

impl GrokBuildAdapter {
    pub fn new() -> Self {
        Self
    }

    fn generate_config_toml(config: &AgentWeaveConfig) -> String {
        let mut toml = String::new();

        // [project]
        toml.push_str("[project]\n");
        toml.push_str(&format!("name = \"{}\"\n", config.metadata.name));
        if let Some(version) = &config.metadata.version {
            toml.push_str(&format!("version = \"{}\"\n", version));
        }
        if let Some(desc) = &config.metadata.description {
            toml.push_str(&format!("description = \"{}\"\n", desc));
        }
        toml.push('\n');

        // [model]
        if let Some(model) = &config.default_model {
            toml.push_str("[model]\n");
            toml.push_str(&format!("provider = \"{}\"\n", model.provider));
            toml.push_str(&format!("model = \"{}\"\n", model.model));
            toml.push('\n');
        }

        // [[agent]]
        for agent in &config.agents {
            toml.push_str("[[agent]]\n");
            toml.push_str(&format!("name = \"{}\"\n", agent.name));
            if let Some(desc) = &agent.description {
                toml.push_str(&format!("description = \"{}\"\n", desc));
            }
            if let Some(role) = &agent.role {
                toml.push_str(&format!("role = \"{}\"\n", role));
            }
            if let Some(prompt) = &agent.system_prompt {
                let escaped = prompt.replace('\\', "\\\\").replace('"', "\\\"");
                toml.push_str(&format!("system_prompt = \"{}\"\n", escaped));
            }
            if !agent.skills.is_empty() {
                let skills_str: Vec<String> =
                    agent.skills.iter().map(|s| format!("\"{}\"", s)).collect();
                toml.push_str(&format!("skills = [{}]\n", skills_str.join(", ")));
            }
            if !agent.sub_agents.is_empty() {
                let subs: Vec<String> = agent
                    .sub_agents
                    .iter()
                    .map(|s| format!("\"{}\"", s))
                    .collect();
                toml.push_str(&format!("sub_agents = [{}]\n", subs.join(", ")));
            }
            toml.push('\n');
        }

        // [[rule]]
        for rule in &config.rules {
            toml.push_str("[[rule]]\n");
            toml.push_str(&format!("name = \"{}\"\n", rule.name));
            let escaped = rule.content.replace('\\', "\\\\").replace('"', "\\\"");
            toml.push_str(&format!("content = \"{}\"\n", escaped));
            toml.push_str(&format!(
                "activation = \"{:?}\"\n",
                rule.activation.activation_type
            ));
            if !rule.activation.globs.is_empty() {
                let globs: Vec<String> = rule
                    .activation
                    .globs
                    .iter()
                    .map(|g| format!("\"{}\"", g))
                    .collect();
                toml.push_str(&format!("globs = [{}]\n", globs.join(", ")));
            }
            toml.push('\n');
        }

        // [[skill]]
        for skill in &config.skills {
            toml.push_str("[[skill]]\n");
            toml.push_str(&format!("name = \"{}\"\n", skill.name));
            if let Some(desc) = &skill.description {
                toml.push_str(&format!("description = \"{}\"\n", desc));
            }
            if let Some(prompt) = &skill.prompt {
                let escaped = prompt.replace('\\', "\\\\").replace('"', "\\\"");
                toml.push_str(&format!("prompt = \"{}\"\n", escaped));
            }
            if !skill.tools.is_empty() {
                let tools: Vec<String> =
                    skill.tools.iter().map(|t| format!("\"{}\"", t)).collect();
                toml.push_str(&format!("tools = [{}]\n", tools.join(", ")));
            }
            toml.push('\n');
        }

        // [[hook]]
        for hook in &config.hooks {
            toml.push_str("[[hook]]\n");
            toml.push_str(&format!("name = \"{}\"\n", hook.name));
            toml.push_str(&format!(
                "event = \"{}\"\n",
                format!("{:?}", hook.event).to_lowercase()
            ));
            toml.push_str(&format!("command = \"{}\"\n", hook.command));
            if let Some(filter) = &hook.filter {
                toml.push_str(&format!("filter = \"{}\"\n", filter));
            }
            if let Some(timeout) = hook.timeout_ms {
                toml.push_str(&format!("timeout_ms = {}\n", timeout));
            }
            toml.push('\n');
        }

        // [[mcp_server]]
        for mcp in &config.mcp_servers {
            toml.push_str("[[mcp_server]]\n");
            toml.push_str(&format!("name = \"{}\"\n", mcp.name));
            toml.push_str(&format!("command = \"{}\"\n", mcp.command));
            if !mcp.args.is_empty() {
                let args: Vec<String> =
                    mcp.args.iter().map(|a| format!("\"{}\"", a)).collect();
                toml.push_str(&format!("args = [{}]\n", args.join(", ")));
            }
            toml.push('\n');
        }

        toml
    }
}

impl Default for GrokBuildAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl VendorAdapter for GrokBuildAdapter {
    fn vendor_id(&self) -> TargetVendor {
        TargetVendor::GrokBuild
    }
    fn display_name(&self) -> &str {
        "Grok Build"
    }

    fn generate(&self, config: &AgentWeaveConfig, _project_root: &Path) -> Result<AdapterOutput> {
        let mut files = HashMap::new();
        files.insert(
            ".grok/config.toml".to_string(),
            Self::generate_config_toml(config),
        );
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
            targets: vec![TargetVendor::GrokBuild],
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
            Concept::Rule,
            Concept::Skill,
            Concept::Hook,
            Concept::McpServer,
            Concept::Plugin,
        ]
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
                name: "grok-test".to_string(),
                version: Some("1.0.0".to_string()),
                description: Some("Test project".to_string()),
                authors: Vec::new(),
            },
            default_model: Some(ModelConfig {
                provider: "xai".to_string(),
                model: "grok-3".to_string(),
                params: HashMap::new(),
                fallback: None,
            }),
            targets: vec![TargetVendor::GrokBuild],
            agents: vec![AgentDef {
                name: "builder".to_string(),
                description: Some("Builds things".to_string()),
                role: Some("builder".to_string()),
                system_prompt: Some("Build the project.".to_string()),
                model: None,
                tools: None,
                skills: vec!["compile".to_string()],
                sub_agents: Vec::new(),
                memory: None,
                max_turns: None,
                isolation: None,
            }],
            rules: vec![RuleDef {
                name: "safety".to_string(),
                description: None,
                activation: RuleActivation {
                    activation_type: ActivationType::Always,
                    globs: Vec::new(),
                    description: None,
                },
                content: "Always check for errors.".to_string(),
            }],
            skills: vec![SkillDef {
                name: "compile".to_string(),
                description: Some("Compile code".to_string()),
                prompt: Some("Compile the source code.".to_string()),
                tools: vec!["cargo".to_string()],
                model: None,
            }],
            workflows: Vec::new(),
            hooks: vec![HookDef {
                name: "pre-build".to_string(),
                event: HookEvent::PreToolCall,
                filter: Some("build*".to_string()),
                command: "cargo check".to_string(),
                timeout_ms: Some(60000),
            }],
            memory: None,
            mcp_servers: vec![McpServerConfig {
                name: "fs".to_string(),
                command: "mcp-fs".to_string(),
                args: vec!["--root".to_string(), "/tmp".to_string()],
                env: HashMap::new(),
                transport: None,
            }],
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
    fn test_generate_config_toml() {
        let adapter = GrokBuildAdapter::new();
        let config = sample_config();
        let output = adapter.generate(&config, &PathBuf::from("/tmp")).unwrap();

        assert!(output.files.contains_key(".grok/config.toml"));
        let toml = output.files.get(".grok/config.toml").unwrap();

        assert!(toml.contains("[project]"));
        assert!(toml.contains("name = \"grok-test\""));
        assert!(toml.contains("[model]"));
        assert!(toml.contains("provider = \"xai\""));
        assert!(toml.contains("[[agent]]"));
        assert!(toml.contains("[[rule]]"));
        assert!(toml.contains("[[skill]]"));
        assert!(toml.contains("[[hook]]"));
        assert!(toml.contains("[[mcp_server]]"));
    }

    #[test]
    fn test_empty_config() {
        let adapter = GrokBuildAdapter::new();
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
        let toml = output.files.get(".grok/config.toml").unwrap();
        assert!(toml.contains("[project]"));
        assert!(toml.contains("name = \"empty\""));
    }
}
