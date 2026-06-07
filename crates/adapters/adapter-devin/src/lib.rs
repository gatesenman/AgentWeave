use agentweave_core::adapter::{AdapterOutput, Concept, DiffEntry, VendorAdapter};
use agentweave_core::config::AgentWeaveConfig;
use agentweave_core::error::Result;
use agentweave_core::schema::TargetVendor;
use std::collections::HashMap;
use std::path::Path;

/// Adapter for Devin AI
///
/// Generates `.devin/` directory structure:
/// - config.json (project metadata, model, permissions)
/// - hooks.v1.json (lifecycle hooks)
/// - skills/<name>.md (skill definitions)
/// - agents/<name>.md (agent definitions)
pub struct DevinAdapter;

impl DevinAdapter {
    pub fn new() -> Self {
        Self
    }

    fn generate_config_json(config: &AgentWeaveConfig) -> String {
        let mut root = serde_json::Map::new();

        root.insert(
            "name".to_string(),
            serde_json::Value::String(config.metadata.name.clone()),
        );

        if let Some(version) = &config.metadata.version {
            root.insert(
                "version".to_string(),
                serde_json::Value::String(version.clone()),
            );
        }

        if let Some(desc) = &config.metadata.description {
            root.insert(
                "description".to_string(),
                serde_json::Value::String(desc.clone()),
            );
        }

        if let Some(model) = &config.default_model {
            let mut model_obj = serde_json::Map::new();
            model_obj.insert(
                "provider".to_string(),
                serde_json::Value::String(model.provider.clone()),
            );
            model_obj.insert(
                "model".to_string(),
                serde_json::Value::String(model.model.clone()),
            );
            root.insert(
                "defaultModel".to_string(),
                serde_json::Value::Object(model_obj),
            );
        }

        if let Some(perms) = &config.permissions {
            let mut p = serde_json::Map::new();
            if !perms.allow.is_empty() {
                p.insert("allow".to_string(), serde_json::json!(perms.allow));
            }
            if !perms.deny.is_empty() {
                p.insert("deny".to_string(), serde_json::json!(perms.deny));
            }
            if !perms.ask.is_empty() {
                p.insert("ask".to_string(), serde_json::json!(perms.ask));
            }
            root.insert("permissions".to_string(), serde_json::Value::Object(p));
        }

        if !config.mcp_servers.is_empty() {
            let servers: Vec<serde_json::Value> = config
                .mcp_servers
                .iter()
                .map(|s| {
                    let mut m = serde_json::Map::new();
                    m.insert(
                        "name".to_string(),
                        serde_json::Value::String(s.name.clone()),
                    );
                    m.insert(
                        "command".to_string(),
                        serde_json::Value::String(s.command.clone()),
                    );
                    if !s.args.is_empty() {
                        m.insert("args".to_string(), serde_json::json!(s.args));
                    }
                    if !s.env.is_empty() {
                        m.insert("env".to_string(), serde_json::json!(s.env));
                    }
                    serde_json::Value::Object(m)
                })
                .collect();
            root.insert("mcpServers".to_string(), serde_json::json!(servers));
        }

        serde_json::to_string_pretty(&serde_json::Value::Object(root))
            .unwrap_or_else(|_| "{}".to_string())
    }

    fn generate_hooks_json(config: &AgentWeaveConfig) -> String {
        let hooks: Vec<serde_json::Value> = config
            .hooks
            .iter()
            .map(|h| {
                let mut m = serde_json::Map::new();
                m.insert(
                    "name".to_string(),
                    serde_json::Value::String(h.name.clone()),
                );
                m.insert(
                    "event".to_string(),
                    serde_json::Value::String(format!("{:?}", h.event).to_lowercase()),
                );
                m.insert(
                    "command".to_string(),
                    serde_json::Value::String(h.command.clone()),
                );
                if let Some(filter) = &h.filter {
                    m.insert(
                        "filter".to_string(),
                        serde_json::Value::String(filter.clone()),
                    );
                }
                if let Some(timeout) = h.timeout_ms {
                    m.insert(
                        "timeoutMs".to_string(),
                        serde_json::Value::Number(serde_json::Number::from(timeout)),
                    );
                }
                serde_json::Value::Object(m)
            })
            .collect();

        let wrapper = serde_json::json!({ "version": 1, "hooks": hooks });
        serde_json::to_string_pretty(&wrapper).unwrap_or_else(|_| "{}".to_string())
    }

    fn generate_skill_md(skill: &agentweave_core::schema::SkillDef) -> String {
        let mut content = String::new();
        content.push_str("---\n");
        content.push_str(&format!("name: {}\n", skill.name));
        if let Some(desc) = &skill.description {
            content.push_str(&format!("description: {}\n", desc));
        }
        if !skill.tools.is_empty() {
            content.push_str(&format!("tools: [{}]\n", skill.tools.join(", ")));
        }
        content.push_str("---\n\n");
        if let Some(prompt) = &skill.prompt {
            content.push_str(prompt);
            content.push('\n');
        }
        content
    }

    fn generate_agent_md(agent: &agentweave_core::schema::AgentDef) -> String {
        let mut content = String::new();
        content.push_str(&format!("# {}\n\n", agent.name));
        if let Some(desc) = &agent.description {
            content.push_str(&format!("{}\n\n", desc));
        }
        if let Some(role) = &agent.role {
            content.push_str(&format!("**Role:** {}\n\n", role));
        }
        if let Some(prompt) = &agent.system_prompt {
            content.push_str("## Instructions\n\n");
            content.push_str(prompt);
            content.push('\n');
        }
        if !agent.sub_agents.is_empty() {
            content.push_str("\n## Sub-agents\n\n");
            for sa in &agent.sub_agents {
                content.push_str(&format!("- {}\n", sa));
            }
        }
        content
    }
}

