# AgentWeave Schema Specification v1

## Overview

The AgentWeave Schema defines a **superset configuration format** for unified AI agent management across 12+ vendor platforms. This specification covers:

1. **Core Schema** — JSON Schema (Draft-07) + XML Schema (XSD) defining all concepts
2. **Extensibility Model** — How to add new concepts without breaking existing configs
3. **Governance Integration** — Schema-level policy enforcement
4. **Versioning Strategy** — Backward-compatible evolution

---

## 1. Schema Formats

| Format | File | Usage |
|--------|------|-------|
| JSON Schema | `packages/schema/agentweave.schema.json` | IDE autocomplete, JSON/YAML validation |
| XML Schema | `packages/schema/xml/agentweave.xsd` | XML validation, enterprise integrations |
| TypeScript | Generated from JSON Schema | Frontend type-safety |
| Rust types | `crates/agentweave-core/src/config.rs` | Engine parsing |

### Authoring Format Recommendation

| Format | When to Use |
|--------|-------------|
| **YAML** | Default for human authoring (concise, supports comments) |
| **JSON** | Programmatic generation, API responses, IDE schemas |
| **XML** | Enterprise integrations, SOAP/WSDL, legacy systems |

All three formats express identical semantics; the engine normalizes to an internal AST.

---

## 2. Concept Catalog (46+ Concepts)

### Core Concepts

| # | Concept | Description | Required |
|---|---------|-------------|----------|
| 1 | `metadata` | Project identity (name, version, team, tags) | ✓ |
| 2 | `targets` | Vendor platforms for generation | |
| 3 | `agents` | AI assistant definitions with roles/models | |
| 4 | `sub_agents` | Delegatable child agents (nested) | |
| 5 | `rules` | Behavioral directives (scoped, prioritized) | |
| 6 | `skills` | Reusable procedures with steps | |
| 7 | `hooks` | Event-triggered lifecycle automations | |
| 8 | `mcp_servers` | MCP protocol server configs | |
| 9 | `plugins` | Loadable extension modules | |
| 10 | `tools` | Custom tool/function definitions | |
| 11 | `workflows` | Multi-step orchestrated processes | |
| 12 | `memory` | Learning/recall configuration | |
| 13 | `context` | Context injection (files, env, dynamic) | |
| 14 | `sessions` | Session persistence and isolation | |
| 15 | `permissions` | Allow/deny/ask permission model | |
| 16 | `models` | Named model provider configs | |
| 17 | `code_index` | Source code indexing rules | |
| 18 | `wiki` | Documentation knowledge base | |
| 19 | `templates` | Reusable content templates | |
| 20 | `snippets` | Code fragment library | |
| 21 | `prompts` | Prompt template management | |

### System Concepts

| # | Concept | Description |
|---|---------|-------------|
| 22 | `sync` | Multi-IDE real-time synchronization |
| 23 | `governance` | RBAC, policies, audit, compliance |
| 24 | `updater` | Remote update configuration |
| 25 | `telemetry` | Observability (OTLP traces/metrics) |
| 26 | `notifications` | Alert channels (desktop, slack, email) |
| 27 | `api_endpoints` | External service integrations |
| 28 | `webhooks` | HTTP callback registrations |
| 29 | `event_bus` | Internal event routing |

### Sub-Concepts (Nested)

| # | Concept | Parent | Description |
|---|---------|--------|-------------|
| 30 | `schedule` | agent | Cron-based agent activation |
| 31 | `retry` | skill/workflow | Retry policy (backoff) |
| 32 | `rbac` | governance | Role-based access control |
| 33 | `policies` | governance | Enforcement rules |
| 34 | `audit` | governance | Audit trail config |
| 35 | `quotas` | governance | Usage limits |
| 36 | `compliance` | governance | Regulatory frameworks |
| 37 | `network` | permissions | Network access rules |
| 38 | `filesystem` | permissions | File access rules |
| 39 | `dynamic` | context | Command-based dynamic context |
| 40 | `workflow_step` | workflow | Individual workflow step |

### Meta Concepts

