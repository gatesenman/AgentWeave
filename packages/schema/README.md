# @agentweave/schema

Standard schema definitions for AgentWeave configuration format.

## Contents

```
packages/schema/
├── agentweave.schema.json    # JSON Schema (Draft-07) — primary validator
├── xml/
│   └── agentweave.xsd        # XML Schema (W3C XSD 1.0)
├── examples/
│   ├── minimal.yaml          # Minimal valid config
│   ├── minimal.json          # Minimal JSON format
│   ├── minimal.xml           # Minimal XML format
│   ├── complete.yaml         # All 46+ concepts demonstrated
│   ├── complete.json         # Full JSON equivalent
│   └── complete.xml          # Full XML equivalent
└── README.md
```

## Usage

### YAML Validation (IDE)

Add to top of `agentweave.yaml`:
```yaml
# yaml-language-server: $schema=./node_modules/@agentweave/schema/agentweave.schema.json
```

### JSON Validation

```json
{ "$schema": "https://agentweave.dev/schema/v1/agentweave.schema.json" }
```

### CLI Validation

```bash
agentweave validate             # All levels
agentweave validate --level schema  # Schema only
```

### Programmatic (Node.js)

```typescript
import Ajv from 'ajv';
import schema from '@agentweave/schema/agentweave.schema.json';

const ajv = new Ajv();
const validate = ajv.compile(schema);
const valid = validate(config);
```

### XML Validation

```bash
xmllint --schema packages/schema/xml/agentweave.xsd config.xml --noout
```

## Extensibility

- **`x-*` fields**: Any object supports vendor-specific extensions
- **`custom:` vendors**: Custom target vendor identifiers
- **`extends`**: Configuration inheritance (deep merge)
- **`kind: Fragment`**: Partial configs for sharing

## Supported Concepts (46+)

See [Schema Specification](../../docs/spec/schema-specification.md) for the full catalog.

## Versioning

- Current: `agentweave/v1`
- New optional fields may be added without version bump
- Breaking changes require major version increment
