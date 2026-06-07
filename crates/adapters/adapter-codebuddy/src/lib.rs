use agentweave_core::adapter::{AdapterOutput, Concept, DiffEntry, VendorAdapter};
use agentweave_core::config::AgentWeaveConfig;
use agentweave_core::error::Result;
use agentweave_core::schema::TargetVendor;
use std::collections::HashMap;
use std::path::Path;

/// Adapter for CodeBuddy
///
/// Generates `.codebuddy/` directory:
/// - settings.json (project config, model, permissions)
/// - agents/<name>.json (agent definitions)
/// - skills/<name>.json (skill definitions)
/// - hooks.json (lifecycle hooks)
/// - mcp-config.json (MCP server configuration)
pub struct CodebuddyAdapter;

impl CodebuddyAdapter {
    pub fn new() -> Self {
        Self
    }

    fn generate_settings_json(config: &AgentWeaveConfig) -> String {
        let mut root = serde_json::Map::new();

        root.insert(
            "projectName".to_string(),
            serde_json::Value::String(config.metadata.name.clone()),
        );

        if let Some(version) = &config.metadata.version {
            root.insert(
                "version".to_string(),
                serde_json::Value::String(version.clone()),
            );
        }

        if let Some(model) = &config.default_model {
            root.insert(
                "defaultModel".to_string(),
                serde_json::json!({
                    "provider": model.provider,
                    "model": model.model
                }),
            );
        }

        if let Some(perms) = &config.permissions {
            root.insert(
                "permissions".to_string(),
                serde_json::json!({
                    "allow": perms.allow,
                    "ask": perms.ask,
                    "deny": perms.deny
                }),
            );
        }

        if !config.output_styles.is_empty() {
            let styles: Vec<serde_json::Value> = config
                .output_styles
                .iter()
                .map(|s| {
                    serde_json::json!({
                        "name": s.name,
                        "content": s.content
                    })
                })
                .collect();
            root.insert("outputStyles".to_string(), serde_json::json!(styles));
        }

        if !config.rules.is_empty() {
            let rules: Vec<serde_json::Value> = config
                .rules
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "name": r.name,
                        "content": r.content,
                        "activation": format!("{:?}", r.activation.activation_type).to_lowercase()
                    })
                })
                .collect();
            root.insert("rules".to_string(), serde_json::json!(rules));
        }

        serde_json::to_string_pretty(&serde_json::Value::Object(root))
            .unwrap_or_else(|_| "{}".to_string())
    }

    fn generate_agent_json(agent: &agentweave_core::schema::AgentDef) -> String {
        let mut obj = serde_json::Map::new();
        obj.insert(
            "name".to_string(),
            serde_json::Value::String(agent.name.clone()),
        );
        if let Some(desc) = &agent.description {
            obj.insert(
                "description".to_string(),
                serde_json::Value::String(desc.clone()),
            );
        }
        if let Some(role) = &agent.role {
            obj.insert(
                "role".to_string(),
                serde_json::Value::String(role.clone()),
            );
        }
        if let Some(prompt) = &agent.system_prompt {
            obj.insert(
                "systemPrompt".to_string(),
                serde_json::Value::String(prompt.clone()),
            );
        }
        if !agent.skills.is_empty() {
            obj.insert("skills".to_string(), serde_json::json!(agent.skills));
        }
        if !agent.sub_agents.is_empty() {
            obj.insert("subAgents".to_string(), serde_json::json!(agent.sub_agents));
        }
        if let Some(model) = &agent.model {
            obj.insert(
                "model".to_string(),
                serde_json::json!({
                    "provider": model.provider,
                    "model": model.model
                }),
            );
        }

        serde_json::to_string_pretty(&serde_json::Value::Object(obj))
            .unwrap_or_else(|_| "{}".to_string())
    }

    fn generate_skill_json(skill: &agentweave_core::schema::SkillDef) -> String {
        let mut obj = serde_json::Map::new();
        obj.insert(
            "name".to_string(),
            serde_json::Value::String(skill.name.clone()),
        );
        if let Some(desc) = &skill.description {
            obj.insert(
                "description".to_string(),
                serde_json::Value::String(desc.clone()),
            );
        }
        if let Some(prompt) = &skill.prompt {
            obj.insert(
                "prompt".to_string(),
                serde_json::Value::String(prompt.clone()),
            );
        }
        if !skill.tools.is_empty() {
            obj.insert("tools".to_string(), serde_json::json!(skill.tools));
        }

        serde_json::to_string_pretty(&serde_json::Value::Object(obj))
            .unwrap_or_else(|_| "{}".to_string())
    }

    fn generate_hooks_json(config: &AgentWeaveConfig) -> String {
        let hooks: Vec<serde_json::Value> = config
            .hooks
            .iter()
            .map(|h| {
                let mut m = serde_json::Map::new();
                m.insert("name".to_string(), serde_json::json!(h.name));
                m.insert(
                    "event".to_string(),
                    serde_json::json!(format!("{:?}", h.event).to_lowercase()),
                );
                m.insert("command".to_string(), serde_json::json!(h.command));
                if let Some(filter) = &h.filter {
                    m.insert("filter".to_string(), serde_json::json!(filter));
                }
                if let Some(timeout) = h.timeout_ms {
                    m.insert("timeoutMs".to_string(), serde_json::json!(timeout));
                }
                serde_json::Value::Object(m)
            })
            .collect();

        serde_json::to_string_pretty(&serde_json::json!({ "hooks": hooks }))
            .unwrap_or_else(|_| "{}".to_string())
    }

    fn generate_mcp_config_json(config: &AgentWeaveConfig) -> String {
        let servers: Vec<serde_json::Value> = config
            .mcp_servers
            .iter()
            .map(|s| {
                let mut m = serde_json::Map::new();
                m.insert("name".to_string(), serde_json::json!(s.name));
                m.insert("command".to_string(), serde_json::json!(s.command));
                if !s.args.is_empty() {
                    m.insert("args".to_string(), serde_json::json!(s.args));
                }
                if !s.env.is_empty() {
                    m.insert("env".to_string(), serde_json::json!(s.env));
                }
                if let Some(transport) = &s.transport {
                    m.insert("transport".to_string(), serde_json::json!(transport));
                }
                serde_json::Value::Object(m)
            })
            .collect();

        serde_json::to_string_pretty(&serde_json::json!({ "mcpServers": servers }))
            .unwrap_or_else(|_| "{}".to_string())
    }
}

