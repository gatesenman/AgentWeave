use crate::error::Result;
use semver::Version;
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Information about an available update
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub version: String,
    pub release_url: String,
    pub body: String,
    pub assets: Vec<ReleaseAsset>,
    pub published_at: String,
}

/// A downloadable release asset
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReleaseAsset {
    pub name: String,
    pub browser_download_url: String,
    pub size: u64,
}

/// GitHub release response (subset of fields)
#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    html_url: String,
    body: Option<String>,
    assets: Vec<GitHubAsset>,
    published_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
    size: u64,
}

/// Configuration for the update checker
#[derive(Debug, Clone)]
pub struct CheckerConfig {
    /// GitHub owner/repo
    pub repo: String,
    /// How often to check for updates
    pub check_interval: Duration,
    /// Optional GitHub API token for higher rate limits
    pub api_token: Option<String>,
}

impl Default for CheckerConfig {
    fn default() -> Self {
        Self {
            repo: "gaosichun888/AgentWeave".to_string(),
            check_interval: Duration::from_secs(3600),
            api_token: None,
        }
    }
}

/// Checks for new releases on GitHub
pub struct UpdateChecker {
    config: CheckerConfig,
    current_version: Version,
    client: reqwest::Client,
}

impl UpdateChecker {
    pub fn new(current_version: &str, config: CheckerConfig) -> Result<Self> {
        let version = Version::parse(current_version)?;
        Ok(Self {
            config,
            current_version: version,
            client: reqwest::Client::builder()
                .user_agent("agentweave-updater")
                .timeout(Duration::from_secs(30))
                .build()
                .map_err(|e| crate::error::UpdateError::Other(e.to_string()))?,
        })
    }

    /// Check interval for this checker
    pub fn check_interval(&self) -> Duration {
        self.config.check_interval
    }

    /// Check GitHub releases API for a newer version.
    /// Returns `Some(UpdateInfo)` if a newer version is available.
    pub async fn check_for_update(&self) -> Result<Option<UpdateInfo>> {
        let url = format!(
            "https://api.github.com/repos/{}/releases/latest",
            self.config.repo
        );

        let mut req = self.client.get(&url);
        if let Some(token) = &self.config.api_token {
            req = req.header("Authorization", format!("Bearer {}", token));
        }

        let resp = req.send().await?;
        if resp.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(None);
        }
        let release: GitHubRelease = resp.error_for_status()?.json().await?;

        let tag = release.tag_name.trim_start_matches('v');
        let remote_version = Version::parse(tag)?;

        if remote_version <= self.current_version {
            return Ok(None);
        }

        let assets = release
            .assets
            .into_iter()
            .map(|a| ReleaseAsset {
                name: a.name,
                browser_download_url: a.browser_download_url,
                size: a.size,
            })
            .collect();

        Ok(Some(UpdateInfo {
            version: remote_version.to_string(),
            release_url: release.html_url,
            body: release.body.unwrap_or_default(),
            assets,
            published_at: release.published_at.unwrap_or_default(),
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_checker_creation() {
        let checker = UpdateChecker::new("0.1.0", CheckerConfig::default());
        assert!(checker.is_ok());
    }

    #[test]
    fn test_checker_invalid_version() {
        let checker = UpdateChecker::new("not-a-version", CheckerConfig::default());
        assert!(checker.is_err());
    }

    #[test]
    fn test_check_interval() {
        let config = CheckerConfig {
            check_interval: Duration::from_secs(7200),
            ..Default::default()
        };
        let checker = UpdateChecker::new("0.1.0", config).unwrap();
        assert_eq!(checker.check_interval(), Duration::from_secs(7200));
    }

    #[test]
    fn test_default_config() {
        let config = CheckerConfig::default();
        assert_eq!(config.repo, "gaosichun888/AgentWeave");
        assert_eq!(config.check_interval, Duration::from_secs(3600));
        assert!(config.api_token.is_none());
    }
}
