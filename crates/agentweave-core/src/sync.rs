use crate::adapter::AdapterRegistry;
use crate::config::AgentWeaveConfig;
use crate::error::Result;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

/// Sync mode
#[derive(Debug, Clone, PartialEq)]
pub enum SyncMode {
    Realtime,
    OnSave,
    Manual,
}

impl SyncMode {
    pub fn from_str(s: &str) -> Self {
        match s {
            "on-save" => Self::OnSave,
            "manual" => Self::Manual,
            _ => Self::Realtime,
        }
    }
}

/// File change event
#[derive(Debug, Clone)]
pub struct FileChangeEvent {
    pub path: PathBuf,
    pub kind: FileChangeKind,
}

#[derive(Debug, Clone, PartialEq)]
pub enum FileChangeKind {
    Created,
    Modified,
    Deleted,
    Renamed,
}

/// Lock strategy for conflict resolution
#[derive(Debug, Clone, PartialEq)]
pub enum LockStrategy {
    LastWriteWins,
    Merge,
    Lock,
}

impl LockStrategy {
    pub fn from_str(s: &str) -> Self {
        match s {
            "merge" => Self::Merge,
            "lock" => Self::Lock,
            _ => Self::LastWriteWins,
        }
    }
}

/// Sync engine manages real-time synchronization between
/// AgentWeave config and vendor-specific files.
///
/// This is the core-level sync engine (synchronous).
/// For the full async runtime with file watching and debounce,
/// see the `agentweave-sync` crate.
pub struct SyncEngine {
    project_root: PathBuf,
    mode: SyncMode,
    registry: Arc<Mutex<AdapterRegistry>>,
    debounce_ms: u64,
    lock_strategy: LockStrategy,
}

impl SyncEngine {
    pub fn new(
        project_root: PathBuf,
        mode: SyncMode,
        registry: Arc<Mutex<AdapterRegistry>>,
    ) -> Self {
        Self {
            project_root,
            mode,
            registry,
            debounce_ms: 300,
            lock_strategy: LockStrategy::LastWriteWins,
        }
    }

    /// Handle a file change event
    pub fn on_change(&self, event: &FileChangeEvent) -> Result<()> {
        if self.mode == SyncMode::Manual {
            return Ok(());
        }

        let relative = event
            .path
            .strip_prefix(&self.project_root)
            .unwrap_or(&event.path);
        if relative.starts_with(".agentweave") {
            self.regenerate_all()?;
        }

        Ok(())
    }

    /// Regenerate all vendor configurations from current AgentWeave config
    pub fn regenerate_all(&self) -> Result<()> {
        let config = AgentWeaveConfig::load(&self.project_root)?;
        let registry = self.registry.lock().unwrap();
        let results = registry.generate_all(&config, &self.project_root);

        for (vendor, result) in results {
            match result {
                Ok(output) => {
                    for (path, content) in &output.files {
                        let full_path = self.project_root.join(path);
                        if let Some(parent) = full_path.parent() {
                            std::fs::create_dir_all(parent)?;
                        }
                        std::fs::write(&full_path, content)?;
                    }
                }
                Err(e) => {
                    tracing::warn!("Failed to generate config for {}: {}", vendor, e);
                }
            }
        }

        Ok(())
    }

    /// Set debounce interval
    pub fn set_debounce(&mut self, ms: u64) {
        self.debounce_ms = ms;
    }

    /// Set lock strategy
    pub fn set_lock_strategy(&mut self, strategy: LockStrategy) {
        self.lock_strategy = strategy;
    }

    pub fn mode(&self) -> &SyncMode {
        &self.mode
    }

    pub fn project_root(&self) -> &Path {
        &self.project_root
    }

    pub fn debounce_ms(&self) -> u64 {
        self.debounce_ms
    }

    pub fn lock_strategy(&self) -> &LockStrategy {
        &self.lock_strategy
    }
}
