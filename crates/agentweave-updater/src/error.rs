use thiserror::Error;

#[derive(Error, Debug)]
pub enum UpdateError {
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON parse error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Semver parse error: {0}")]
    Semver(#[from] semver::Error),

    #[error("Checksum mismatch: expected {expected}, got {actual}")]
    ChecksumMismatch { expected: String, actual: String },

    #[error("Signature verification failed")]
    SignatureInvalid,

    #[error("No compatible asset found for platform {platform}")]
    NoAssetFound { platform: String },

    #[error("Update error: {0}")]
    Other(String),
}

pub type Result<T> = std::result::Result<T, UpdateError>;
