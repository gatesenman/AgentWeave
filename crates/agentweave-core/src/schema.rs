use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Activation type for rules
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum ActivationType {
    Always,
    Glob,
    Description,
    Manual,
}

/// Model configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub provider: String,
    pub model: String,
    #[serde(default)]
    pub params: HashMap<String, serde_yaml::Value>,
    #[serde(default)]
    pub fallback: Option<Box<ModelConfig>>,
}

/// Permission policy
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionPolicy {
    #[serde(default)]
    pub allow: Vec<String>,
    #[serde(default)]
    pub ask: Vec<String>,
    #[serde(default)]
    pub deny: Vec<String>,
}

/// Tool definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDef {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub input_schema: Option<serde_json::Value>,
    #[serde(default)]
    pub output_schema: Option<serde_json::Value>,
}

/// Agent definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentDef {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub role: Option<String>,
    #[serde(default)]
    pub system_prompt: Option<String>,
    #[serde(default)]
    pub model: Option<ModelConfig>,
    #[serde(default)]
    pub tools: Option<PermissionPolicy>,
    #[serde(default)]
    pub skills: Vec<String>,
    #[serde(default)]
    pub sub_agents: Vec<String>,
    #[serde(default)]
    pub memory: Option<MemoryConfig>,
    #[serde(default)]
    pub max_turns: Option<u32>,
    #[serde(default)]
    pub isolation: Option<String>,
}

/// Rule definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleDef {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    pub activation: RuleActivation,
    pub content: String,
}

/// Rule activation configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleActivation {
    #[serde(rename = "type")]
    pub activation_type: ActivationType,
    #[serde(default)]
    pub globs: Vec<String>,
    #[serde(default)]
    pub description: Option<String>,
}

/// Skill definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillDef {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub prompt: Option<String>,
    #[serde(default)]
    pub tools: Vec<String>,
    #[serde(default)]
    pub model: Option<ModelConfig>,
}

/// Workflow step
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum WorkflowStep {
    #[serde(rename = "agent")]
    Agent {
        agent: String,
        input: Option<String>,
    },
    #[serde(rename = "parallel")]
    Parallel { steps: Vec<WorkflowStep> },
    #[serde(rename = "condition")]
    Condition {
        #[serde(rename = "if")]
        condition: String,
        then: Vec<WorkflowStep>,
        #[serde(rename = "else")]
        otherwise: Option<Vec<WorkflowStep>>,
    },
    #[serde(rename = "script")]
    Script { command: String },
}

/// Workflow definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowDef {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    pub steps: Vec<WorkflowStep>,
    #[serde(default)]
    pub triggers: Vec<String>,
}

/// Hook event type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum HookEvent {
    PreToolCall,
    PostToolCall,
    SessionStart,
    SessionEnd,
    PreCommit,
    PostCommit,
    OnError,
    ConfigChange,
}

/// Hook definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookDef {
    pub name: String,
    pub event: HookEvent,
    #[serde(default)]
    pub filter: Option<String>,
    pub command: String,
    #[serde(default)]
    pub timeout_ms: Option<u64>,
}

/// Memory configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryConfig {
    #[serde(default = "default_true")]
    pub auto_learn: bool,
    #[serde(default)]
    pub max_entries: Option<u32>,
    #[serde(default)]
    pub manual_instructions: Option<String>,
}

fn default_true() -> bool {
    true
}

/// MCP server configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerConfig {
    pub name: String,
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
    #[serde(default)]
    pub transport: Option<String>,
}

/// Context injection configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextConfig {
    #[serde(default)]
    pub files: Vec<String>,
    #[serde(default)]
    pub env_vars: HashMap<String, String>,
    #[serde(default)]
    pub instructions: Option<String>,
}

/// Prompt template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptTemplate {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    pub template: String,
    #[serde(default)]
    pub variables: Vec<String>,
}

/// Output style
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutputStyle {
    pub name: String,
    pub content: String,
}

/// Schedule definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleDef {
    pub name: String,
    pub cron: String,
    pub task: String,
    #[serde(default)]
    pub enabled: bool,
}

/// Automation trigger
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomationDef {
    pub name: String,
    pub event: String,
    #[serde(default)]
    pub filter: Option<String>,
    pub action: String,
}

/// Sync configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConfig {
    #[serde(default = "default_sync_mode")]
    pub mode: String,
    #[serde(default = "default_transport")]
    pub transport: String,
    #[serde(default = "default_lock_strategy")]
    pub lock_strategy: String,
}

fn default_sync_mode() -> String {
    "realtime".to_string()
}
fn default_transport() -> String {
    "file-watch".to_string()
}
fn default_lock_strategy() -> String {
    "last-write-wins".to_string()
}

/// Observability configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObservabilityConfig {
    #[serde(default)]
    pub logging: Option<LoggingConfig>,
    #[serde(default)]
    pub tracing: Option<TracingConfig>,
    #[serde(default)]
    pub metrics: Option<MetricsConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    #[serde(default = "default_log_level")]
    pub level: String,
    #[serde(default)]
    pub output: Option<String>,
    #[serde(default)]
    pub format: Option<String>,
}

fn default_log_level() -> String {
    "info".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TracingConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub exporter: Option<String>,
    #[serde(default)]
    pub endpoint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub exporters: Vec<String>,
}

/// Governance configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceConfig {
    #[serde(default)]
    pub policies: Vec<PolicyDef>,
    #[serde(default)]
    pub quotas: Vec<QuotaDef>,
    #[serde(default)]
    pub roles: Vec<RoleDef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyDef {
    pub name: String,
    pub rules: Vec<String>,
    #[serde(default)]
    pub enforcement: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuotaDef {
    pub name: String,
    pub limit: u64,
    pub period: String,
    pub resource: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoleDef {
    pub name: String,
    pub permissions: Vec<String>,
}

/// Target vendor enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "kebab-case")]
pub enum TargetVendor {
    Codex,
    ClaudeCode,
    Cursor,
    Windsurf,
    GeminiCli,
    GithubCopilot,
    Devin,
    Cline,
    Codebuddy,
    Qoder,
    GrokBuild,
    Openclaw,
}

impl std::fmt::Display for TargetVendor {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Codex => write!(f, "codex"),
            Self::ClaudeCode => write!(f, "claude-code"),
            Self::Cursor => write!(f, "cursor"),
            Self::Windsurf => write!(f, "windsurf"),
            Self::GeminiCli => write!(f, "gemini-cli"),
            Self::GithubCopilot => write!(f, "github-copilot"),
            Self::Devin => write!(f, "devin"),
            Self::Cline => write!(f, "cline"),
            Self::Codebuddy => write!(f, "codebuddy"),
            Self::Qoder => write!(f, "qoder"),
            Self::GrokBuild => write!(f, "grok-build"),
            Self::Openclaw => write!(f, "openclaw"),
        }
    }
}
