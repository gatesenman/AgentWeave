# AgentWeave Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Desktop App (Tauri v2)                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │Dashboard│ │ Config  │ │Adapters │ │  Logs   │          │
│  │         │ │ Editor  │ │  View   │ │ Viewer  │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
├─────────────────────────────────────────────────────────────┤
│                     Tauri IPC Layer                           │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                      Core Engine (Rust)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Config  │  │ Adapter  │  │   Sync   │  │  Trace   │   │
│  │  Parser  │  │ Registry │  │  Engine  │  │Collector │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Governance│  │ Updater  │  │   ACP    │  │ Version  │   │
│  │  Engine  │  │  Module  │  │ Gateway  │  │ Manager  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    Adapter Layer (12 Vendors)                 │
│  ┌────┐ ┌────────┐ ┌──────┐ ┌────────┐ ┌──────┐ ┌──────┐ │
│  │Cdx │ │Claude  │ │Cursor│ │Windsurf│ │Gemini│ │Copilt│ │
│  └────┘ └────────┘ └──────┘ └────────┘ └──────┘ └──────┘ │
│  ┌────┐ ┌────────┐ ┌──────┐ ┌────────┐ ┌──────┐ ┌──────┐ │
│  │Devn│ │ Cline  │ │CdBdy │ │ Qoder  │ │ Grok │ │OClaw │ │
│  └────┘ └────────┘ └──────┘ └────────┘ └──────┘ └──────┘ │
└─────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    File System Output                         │
│  .cursorrules, AGENTS.md, CLAUDE.md, .github/*, etc.         │
└─────────────────────────────────────────────────────────────┘
```

## Crate Structure

```
AgentWeave/
├── crates/
│   ├── agentweave-core/     # Config parsing, adapter trait, error types
│   ├── agentweave-cli/      # CLI binary (commands, i18n, import, compare, version)
│   ├── agentweave-acp/      # ACP gateway (REST API, routing, health)
│   ├── agentweave-trace/    # Tracing + OTLP export + log capture
│   ├── agentweave-sync/     # Real-time file sync engine
│   ├── agentweave-governance/ # RBAC, policies, audit, quotas
│   ├── agentweave-updater/  # Remote update mechanism
│   └── adapters/
│       ├── adapter-codex/
│       ├── adapter-claude/
│       ├── adapter-cursor/
│       ├── adapter-windsurf/
│       ├── adapter-gemini/
│       ├── adapter-copilot/
│       ├── adapter-devin/
│       ├── adapter-cline/
│       ├── adapter-codebuddy/
│       ├── adapter-qoder/
│       ├── adapter-grok/
│       └── adapter-openclaw/
├── desktop/                  # Tauri v2 desktop application
│   ├── src/                  # React + TypeScript frontend
│   └── src-tauri/           # Rust backend for Tauri
└── docs/                     # Documentation
```

## Data Flow

### Generate Flow
```
agentweave.yaml → Config Parser → AdapterRegistry → [Adapter₁..Adapter₁₂] → File Output
                                         ↓
                              TraceCollector (spans)
                                         ↓
                              OTLP Export / File / Console
```

### Import Flow
```
Vendor Files (.cursorrules, CLAUDE.md, etc.)
    → Vendor-specific Parser
    → Normalize to Superset Schema
    → Write .agentweave/ YAML files
```

### Sync Flow
```
File System Events (notify v7)
    → Debounce (300ms)
    → Conflict Detection
    → Resolution Strategy
    → Re-generate affected vendors
    → Notify subscribers (event bus)
```

### ACP Dispatch Flow
```
HTTP Request → Router → RunRequest
    → Strategy Selection (best-match/round-robin/etc.)
    → Health Filter (exclude unhealthy agents)
    → Target Selection
    → Dispatch + Record Run
    → Response + Trace Correlation
```

## Design Decisions

### Why Rust?
- Single binary distribution (no runtime dependencies)
- Cross-platform compilation
- Memory safety without GC (important for file-watching daemon)
- Excellent async support (tokio) for ACP gateway
- Fast startup for CLI usage

### Why YAML for Superset Schema?
- Human-readable and editable
- Git-friendly (easy diffs)
- Widely understood by developers
- Supports complex nested structures
- Comments allowed (unlike JSON)

### Why Tauri v2?
- Smaller binary than Electron (~10MB vs ~150MB)
- Native performance with Rust backend
- Access to full Rust ecosystem from desktop app
- Cross-platform (Windows, macOS, Linux)

### Adapter Pattern
Each vendor adapter implements `VendorAdapter` trait:
```rust
pub trait VendorAdapter: Send + Sync {
    fn name(&self) -> &str;
    fn display_name(&self) -> &str;
    fn supported_concepts(&self) -> Vec<Concept>;
    fn generate(&self, config: &AgentWeaveConfig, output_dir: &Path)
        -> Result<AdapterOutput, AdapterError>;
}
```

This enables:
- Easy addition of new vendors
- Independent testing per vendor
- Feature-flag based inclusion
- Community contributions via crate plugins
