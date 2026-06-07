use std::collections::HashMap;
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tokio::sync::mpsc;

/// Aggregated change after debounce window closes
#[derive(Debug, Clone)]
pub struct DebouncedChange {
    pub paths: Vec<PathBuf>,
    pub triggered_at: Instant,
}

/// Debouncer collects rapid-fire filesystem events and emits a single
/// aggregated event after a configurable quiet period.
pub struct Debouncer {
    delay: Duration,
    pending: HashMap<PathBuf, Instant>,
    last_flush: Option<Instant>,
}

impl Debouncer {
    pub fn new(delay_ms: u64) -> Self {
        Self {
            delay: Duration::from_millis(delay_ms),
            pending: HashMap::new(),
            last_flush: None,
        }
    }

    /// Record a path change. Returns `true` if the debounce window was already open.
    pub fn record(&mut self, path: PathBuf) -> bool {
        let was_pending = !self.pending.is_empty();
        self.pending.insert(path, Instant::now());
        was_pending
    }

    /// Check if the debounce window has elapsed and return aggregated changes if so.
    pub fn try_flush(&mut self) -> Option<DebouncedChange> {
        if self.pending.is_empty() {
            return None;
        }

        let latest = self.pending.values().max().copied()?;
        if latest.elapsed() >= self.delay {
            let paths: Vec<PathBuf> = self.pending.keys().cloned().collect();
            self.pending.clear();
            self.last_flush = Some(Instant::now());
            Some(DebouncedChange {
                paths,
                triggered_at: latest,
            })
        } else {
            None
        }
    }

    /// Force flush all pending changes regardless of timing.
    pub fn flush_all(&mut self) -> Option<DebouncedChange> {
        if self.pending.is_empty() {
            return None;
        }
        let paths: Vec<PathBuf> = self.pending.keys().cloned().collect();
        self.pending.clear();
        self.last_flush = Some(Instant::now());
        Some(DebouncedChange {
            paths,
            triggered_at: Instant::now(),
        })
    }

    pub fn delay(&self) -> Duration {
        self.delay
    }

    pub fn set_delay(&mut self, ms: u64) {
        self.delay = Duration::from_millis(ms);
    }

    pub fn pending_count(&self) -> usize {
        self.pending.len()
    }

    pub fn is_idle(&self) -> bool {
        self.pending.is_empty()
    }
}

/// Spawns a debounce task that receives raw path events and emits debounced changes.
pub fn spawn_debounce_task(
    delay_ms: u64,
    mut input_rx: mpsc::UnboundedReceiver<PathBuf>,
    output_tx: mpsc::UnboundedSender<DebouncedChange>,
) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        let mut debouncer = Debouncer::new(delay_ms);
        let tick_interval = Duration::from_millis(50);

        loop {
            tokio::select! {
                path = input_rx.recv() => {
                    match path {
                        Some(p) => { debouncer.record(p); }
                        None => {
                            // Channel closed, flush remaining
                            if let Some(change) = debouncer.flush_all() {
                                let _ = output_tx.send(change);
                            }
                            break;
                        }
                    }
                }
                _ = tokio::time::sleep(tick_interval) => {
                    if let Some(change) = debouncer.try_flush() {
                        if output_tx.send(change).is_err() {
                            break;
                        }
                    }
                }
            }
        }
    })
}
