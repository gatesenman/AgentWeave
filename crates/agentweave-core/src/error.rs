use thiserror::Error;

#[derive(Error, Debug)]
pub enum AgentWeaveError {
    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Schema validation error: {0}")]
    SchemaValidation(String),

    #[error("Adapter error for vendor '{vendor}': {message}")]
    Adapter { vendor: String, message: String },

    #[error("Sync error: {0}")]
    Sync(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("YAML parse error: {0}")]
    Yaml(#[from] serde_yaml::Error),

    #[error("JSON parse error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Unsupported concept '{concept}' for vendor '{vendor}'")]
    UnsupportedConcept { concept: String, vendor: String },

    #[error("Version conflict: {0}")]
    VersionConflict(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),
}

pub type Result<T> = std::result::Result<T, AgentWeaveError>;
