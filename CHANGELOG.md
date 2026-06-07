# Changelog

All notable changes to AgentWeave will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-06-06

### Added

#### Core Engine
- Superset schema defining 46+ unified AI agent configuration concepts
- Configuration parser with YAML/JSON support and schema validation
- Adapter trait system enabling pluggable vendor support
- Deep-merge configuration inheritance (`extends` keyword)
- Three configuration kinds: Project, Fragment, Template

#### Vendor Adapters (12)
- **OpenAI Codex** — `AGENTS.md`, skills, MCP server config
- **Claude Code** — `CLAUDE.md`, `.claude/settings.json`, `.mcp.json`
- **Cursor** — `.cursor/rules/*.mdc` with frontmatter metadata
- **Windsurf** — `.windsurf/rules/*.md`
- **Gemini CLI** — `GEMINI.md`, `.gemini/settings.json`
- **GitHub Copilot** — `.github/copilot-instructions.md`, `.github/instructions/`
- **Devin** — `.devin/agents/`, `AGENTS.md`
- **Cline** — `.clinerules/`
- **CodeBuddy** — `.codebuddy/` multi-file config
- **Qoder** — `/agents` directory + SDK integration
- **Grok Build** — `.grok/config.toml`
- **OpenClaw** — `~/.openclaw/openclaw.json`

#### CLI Tool (20 Commands)
- `init` — Initialize project with AgentWeave configuration scaffold
- `generate` — Generate vendor-specific configs from superset
- `validate` — Schema + semantic validation of configuration
- `import` — Reverse-import existing vendor configs (8 vendors)
- `compare` — Cross-vendor output comparison table
- `diff` — Show differences between versions or vendors
- `watch` — Real-time file monitoring with auto-regeneration
- `sync` — Manual/realtime sync mode management
- `vendors` — List supported vendors and capabilities
- `status` — Show project and adapter status
- `version` — Configuration snapshot management (commit/log/restore)
- `serve` — Start ACP REST gateway
- `mcp` — MCP server lifecycle management (add/list/remove/test)
- `plugin` — Plugin management (install/list/remove/info)
- `secret` — Encrypted credential storage (set/list/remove/export)
- `debug` — Cross-vendor unified debugging
- `health` — Environment and configuration health check
- `export` — Configuration export (yaml/json/markdown)
- `completions` — Shell auto-completion generation (bash/zsh/fish/powershell)
- `daemon` — Background daemon (watch + sync + ACP combined)

#### ACP Gateway
- REST API (Axum) for agent registration, discovery, and dispatch
- 5 routing strategies: BestMatch, RoundRobin, LeastLatency, RaceFirst, Fanout
- Health check endpoints with circuit breaking
- Dispatch history tracking

#### Real-time Sync Engine
- File system watcher (notify v7) with 300ms debounce
- Event bus for inter-component communication
- Conflict detection with lock strategy
- Multi-IDE concurrent sync support

#### Enterprise Governance
- RBAC with 3 built-in roles (Admin, Developer, Viewer)
- Policy engine with severity levels and enforcement modes
- SQLite-based audit logging with retention policies
- Quota management (agents, vendors, operations/day)

#### Cross-Vendor Tracing
- OpenTelemetry-compatible span model
- 3 exporters: OTLP (gRPC), Console, File
- Trace context propagation across vendor boundaries
- Span visualization in desktop app

#### Remote Updater
- GitHub Releases integration with semver resolution
- SHA256 integrity verification
- Ed25519 signature validation
- Update strategies: Auto, Manual, Canary

#### Desktop Application (Tauri v2)
- Cross-platform: Linux (deb/AppImage), macOS (dmg), Windows (msi/exe)
- 9 pages: Dashboard, Config Editor, Adapters, Compare, ACP, Trace, Governance, Plugins, Settings
- 18 IPC commands connecting UI to real engine
- System tray with minimize-to-tray
- Dark/light theme support
- i18n: zh-CN, en-US, ja-JP
- CodeMirror YAML editor with syntax highlighting

#### Schema System
- JSON Schema (Draft-07) with 46+ concept definitions
- XML Schema (W3C XSD 1.0) parallel definition
- Example configurations: minimal and complete (YAML/JSON/XML)
- Extensibility: `x-*` pattern properties, `custom:` vendors, `extends` inheritance
- Specification documentation with versioning strategy

#### Documentation
- User guide with installation and workflow instructions
- API reference for all CLI commands
- Architecture overview with system diagrams
- Schema specification (extensibility, governance, versioning)
- Adapter protocol specification for SDK developers
- Quick start, enterprise governance, and desktop app guides
- Contributing guide

#### Infrastructure
- GitHub Actions CI/CD (build + test + cross-platform release)
- Cross-compilation for 5 targets (linux-x64, linux-arm64, macos-x64, macos-arm64, windows-x64)
- Monorepo workspace (Cargo) with 20+ crates
- i18n via Fluent (CLI) + i18next (desktop)

[0.1.0]: https://github.com/gaosichun888/AgentWeave/releases/tag/v0.1.0
