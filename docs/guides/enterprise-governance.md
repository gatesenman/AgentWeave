# Enterprise Governance Guide

## Overview

AgentWeave provides enterprise-grade governance features including RBAC, policy enforcement, audit logging, and resource quotas.

## RBAC (Role-Based Access Control)

### Built-in Roles

| Role | Permissions |
|------|------------|
| Admin | Full access to all features |
| Developer | Read/write configs, generate, view own audit |
| Viewer | Read-only access to configurations |

### Configuration

```yaml
governance:
  rbac:
    roles:
      - name: tech-lead
        permissions:
          - "config:read"
          - "config:write"
          - "generate:all"
          - "policy:read"
      - name: intern
        permissions:
          - "config:read"
          - "generate:assigned"
```

## Policies

Policies enforce organizational constraints on AI agent usage.

### Policy Types

| Type | Description | Example |
|------|-------------|---------|
| `allowlist` | Restrict to approved values | Approved model list |
| `budget` | Resource usage limits | Monthly token cap |
| `security` | Data protection rules | PII detection |
| `compliance` | Regulatory adherence | Data residency |

### Example

```yaml
governance:
  policies:
    - name: approved-models
      type: allowlist
      values:
        - "anthropic/claude-sonnet-4"
        - "google/gemini-2.5-pro"

    - name: monthly-budget
      type: budget
      limit: 5000000  # tokens
      period: monthly
      alert_threshold: 0.8
```

## Audit Logging

All operations are logged to a SQLite database for compliance.

### Logged Events

- Configuration changes
- Generate operations
- Policy violations
- Authentication events
- Export/import operations

### Querying Audit Logs

```bash
agentweave governance audit --last 100
agentweave governance audit --user admin --action config:update
```

### Export

```bash
agentweave governance audit --export json > audit-2024.json
```

## Quotas

Resource quotas prevent runaway usage.

```yaml
governance:
  quotas:
    api_calls:
      limit: 10000
      period: monthly
    tokens:
      limit: 1000000
      period: monthly
    generates:
      limit: 500
      period: daily
```

## CLI Commands

```bash
# View governance status
agentweave governance status

# Manage policies
agentweave governance policy list
agentweave governance policy add --name new-policy --type allowlist

# View audit log
agentweave governance audit --last 50

# Check compliance
agentweave governance compliance check
```

## Desktop Integration

The Governance page in the desktop app provides:
- Real-time policy status dashboard
- Role management UI
- Audit log viewer with filtering
- Quota usage graphs
- Compliance report generation
