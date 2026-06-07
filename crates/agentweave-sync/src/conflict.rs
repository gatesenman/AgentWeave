use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

/// Lock/conflict resolution strategy
#[derive(Debug, Clone, PartialEq)]
pub enum LockStrategy {
    /// Last write wins — no conflict resolution, newest change overwrites
    LastWriteWins,
    /// Merge — attempt to merge concurrent edits (future: 3-way merge)
    Merge,
    /// Lock — acquire exclusive lock before writing, block concurrent edits
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

/// Tracks file modification timestamps for conflict detection.
#[derive(Debug)]
pub struct ConflictDetector {
    /// Last known modification time for each tracked file
    known_mtimes: HashMap<PathBuf, SystemTime>,
    strategy: LockStrategy,
}

/// Result of conflict check
#[derive(Debug, Clone, PartialEq)]
pub enum ConflictResult {
    /// No conflict — safe to write
    NoConflict,
    /// File was externally modified since we last wrote it
    ExternalModification { path: PathBuf },
    /// File is locked by another process
    Locked { path: PathBuf },
}

impl ConflictDetector {
    pub fn new(strategy: LockStrategy) -> Self {
        Self {
            known_mtimes: HashMap::new(),
            strategy,
        }
    }

    /// Record that we just wrote a file (update our known mtime).
    pub fn record_write(&mut self, path: &Path) {
        if let Ok(meta) = std::fs::metadata(path) {
            if let Ok(mtime) = meta.modified() {
                self.known_mtimes.insert(path.to_path_buf(), mtime);
            }
        }
    }

    /// Check if a file has been externally modified since our last known write.
    pub fn check_conflict(&self, path: &Path) -> ConflictResult {
        match self.strategy {
            LockStrategy::LastWriteWins => ConflictResult::NoConflict,
            LockStrategy::Merge | LockStrategy::Lock => {
                if let Some(known_mtime) = self.known_mtimes.get(path) {
                    if let Ok(meta) = std::fs::metadata(path) {
                        if let Ok(current_mtime) = meta.modified() {
                            if current_mtime > *known_mtime {
                                return ConflictResult::ExternalModification {
                                    path: path.to_path_buf(),
                                };
                            }
                        }
                    }
                }
                ConflictResult::NoConflict
            }
        }
    }

    /// Resolve a conflict according to the current strategy.
    /// Returns `true` if the write should proceed.
    pub fn resolve(&self, conflict: &ConflictResult) -> bool {
        match (&self.strategy, conflict) {
            (_, ConflictResult::NoConflict) => true,
            (LockStrategy::LastWriteWins, _) => true,
            (LockStrategy::Merge, ConflictResult::ExternalModification { .. }) => {
                // In a full implementation, we'd attempt a 3-way merge here.
                // For now, allow the write (last-write-wins fallback).
                tracing::warn!("Conflict detected, falling back to last-write-wins");
                true
            }
            (LockStrategy::Lock, ConflictResult::ExternalModification { .. }) => {
                tracing::error!("Conflict detected in lock mode — write blocked");
                false
            }
            (LockStrategy::Lock, ConflictResult::Locked { .. }) => false,
            _ => true,
        }
    }

    pub fn strategy(&self) -> &LockStrategy {
        &self.strategy
    }

    pub fn set_strategy(&mut self, strategy: LockStrategy) {
        self.strategy = strategy;
    }

    /// Remove tracking for a path.
    pub fn forget(&mut self, path: &Path) {
        self.known_mtimes.remove(path);
    }

    /// Clear all tracked state.
    pub fn clear(&mut self) {
        self.known_mtimes.clear();
    }
}
