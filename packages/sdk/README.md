# AgentWeave Adapter SDK

Build custom adapters for new vendor platforms.

## Quick Start

```rust
use agentweave_core::adapter::{VendorAdapter, AdapterOutput};
use agentweave_core::config::AgentWeaveConfig;
use agentweave_core::schema::TargetVendor;
use std::path::Path;
use anyhow::Result;

pub struct MyVendorAdapter;

impl VendorAdapter for MyVendorAdapter {
    fn vendor(&self) -> TargetVendor {
        TargetVendor::Custom("my-vendor".to_string())
    }

    fn display_name(&self) -> &str {
        "My Vendor"
    }

    fn supported_concepts(&self) -> Vec<&str> {
        vec!["agent", "rule", "mcp-server", "hook"]
    }

    fn generate(&self, config: &AgentWeaveConfig, _project_root: &Path) -> Result<AdapterOutput> {
        let mut output = AdapterOutput::new();
        
        // Generate your vendor's config format
        let mut content = String::new();
        for agent in &config.agents {
            content.push_str(&format!("agent: {}\n", agent.name));
            content.push_str(&format!("role: {}\n", agent.role));
        }
        
        output.add_file(".my-vendor/config.yaml", content);
        Ok(output)
    }
}
```

## Adapter Trait

Every adapter must implement `VendorAdapter`:

| Method | Required | Description |
|--------|----------|-------------|
| `vendor()` | Yes | Return the vendor identifier |
| `display_name()` | Yes | Human-readable name |
| `supported_concepts()` | Yes | List of concepts this vendor supports |
| `generate()` | Yes | Generate vendor config from AgentWeave config |
| `parse()` | No | Reverse-parse vendor config into AgentWeave format |
| `diff()` | No | Compute differences between current and generated |

## Registration

Register your adapter in the CLI or desktop app:

```rust
use agentweave_core::adapter::AdapterRegistry;

let mut registry = AdapterRegistry::new();
registry.register(Box::new(MyVendorAdapter));
```

## Plugin Distribution

Package as a Rust crate and publish to crates.io, or distribute as a WASM module for dynamic loading:

```toml
[package]
name = "agentweave-adapter-myvendor"
version = "0.1.0"

[dependencies]
agentweave-core = "0.1"
```

## Concepts Reference

Your adapter should handle as many of the 46 superset concepts as applicable:

| Category | Concepts |
|----------|----------|
| Core | agent, sub-agent, model, rule, skill, workflow, hook, memory, context |
| Tools | mcp-server, plugin, tool, permission, command |
| Runtime | session, env, sandbox, schedule, automation, channel |
| Content | prompt-template, output-style, knowledge, code-index, example |
| Governance | log, trace, metric, audit, version, snapshot, policy, quota, role, team |
