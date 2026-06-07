# AgentWeave API Reference

## ACP Gateway REST API

Base URL: `http://localhost:9800`

### Health Check

```
GET /ping
```

Response:
```json
{
  "status": "ok",
  "service": "agentweave-acp",
  "version": "0.1.0",
  "capabilities": ["dispatch", "health-check", "routing", "tracing"]
}
```

---

### Agents

#### List Agents

```
GET /agents
```

Response: `200 OK`
```json
[
  {
    "id": "agent-001",
    "name": "coder",
    "description": "General coding assistant",
    "vendor": "codex",
    "capabilities": ["chat", "code-generation", "debugging"]
  }
]
```

#### Register Agent

```
POST /agents
Content-Type: application/json
```

Body:
```json
{
  "id": "agent-001",
  "name": "coder",
  "description": "General coding assistant",
  "vendor": "codex",
  "capabilities": ["chat", "code-generation"]
}
```

Response: `201 Created`
```json
{ "registered": "agent-001" }
```

#### Get Agent

```
GET /agents/{id}
```

Response: `200 OK` | `404 Not Found`

#### Delete Agent

```
DELETE /agents/{id}
```

Response: `204 No Content`

---

### Agent Health

#### Get Agent Health

```
GET /agents/{id}/health
```

Response:
```json
{
  "agent_id": "agent-001",
  "healthy": true,
  "consecutive_failures": 0,
  "latency_ms": 42
}
```

#### Get All Health

```
GET /health
```

Response:
```json
{
  "agents": [
    {
      "agent_id": "agent-001",
      "healthy": true,
      "consecutive_failures": 0,
      "latency_ms": 42
    }
  ]
}
```

---

### Runs (Dispatch)

#### Create Run

```
POST /runs
Content-Type: application/json
```

Body:
```json
{
  "agent": "coder",
  "vendor": null,
  "strategy": "best-match",
  "input": {
    "messages": [
      { "role": "user", "content": "Implement the login feature" }
    ],
    "context": { "file": "src/auth.ts" }
  },
  "options": {
    "mode": "sync",
    "timeout_secs": 300,
    "trace_id": "custom-trace-id"
  }
}
```

**Strategy options:**
| Strategy | Behavior |
|----------|----------|
| `best-match` | Route to lowest-latency healthy agent |
| `round-robin` | Distribute evenly across healthy agents |
| `least-latency` | Route to fastest responding agent |
| `race-first` | Send to all, return first response |
| `fanout` | Send to all, aggregate responses |
| `direct` | Route to specific vendor |

Response: `201 Created` | `503 Service Unavailable`
```json
{
  "id": "run-uuid-here",
  "status": "completed",
  "output": {
    "messages": [
      { "role": "assistant", "content": "Dispatched to agent 'coder' (vendor: codex)" }
    ],
    "metadata": {
      "vendor": "codex",
      "latency_ms": 15,
      "trace_id": "custom-trace-id"
    }
  },
  "created_at": "2026-01-15T10:30:00Z",
  "completed_at": "2026-01-15T10:30:01Z",
  "error": null
}
```

#### Get Run History

```
GET /runs/history
```

Response:
```json
{
  "runs": [
    {
      "id": "run-uuid",
      "agent_id": "agent-001",
      "vendor": "codex",
      "status": "completed",
      "trace_id": "trace-123"
    }
  ]
}
```

---

## Superset Schema YAML Reference

### Concept Types (46 total)

| Category | Concepts |
|----------|----------|
| Core | Agent, Rule, Skill, Hook, Workflow, Memory |
| Context | Context, CodeIndex, Wiki, Session, SubAgent |
| Tools | MCP, Plugin, Tool, Permission |
| Config | Model, Provider, Environment, Secret |
| Sync | SyncConfig, LockStrategy, ConflictPolicy |
| Governance | Policy, Role, AuditEntry, Quota |
| Observability | Trace, Span, Log, Metric |
| Deployment | Target, Adapter, Template |
| Advanced | Pipeline, Trigger, Schedule, Notification |
| Extensions | CustomField, Metadata, Tag, Label |
| Collaboration | Team, Workspace, SharedConfig |
| Quality | TestCase, Benchmark, Comparison |

---

## Rust API (Library)

### Core Config

```rust
use agentweave_core::config::AgentWeaveConfig;

let config = AgentWeaveConfig::load(&project_dir)?;
println!("Project: {}", config.metadata.name);
println!("Agents: {}", config.agents.len());
```

### Adapter Registry

```rust
use agentweave_core::adapter::AdapterRegistry;

let registry = AdapterRegistry::new();
// Register adapters...
let results = registry.generate_all(&config, &project_dir);
```

### Trace Collector

```rust
use agentweave_trace::{TraceCollector, SpanStatus};
use agentweave_trace::otlp::OtlpExporter;

let mut collector = TraceCollector::new();
collector.add_exporter(Box::new(
    OtlpExporter::new("http://localhost:4318", "agentweave")
));

let trace_id = TraceCollector::new_trace_id();
let span_id = collector.start_span("generate", "cursor", &trace_id, None);
// ... do work ...
collector.end_span(&span_id, SpanStatus::Ok);
```

### Governance

```rust
use agentweave_governance::{RbacManager, PolicyEngine, AuditLogger};

let rbac = RbacManager::new();
rbac.add_role("admin", &["*"]);
rbac.check_permission("user-1", "config:write")?;

let audit = AuditLogger::new("audit.db")?;
audit.log("user-1", "config:generate", "cursor")?;
```
