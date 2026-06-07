use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf};
use tokio::sync::mpsc;
use tracing;

/// FileWatcher watches the `.agentweave/` directory for filesystem changes
/// and forwards raw path events to a channel for debouncing.
pub struct FileWatcher {
    watcher: RecommendedWatcher,
    watch_path: PathBuf,
}

impl FileWatcher {
    /// Create a new file watcher on the given directory.
    /// Events are sent to `event_tx`.
    pub fn new(
        watch_path: PathBuf,
        event_tx: mpsc::UnboundedSender<PathBuf>,
    ) -> notify::Result<Self> {
        let tx = event_tx.clone();
        let watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
            match res {
                Ok(event) => {
                    if Self::is_relevant_event(&event.kind) {
                        for path in event.paths {
                            let _ = tx.send(path);
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("File watcher error: {:?}", e);
                }
            }
        })?;

        Ok(Self {
            watcher,
            watch_path,
        })
    }

    /// Start watching the configured path recursively.
    pub fn start(&mut self) -> notify::Result<()> {
        tracing::info!("Starting file watcher on {:?}", self.watch_path);
        self.watcher
            .watch(&self.watch_path, RecursiveMode::Recursive)?;
        Ok(())
    }

    /// Stop watching.
    pub fn stop(&mut self) -> notify::Result<()> {
        tracing::info!("Stopping file watcher on {:?}", self.watch_path);
        self.watcher.unwatch(&self.watch_path)?;
        Ok(())
    }

    pub fn watch_path(&self) -> &Path {
        &self.watch_path
    }

    fn is_relevant_event(kind: &EventKind) -> bool {
        matches!(
            kind,
            EventKind::Create(_)
                | EventKind::Modify(_)
                | EventKind::Remove(_)
        )
    }
}

/// Determine which concept categories were affected by a set of changed paths.
pub fn detect_changed_concepts(project_root: &Path, paths: &[PathBuf]) -> Vec<String> {
    let mut concepts = Vec::new();
    let config_dir = project_root.join(".agentweave");

    let mut has_agents = false;
    let mut has_rules = false;
    let mut has_skills = false;
    let mut has_hooks = false;
    let mut has_mcp = false;
    let mut has_main_config = false;

    for path in paths {
        let relative = path.strip_prefix(&config_dir).unwrap_or(path);
        let rel_str = relative.to_string_lossy();

        if rel_str.starts_with("agents") {
            has_agents = true;
        } else if rel_str.starts_with("rules") {
            has_rules = true;
        } else if rel_str.starts_with("skills") {
            has_skills = true;
        } else if rel_str.starts_with("hooks") {
            has_hooks = true;
        } else if rel_str.starts_with("mcp") {
            has_mcp = true;
        } else if rel_str == "agentweave.yaml" || rel_str.ends_with("agentweave.yaml") {
            has_main_config = true;
        }
    }

    if has_agents {
        concepts.push("agents".to_string());
    }
    if has_rules {
        concepts.push("rules".to_string());
    }
    if has_skills {
        concepts.push("skills".to_string());
    }
    if has_hooks {
        concepts.push("hooks".to_string());
    }
    if has_mcp {
        concepts.push("mcp".to_string());
    }
    if has_main_config {
        concepts.push("config".to_string());
    }

    concepts
}
