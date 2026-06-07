use agentweave_sync::debounce::Debouncer;
use std::path::PathBuf;
use std::thread;
use std::time::Duration;

#[test]
fn test_debouncer_new() {
    let debouncer = Debouncer::new(300);
    assert_eq!(debouncer.delay(), Duration::from_millis(300));
    assert!(debouncer.is_idle());
    assert_eq!(debouncer.pending_count(), 0);
}

#[test]
fn test_debouncer_record_single() {
    let mut debouncer = Debouncer::new(300);
    let was_pending = debouncer.record(PathBuf::from("/tmp/test.yaml"));
    assert!(!was_pending);
    assert_eq!(debouncer.pending_count(), 1);
    assert!(!debouncer.is_idle());
}

#[test]
fn test_debouncer_record_multiple() {
    let mut debouncer = Debouncer::new(300);
    debouncer.record(PathBuf::from("/tmp/a.yaml"));
    let was_pending = debouncer.record(PathBuf::from("/tmp/b.yaml"));
    assert!(was_pending);
    assert_eq!(debouncer.pending_count(), 2);
}

#[test]
fn test_debouncer_dedup_same_path() {
    let mut debouncer = Debouncer::new(300);
    debouncer.record(PathBuf::from("/tmp/a.yaml"));
    debouncer.record(PathBuf::from("/tmp/a.yaml"));
    assert_eq!(debouncer.pending_count(), 1);
}

#[test]
fn test_debouncer_no_flush_before_delay() {
    let mut debouncer = Debouncer::new(300);
    debouncer.record(PathBuf::from("/tmp/a.yaml"));
    // Immediately try flush — should not fire yet
    let result = debouncer.try_flush();
    assert!(result.is_none());
    assert_eq!(debouncer.pending_count(), 1);
}

#[test]
fn test_debouncer_flushes_after_delay() {
    let mut debouncer = Debouncer::new(50);
    debouncer.record(PathBuf::from("/tmp/a.yaml"));
    debouncer.record(PathBuf::from("/tmp/b.yaml"));

    // Wait for debounce period to elapse
    thread::sleep(Duration::from_millis(80));

    let result = debouncer.try_flush();
    assert!(result.is_some());
    let change = result.unwrap();
    assert_eq!(change.paths.len(), 2);
    assert!(debouncer.is_idle());
}

#[test]
fn test_debouncer_flush_all_ignores_timing() {
    let mut debouncer = Debouncer::new(5000);
    debouncer.record(PathBuf::from("/tmp/a.yaml"));
    debouncer.record(PathBuf::from("/tmp/b.yaml"));

    // Force flush even though delay has not elapsed
    let result = debouncer.flush_all();
    assert!(result.is_some());
    let change = result.unwrap();
    assert_eq!(change.paths.len(), 2);
    assert!(debouncer.is_idle());
}

#[test]
fn test_debouncer_empty_flush() {
    let mut debouncer = Debouncer::new(300);
    assert!(debouncer.try_flush().is_none());
    assert!(debouncer.flush_all().is_none());
}

#[test]
fn test_debouncer_set_delay() {
    let mut debouncer = Debouncer::new(300);
    debouncer.set_delay(500);
    assert_eq!(debouncer.delay(), Duration::from_millis(500));
}

#[test]
fn test_debouncer_resets_after_new_event() {
    let mut debouncer = Debouncer::new(100);
    debouncer.record(PathBuf::from("/tmp/a.yaml"));

    // Wait part of the delay
    thread::sleep(Duration::from_millis(60));

    // New event resets the latest timestamp
    debouncer.record(PathBuf::from("/tmp/b.yaml"));

    // Not enough time since the second event
    thread::sleep(Duration::from_millis(60));
    // The second record was at ~60ms, so at ~120ms total only ~60ms has passed since last event
    let result = debouncer.try_flush();
    assert!(result.is_none());

    // Wait the full remaining delay
    thread::sleep(Duration::from_millis(80));
    let result = debouncer.try_flush();
    assert!(result.is_some());
}
