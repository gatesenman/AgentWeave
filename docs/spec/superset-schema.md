# AgentWeave Superset Schema Specification

Version: 1.0.0

## Overview

The AgentWeave Superset Schema defines a universal configuration format that encompasses all concepts across AI agent platforms. It serves as the single source of truth from which vendor-specific configurations are generated.

## Top-Level Structure

```yaml
apiVersion: agentweave/v1
kind: Project
metadata: { ... }
targets: [ ... ]
default_model: { ... }
agents: [ ... ]
rules: [ ... ]
skills: [ ... ]
hooks: [ ... ]
mcp_servers: [ ... ]
workflows: [ ... ]
sync: { ... }
governance: { ... }
updater: { ... }
```

## Concept Catalog (46 Concepts)

### Core Concepts

| # | Concept | Description |
|---|---------|-------------|
| 1 | Agent | Primary AI assistant with role/instructions |
| 2 | SubAgent | Nested agent within a parent agent |
| 3 | MultiAgent | Coordinated group of agents |
| 4 | Rule | Behavioral directive for the AI |
| 5 | Skill | Reusable capability/procedure |
| 6 | Workflow | Multi-step orchestrated process |
| 7 | Hook | Event-triggered automation |
| 8 | Memory | Persistent context across sessions |
| 9 | Context | Scoped information for the agent |
| 10 | Session | Conversation state management |

### Integration Concepts

| # | Concept | Description |
|---|---------|-------------|
| 11 | MCP Server | Model Context Protocol server |
| 12 | Plugin | Loadable extension module |
| 13 | Tool | Callable function/action |
| 14 | API Endpoint | External service integration |
| 15 | Webhook | HTTP callback registration |
| 16 | EventBus | Pub/sub message channel |

### Configuration Concepts

| # | Concept | Description |
|---|---------|-------------|
| 17 | Model | AI model selection/params |
| 18 | Permission | Access control definition |
| 19 | OutputStyle | Response format preferences |
| 20 | Temperature | Randomness/creativity parameter |
| 21 | MaxTokens | Output length limit |
| 22 | TopP | Nucleus sampling threshold |
| 23 | StopSequence | Generation termination tokens |

### Content Concepts

| # | Concept | Description |
|---|---------|-------------|
| 24 | CodeIndex | Source code search/retrieval |
| 25 | Wiki | Knowledge base documents |
| 26 | Documentation | Reference material |
| 27 | Template | Reusable content patterns |
| 28 | Snippet | Code fragment library |
| 29 | Prompt | Prompt template management |

### Governance Concepts

| # | Concept | Description |
|---|---------|-------------|
| 30 | RBAC | Role-based access control |
| 31 | Policy | Organizational constraint |
| 32 | AuditLog | Activity tracking |
| 33 | Quota | Resource usage limit |
| 34 | Compliance | Regulatory adherence |
| 35 | DataResidency | Geographic data controls |

### Operations Concepts

| # | Concept | Description |
|---|---------|-------------|
| 36 | Sync | Multi-IDE real-time sync |
| 37 | Watch | File change monitoring |
| 38 | Version | Configuration versioning |
| 39 | Migration | Cross-vendor migration |
| 40 | Import | Vendor config ingestion |
| 41 | Export | Configuration output |

### Platform Concepts

| # | Concept | Description |
|---|---------|-------------|
| 42 | Updater | Remote software updates |
| 43 | Notification | User alert system |
| 44 | Telemetry | Usage metrics collection |
| 45 | Trace | Distributed tracing |
| 46 | HealthCheck | System diagnostics |

## Vendor Concept Coverage

| Vendor | Concepts Supported |
|--------|-------------------|
| Codex | Agent, SubAgent, Rule, Skill, Memory, MCP, Hook, Workflow |
| Claude Code | Agent, SubAgent, Rule, Skill, Workflow, Hook, Memory, MCP, Permission, OutputStyle |
| Cursor | Rule, Agent, Context |
| Windsurf | Rule, Agent, Memory |
| Gemini CLI | Rule, Agent, Memory, MCP, Model |
| GitHub Copilot | Rule, Agent |
| Devin | Agent, SubAgent, Rule, Skill, Hook, MCP, Workflow |
| Cline | Rule, Agent |
| CodeBuddy | Agent, SubAgent, Rule, Skill, Hook, MCP, Permission, OutputStyle |
| Qoder | Agent, SubAgent, Tool |
| Grok Build | Agent, Rule, Skill, Hook, MCP, Plugin |
| OpenClaw | Agent, MultiAgent, Memory, Session, Model |

## Field Types

### Metadata

```yaml
metadata:
  name: string (required)
  version: string (semver)
  description: string
  team: string
  org: string
  tags: string[]
```

### Agent

```yaml
agents:
  - name: string (required)
    role: string (required)
    instructions: string (required)
    model: ModelConfig
    permissions: string[]
    sub_agents: Agent[]
    tools: string[]
    memory: MemoryConfig
```

### Rule

```yaml
rules:
  - name: string (required)
    content: string (required)
    scope: glob pattern
    severity: error | warning | info
    applies_to: string[] (vendor names)
```

### MCP Server

```yaml
mcp_servers:
  - name: string (required)
    command: string (required)
    args: string[]
    transport: stdio | sse | websocket
    env: map<string, string>
    timeout_ms: number
```
