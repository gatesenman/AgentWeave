use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use tokio::sync::mpsc;

use agentweave_core::adapter::AdapterRegistry;
use agentweave_core::config::AgentWeaveConfig;
use agentweave_core::schema::SyncConfig;

use crate::conflict::{ConflictDetector, ConflictResult, LockStrategy};
use crate::debounce::{spawn_debounce_task, DebouncedChange};
use crate::event_bus::{SharedEventBus, SyncEvent};
use crate::watcher::{detect_changed_concepts, FileWatcher};

/// Configuration for the sync engine
#[derive(Debug, Clone)]
pub struct SyncEngineConfig {
    pub project_root: PathBuf,
    pub debounce_ms: u64,
    pub lock_strategy: LockStrategy,
}

impl SyncEngineConfig {
    pub fn from_project(project_root: PathBuf, sync_config: Option<&SyncConfig>) -> Self {
        let lock_strategy = sync_config
            .map(|c| LockStrategy::from_str(&c.lock_strategy))
            .unwrap_or(LockStrategy::LastWriteWins);

        Self {
            project_root,
            debounce_ms: 300,
            lock_strategy,
        }
    }
}

/// The real-time sync engine coordinates file watching, debouncing,
/// conflict detection, adapter invocation, and event publication.
pub struct SyncEngine {
    config: SyncEngineConfig,
    registry: Arc<Mutex<AdapterRegistry>>,
    event_bus: SharedEventBus,
    conflict_detector: Arc<Mutex<ConflictDetector>>,
}

impl SyncEngine {
    pub fn new(
        config: SyncEngineConfig,
        registry: Arc<Mutex<AdapterRegistry>>,
        event_bus: SharedEventBus,
    ) -> Self {
        let conflict_detector = Arc::new(Mutex::new(ConflictDetector::new(
            config.lock_strategy.clone(),
        )));
        Self {
            config,
            registry,
            event_bus,
            conflict_detector,
        }
    }

    /// Run the sync engine: start file watcher + debounce loop.
    /// Returns when the shutdown signal is received.
    pub async fn run(&self, mut shutdown: tokio::sync::watch::Receiver<bool>) {
        let watch_path = self.config.project_root.join(".agentweave");

        // Channels
        let (raw_tx, raw_rx) = mpsc::unbounded_channel::<PathBuf>();
        let (debounced_tx, mut debounced_rx) = mpsc::unbounded_channel::<DebouncedChange>();

        // Start debounce task
        let debounce_handle =
            spawn_debounce_task(self.config.debounce_ms, raw_rx, debounced_tx);

        // Start file watcher
        let mut watcher = match FileWatcher::new(watch_path.clone(), raw_tx) {
            Ok(w) => w,
            Err(e) => {
                tracing::error!("Failed to create file watcher: {:?}", e);
                return;
            }
        };

        if let Err(e) = watcher.start() {
            tracing::error!("Failed to start file watcher: {:?}", e);
            return;
        }

        self.event_bus.publish(SyncEvent::WatcherStarted {
            watch_path: watch_path.clone(),
        });

        loop {
            tokio::select! {
                Some(change) = debounced_rx.recv() => {
                    self.handle_change(change);
                }
                _ = shutdown.changed() => {
                    if *shutdown.borrow() {
                        break;
                    }
                }
            }
        }

        // Cleanup
        let _ = watcher.stop();
        debounce_handle.abort();
        self.event_bus.publish(SyncEvent::WatcherStopped);
    }

    /// Handle a debounced change: reload config, detect concepts, run adapters.
    fn handle_change(&self, change: DebouncedChange) {
        let concepts = detect_changed_concepts(&self.config.project_root, &change.paths);

        self.event_bus.publish(SyncEvent::ChangeDetected {
            paths: change.paths.clone(),
            concepts: concepts.clone(),
        });

        tracing::info!(
            "Change detected: {} file(s), concepts: {:?}",
            change.paths.len(),
            concepts
        );

        // Reload config
        let config = match AgentWeaveConfig::load(&self.config.project_root) {
            Ok(c) => c,
            Err(e) => {
                tracing::error!("Failed to reload config: {}", e);
                return;
            }
        };

        // Determine affected vendors (all targets for now; could optimize to only
        // regenerate vendors that use the changed concepts)
        let registry = self.registry.lock().unwrap();
        let results = registry.generate_all(&config, &self.config.project_root);

        for (vendor, result) in results {
            match result {
                Ok(output) => {
                    let mut files_written = Vec::new();
                    for (rel_path, content) in &output.files {
                        let full_path = self.config.project_root.join(rel_path);

                        // Conflict check
                        let conflict = {
                            let detector = self.conflict_detector.lock().unwrap();
                            detector.check_conflict(&full_path)
                        };

                        let should_write = {
                            let detector = self.conflict_detector.lock().unwrap();
                            detector.resolve(&conflict)
                        };

                        if !should_write {
                            self.event_bus.publish(SyncEvent::ConflictDetected {
                                path: full_path.clone(),
                                resolution: "blocked".to_string(),
                            });
                            continue;
                        }

                        if let ConflictResult::ExternalModification { ref path } = conflict {
                            self.event_bus.publish(SyncEvent::ConflictDetected {
                                path: path.clone(),
                                resolution: "overwritten".to_string(),
                            });
                        }

                        // Write file
                        if let Some(parent) = full_path.parent() {
                            let _ = std::fs::create_dir_all(parent);
                        }
                        if let Err(e) = std::fs::write(&full_path, content) {
                            tracing::error!("Failed to write {}: {}", rel_path, e);
                            continue;
                        }

                        // Record write for conflict tracking
                        {
                            let mut detector = self.conflict_detector.lock().unwrap();
                            detector.record_write(&full_path);
                        }

                        files_written.push(rel_path.clone());
                    }

                    if !files_written.is_empty() {
                        self.event_bus.publish(SyncEvent::RegenerateSuccess {
                            vendor: vendor.to_string(),
                            files_written,
                        });
                    }
                }
                Err(e) => {
                    let error_msg = e.to_string();
                    tracing::warn!("Failed to generate for {}: {}", vendor, error_msg);
                    self.event_bus.publish(SyncEvent::RegenerateError {
                        vendor: vendor.to_string(),
                        error: error_msg,
                    });
                }
            }
        }
    }

    pub fn event_bus(&self) -> &SharedEventBus {
        &self.event_bus
    }

    pub fn project_root(&self) -> &Path {
        &self.config.project_root
    }
}