| # | Concept | Description |
|---|---------|-------------|
| 41 | `extends` | Configuration inheritance |
| 42 | `kind` | Config type (Project/Fragment/Template) |
| 43 | `apiVersion` | Schema version for compatibility |
| 44 | `x-*` | Extension namespace (vendor-specific) |
| 45 | `default_model` | Fallback model for all agents |
| 46 | `tags` | Freeform categorization labels |
| 47 | `constraints` | Hard limits for agents |
| 48 | `triggers` | Event-based agent activation |

---

## 3. Extensibility Model

### 3.1 Extension Fields (`x-*`)

Any object in the schema may contain additional fields prefixed with `x-`:

```yaml
agents:
  - name: my-agent
    role: Developer
    x-cursor-theme: dark          # Cursor-specific
    x-claude-thinking-mode: extended  # Claude-specific
    x-custom-internal-id: abc123  # Custom field
```

**Rules:**
- Extension fields are **never validated** by the schema
- They are **preserved** during parsing and passed to adapters
- Vendor adapters can read their own `x-{vendor}` fields
- Unknown `x-` fields are silently ignored

### 3.2 Custom Vendors

New vendor targets beyond the 12 built-in ones use the `custom:` prefix:

```yaml
targets:
  - codex
  - claude-code
  - "custom:my-internal-tool"  # Custom vendor
```

### 3.3 Configuration Inheritance (`extends`)

Configs can inherit from other files or remote URIs:

```yaml
# team-config.yaml
extends:
  - ./shared/company-rules.yaml         # Local file
  - https://registry.agentweave.dev/base/strict  # Remote

# Properties are deep-merged in order (later wins)
```

**Merge semantics:**
- Objects: deep merge (recursive)
- Arrays: concatenate (dedup by `name` field if present)
- Scalars: last value wins

### 3.4 Fragment Configs

Partial configs that can be shared across projects:

```yaml
apiVersion: agentweave/v1
kind: Fragment

# Only contains rules — no metadata.name required
rules:
  - name: security-baseline
    content: Never log PII or secrets
    severity: error
```

### 3.5 Adding New Concepts (Future-Proofing)

When a new concept is needed:

1. Add to JSON Schema `definitions` with full type definition
2. Add to root `properties` with `$ref`
3. Keep `additionalProperties: false` + `patternProperties: { "^x-": {} }` pattern
4. Increment `apiVersion` minor version (e.g., `agentweave/v1.1`)
5. Old configs remain valid (new fields are optional)

**Backward compatibility guarantee:**
- Required fields are NEVER added to existing types
- Existing field types are NEVER changed
- Only new optional properties are added

---

## 4. Governance Integration

### 4.1 Schema-Level Constraints

The schema enforces governance at the data level:

```json
"Rule": {
  "properties": {
    "severity": {
      "enum": ["error", "warning", "info", "hint"]
    }
  }
}
```

### 4.2 Policy Enforcement

Policies defined in `governance.policies` are enforced at runtime:

| Policy Type | Enforcement |
|------------|-------------|
| `allowlist` | Only listed values permitted |
| `denylist` | Listed values blocked |
| `budget` | Numeric limit per period |
| `rate-limit` | Request throttling |
| `security` | Security-sensitive operations |
| `compliance` | Regulatory requirements |

### 4.3 Audit Trail

Every schema change generates an audit event:

```json
{
  "event": "config:change",
  "timestamp": "2026-06-06T18:00:00Z",
  "user": "alice@acme.dev",
  "diff": { "path": "rules[0].content", "old": "...", "new": "..." }
}
```

### 4.4 RBAC Enforcement

Operations are permission-gated:

| Operation | Required Permission |
|-----------|-------------------|
| Read config | `config:read` |
| Modify config | `config:write` |
| Generate output | `generate:*` |
| Manage policies | `governance:admin` |
| View audit logs | `audit:read` |

---

## 5. Versioning Strategy

### Schema Version Format

```
agentweave/v{MAJOR}
```

- **v1** — Current stable version
- **v2** — Next major (breaking changes only if necessary)

### Compatibility Rules

