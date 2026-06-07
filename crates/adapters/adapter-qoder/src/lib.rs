use agentweave_core::adapter::{AdapterOutput, Concept, DiffEntry, VendorAdapter};
use agentweave_core::config::AgentWeaveConfig;
use agentweave_core::error::Result;
use agentweave_core::schema::TargetVendor;
use std::collections::HashMap;
use std::path::Path;

/// Adapter for Qoder
///
/// Generates subagent configuration files under `agents/` directory.
/// Each agent gets a JSON config file with tools and SDK configuration.
pub struct QoderAdapter;

impl QoderAdapter {
    pub fn new() -> Self {
        Self
    }

    fn generate_agent_config(
        agent: &agentweave_core::schema::AgentDef,
        config: &AgentWeaveConfig,
    ) -> String {
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

        // Model from agent or fallback to default
        let model = agent.model.as_ref().or(config.default_model.as_ref());
        if let Some(m) = model {
            obj.insert(
                "model".to_string(),
                serde_json::json!({
                    "provider": m.provider,
                    "model": m.model
                }),
            );
        }

        // Tools from agent permissions or project-level tools
        if let Some(tools) = &agent.tools {
            obj.insert(
                "tools".to_string(),
                serde_json::json!({
                    "allow": tools.allow,
                    "deny": tools.deny
                }),
            );
        }

        // Sub-agents
        if !agent.sub_agents.is_empty() {
            obj.insert(
                "subAgents".to_string(),
                serde_json::json!(agent.sub_agents),
            );
        }

        if let Some(max_turns) = agent.max_turns {
            obj.insert(
                "maxTurns".to_string(),
                serde_json::Value::Number(serde_json::Number::from(max_turns)),
            );
        }

        serde_json::to_string_pretty(&serde_json::Value::Object(obj))
            .unwrap_or_else(|_| "{}".to_string())
    }

    fn generate_manifest(config: &AgentWeaveConfig) -> String {
        let mut manifest = serde_json::Map::new();

        manifest.insert(
            "projectName".to_string(),
            serde_json::Value::String(config.metadata.name.clone()),
        );

        if let Some(version) = &config.metadata.version {
            manifest.insert(
                "version".to_string(),
                serde_json::Value::String(version.clone()),
            );
        }

        let agent_names: Vec<String> = config.agents.iter().map(|a| a.name.clone()).collect();
        manifest.insert("agents".to_string(), serde_json::json!(agent_names));

        if !config.tools.is_empty() {
            let tools: Vec<serde_json::Value> = config
                .tools
                .iter()
                .map(|t| {
                    let mut m = serde_json::Map::new();
                    m.insert("name".to_string(), serde_json::json!(t.name));
                    if let Some(desc) = &t.description {
                        m.insert("description".to_string(), serde_json::json!(desc));
                    }
                    serde_json::Value::Object(m)
                })
                .collect();
            manifest.insert("tools".to_string(), serde_json::json!(tools));
        }

        serde_json::to_string_pretty(&serde_json::Value::Object(manifest))
            .unwrap_or_else(|_| "{}".to_string())
    }
}

impl Default for QoderAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl VendorAdapter for QoderAdapter {
    fn vendor_id(&self) -> TargetVendor {
        TargetVendor::Qoder
    }
    fn display_name(&self) -> &str {
        "Qoder"
    }

    fn generate(&self, config: &AgentWeaveConfig, _project_root: &Path) -> Result<AdapterOutput> {
        let mut files = HashMap::new();

        // Manifest
        files.insert(
            "agents/manifest.json".to_string(),
            Self::generate_manifest(config),
        );

        // Individual agent configs
        for agent in &config.agents {
            let path = format!("agents/{}.json", agent.name);
            files.insert(path, Self::generate_agent_config(agent, config));
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
            targets: vec![TargetVendor::Qoder],
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
        vec![Concept::Agent, Concept::SubAgent, Concept::Tool]
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
                name: "qoder-test".to_string(),
                version: Some("0.5.0".to_string()),
                description: None,
                authors: Vec::new(),
            },
            default_model: Some(ModelConfig {
                provider: "anthropic".to_string(),
                model: "claude-sonnet-4".to_string(),
                params: HashMap::new(),
                fallback: None,
            }),
            targets: vec![TargetVendor::Qoder],
            agents: vec![
                AgentDef {
                    name: "planner".to_string(),
                    description: Some("Plans tasks".to_string()),
                    role: Some("planner".to_string()),
                    system_prompt: Some("Break down the task.".to_string()),
                    model: None,
                    tools: Some(PermissionPolicy {
                        allow: vec!["read".to_string(), "search".to_string()],
                        ask: Vec::new(),
                        deny: Vec::new(),
                    }),
                    skills: Vec::new(),
                    sub_agents: vec!["coder".to_string()],
                    memory: None,
                    max_turns: Some(10),
                    isolation: None,
                },
                AgentDef {
                    name: "coder".to_string(),
                    description: Some("Writes code".to_string()),
                    role: Some("developer".to_string()),
                    system_prompt: None,
                    model: None,
                    tools: None,
                    skills: Vec::new(),
                    sub_agents: Vec::new(),
                    memory: None,
                    max_turns: None,
                    isolation: None,
                },
            ],
            rules: Vec::new(),
            skills: Vec::new(),
            workflows: Vec::new(),
            hooks: Vec::new(),
            memory: None,
            mcp_servers: Vec::new(),
            context: None,
            tools: vec![ToolDef {
                name: "git".to_string(),
                description: Some("Git operations".to_string()),
                input_schema: None,
                output_schema: None,
            }],
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
    fn test_generate_manifest() {
        let adapter = QoderAdapter::new();
        let config = sample_config();
        let output = adapter.generate(&config, &PathBuf::from("/tmp")).unwrap();

        assert!(output.files.contains_key("agents/manifest.json"));
        let json: serde_json::Value =
            serde_json::from_str(output.files.get("agents/manifest.json").unwrap()).unwrap();
        assert_eq!(json["projectName"], "qoder-test");
        let agents = json["agents"].as_array().unwrap();
        assert_eq!(agents.len(), 2);
    }

    #[test]
    fn test_generate_agent_configs() {
        let adapter = QoderAdapter::new();
        let config = sample_config();
        let output = adapter.generate(&config, &PathBuf::from("/tmp")).unwrap();

        assert!(output.files.contains_key("agents/planner.json"));
        assert!(output.files.contains_key("agents/coder.json"));

        let planner: serde_json::Value =
            serde_json::from_str(output.files.get("agents/planner.json").unwrap()).unwrap();
        assert_eq!(planner["name"], "planner");
        assert_eq!(planner["maxTurns"], 10);
        assert!(planner["subAgents"].as_array().unwrap().contains(&serde_json::json!("coder")));
    }

    #[test]
    fn test_supported_concepts() {
        let adapter = QoderAdapter::new();
        let concepts = adapter.supported_concepts();
        assert!(concepts.contains(&Concept::Agent));
        assert!(concepts.contains(&Concept::SubAgent));
        assert!(concepts.contains(&Concept::Tool));
    }
}
