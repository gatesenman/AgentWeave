use crate::checker::UpdateInfo;
use crate::downloader::UpdateDownloader;
use crate::error::{Result, UpdateError};
use serde::{Deserialize, Serialize};
use std::path::Path;

/// Update mode configuration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum UpdateMode {
    /// Download in background, prompt user to restart
    Auto,
    /// Notify only, user triggers download and install
    Manual,
    /// Staged rollout: only a percentage of users receive the update
    Canary,
}

impl Default for UpdateMode {
    fn default() -> Self {
        Self::Manual
    }
}

/// Configuration for canary rollout
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanaryConfig {
    /// Percentage of users who should receive the update (0-100)
    pub rollout_percentage: u8,
    /// Seed for deterministic bucketing
    pub seed: Option<String>,
}

impl Default for CanaryConfig {
    fn default() -> Self {
        Self {
            rollout_percentage: 10,
            seed: None,
        }
    }
}

/// Orchestrates the update process according to the chosen strategy.
pub struct UpdateStrategy {
    pub mode: UpdateMode,
    pub canary: CanaryConfig,
}

impl UpdateStrategy {
    pub fn new(mode: UpdateMode) -> Self {
        Self {
            mode,
            canary: CanaryConfig::default(),
        }
    }

    pub fn with_canary(mode: UpdateMode, canary: CanaryConfig) -> Self {
        Self { mode, canary }
    }

    /// Determine whether this instance should receive a canary update.
    /// Uses a simple hash-based bucketing on a machine identifier.
    pub fn should_receive_canary(&self, machine_id: &str) -> bool {
        if self.mode != UpdateMode::Canary {
            return true;
        }

        let seed = self
            .canary
            .seed
            .as_deref()
            .unwrap_or("agentweave-canary");

        let input = format!("{}{}", seed, machine_id);
        let hash = simple_hash(&input);
        let bucket = (hash % 100) as u8;

        bucket < self.canary.rollout_percentage
    }

    /// Execute the update strategy given available update info.
    ///
    /// Returns a human-readable status message.
    pub async fn execute(
        &self,
        update: &UpdateInfo,
        current_binary: &Path,
        download_dir: &Path,
        expected_sha256: Option<&str>,
        machine_id: &str,
    ) -> Result<UpdateAction> {
        match &self.mode {
            UpdateMode::Auto => {
                // Auto: download and prepare, then signal restart needed
                let action = self
                    .download_and_prepare(update, current_binary, download_dir, expected_sha256)
                    .await?;
                Ok(action)
            }
            UpdateMode::Manual => {
                // Manual: notify only
                Ok(UpdateAction::NotifyAvailable {
                    version: update.version.clone(),
                    release_url: update.release_url.clone(),
                })
            }
            UpdateMode::Canary => {
                if !self.should_receive_canary(machine_id) {
                    return Ok(UpdateAction::CanarySkipped {
                        version: update.version.clone(),
                    });
                }
                let action = self
                    .download_and_prepare(update, current_binary, download_dir, expected_sha256)
                    .await?;
                Ok(action)
            }
        }
    }

    async fn download_and_prepare(
        &self,
        update: &UpdateInfo,
        current_binary: &Path,
        download_dir: &Path,
        expected_sha256: Option<&str>,
    ) -> Result<UpdateAction> {
        let platform_asset = find_platform_asset(&update.assets)?;
        let downloader = UpdateDownloader::new();

        let downloaded = downloader
            .download_asset(&platform_asset, download_dir)
            .await?;

        if let Some(sha) = expected_sha256 {
            UpdateDownloader::verify_sha256(&downloaded, sha)?;
        }

        // Stage the update (copy next to current binary as pending)
        let staged = download_dir.join("agentweave-staged");
        std::fs::copy(&downloaded, &staged)?;

        Ok(UpdateAction::ReadyToRestart {
            version: update.version.clone(),
            staged_path: staged,
            current_binary: current_binary.to_path_buf(),
        })
    }
}

/// Result of the update strategy execution
#[derive(Debug)]
pub enum UpdateAction {
    /// Update downloaded and staged; restart to apply.
    ReadyToRestart {
        version: String,
        staged_path: std::path::PathBuf,
        current_binary: std::path::PathBuf,
    },
    /// Notify user that an update is available (manual mode).
    NotifyAvailable {
        version: String,
        release_url: String,
    },
    /// This instance was not selected for the canary rollout.
    CanarySkipped {
        version: String,
    },
}

/// Find the release asset matching the current platform.
fn find_platform_asset(
    assets: &[crate::checker::ReleaseAsset],
) -> Result<crate::checker::ReleaseAsset> {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;

    let platform_hints: Vec<String> = vec![
        format!("{}-{}", os, arch),
        os.to_string(),
        arch.to_string(),
    ];

    for asset in assets {
        let name_lower = asset.name.to_lowercase();
        if platform_hints
            .iter()
            .any(|hint| name_lower.contains(hint))
        {
            return Ok(asset.clone());
        }
    }

    // Fallback: return first asset if only one exists
    if assets.len() == 1 {
        return Ok(assets[0].clone());
    }

    Err(UpdateError::NoAssetFound {
        platform: format!("{}-{}", os, arch),
    })
}

/// Simple non-cryptographic hash for canary bucketing
fn simple_hash(s: &str) -> u64 {
    let mut hash: u64 = 5381;
    for byte in s.bytes() {
        hash = hash.wrapping_mul(33).wrapping_add(byte as u64);
    }
    hash
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_mode() {
        assert_eq!(UpdateMode::default(), UpdateMode::Manual);
    }

    #[test]
    fn test_strategy_auto() {
        let strategy = UpdateStrategy::new(UpdateMode::Auto);
        assert_eq!(strategy.mode, UpdateMode::Auto);
    }

    #[test]
    fn test_canary_bucketing_deterministic() {
        let strategy = UpdateStrategy::with_canary(
            UpdateMode::Canary,
            CanaryConfig {
                rollout_percentage: 50,
                seed: Some("test-seed".to_string()),
            },
        );

        let result1 = strategy.should_receive_canary("machine-a");
        let result2 = strategy.should_receive_canary("machine-a");
        assert_eq!(result1, result2, "Canary bucketing should be deterministic");
    }

    #[test]
    fn test_canary_zero_percent() {
        let strategy = UpdateStrategy::with_canary(
            UpdateMode::Canary,
            CanaryConfig {
                rollout_percentage: 0,
                seed: None,
            },
        );
        // 0% should never receive
        assert!(!strategy.should_receive_canary("any-machine"));
    }

    #[test]
    fn test_canary_hundred_percent() {
        let strategy = UpdateStrategy::with_canary(
            UpdateMode::Canary,
            CanaryConfig {
                rollout_percentage: 100,
                seed: None,
            },
        );
        // 100% should always receive
        assert!(strategy.should_receive_canary("any-machine"));
    }

    #[test]
    fn test_non_canary_always_receives() {
        let strategy = UpdateStrategy::new(UpdateMode::Auto);
        assert!(strategy.should_receive_canary("any-machine"));
    }

    #[test]
    fn test_find_platform_asset_single() {
        let assets = vec![crate::checker::ReleaseAsset {
            name: "agentweave-universal.tar.gz".to_string(),
            browser_download_url: "https://example.com/dl".to_string(),
            size: 1024,
        }];
        let result = find_platform_asset(&assets);
        assert!(result.is_ok());
    }

    #[test]
    fn test_find_platform_asset_empty() {
        let assets: Vec<crate::checker::ReleaseAsset> = vec![];
        let result = find_platform_asset(&assets);
        assert!(result.is_err());
    }
}
