use crate::error::{AgentWeaveError, Result};
use crate::schema::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

/// Project metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectMetadata {
    pub name: String,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub authors: Vec<AuthorInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthorInfo {
    pub name: String,
    #[serde(default)]
    pub email: Option<String>,
}

/// Main AgentWeave configuration (fully parsed)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentWeaveConfig {
    pub metadata: ProjectMetadata,
    #[serde(default)]
    pub default_model: Option<ModelConfig>,
    #[serde(default)]
    pub targets: Vec<TargetVendor>,
    #[serde(default)]
    pub agents: Vec<AgentDef>,
    #[serde(default)]
    pub rules: Vec<RuleDef>,
    #[serde(default)]
    pub skills: Vec<SkillDef>,
    #[serde(default)]
    pub workflows: Vec<WorkflowDef>,
    #[serde(default)]
    pub hooks: Vec<HookDef>,
    #[serde(default)]
    pub memory: Option<MemoryConfig>,
    #[serde(default)]
    pub mcp_servers: Vec<McpServerConfig>,
    #[serde(default)]
    pub context: Option<ContextConfig>,
    #[serde(default)]
    pub tools: Vec<ToolDef>,
    #[serde(default)]
    pub permissions: Option<PermissionPolicy>,
    #[serde(default)]
    pub prompts: Vec<PromptTemplate>,
    #[serde(default)]
    pub output_styles: Vec<OutputStyle>,
    #[serde(default)]
    pub env: HashMap<String, String>,
    #[serde(default)]
    pub schedules: Vec<ScheduleDef>,
    #[serde(default)]
    pub automations: Vec<AutomationDef>,
    #[serde(default)]
    pub sync: Option<SyncConfig>,
    #[serde(default)]
    pub observability: Option<ObservabilityConfig>,
    #[serde(default)]
    pub governance: Option<GovernanceConfig>,
}

/// Raw YAML entry point file
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawConfigFile {
    pub api_version: String,
    pub kind: String,
    pub metadata: ProjectMetadata,
    #[serde(default)]
    pub spec: RawConfigSpec,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RawConfigSpec {
    #[serde(default)]
    pub default_model: Option<ModelConfig>,
    #[serde(default)]
    pub targets: Vec<TargetVendor>,
    #[serde(default)]
    pub sync: Option<SyncConfig>,
}

impl AgentWeaveConfig {
    /// Load configuration from a project directory
    pub fn load(project_dir: &Path) -> Result<Self> {
        let config_dir = project_dir.join(".agentweave");
        if !config_dir.exists() {
            return Err(AgentWeaveError::FileNotFound(
                config_dir.to_string_lossy().to_string(),
            ));
        }

        let main_config_path = config_dir.join("agentweave.yaml");
        if !main_config_path.exists() {
            return Err(AgentWeaveError::FileNotFound(
                main_config_path.to_string_lossy().to_string(),
            ));
        }

        let content = std::fs::read_to_string(&main_config_path)?;
        let raw: RawConfigFile = serde_yaml::from_str(&content)?;

        let mut config = AgentWeaveConfig {
            metadata: raw.metadata,
            default_model: raw.spec.default_model,
            targets: raw.spec.targets,
            sync: raw.spec.sync,
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
            observability: None,
            governance: None,
        };

        // Load agents
        config.agents = Self::load_agents(&config_dir)?;

        // Load rules
        config.rules = Self::load_rules(&config_dir)?;

        // Load skills
        config.skills = Self::load_skills(&config_dir)?;

        // Load MCP servers
        config.mcp_servers = Self::load_mcp_servers(&config_dir)?;

        // Load hooks
        config.hooks = Self::load_hooks(&config_dir)?;

        Ok(config)
    }

    fn load_agents(config_dir: &Path) -> Result<Vec<AgentDef>> {
        let agents_dir = config_dir.join("agents");
        if !agents_dir.exists() {
            return Ok(Vec::new());
        }
        Self::load_yaml_files(&agents_dir)
    }

    fn load_rules(config_dir: &Path) -> Result<Vec<RuleDef>> {
        let rules_dir = config_dir.join("rules");
        if !rules_dir.exists() {
            return Ok(Vec::new());
        }
        Self::load_yaml_files(&rules_dir)
    }

    fn load_skills(config_dir: &Path) -> Result<Vec<SkillDef>> {
        let skills_dir = config_dir.join("skills");
        if !skills_dir.exists() {
            return Ok(Vec::new());
        }

        let mut skills = Vec::new();
        for entry in std::fs::read_dir(&skills_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                let skill_file = path.join("skill.yaml");
                if skill_file.exists() {
                    let content = std::fs::read_to_string(&skill_file)?;
                    let skill: SkillDef = serde_yaml::from_str(&content)?;
                    skills.push(skill);
                }
            }
        }
        Ok(skills)
    }

    fn load_mcp_servers(config_dir: &Path) -> Result<Vec<McpServerConfig>> {
        let mcp_dir = config_dir.join("mcp");
        let servers_file = mcp_dir.join("servers.yaml");
        if !servers_file.exists() {
            return Ok(Vec::new());
        }
        let content = std::fs::read_to_string(&servers_file)?;
        let servers: Vec<McpServerConfig> = serde_yaml::from_str(&content)?;
        Ok(servers)
    }

    fn load_hooks(config_dir: &Path) -> Result<Vec<HookDef>> {
        let hooks_dir = config_dir.join("hooks");
        let hooks_file = hooks_dir.join("hooks.yaml");
        if !hooks_file.exists() {
            return Ok(Vec::new());
        }
        let content = std::fs::read_to_string(&hooks_file)?;
        let hooks: Vec<HookDef> = serde_yaml::from_str(&content)?;
        Ok(hooks)
    }

    fn load_yaml_files<T: serde::de::DeserializeOwned>(dir: &Path) -> Result<Vec<T>> {
        let mut items = Vec::new();
        for entry in std::fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().is_some_and(|e| e == "yaml" || e == "yml") {
                let content = std::fs::read_to_string(&path)?;
                let item: T = serde_yaml::from_str(&content)?;
                items.push(item);
            }
        }
        Ok(items)
    }

    /// Get the project root directory for a given config dir
    pub fn project_root(config_dir: &Path) -> PathBuf {
        config_dir.parent().unwrap_or(config_dir).to_path_buf()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_load_missing_dir() {
        let dir = Path::new("/nonexistent");
        let result = AgentWeaveConfig::load(dir);
        assert!(result.is_err());
    }
}
