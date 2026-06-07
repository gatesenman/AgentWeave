use agentweave_core::adapter::{AdapterOutput, Concept, DiffEntry, VendorAdapter};
use agentweave_core::config::AgentWeaveConfig;
use agentweave_core::error::Result;
use agentweave_core::schema::TargetVendor;
use std::collections::HashMap;
use std::path::Path;

/// Adapter for OpenClaw
///
/// Generates `openclaw.json` with:
/// - agents: agent definitions
/// - multiAgent: orchestration config with sub-agent relationships
/// - memory: memory configuration
/// - tracing: observability settings
/// - plugins: MCP server configs mapped as plugins
pub struct OpenclawAdapter;

impl OpenclawAdapter {
    pub fn new() -> Self {
        Self
    }

    fn generate_openclaw_json(config: &AgentWeaveConfig) -> String {
        let mut root = serde_json::Map::new();

        // Project metadata
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

        // Agents
        let agents: Vec<serde_json::Value> = config
            .agents
            .iter()
            .map(|a| {
                let mut agent = serde_json::Map::new();
                agent.insert("name".to_string(), serde_json::json!(a.name));
                if let Some(desc) = &a.description {
                    agent.insert("description".to_string(), serde_json::json!(desc));
                }
                if let Some(role) = &a.role {
                    agent.insert("role".to_string(), serde_json::json!(role));
                }
                if let Some(prompt) = &a.system_prompt {
                    agent.insert("systemPrompt".to_string(), serde_json::json!(prompt));
                }
                let model = a.model.as_ref().or(config.default_model.as_ref());
                if let Some(m) = model {
                    agent.insert(
                        "model".to_string(),
                        serde_json::json!({
                            "provider": m.provider,
                            "name": m.model
                        }),
                    );
                }
                if let Some(max_turns) = a.max_turns {
                    agent.insert("maxTurns".to_string(), serde_json::json!(max_turns));
                }
                serde_json::Value::Object(agent)
            })
            .collect();
        root.insert("agents".to_string(), serde_json::json!(agents));

        // multiAgent: orchestration from sub_agents relationships
        let multi_agent_entries: Vec<serde_json::Value> = config
            .agents
            .iter()
            .filter(|a| !a.sub_agents.is_empty())
            .map(|a| {
                serde_json::json!({
                    "supervisor": a.name,
                    "workers": a.sub_agents,
                    "strategy": "round-robin"
                })
            })
            .collect();
        if !multi_agent_entries.is_empty() {
            root.insert(
                "multiAgent".to_string(),
                serde_json::json!(multi_agent_entries),
            );
        }

        // Memory
        if let Some(mem) = &config.memory {
            let mut mem_obj = serde_json::Map::new();
            mem_obj.insert("autoLearn".to_string(), serde_json::json!(mem.auto_learn));
            if let Some(max) = mem.max_entries {
                mem_obj.insert("maxEntries".to_string(), serde_json::json!(max));
            }
            if let Some(instructions) = &mem.manual_instructions {
                mem_obj.insert(
                    "instructions".to_string(),
                    serde_json::json!(instructions),
                );
            }
            root.insert("memory".to_string(), serde_json::Value::Object(mem_obj));
        }

        // Tracing from observability
        if let Some(obs) = &config.observability {
            let mut tracing_obj = serde_json::Map::new();
            if let Some(t) = &obs.tracing {
                tracing_obj.insert("enabled".to_string(), serde_json::json!(t.enabled));
                if let Some(exporter) = &t.exporter {
                    tracing_obj.insert("exporter".to_string(), serde_json::json!(exporter));
                }
                if let Some(endpoint) = &t.endpoint {
                    tracing_obj.insert("endpoint".to_string(), serde_json::json!(endpoint));
                }
            }
            if let Some(l) = &obs.logging {
                tracing_obj.insert("logLevel".to_string(), serde_json::json!(l.level));
            }
            if !tracing_obj.is_empty() {
                root.insert(
                    "tracing".to_string(),
                    serde_json::Value::Object(tracing_obj),
                );
            }
        }

        // Plugins from MCP servers
        if !config.mcp_servers.is_empty() {
            let plugins: Vec<serde_json::Value> = config
                .mcp_servers
                .iter()
                .map(|s| {
                    let mut p = serde_json::Map::new();
                    p.insert("name".to_string(), serde_json::json!(s.name));
                    p.insert("type".to_string(), serde_json::json!("mcp"));
                    p.insert("command".to_string(), serde_json::json!(s.command));
                    if !s.args.is_empty() {
                        p.insert("args".to_string(), serde_json::json!(s.args));
                    }
                    if !s.env.is_empty() {
                        p.insert("env".to_string(), serde_json::json!(s.env));
                    }
                    serde_json::Value::Object(p)
                })
                .collect();
            root.insert("plugins".to_string(), serde_json::json!(plugins));
        }

        serde_json::to_string_pretty(&serde_json::Value::Object(root))
            .unwrap_or_else(|_| "{}".to_string())
    }
}

impl Default for OpenclawAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl VendorAdapter for OpenclawAdapter {
    fn vendor_id(&self) -> TargetVendor {
        TargetVendor::Openclaw
    }
    fn display_name(&self) -> &str {
        "OpenClaw"
    }

