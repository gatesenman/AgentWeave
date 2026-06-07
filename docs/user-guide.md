# AgentWeave User Guide

## Quick Start

### Installation

```bash
# From source
cargo install --path crates/agentweave-cli

# Or download pre-built binary from releases
curl -L https://github.com/gaosichun888/AgentWeave/releases/latest/download/agentweave-linux-x86_64.tar.gz | tar xz
sudo mv agentweave /usr/local/bin/
```

### Initialize a Project

```bash
cd your-project
agentweave init --name "My Project"
```

This creates `.agentweave/` with:
- `agentweave.yaml` — Project configuration
- `agents/main.agent.yaml` — Default agent definition
- `rules/general.rule.yaml` — Default coding rules

### Generate Vendor Configs

```bash
# Generate for all configured targets
agentweave generate

# Generate for a specific vendor
agentweave generate --vendor cursor
```

### Import Existing Configs

```bash
# Import from an existing Cursor setup
agentweave import cursor

# Import from Claude Code
agentweave import claude-code
```

## Configuration Reference

### Project Config (`agentweave.yaml`)

```yaml
apiVersion: agentweave/v1
kind: Project
metadata:
  name: "my-project"
  version: "1.0.0"
  description: "Project description"
  authors:
    - name: "Developer"

spec:
  defaultModel:
    provider: openai
    model: gpt-4o
    params:
      temperature: 0.7

  targets:
    - codex
    - claude-code
    - cursor
    - windsurf
    - gemini-cli
    - github-copilot
    - devin
    - cline
    - codebuddy
    - qoder
    - grok-build
    - openclaw

  sync:
    mode: realtime          # realtime | on-save | manual
    transport: file-watch
    debounceMs: 300
    lockStrategy: last-write-wins  # last-write-wins | merge | lock
```

### Agent Definition (`agents/*.agent.yaml`)

```yaml
name: frontend-specialist
description: "Frontend development agent"
role: "Senior React/TypeScript engineer"
systemPrompt: |
  You are an expert frontend developer specializing in React.
  Follow component-driven architecture.

tools:
  allow:
    - "Bash(*)"
    - "Read(**)"
    - "Write(src/**/*.tsx)"
  deny:
    - "Write(*.env)"

skills:
  - react-patterns
  - testing-best-practices

memory:
  maxContextTokens: 128000
  strategy: sliding-window
```

### Rule Definition (`rules/*.rule.yaml`)

```yaml
name: typescript-standards
description: "TypeScript coding standards"
activation:
  type: glob           # always | glob | manual | agent-request
  globs:
    - "**/*.ts"
    - "**/*.tsx"
priority: 100
content: |
  - Use strict TypeScript
  - Prefer interfaces over types
  - No `any` type usage
  - All functions must have return types
```

### MCP Server (`mcp/*.mcp.yaml`)

```yaml
name: postgres-mcp
protocol: stdio
command: npx
args: ["-y", "@modelcontextprotocol/server-postgres"]
env:
  DATABASE_URL: "${DATABASE_URL}"
capabilities:
  - query
  - schema-introspection
```

### Hook Definition (`hooks/*.hook.yaml`)

```yaml
name: pre-commit-lint
trigger: pre-commit
command: npm run lint
timeout: 30s
failBehavior: block   # block | warn | ignore
```

## Commands

| Command | Description |
|---------|-------------|
| `agentweave init` | Initialize new project |
| `agentweave generate` | Generate all vendor configs |
| `agentweave validate` | Validate configuration |
| `agentweave import <vendor>` | Import existing vendor config |
| `agentweave vendors` | List supported vendors |
| `agentweave status` | Show project status |
| `agentweave watch` | Watch for changes and regenerate |
| `agentweave sync` | Real-time sync across IDEs |
| `agentweave compare` | Compare output across vendors |
| `agentweave version commit` | Save config version |
| `agentweave version log` | Show version history |
| `agentweave version restore` | Restore config version |
| `agentweave serve` | Start ACP gateway server |

## Vendor Output Mapping

| Vendor | Generated Files |
|--------|----------------|
| Codex | `AGENTS.md` |
| Claude Code | `CLAUDE.md`, `.claude/settings.json` |
| Cursor | `.cursorrules`, `.cursor/rules/*.mdc` |
| Windsurf | `.windsurfrules`, `.windsurf/rules/*.md` |
| Gemini CLI | `GEMINI.md` |
| GitHub Copilot | `.github/copilot-instructions.md`, `.github/instructions/*.md` |
| Devin | `.devin/config.json`, `.devin/agents/*.md`, `.devin/hooks.v1.json` |
| Cline | `.clinerules/*.md` |
| CodeBuddy | `.codebuddy/settings.json`, `.codebuddy/agents/*.json`, `.codebuddy/hooks.json`, `.codebuddy/mcp-config.json` |
| Qoder | `agents/*.json`, `agents/manifest.json` |
| Grok Build | `.grok/config.toml` |
| OpenClaw | `openclaw.json` |

## ACP Gateway

Start the unified dispatch server:

```bash
agentweave serve --port 9800
```

### API Endpoints

```
GET  /ping               - Service health
GET  /agents             - List registered agents
POST /agents             - Register agent
POST /runs              - Dispatch work to agent
GET  /health            - All agent health status
GET  /runs/history      - Execution history
```

### Example: Dispatch

```bash
curl -X POST http://localhost:9800/runs \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "coder",
    "strategy": "best-match",
    "input": {
      "messages": [{"role": "user", "content": "Fix the bug in auth.ts"}]
    }
  }'
```

## Enterprise Governance

### RBAC Roles

| Role | Permissions |
|------|------------|
| Admin | Full access: create/edit/delete policies, manage users, view audit |
| Developer | Edit configs, generate, view policies |
| Viewer | Read-only access to configs and logs |

### Policy Modes

- **enforce** — Block non-compliant operations
- **warn** — Allow but emit warning
- **audit-only** — Log for review, no blocking

### Audit Logging

All operations are logged to SQLite with:
- Timestamp, actor, action, resource
- Policy evaluation results
- Full-chain trace correlation

## Tracing & Observability

AgentWeave supports OTLP-compatible trace export:

```bash
# Configure OTLP endpoint
export AGENTWEAVE_OTLP_ENDPOINT=http://localhost:4318

# Or use file export for local debugging
export AGENTWEAVE_TRACE_FILE=./traces.jsonl
```

Cross-vendor spans include:
- `agentweave.vendor` — Which vendor processed the request
- `agentweave.operation` — generate/validate/import/dispatch
- Full parent-child span correlation

## i18n

Set language via:
```bash
agentweave --lang zh-CN generate
agentweave --lang ja-JP status
```

Supported: `en-US`, `zh-CN`, `ja-JP`
