use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Version entry representing a configuration snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionEntry {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub message: String,
    pub author: String,
    pub files_changed: Vec<String>,
}

/// Version manager tracks configuration changes
pub struct VersionManager {
    history_dir: PathBuf,
}

impl VersionManager {
    pub fn new(project_dir: &Path) -> Self {
        let history_dir = project_dir.join(".agentweave/.history");
        Self { history_dir }
    }

    pub fn init(&self) -> Result<()> {
        std::fs::create_dir_all(&self.history_dir)?;
        let index_path = self.history_dir.join("index.json");
        if !index_path.exists() {
            std::fs::write(&index_path, "[]")?;
        }
        Ok(())
    }

    /// Create a new version snapshot
    pub fn commit(&self, message: &str, author: &str, files: &[String]) -> Result<VersionEntry> {
        self.init()?;
        let entry = VersionEntry {
            id: generate_version_id(),
            timestamp: Utc::now(),
            message: message.to_string(),
            author: author.to_string(),
            files_changed: files.to_vec(),
        };

        // Save snapshot of current config
        let snapshot_dir = self.history_dir.join(&entry.id);
        std::fs::create_dir_all(&snapshot_dir)?;

        let config_dir = self.history_dir.parent().unwrap();
        for file in files {
            let src = config_dir.join(file);
            if src.exists() {
                let dest = snapshot_dir.join(file);
                if let Some(parent) = dest.parent() {
                    std::fs::create_dir_all(parent)?;
                }
                std::fs::copy(&src, &dest)?;
            }
        }

        // Update index
        let mut history = self.load_history()?;
        history.push(entry.clone());
        self.save_history(&history)?;

        Ok(entry)
    }

    /// List version history
    pub fn log(&self, limit: usize) -> Result<Vec<VersionEntry>> {
        let history = self.load_history()?;
        Ok(history.into_iter().rev().take(limit).collect())
    }

    /// Show diff between two versions
    #[allow(dead_code)]
    pub fn diff(&self, from_id: &str, to_id: &str) -> Result<Vec<FileDiff>> {
        let from_dir = self.history_dir.join(from_id);
        let to_dir = self.history_dir.join(to_id);

        if !from_dir.exists() {
            anyhow::bail!("Version '{}' not found", from_id);
        }
        if !to_dir.exists() {
            anyhow::bail!("Version '{}' not found", to_id);
        }

        let mut diffs = Vec::new();
        let from_files = list_files_recursive(&from_dir)?;
        let to_files = list_files_recursive(&to_dir)?;

        // Files modified or removed
        for file in &from_files {
            let from_content = std::fs::read_to_string(from_dir.join(file))?;
            let to_path = to_dir.join(file);
            if to_path.exists() {
                let to_content = std::fs::read_to_string(&to_path)?;
                if from_content != to_content {
                    diffs.push(FileDiff {
                        path: file.clone(),
                        status: DiffStatus::Modified,
                        lines_added: count_diff_lines(&from_content, &to_content).0,
                        lines_removed: count_diff_lines(&from_content, &to_content).1,
                    });
                }
            } else {
                diffs.push(FileDiff {
                    path: file.clone(),
                    status: DiffStatus::Removed,
                    lines_added: 0,
                    lines_removed: from_content.lines().count(),
                });
            }
        }

        // Files added
        for file in &to_files {
            if !from_files.contains(file) {
                let content = std::fs::read_to_string(to_dir.join(file))?;
                diffs.push(FileDiff {
                    path: file.clone(),
                    status: DiffStatus::Added,
                    lines_added: content.lines().count(),
                    lines_removed: 0,
                });
            }
        }

        Ok(diffs)
    }

    /// Restore configuration to a specific version
    pub fn restore(&self, version_id: &str) -> Result<usize> {
        let snapshot_dir = self.history_dir.join(version_id);
        if !snapshot_dir.exists() {
            anyhow::bail!("Version '{}' not found", version_id);
        }

        let config_dir = self.history_dir.parent().unwrap();
        let files = list_files_recursive(&snapshot_dir)?;
        let mut restored = 0;

        for file in &files {
            let src = snapshot_dir.join(file);
            let dest = config_dir.join(file);
            if let Some(parent) = dest.parent() {
                std::fs::create_dir_all(parent)?;
            }
            std::fs::copy(&src, &dest)?;
            restored += 1;
        }

        Ok(restored)
    }

    fn load_history(&self) -> Result<Vec<VersionEntry>> {
        let index_path = self.history_dir.join("index.json");
        if !index_path.exists() {
            return Ok(Vec::new());
        }
        let content = std::fs::read_to_string(&index_path)?;
        let history: Vec<VersionEntry> = serde_json::from_str(&content)?;
        Ok(history)
    }

    fn save_history(&self, history: &[VersionEntry]) -> Result<()> {
        let index_path = self.history_dir.join("index.json");
        let content = serde_json::to_string_pretty(history)?;
        std::fs::write(&index_path, content)?;
        Ok(())
    }
}

/// Represents a file-level diff entry between two config versions
#[derive(Debug)]
#[allow(dead_code)]
pub struct FileDiff {
    pub path: String,
    pub status: DiffStatus,
    pub lines_added: usize,
    pub lines_removed: usize,
}

/// Status of a file in a version diff
#[derive(Debug)]
#[allow(dead_code)]
pub enum DiffStatus {
    Added,
    Modified,
    Removed,
}

fn generate_version_id() -> String {
    let now = Utc::now();
    format!("{}", now.format("%Y%m%d-%H%M%S"))
}

fn list_files_recursive(dir: &Path) -> Result<Vec<String>> {
    let mut files = Vec::new();
    if !dir.exists() {
        return Ok(files);
    }
    for entry in walkdir::WalkDir::new(dir).into_iter().flatten() {
        if entry.file_type().is_file() {
            if let Ok(rel) = entry.path().strip_prefix(dir) {
                files.push(rel.to_string_lossy().to_string());
            }
        }
    }
    Ok(files)
}

#[allow(dead_code)]
fn count_diff_lines(from: &str, to: &str) -> (usize, usize) {
    let from_lines: std::collections::HashSet<&str> = from.lines().collect();
    let to_lines: std::collections::HashSet<&str> = to.lines().collect();

    let added = to_lines.difference(&from_lines).count();
    let removed = from_lines.difference(&to_lines).count();
    (added, removed)
}
