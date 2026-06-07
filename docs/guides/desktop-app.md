# Desktop Application Guide

## Overview

The AgentWeave Desktop App is a cross-platform (Windows/macOS/Linux) application built with Tauri v2 + React that provides a GUI for all AgentWeave operations.

## Building

### Prerequisites

- Rust 1.70+
- Node.js 18+
- pnpm 8+
- System libraries (Linux only):
  ```bash
  sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev \
    libappindicator3-dev librsvg2-dev libsoup-3.0-dev \
    javascriptcoregtk-4.1-dev
  ```

### Development

```bash
cd apps/desktop
pnpm install
pnpm tauri dev
```

### Production Build

```bash
cd apps/desktop
pnpm install
pnpm tauri build
```

Output will be in `src-tauri/target/release/bundle/`.

## Features

### Dashboard
- Project folder selection via system dialog
- Project status overview (agents, rules, skills, MCP servers)
- Health check display
- Quick actions: Generate All, Validate, Start/Stop Watch

### Configuration Editor
- Real file loading from project directory
- YAML syntax highlighting (CodeMirror)
- File tab switching
- Save and validate in-place

### Adapters
- View all 12 registered vendor adapters
- See supported concepts per vendor
- Generate configs for individual vendors
- Batch generation with results display

### Compare
- Side-by-side vendor output comparison
- CodeMirror diff view
- Vendor selector dropdowns

### ACP Gateway
- Registered vendor overview
- Routing strategy configuration (5 strategies)
- Output comparison table (files/lines/bytes per vendor)

### Trace & Observability
- Span list from OTLP collector
- Waterfall view per span
- Error rate metrics
- Log viewer
- Alert configuration

### Governance
- Policy management table
- RBAC role viewer
- Audit log table
- Quota usage progress bars

### Plugins & MCP
- Installed MCP server list (from project config)
- Marketplace browser
- Custom adapter development guide

### Settings
- Theme toggle (Light/Dark)
- Language selection (中文/English/日本語)
- About information

## System Tray

The app minimizes to system tray on window close:
- **Show** — Bring window to front
- **Hide** — Minimize to tray
- **Quit** — Exit application

## IPC Commands

The desktop app communicates with the Rust backend via 16 Tauri IPC commands:

| Command | Description |
|---------|-------------|
| `get_project_status` | Load project info from agentweave.yaml |
| `generate_configs` | Generate vendor configs (all or single) |
| `validate_config` | Validate configuration |
| `list_vendors` | List all registered adapters |
| `compare_vendors` | Compare vendor output metrics |
| `load_config` | Read a file's content |
| `save_config` | Write content to a file |
| `list_config_files` | List YAML files in project |
| `health_check` | Run environment health checks |
| `export_config` | Export config in yaml/json/markdown |
| `import_vendor` | Import existing vendor config |
| `start_watch` | Start file watcher |
| `stop_watch` | Stop file watcher |
| `get_trace_spans` | Get recent trace spans |
| `get_governance_status` | Get governance metrics |
| `list_mcp_servers` | List configured MCP servers |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open project folder |
| `Ctrl+S` | Save current file |
| `Ctrl+G` | Generate all configs |
| `Ctrl+,` | Open settings |
