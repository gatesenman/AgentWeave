# Adapter Protocol Specification

Version: 1.0.0

## Overview

Adapters translate the AgentWeave superset schema into vendor-specific configuration formats. Each adapter implements the `VendorAdapter` trait and handles format-specific generation.

## Adapter Trait

```rust
pub trait VendorAdapter: Send + Sync {
    fn vendor(&self) -> TargetVendor;
    fn display_name(&self) -> &str;
    fn supported_concepts(&self) -> Vec<&str>;
    fn generate(&self, config: &AgentWeaveConfig, project_root: &Path) -> Result<AdapterOutput>;
}
```

## Output Format

```rust
pub struct AdapterOutput {
    pub files: Vec<OutputFile>,
}

pub struct OutputFile {
    pub path: PathBuf,    // Relative to project root
    pub content: String,  // Generated content
}
```

## Registration

Adapters are registered in an `AdapterRegistry`:

```rust
let mut registry = AdapterRegistry::new();
registry.register(Box::new(CodexAdapter::new()));
registry.register(Box::new(ClaudeCodeAdapter::new()));
// ... etc
```

## Vendor Output Mapping

| Vendor | Output Files | Format |
|--------|-------------|--------|
| Codex | `AGENTS.md` | Markdown |
| Claude Code | `CLAUDE.md`, `.claude/settings.json` | Markdown + JSON |
| Cursor | `.cursor/rules/*.mdc` | MDC (Markdown Directives) |
| Windsurf | `.windsurf/rules/*.md` | Markdown |
| Gemini CLI | `GEMINI.md` | Markdown |
| GitHub Copilot | `.github/copilot-instructions.md` | Markdown |
| Devin | `.devin/settings.json`, `.devin/skills/*.md` | JSON + Markdown |
| Cline | `.clinerules` | Markdown |
| CodeBuddy | `.codebuddy/config.yaml` | YAML |
| Qoder | `/agents/*.yaml` | YAML |
| Grok Build | `.grok/config.toml` | TOML |
| OpenClaw | `~/.openclaw/openclaw.json` | JSON |

## Concept Mapping Rules

When a concept is not supported by a vendor:
1. **Skip silently** — do not generate unsupported fields
2. **Downgrade gracefully** — map to nearest equivalent if possible
3. **Log warning** — emit trace span noting the skipped concept

## Custom Adapter Development

See `packages/sdk/README.md` for the adapter development guide.

### Minimal Implementation

```rust
use agentweave_core::adapter::{VendorAdapter, AdapterOutput, OutputFile};
use agentweave_core::config::AgentWeaveConfig;
use agentweave_core::schema::TargetVendor;
use std::path::Path;
use anyhow::Result;

pub struct MyAdapter;

impl VendorAdapter for MyAdapter {
    fn vendor(&self) -> TargetVendor {
        TargetVendor::Custom("my-vendor".to_string())
    }

    fn display_name(&self) -> &str { "My Vendor" }

    fn supported_concepts(&self) -> Vec<&str> {
        vec!["agent", "rule"]
    }

    fn generate(&self, config: &AgentWeaveConfig, _root: &Path) -> Result<AdapterOutput> {
        let mut output = AdapterOutput::new();
        // Generate vendor-specific files
        output.add_file(".my-vendor/config.json", serde_json::to_string_pretty(&config)?);
        Ok(output)
    }
}
```
