use agentweave_core::adapter::AdapterRegistry;
use agentweave_core::config::AgentWeaveConfig;
use anyhow::Result;
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc;
use std::time::{Duration, Instant};

pub async fn watch_and_regenerate(project_dir: &PathBuf, registry: &AdapterRegistry) -> Result<()> {
    let config_dir = project_dir.join(".agentweave");
    if !config_dir.exists() {
        anyhow::bail!("No .agentweave directory found. Run 'agentweave init' first.");
    }

    println!("Watching for changes in {}...", config_dir.display());
    println!("  Press Ctrl+C to stop\n");

    let (tx, rx) = mpsc::channel::<notify::Result<Event>>();

    let mut watcher = RecommendedWatcher::new(
        move |res| {
            let _ = tx.send(res);
        },
        Config::default(),
    )?;

    watcher.watch(&config_dir, RecursiveMode::Recursive)?;

    let debounce = Duration::from_millis(300);
    let mut last_regen = Instant::now() - debounce;

    // Do initial generation
    regenerate(project_dir, registry)?;

    loop {
        match rx.recv_timeout(Duration::from_millis(100)) {
            Ok(Ok(event)) => {
                let dominated_by_history = event.paths.iter().all(|p| {
                    p.to_string_lossy().contains(".history")
                });
                if dominated_by_history {
                    continue;
                }

                if last_regen.elapsed() >= debounce {
                    last_regen = Instant::now();
                    let changed: Vec<_> = event
                        .paths
                        .iter()
                        .filter_map(|p| p.strip_prefix(&config_dir).ok())
                        .map(|p| p.to_string_lossy().to_string())
                        .collect();

                    if !changed.is_empty() {
                        println!("  Changed: {}", changed.join(", "));
                        match regenerate(project_dir, registry) {
                            Ok(count) => println!("  Regenerated: {} vendors\n", count),
                            Err(e) => println!("  Error: {}\n", e),
                        }
                    }
                }
            }
            Ok(Err(e)) => {
                eprintln!("Watch error: {:?}", e);
            }
            Err(mpsc::RecvTimeoutError::Timeout) => continue,
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
        }
    }

    Ok(())
}

fn regenerate(project_dir: &PathBuf, registry: &AdapterRegistry) -> Result<usize> {
    let config = AgentWeaveConfig::load(project_dir)?;
    let results = registry.generate_all(&config, project_dir);
    let mut count = 0;

    for (_vendor, result) in &results {
        if let Ok(output) = result {
            for (path, content) in &output.files {
                let full = project_dir.join(path);
                if let Some(parent) = full.parent() {
                    std::fs::create_dir_all(parent)?;
                }
                std::fs::write(&full, content)?;
            }
            count += 1;
        }
    }

    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_regenerate_no_config() {
        let dir = PathBuf::from("/tmp/nonexistent-aw-test");
        let registry = AdapterRegistry::new();
        assert!(regenerate(&dir, &registry).is_err());
    }
}