    fn generate(&self, config: &AgentWeaveConfig, _project_root: &Path) -> Result<AdapterOutput> {
        let mut files = HashMap::new();
        files.insert(
            "openclaw.json".to_string(),
            Self::generate_openclaw_json(config),
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
            targets: vec![TargetVendor::Openclaw],
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
            Concept::Memory,
            Concept::McpServer,
            Concept::Plugin,
            Concept::Model,
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
                name: "openclaw-test".to_string(),
                version: Some("1.0.0".to_string()),
                description: None,
                authors: Vec::new(),
            },
            default_model: Some(ModelConfig {
                provider: "openai".to_string(),
                model: "gpt-4o".to_string(),
                params: HashMap::new(),
                fallback: None,
            }),
            targets: vec![TargetVendor::Openclaw],
            agents: vec![
                AgentDef {
                    name: "orchestrator".to_string(),
                    description: Some("Main orchestrator".to_string()),
                    role: Some("supervisor".to_string()),
                    system_prompt: Some("Coordinate the team.".to_string()),
                    model: None,
                    tools: None,
                    skills: Vec::new(),
                    sub_agents: vec!["worker-a".to_string(), "worker-b".to_string()],
                    memory: None,
                    max_turns: Some(20),
                    isolation: None,
                },
                AgentDef {
                    name: "worker-a".to_string(),
                    description: Some("Worker A".to_string()),
                    role: None,
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
            memory: Some(MemoryConfig {
                auto_learn: true,
                max_entries: Some(500),
                manual_instructions: Some("Remember user preferences.".to_string()),
            }),
            mcp_servers: vec![McpServerConfig {
                name: "search".to_string(),
                command: "mcp-search".to_string(),
                args: vec!["--engine".to_string(), "brave".to_string()],
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
            observability: Some(ObservabilityConfig {
                logging: Some(LoggingConfig {
                    level: "debug".to_string(),
                    output: None,
                    format: None,
                }),
                tracing: Some(TracingConfig {
                    enabled: true,
                    exporter: Some("otlp".to_string()),
                    endpoint: Some("http://localhost:4317".to_string()),
                }),
                metrics: None,
            }),
            governance: None,
        }
    }

    #[test]
    fn test_generate_openclaw_json() {
        let adapter = OpenclawAdapter::new();
        let config = sample_config();
        let output = adapter.generate(&config, &PathBuf::from("/tmp")).unwrap();

        assert!(output.files.contains_key("openclaw.json"));
        let json: serde_json::Value =
            serde_json::from_str(output.files.get("openclaw.json").unwrap()).unwrap();

        assert_eq!(json["name"], "openclaw-test");
        assert_eq!(json["agents"].as_array().unwrap().len(), 2);
    }

    #[test]
    fn test_multi_agent_config() {
        let adapter = OpenclawAdapter::new();
        let config = sample_config();
        let output = adapter.generate(&config, &PathBuf::from("/tmp")).unwrap();

        let json: serde_json::Value =
            serde_json::from_str(output.files.get("openclaw.json").unwrap()).unwrap();

        let multi = json["multiAgent"].as_array().unwrap();
        assert_eq!(multi.len(), 1);
        assert_eq!(multi[0]["supervisor"], "orchestrator");
        assert_eq!(multi[0]["workers"].as_array().unwrap().len(), 2);
    }

    #[test]
    fn test_memory_config() {
        let adapter = OpenclawAdapter::new();
        let config = sample_config();
        let output = adapter.generate(&config, &PathBuf::from("/tmp")).unwrap();

        let json: serde_json::Value =
            serde_json::from_str(output.files.get("openclaw.json").unwrap()).unwrap();

        assert_eq!(json["memory"]["autoLearn"], true);
        assert_eq!(json["memory"]["maxEntries"], 500);
    }

    #[test]
    fn test_tracing_config() {
        let adapter = OpenclawAdapter::new();
        let config = sample_config();
        let output = adapter.generate(&config, &PathBuf::from("/tmp")).unwrap();

        let json: serde_json::Value =
            serde_json::from_str(output.files.get("openclaw.json").unwrap()).unwrap();

        assert_eq!(json["tracing"]["enabled"], true);
        assert_eq!(json["tracing"]["exporter"], "otlp");
    }

    #[test]
    fn test_plugins_from_mcp() {
        let adapter = OpenclawAdapter::new();
        let config = sample_config();
        let output = adapter.generate(&config, &PathBuf::from("/tmp")).unwrap();

        let json: serde_json::Value =
            serde_json::from_str(output.files.get("openclaw.json").unwrap()).unwrap();

        let plugins = json["plugins"].as_array().unwrap();
        assert_eq!(plugins.len(), 1);
        assert_eq!(plugins[0]["name"], "search");
        assert_eq!(plugins[0]["type"], "mcp");
    }

    #[test]
    fn test_supported_concepts() {
        let adapter = OpenclawAdapter::new();
        let concepts = adapter.supported_concepts();
        assert!(concepts.contains(&Concept::Agent));
        assert!(concepts.contains(&Concept::Memory));
        assert!(concepts.contains(&Concept::Plugin));
    }
}