| Change Type | Allowed in Minor | Allowed in Major |
|-------------|-----------------|-----------------|
| Add optional property | ✓ | ✓ |
| Add enum value | ✓ | ✓ |
| Remove property | ✗ | ✓ |
| Change property type | ✗ | ✓ |
| Add required property | ✗ | ✓ |
| Rename property | ✗ | ✓ (with alias) |

### Migration Path

```bash
# Auto-migrate from v1 to v2 (future)
agentweave migrate --from v1 --to v2
```

---

## 6. Validation Levels

| Level | Description | Command |
|-------|-------------|---------|
| **Syntax** | Well-formed YAML/JSON/XML | `agentweave validate --level syntax` |
| **Schema** | Conforms to JSON/XML Schema | `agentweave validate --level schema` |
| **Semantic** | Cross-field consistency (refs exist, no cycles) | `agentweave validate --level semantic` |
| **Policy** | Governance policies satisfied | `agentweave validate --level policy` |

### Validation Examples

```bash
# Full validation (all levels)
agentweave validate

# Schema-only (fast)
agentweave validate --level schema

# With JSON Schema directly
npx ajv validate -s packages/schema/agentweave.schema.json -d agentweave.yaml

# XML validation
xmllint --schema packages/schema/xml/agentweave.xsd config.xml
```

---

## 7. IDE Support

### VS Code / Cursor

Add to `agentweave.yaml`:
```yaml
# yaml-language-server: $schema=https://agentweave.dev/schema/v1/agentweave.schema.json
```

Or in `.vscode/settings.json`:
```json
{
  "yaml.schemas": {
    "https://agentweave.dev/schema/v1/agentweave.schema.json": "agentweave.yaml"
  }
}
```

### JSON files

Add `$schema` to the root:
```json
{
  "$schema": "https://agentweave.dev/schema/v1/agentweave.schema.json",
  "apiVersion": "agentweave/v1"
}
```

### Benefits
- Autocomplete for all 46+ concepts
- Inline validation with error messages
- Hover documentation for every field
- Snippet generation

---

## 8. Concept Categories for Governance

Concepts are categorized for fine-grained governance:

| Category | Concepts | Governance Control |
|----------|----------|--------------------|
| **Identity** | metadata, kind, apiVersion | Version lock |
| **Execution** | agents, workflows, hooks | Permission gates |
| **Data** | memory, context, code_index, wiki | Data residency |
| **Integration** | mcp_servers, plugins, api_endpoints | Allowlist/denylist |
| **Security** | permissions, governance, compliance | RBAC enforcement |
| **Operations** | sync, updater, telemetry, notifications | Admin-only |

---

## 9. Schema Registry (Future)

```
https://registry.agentweave.dev/
├── schema/
│   ├── v1/agentweave.schema.json
│   └── v1/agentweave.xsd
├── templates/
│   ├── typescript-strict
│   ├── python-ml
│   └── enterprise-governance
└── fragments/
    ├── security-baseline
    └── performance-rules
```

---

## 10. Quick Reference

### Minimal Valid Config (YAML)

```yaml
apiVersion: agentweave/v1
kind: Project
metadata:
  name: my-project
targets:
  - cursor
agents:
  - name: assistant
    role: General development assistant
```

### Minimal Valid Config (JSON)

```json
{
  "apiVersion": "agentweave/v1",
  "kind": "Project",
  "metadata": { "name": "my-project" },
  "targets": ["cursor"],
  "agents": [{ "name": "assistant", "role": "General development assistant" }]
}
```

### Minimal Valid Config (XML)

```xml
<?xml version="1.0"?>
<aw:agentweave xmlns:aw="https://agentweave.dev/schema/v1"
               apiVersion="agentweave/v1" kind="Project">
  <aw:metadata><aw:name>my-project</aw:name></aw:metadata>
  <aw:targets><aw:target>cursor</aw:target></aw:targets>
  <aw:agents>
    <aw:agent name="assistant">
      <aw:role>General development assistant</aw:role>
    </aw:agent>
  </aw:agents>
</aw:agentweave>
```
