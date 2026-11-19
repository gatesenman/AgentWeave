use serde::{Deserialize, Serialize};

use crate::config::{AgentWeaveConfig, ProjectMetadata};
use crate::error::{AgentWeaveError, Result};

pub const WEAVE_PACK_KIND: &str = "weave-pack";
pub const WEAVE_PACK_VERSION: u32 = 1;

/// Portable, validated AgentWeave configuration pack (`.weave.json`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeavePack {
    pub kind: String,
    pub version: u32,
    pub config: AgentWeaveConfig,
}

impl WeavePack {
    pub fn new(config: AgentWeaveConfig) -> Self {
        Self {
            kind: WEAVE_PACK_KIND.to_string(),
            version: WEAVE_PACK_VERSION,
            config,
        }
    }
}

pub fn starter_config(name: &str) -> AgentWeaveConfig {
    AgentWeaveConfig {
        metadata: ProjectMetadata {
            name: name.to_string(),
            version: Some("0.2.0".to_string()),
            description: Some("Starter AgentWeave pack".to_string()),
            authors: vec![],
        },
        default_model: None,
        targets: vec![],
        agents: vec![],
        rules: vec![],
        skills: vec![],
        workflows: vec![],
        hooks: vec![],
        memory: None,
        mcp_servers: vec![],
        context: None,
        tools: vec![],
        permissions: None,
        prompts: vec![],
        output_styles: vec![],
        env: Default::default(),
        schedules: vec![],
        automations: vec![],
        sync: None,
        observability: None,
        governance: None,
    }
}

pub fn serialize_pack(pack: &WeavePack) -> Result<String> {
    validate_pack(pack)?;
    serde_json::to_string_pretty(pack)
        .map(|s| s + "\n")
        .map_err(|e| AgentWeaveError::Config(format!("failed to serialize pack: {e}")))
}

pub fn parse_pack(text: &str) -> Result<WeavePack> {
    let pack: WeavePack = serde_json::from_str(text)
        .map_err(|e| AgentWeaveError::Config(format!("invalid .weave.json: {e}")))?;
    validate_pack(&pack)?;
    Ok(pack)
}

pub fn validate_pack(pack: &WeavePack) -> Result<()> {
    if pack.kind != WEAVE_PACK_KIND {
        return Err(AgentWeaveError::Config(format!(
            "invalid pack kind: {}",
            pack.kind
        )));
    }
    if pack.version != WEAVE_PACK_VERSION {
        return Err(AgentWeaveError::Config(format!(
            "unsupported pack version: {}",
            pack.version
        )));
    }
    if pack.config.metadata.name.trim().is_empty() {
        return Err(AgentWeaveError::Config(
            "pack config metadata.name is required".into(),
        ));
    }
    Ok(())
}