impl Default for CodebuddyAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl VendorAdapter for CodebuddyAdapter {
    fn vendor_id(&self) -> TargetVendor {
        TargetVendor::Codebuddy
    }
    fn display_name(&self) -> &str {
        "CodeBuddy"
    }

    fn generate(&self, config: &AgentWeaveConfig, _project_root: &Path) -> Result<AdapterOutput> {
        let mut files = HashMap::new();

        files.insert(
            ".codebuddy/settings.json".to_string(),
            Self::generate_settings_json(config),
        );

        for agent in &config.agents {
            files.insert(
                format!(".codebuddy/agents/{}.json", agent.name),
                Self::generate_agent_json(agent),
            );
        }

        for skill in &config.skills {
            files.insert(
                format!(".codebuddy/skills/{}.json", skill.name),
                Self::generate_skill_json(skill),
            );
        }

        files.insert(
            ".codebuddy/hooks.json".to_string(),
            Self::generate_hooks_json(config),
        );

        files.insert(
            ".codebuddy/mcp-config.json".to_string(),
            Self::generate_mcp_config_json(config),
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
            targets: vec![TargetVendor::Codebuddy],
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
            Concept::Permission,
            Concept::OutputStyle,
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
                version: Some("2.0.0".to_string()),
                description: None,
                authors: Vec::new(),
            },
            default_model: Some(ModelConfig {
                provider: "openai".to_string(),
                model: "gpt-4".to_string(),
                params: HashMap::new(),
                fallback: None,
            }),
            targets: vec![TargetVendor::Codebuddy],
            agents: vec![AgentDef {
                name: "helper".to_string(),
                description: Some("General helper".to_string()),
                role: Some("assistant".to_string()),
                system_prompt: Some("You help with code.".to_string()),
                model: None,
                tools: None,
                skills: vec!["review".to_string()],
                sub_agents: Vec::new(),
                memory: None,
                max_turns: None,
                isolation: None,
            }],
            rules: vec![RuleDef {
                name: "formatting".to_string(),
                description: None,
                activation: RuleActivation {
                    activation_type: ActivationType::Always,
                    globs: Vec::new(),
                    description: None,
                },
                content: "Use prettier.".to_string(),
            }],
            skills: vec![SkillDef {
                name: "review".to_string(),
                description: Some("Code review".to_string()),
                prompt: Some("Review the code carefully.".to_string()),
                tools: vec!["git".to_string()],
                model: None,
            }],
            workflows: Vec::new(),
            hooks: vec![HookDef {
                name: "lint".to_string(),
                event: HookEvent::PreCommit,
                filter: None,
                command: "npm run lint".to_string(),
                timeout_ms: None,
            }],
            memory: None,
            mcp_servers: vec![McpServerConfig {
                name: "db".to_string(),
                command: "mcp-server-db".to_string(),
                args: vec!["--port".to_string(), "5432".to_string()],
                env: HashMap::new(),
                transport: Some("stdio".to_string()),
            }],
            context: None,
            tools: Vec::new(),
            permissions: Some(PermissionPolicy {
                allow: vec!["read".to_string()],
                ask: Vec::new(),
                deny: vec!["rm -rf".to_string()],
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
    fn test_generate_settings() {
        let adapter = CodebuddyAdapter::new();
        let config = sample_config();
        let output = adapter.generate(&config, &PathBuf::from("/tmp")).unwrap();

        assert!(output.files.contains_key(".codebuddy/settings.json"));
        let json: serde_json::Value =
            serde_json::from_str(output.files.get(".codebuddy/settings.json").unwrap()).unwrap();
        assert_eq!(json["projectName"], "test-project");
        assert_eq!(json["defaultModel"]["provider"], "openai");
    }

    #[test]
    fn test_generate_agents() {
        let adapter = CodebuddyAdapter::new();
        let config = sample_config();
        let output = adapter.generate(&config, &PathBuf::from("/tmp")).unwrap();

        assert!(output.files.contains_key(".codebuddy/agents/helper.json"));
        let json: serde_json::Value =
            serde_json::from_str(output.files.get(".codebuddy/agents/helper.json").unwrap())
                .unwrap();
        assert_eq!(json["name"], "helper");
    }

    #[test]
    fn test_generate_skills() {
        let adapter = CodebuddyAdapter::new();
        let config = sample_config();
        let output = adapter.generate(&config, &PathBuf::from("/tmp")).unwrap();

        assert!(output.files.contains_key(".codebuddy/skills/review.json"));
    }

    #[test]
    fn test_generate_hooks_and_mcp() {
        let adapter = CodebuddyAdapter::new();
        let config = sample_config();
        let output = adapter.generate(&config, &PathBuf::from("/tmp")).unwrap();

        assert!(output.files.contains_key(".codebuddy/hooks.json"));
        assert!(output.files.contains_key(".codebuddy/mcp-config.json"));

        let mcp: serde_json::Value =
            serde_json::from_str(output.files.get(".codebuddy/mcp-config.json").unwrap()).unwrap();
        assert!(mcp["mcpServers"].as_array().unwrap().len() > 0);
    }
}
