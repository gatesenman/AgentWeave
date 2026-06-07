# Contributing to AgentWeave

Thank you for your interest in contributing to AgentWeave!

## Development Setup

### Prerequisites

- Rust 1.75+ (install via [rustup](https://rustup.rs))
- Node.js 20+ (for desktop app frontend)
- pnpm 9+ (package manager)

### Building

```bash
# Clone the repository
git clone https://github.com/gaosichun888/AgentWeave.git
cd AgentWeave

# Build all Rust crates
cargo build

# Run tests
cargo test

# Run the CLI
cargo run -p agentweave-cli -- --help
```

### Project Structure

- `crates/agentweave-core/` — Core engine with schema, adapter framework, sync
- `crates/agentweave-cli/` — Command-line interface
- `crates/agentweave-acp/` — ACP Gateway server
- `crates/agentweave-trace/` — Cross-vendor tracing
- `crates/adapters/` — Vendor-specific adapters
- `apps/desktop/` — Tauri desktop application
- `packages/schema/` — JSON Schema definitions
- `docs/` — Documentation

### Adding a New Adapter

1. Create a new crate in `crates/adapters/adapter-{vendor}/`
2. Implement the `VendorAdapter` trait from `agentweave-core`
3. Register the adapter in `agentweave-cli/src/main.rs`
4. Add tests covering generate + parse round-trip
5. Update documentation

### Code Style

- Use `cargo fmt` before committing
- Run `cargo clippy` and fix warnings
- Write doc comments for public APIs
- Follow Rust API guidelines

## Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `cargo test && cargo clippy && cargo fmt --check`
5. Submit a pull request with a clear description

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
