use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// ACP Agent descriptor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AcpAgent {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub vendor: Option<String>,
    #[serde(default)]
    pub capabilities: Vec<String>,
}

/// ACP Run request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunRequest {
    pub agent: String,
    #[serde(default)]
    pub vendor: Option<String>,
    #[serde(default = "default_strategy")]
    pub strategy: String,
    pub input: RunInput,
    #[serde(default)]
    pub options: RunOptions,
}

fn default_strategy() -> String {
    "best-match".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunInput {
    pub messages: Vec<Message>,
    #[serde(default)]
    pub context: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RunOptions {
    #[serde(default = "default_mode")]
    pub mode: String,
    #[serde(default)]
    pub timeout_secs: Option<u64>,
    #[serde(default)]
    pub max_tokens: Option<u32>,
    #[serde(default)]
    pub trace_id: Option<String>,
}

fn default_mode() -> String {
    "sync".to_string()
}

/// ACP Run response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunResponse {
    pub id: String,
    pub status: RunStatus,
    #[serde(default)]
    pub output: Option<RunOutput>,
    pub created_at: DateTime<Utc>,
    #[serde(default)]
    pub completed_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum RunStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunOutput {
    pub messages: Vec<Message>,
    #[serde(default)]
    pub metadata: Option<serde_json::Value>,
}

impl RunResponse {
    pub fn new_pending(_agent: &str) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            status: RunStatus::Pending,
            output: None,
            created_at: Utc::now(),
            completed_at: None,
            error: None,
        }
    }
}
