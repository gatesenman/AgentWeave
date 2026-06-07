use crate::{Span, SpanExporter, SpanStatus};
use serde::Serialize;
use std::collections::HashMap;

/// OTLP-compatible span exporter
/// Converts AgentWeave spans to OpenTelemetry Protocol format
pub struct OtlpExporter {
    endpoint: String,
    service_name: String,
    headers: HashMap<String, String>,
}

/// OTLP export payload (simplified protobuf-JSON format)
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OtlpExportRequest {
    resource_spans: Vec<ResourceSpan>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ResourceSpan {
    resource: OtlpResource,
    scope_spans: Vec<ScopeSpan>,
}

#[derive(Debug, Serialize)]
struct OtlpResource {
    attributes: Vec<OtlpAttribute>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScopeSpan {
    scope: InstrumentationScope,
    spans: Vec<OtlpSpan>,
}

#[derive(Debug, Serialize)]
struct InstrumentationScope {
    name: String,
    version: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OtlpSpan {
    trace_id: String,
    span_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    parent_span_id: Option<String>,
    name: String,
    kind: u8,
    start_time_unix_nano: u64,
    end_time_unix_nano: u64,
    attributes: Vec<OtlpAttribute>,
    status: OtlpStatus,
    events: Vec<OtlpEvent>,
}

#[derive(Debug, Serialize)]
struct OtlpAttribute {
    key: String,
    value: OtlpValue,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OtlpValue {
    string_value: Option<String>,
    int_value: Option<i64>,
    bool_value: Option<bool>,
}

#[derive(Debug, Serialize)]
struct OtlpStatus {
    code: u8,
    message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OtlpEvent {
    name: String,
    time_unix_nano: u64,
    attributes: Vec<OtlpAttribute>,
}

impl OtlpExporter {
    pub fn new(endpoint: &str, service_name: &str) -> Self {
        Self {
            endpoint: endpoint.to_string(),
            service_name: service_name.to_string(),
            headers: HashMap::new(),
        }
    }

    pub fn with_header(mut self, key: &str, value: &str) -> Self {
        self.headers.insert(key.to_string(), value.to_string());
        self
    }

    fn convert_spans(&self, spans: &[Span]) -> OtlpExportRequest {
        // Group spans by vendor
        let mut vendor_groups: HashMap<String, Vec<&Span>> = HashMap::new();
        for span in spans {
            vendor_groups
                .entry(span.vendor.clone())
                .or_default()
                .push(span);
        }

        let resource_spans: Vec<ResourceSpan> = vendor_groups
            .into_iter()
            .map(|(vendor, spans)| {
                let otlp_spans: Vec<OtlpSpan> = spans.iter().map(|s| self.to_otlp_span(s)).collect();
                ResourceSpan {
                    resource: OtlpResource {
                        attributes: vec![
                            OtlpAttribute {
                                key: "service.name".to_string(),
                                value: OtlpValue {
                                    string_value: Some(self.service_name.clone()),
                                    int_value: None,
                                    bool_value: None,
                                },
                            },
                            OtlpAttribute {
                                key: "agentweave.vendor".to_string(),
                                value: OtlpValue {
                                    string_value: Some(vendor),
                                    int_value: None,
                                    bool_value: None,
                                },
                            },
                        ],
                    },
                    scope_spans: vec![ScopeSpan {
                        scope: InstrumentationScope {
                            name: "agentweave".to_string(),
                            version: env!("CARGO_PKG_VERSION").to_string(),
                        },
                        spans: otlp_spans,
                    }],
                }
            })
            .collect();

        OtlpExportRequest { resource_spans }
    }

    fn to_otlp_span(&self, span: &Span) -> OtlpSpan {
        let start_nanos = span.start_time.timestamp_nanos_opt().unwrap_or(0) as u64;
        let end_nanos = span
            .end_time
            .and_then(|t| t.timestamp_nanos_opt())
            .unwrap_or(0) as u64;

        let mut attributes: Vec<OtlpAttribute> = span
            .attributes
            .iter()
            .map(|(k, v)| OtlpAttribute {
                key: k.clone(),
                value: OtlpValue {
                    string_value: Some(v.to_string()),
                    int_value: None,
                    bool_value: None,
                },
            })
            .collect();

        attributes.push(OtlpAttribute {
            key: "agentweave.vendor".to_string(),
            value: OtlpValue {
                string_value: Some(span.vendor.clone()),
                int_value: None,
                bool_value: None,
            },
        });

        let events: Vec<OtlpEvent> = span
            .events
            .iter()
            .map(|e| OtlpEvent {
                name: e.name.clone(),
                time_unix_nano: e.timestamp.timestamp_nanos_opt().unwrap_or(0) as u64,
                attributes: e
                    .attributes
                    .iter()
                    .map(|(k, v)| OtlpAttribute {
                        key: k.clone(),
                        value: OtlpValue {
                            string_value: Some(v.to_string()),
                            int_value: None,
                            bool_value: None,
                        },
                    })
                    .collect(),
            })
            .collect();

        OtlpSpan {
            trace_id: span.trace_id.clone(),
            span_id: span.span_id.clone(),
            parent_span_id: span.parent_span_id.clone(),
            name: span.name.clone(),
            kind: 1, // INTERNAL
            start_time_unix_nano: start_nanos,
            end_time_unix_nano: end_nanos,
            attributes,
            status: OtlpStatus {
                code: match span.status {
                    SpanStatus::Ok => 1,
                    SpanStatus::Error => 2,
                    SpanStatus::InProgress => 0,
                },
                message: String::new(),
            },
            events,
        }
    }

    /// Export as JSON payload (for debugging / file export)
    pub fn to_json(&self, spans: &[Span]) -> String {
        let payload = self.convert_spans(spans);
        serde_json::to_string_pretty(&payload).unwrap_or_default()
    }
}

impl SpanExporter for OtlpExporter {
    fn export(&self, spans: &[Span]) -> Result<(), String> {
        let payload = self.convert_spans(spans);
        let _json = serde_json::to_vec(&payload).map_err(|e| e.to_string())?;

        // In production, this would POST to the OTLP endpoint:
        // POST {self.endpoint}/v1/traces
        // Content-Type: application/json
        // Body: payload JSON
        //
        // For now we log successful serialization as proof of export readiness
        tracing::debug!(
            endpoint = %self.endpoint,
            span_count = spans.len(),
            "OTLP export prepared"
        );

        Ok(())
    }

    fn name(&self) -> &str {
        "otlp"
    }
}

/// Console exporter for development/debugging
pub struct ConsoleExporter;

impl SpanExporter for ConsoleExporter {
    fn export(&self, spans: &[Span]) -> Result<(), String> {
        for span in spans {
            println!(
                "[TRACE] {} | {} | {} | {:?} | {}ms",
                span.trace_id,
                span.vendor,
                span.name,
                span.status,
                span.end_time
                    .map(|e| (e - span.start_time).num_milliseconds())
                    .unwrap_or(0)
            );
        }
        Ok(())
    }

    fn name(&self) -> &str {
        "console"
    }
}

/// File exporter writes JSONL to a file
pub struct FileExporter {
    path: std::path::PathBuf,
}

impl FileExporter {
    pub fn new(path: &std::path::Path) -> Self {
        Self {
            path: path.to_path_buf(),
        }
    }
}

impl SpanExporter for FileExporter {
    fn export(&self, spans: &[Span]) -> Result<(), String> {
        use std::io::Write;
        let mut file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.path)
            .map_err(|e| e.to_string())?;

        for span in spans {
            let json = serde_json::to_string(span).map_err(|e| e.to_string())?;
            writeln!(file, "{}", json).map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    fn name(&self) -> &str {
        "file"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::TraceCollector;

    #[test]
    fn test_otlp_conversion() {
        let mut collector = TraceCollector::new();
        let trace_id = TraceCollector::new_trace_id();
        let span_id = collector.start_span("generate", "codex", &trace_id, None);
        collector.end_span(&span_id, SpanStatus::Ok);

        let exporter = OtlpExporter::new("http://localhost:4318", "agentweave");
        let json = exporter.to_json(collector.all_spans());
        assert!(json.contains("resourceSpans"));
        assert!(json.contains("agentweave.vendor"));
        assert!(json.contains("codex"));
    }

    #[test]
    fn test_console_exporter() {
        let mut collector = TraceCollector::new();
        let trace_id = TraceCollector::new_trace_id();
        let span_id = collector.start_span("parse", "cursor", &trace_id, None);
        collector.end_span(&span_id, SpanStatus::Ok);

        let exporter = ConsoleExporter;
        assert!(exporter.export(collector.all_spans()).is_ok());
    }
}