impl Default for DevinAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl VendorAdapter for DevinAdapter {
    fn vendor_id(&self) -> TargetVendor {
        TargetVendor::Devin
    }
    fn display_name(&self) -> &str {
        "Devin"
    }

    fn generate(&self, config: &AgentWeaveConfig, _project_root: &Path) -> Result<AdapterOutput> {
        let mut files = HashMap::new();

        // config.json
        files.insert(
            ".devin/config.json".to_string(),
            Self::generate_config_json(config),
        );

        // hooks.v1.json
        files.insert(
            ".devin/hooks.v1.json".to_string(),
            Self::generate_hooks_json(config),
        );

        // skills/
        for skill in &config.skills {
            let path = format!(".devin/skills/{}.md", skill.name);
            files.insert(path, Self::generate_skill_md(skill));
        }

        // agents/
        for agent in &config.agents {
            let path = format!(".devin/agents/{}.md", agent.name);
            files.insert(path, Self::generate_agent_md(agent));
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
            targets: vec![TargetVendor::Devin],
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
            Concept::Hook,
            Concept::McpServer,
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
                name: "test-project".to_string(),
                version: Some("1.0.0".to_string()),
                description: Some("A test project".to_string()),
                authors: Vec::new(),
            },
            default_model: Some(ModelConfig {
                provider: "anthropic".to_string(),
                model: "claude-sonnet-4".to_string(),
                params: HashMap::new(),
                fallback: None,
            }),
            targets: vec![TargetVendor::Devin],
            agents: vec![AgentDef {
                name: "coder".to_string(),
                description: Some("Coding assistant".to_string()),
                role: Some("developer".to_string()),
                system_prompt: Some("You are a coding assistant.".to_string()),
                model: None,
                tools: None,
                skills: vec!["debug".to_string()],
                sub_agents: vec!["reviewer".to_string()],
                memory: None,
                max_turns: None,
                isolation: None,
            }],
            rules: vec![RuleDef {
                name: "style".to_string(),
                description: None,
                activation: RuleActivation {
                    activation_type: ActivationType::Always,
                    globs: Vec::new(),
                    description: None,
                },
                content: "Follow project style guide.".to_string(),
            }],
            skills: vec![SkillDef {
                name: "debug".to_string(),
                description: Some("Debugging skill".to_string()),
                prompt: Some("Debug the issue step by step.".to_string()),
                tools: vec!["shell".to_string()],
                model: None,
            }],
            workflows: Vec::new(),
            hooks: vec![HookDef {
                name: "pre-commit-lint".to_string(),
                event: HookEvent::PreCommit,
                filter: None,
                command: "cargo fmt --check".to_string(),
                timeout_ms: Some(30000),
            }],
            memory: None,
            mcp_servers: vec![McpServerConfig {
                name: "filesystem".to_string(),
                command: "npx".to_string(),
                args: vec!["-y".to_string(), "@modelcontextprotocol/server-filesystem".to_string()],
                env: HashMap::new(),
                transport: None,
            }],
            context: None,
            tools: Vec::new(),
            permissions: Some(PermissionPolicy {
                allow: vec!["read".to_string()],
                ask: vec!["write".to_string()],
                deny: vec!["delete".to_string()],
            }),
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
    fn test_generate_produces_config_json() {
        let adapter = DevinAdapter::new();
        let config = sample_config();
        let output = adapter.generate(&config, &PathBuf::from("/tmp")).unwrap();

        assert!(output.files.contains_key(".devin/config.json"));
        let json: serde_json::Value =
            serde_json::from_str(output.files.get(".devin/config.json").unwrap()).unwrap();
        assert_eq!(json["name"], "test-project");
        assert_eq!(json["defaultModel"]["provider"], "anthropic");
    }

    #[test]
    fn test_generate_produces_hooks_json() {
        let adapter = DevinAdapter::new();
        let config = sample_config();
        let output = adapter.generate(&config, &PathBuf::from("/tmp")).unwrap();

        assert!(output.files.contains_key(".devin/hooks.v1.json"));
        let json: serde_json::Value =
            serde_json::from_str(output.files.get(".devin/hooks.v1.json").unwrap()).unwrap();
        assert_eq!(json["version"], 1);
        assert!(json["hooks"].as_array().unwrap().len() > 0);
    }

    #[test]
    fn test_generate_produces_skills() {
        let adapter = DevinAdapter::new();
        let config = sample_config();
        let output = adapter.generate(&config, &PathBuf::from("/tmp")).unwrap();

        assert!(output.files.contains_key(".devin/skills/debug.md"));
        let content = output.files.get(".devin/skills/debug.md").unwrap();
        assert!(content.contains("name: debug"));
        assert!(content.contains("Debug the issue step by step."));
    }

    #[test]
    fn test_generate_produces_agents() {
        let adapter = DevinAdapter::new();
        let config = sample_config();
        let output = adapter.generate(&config, &PathBuf::from("/tmp")).unwrap();

        assert!(output.files.contains_key(".devin/agents/coder.md"));
        let content = output.files.get(".devin/agents/coder.md").unwrap();
        assert!(content.contains("# coder"));
        assert!(content.contains("reviewer"));
    }

    #[test]
    fn test_supported_concepts() {
        let adapter = DevinAdapter::new();
        let concepts = adapter.supported_concepts();
        assert!(concepts.contains(&Concept::Agent));
        assert!(concepts.contains(&Concept::Skill));
        assert!(concepts.contains(&Concept::Hook));
        assert!(concepts.contains(&Concept::McpServer));
    }
}
