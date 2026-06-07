use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::broadcast;

/// Events published by the sync engine for UI/CLI consumption.
#[derive(Debug, Clone)]
pub enum SyncEvent {
    /// A set of config files changed and regeneration was triggered
    ChangeDetected {
        paths: Vec<PathBuf>,
        concepts: Vec<String>,
    },
    /// Regeneration completed successfully for a vendor
    RegenerateSuccess {
        vendor: String,
        files_written: Vec<String>,
    },
    /// Regeneration failed for a vendor
    RegenerateError {
        vendor: String,
        error: String,
    },
    /// Conflict detected on a file
    ConflictDetected {
        path: PathBuf,
        resolution: String,
    },
    /// Watcher started
    WatcherStarted {
        watch_path: PathBuf,
    },
    /// Watcher stopped
    WatcherStopped,
}

/// EventBus provides publish/subscribe for sync events.
/// Subscribers receive events via broadcast channels.
pub struct EventBus {
    sender: broadcast::Sender<SyncEvent>,
}

impl EventBus {
    pub fn new(capacity: usize) -> Self {
        let (sender, _) = broadcast::channel(capacity);
        Self { sender }
    }

    /// Publish an event to all subscribers.
    pub fn publish(&self, event: SyncEvent) {
        // Ignore send errors (no active subscribers)
        let _ = self.sender.send(event);
    }

    /// Subscribe to events. Returns a receiver that gets all future events.
    pub fn subscribe(&self) -> broadcast::Receiver<SyncEvent> {
        self.sender.subscribe()
    }

    /// Number of active subscribers.
    pub fn subscriber_count(&self) -> usize {
        self.sender.receiver_count()
    }
}

impl Default for EventBus {
    fn default() -> Self {
        Self::new(256)
    }
}

/// Shared reference to an EventBus.
pub type SharedEventBus = Arc<EventBus>;

pub fn shared_event_bus() -> SharedEventBus {
    Arc::new(EventBus::default())
}
