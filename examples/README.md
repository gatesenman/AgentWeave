# AgentWeave Examples

Three example configurations demonstrating different complexity levels.

## minimal/

Single agent, basic rules. Targets 3 vendors. Good starting point.

```bash
cd minimal && agentweave generate
```

## fullstack/

Multi-agent full-stack web app with MCP servers, hooks, skills, and frontend/backend-specific rules. Targets 8 vendors.

```bash
cd fullstack && agentweave generate
```

## enterprise/

Enterprise-grade with governance policies, RBAC, observability, cost controls, and compliance rules. All 12 vendors.

```bash
cd enterprise && agentweave generate
```

## Quick Start

```bash
# Generate all vendor configs from any example
agentweave generate

# Validate configuration
agentweave validate

# Compare output between vendors
agentweave diff codex cursor

# Watch for changes and auto-regenerate
agentweave watch
```
