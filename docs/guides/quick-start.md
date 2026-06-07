# Quick Start Guide

## Installation

### From Binary Release

Download the latest release for your platform:
- **macOS**: `agentweave-darwin-aarch64.tar.gz`
- **Linux**: `agentweave-linux-x86_64.tar.gz`
- **Windows**: `agentweave-windows-x86_64.zip`

### From Source

```bash
git clone https://github.com/gaosichun888/AgentWeave.git
cd AgentWeave
cargo build --release
```

The binary will be at `target/release/agentweave`.

### Desktop App

```bash
cd apps/desktop
pnpm install
pnpm tauri build
```

## First Project

### 1. Initialize

```bash
mkdir my-project && cd my-project
agentweave init
```

This creates `agentweave.yaml` with a default configuration.

### 2. Configure

Edit `agentweave.yaml` to define your agents, rules, and targets:

```yaml
apiVersion: agentweave/v1
kind: Project
metadata:
  name: my-project
  version: "1.0.0"

targets:
  - codex
  - claude-code
  - cursor

agents:
  - name: main
    role: "Developer assistant"
    instructions: |
      Help write clean, tested code following project conventions.

rules:
  - name: typescript-only
    content: "Use TypeScript for all new files"
    scope: "src/**/*"
```

### 3. Generate

```bash
agentweave generate
```

This creates vendor-specific configuration files:
- `AGENTS.md` (for Codex)
- `CLAUDE.md` + `.claude/settings.json` (for Claude Code)
- `.cursor/rules/*.mdc` (for Cursor)

### 4. Validate

```bash
agentweave validate
```

Checks your configuration for errors and warnings.

### 5. Watch

```bash
agentweave watch
```

Monitors `agentweave.yaml` and auto-regenerates on changes.

## Next Steps

- [Full User Guide](../user-guide.md) — Complete reference
- [API Documentation](../api-reference.md) — ACP Gateway REST API
- [Architecture](../architecture.md) — System design overview
- [Enterprise Setup](./enterprise-governance.md) — RBAC and policies
