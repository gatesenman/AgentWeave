pub mod otlp;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// A trace span representing a unit of work
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Span {
    pub trace_id: String,
    pub span_id: String,
    #[serde(default)]
    pub parent_span_id: Option<String>,
    pub name: String,
    pub vendor: String,
    pub start_time: DateTime<Utc>,
    #[serde(default)]
    pub end_time: Option<DateTime<Utc>>,
    pub status: SpanStatus,
    #[serde(default)]
    pub attributes: HashMap<String, serde_json::Value>,
    #[serde(default)]
    pub events: Vec<SpanEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SpanStatus {
    Ok,
    Error,
    InProgress,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpanEvent {
    pub name: String,
    pub timestamp: DateTime<Utc>,
    #[serde(default)]
    pub attributes: HashMap<String, serde_json::Value>,
}

/// Log entry captured from vendor operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: DateTime<Utc>,
    pub level: LogLevel,
    pub vendor: String,
    pub message: String,
    pub trace_id: Option<String>,
    pub span_id: Option<String>,
    #[serde(default)]
    pub attributes: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

/// Trace collector aggregates spans from multiple vendors
pub struct TraceCollector {
    spans: Vec<Span>,
    logs: Vec<LogEntry>,
    exporters: Vec<Box<dyn SpanExporter>>,
}

/// Trait for exporting spans to external systems
pub trait SpanExporter: Send + Sync {
    fn export(&self, spans: &[Span]) -> Result<(), String>;
    fn name(&self) -> &str;
}

impl TraceCollector {
    pub fn new() -> Self {
        Self {
            spans: Vec::new(),
            logs: Vec::new(),
            exporters: Vec::new(),
        }
    }

    pub fn add_exporter(&mut self, exporter: Box<dyn SpanExporter>) {
        self.exporters.push(exporter);
    }

    pub fn new_trace_id() -> String {
        Uuid::new_v4().to_string()
    }

    pub fn new_span_id() -> String {
        Uuid::new_v4().to_string()[..16].to_string()
    }

    pub fn start_span(
        &mut self,
        name: &str,
        vendor: &str,
        trace_id: &str,
        parent: Option<&str>,
    ) -> String {
        let span_id = Self::new_span_id();
        let span = Span {
            trace_id: trace_id.to_string(),
            span_id: span_id.clone(),
            parent_span_id: parent.map(|s| s.to_string()),
            name: name.to_string(),
            vendor: vendor.to_string(),
            start_time: Utc::now(),
            end_time: None,
            status: SpanStatus::InProgress,
            attributes: HashMap::new(),
            events: Vec::new(),
        };
        self.spans.push(span);
        span_id
    }

    pub fn end_span(&mut self, span_id: &str, status: SpanStatus) {
        if let Some(span) = self.spans.iter_mut().find(|s| s.span_id == span_id) {
            span.end_time = Some(Utc::now());
            span.status = status;
        }
        // Export completed spans
        self.flush_completed();
    }

    pub fn set_attribute(&mut self, span_id: &str, key: &str, value: serde_json::Value) {
        if let Some(span) = self.spans.iter_mut().find(|s| s.span_id == span_id) {
            span.attributes.insert(key.to_string(), value);
        }
    }

    pub fn add_event(&mut self, span_id: &str, event: SpanEvent) {
        if let Some(span) = self.spans.iter_mut().find(|s| s.span_id == span_id) {
            span.events.push(event);
        }
    }

    /// Record a log entry correlated to a trace
    pub fn log(&mut self, entry: LogEntry) {
        self.logs.push(entry);
    }

    /// Capture a vendor log message with automatic trace correlation
    pub fn capture_log(
        &mut self,
        vendor: &str,
        level: LogLevel,
        message: &str,
        trace_id: Option<&str>,
        span_id: Option<&str>,
    ) {
        self.logs.push(LogEntry {
            timestamp: Utc::now(),
            level,
            vendor: vendor.to_string(),
            message: message.to_string(),
            trace_id: trace_id.map(|s| s.to_string()),
            span_id: span_id.map(|s| s.to_string()),
            attributes: HashMap::new(),
        });
    }

    pub fn get_trace(&self, trace_id: &str) -> Vec<&Span> {
        self.spans
            .iter()
            .filter(|s| s.trace_id == trace_id)
            .collect()
    }

    pub fn get_logs_for_trace(&self, trace_id: &str) -> Vec<&LogEntry> {
        self.logs
            .iter()
            .filter(|l| l.trace_id.as_deref() == Some(trace_id))
            .collect()
    }

    pub fn get_logs_for_vendor(&self, vendor: &str) -> Vec<&LogEntry> {
        self.logs
            .iter()
            .filter(|l| l.vendor == vendor)
            .collect()
    }

    pub fn all_spans(&self) -> &[Span] {
        &self.spans
    }

    pub fn all_logs(&self) -> &[LogEntry] {
        &self.logs
    }

    /// Flush completed spans to all exporters
    fn flush_completed(&self) {
        let completed: Vec<&Span> = self
            .spans
            .iter()
            .filter(|s| s.end_time.is_some())
            .collect();

        if completed.is_empty() {
            return;
        }

        let owned: Vec<Span> = completed.into_iter().cloned().collect();
        for exporter in &self.exporters {
            if let Err(e) = exporter.export(&owned) {
                eprintln!("[trace] Export to {} failed: {}", exporter.name(), e);
            }
        }
    }

    /// Get cross-vendor trace summary
    pub fn trace_summary(&self, trace_id: &str) -> TraceSummary {
        let spans = self.get_trace(trace_id);
        let vendors: Vec<String> = spans
            .iter()
            .map(|s| s.vendor.clone())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();

        let total_duration = spans
            .iter()
            .filter_map(|s| {
                s.end_time.map(|end| {
                    (end - s.start_time).num_milliseconds() as u64
                })
            })
            .max()
            .unwrap_or(0);

        let error_count = spans
            .iter()
            .filter(|s| s.status == SpanStatus::Error)
            .count();

        TraceSummary {
            trace_id: trace_id.to_string(),
            span_count: spans.len(),
            vendors,
            total_duration_ms: total_duration,
            error_count,
        }
    }
}

impl Default for TraceCollector {
    fn default() -> Self {
        Self::new()
    }
}

/// Summary of a cross-vendor trace
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraceSummary {
    pub trace_id: String,
    pub span_count: usize,
    pub vendors: Vec<String>,
    pub total_duration_ms: u64,
    pub error_count: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_span_lifecycle() {
        let mut collector = TraceCollector::new();
        let trace_id = TraceCollector::new_trace_id();
        let span_id = collector.start_span("generate", "codex", &trace_id, None);
        collector.set_attribute(&span_id, "files", serde_json::json!(3));
        collector.end_span(&span_id, SpanStatus::Ok);

        let trace = collector.get_trace(&trace_id);
        assert_eq!(trace.len(), 1);
        assert_eq!(trace[0].status, SpanStatus::Ok);
        assert!(trace[0].end_time.is_some());
    }

    #[test]
    fn test_log_capture() {
        let mut collector = TraceCollector::new();
        let trace_id = TraceCollector::new_trace_id();
        collector.capture_log("codex", LogLevel::Info, "Generating AGENTS.md", Some(&trace_id), None);
        collector.capture_log("cursor", LogLevel::Warn, "Rule file too large", Some(&trace_id), None);
        collector.capture_log("claude", LogLevel::Error, "API timeout", None, None);

        assert_eq!(collector.get_logs_for_trace(&trace_id).len(), 2);
        assert_eq!(collector.get_logs_for_vendor("claude").len(), 1);
    }

    #[test]
    fn test_trace_summary() {
        let mut collector = TraceCollector::new();
        let trace_id = TraceCollector::new_trace_id();

        let s1 = collector.start_span("generate", "codex", &trace_id, None);
        collector.end_span(&s1, SpanStatus::Ok);

        let s2 = collector.start_span("generate", "cursor", &trace_id, None);
        collector.end_span(&s2, SpanStatus::Error);

        let summary = collector.trace_summary(&trace_id);
        assert_eq!(summary.span_count, 2);
        assert_eq!(summary.error_count, 1);
        assert_eq!(summary.vendors.len(), 2);
    }
}
