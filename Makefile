.PHONY: build test lint clean dev desktop release help

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build all crates
	cargo build --workspace

test: ## Run all tests
	cargo test --workspace

lint: ## Run clippy and format check
	cargo clippy --workspace -- -D warnings
	cargo fmt --check

fmt: ## Format all Rust code
	cargo fmt --all

clean: ## Clean build artifacts
	cargo clean
	rm -rf apps/desktop/dist apps/desktop/node_modules/.vite

dev: ## Start desktop frontend in browser dev mode
	cd apps/desktop && npm run dev

desktop: ## Build desktop app (requires Tauri CLI)
	cd apps/desktop && npm run tauri build

install-cli: ## Install CLI tool locally
	cargo install --path crates/agentweave-cli

generate: ## Run agentweave generate in current directory
	cargo run -p agentweave-cli -- generate

validate: ## Run agentweave validate in current directory
	cargo run -p agentweave-cli -- validate

schema-check: ## Validate example configs against JSON Schema
	@python3 -c "\
	import json, sys;\
	try: import jsonschema;\
	except: print('pip install jsonschema'); sys.exit(1);\
	schema = json.load(open('packages/schema/agentweave.schema.json'));\
	for f in ['complete', 'minimal']:\
	    data = json.load(open(f'packages/schema/examples/{f}.json'));\
	    jsonschema.validate(data, schema);\
	    print(f'  {f}.json: PASS');\
	print('All schema validations passed.')"

release: ## Build release binaries for all targets
	cargo build --workspace --release

ci: build test lint schema-check ## Run full CI pipeline locally
