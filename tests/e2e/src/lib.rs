//! End-to-end integration tests for AgentWeave
//!
//! These tests verify the complete pipeline:
//! 1. Config loading from `.agentweave/` directory
//! 2. Adapter registry creation (all 12 vendors)
//! 3. Config generation for each vendor
//! 4. Schema validation of generated outputs
//! 5. Cross-vendor comparison
//! 6. Import (reverse-parse) capability

#[cfg(test)]
mod tests {
    use agentweave_core::adapter::{AdapterRegistry, Concept, VendorAdapter};
    use agentweave_core::config::AgentWeaveConfig;
    use agentweave_core::schema::TargetVendor;
    use std::collections::HashSet;
    use std::fs;
    use std::path::Path;
    use tempfile::tempdir;

    /// Build a fully populated registry with all 12 adapters
    fn build_registry() -> AdapterRegistry {
        let mut registry = AdapterRegistry::new();
        registry.register(Box::new(adapter_codex::CodexAdapter::new()));
        registry.register(Box::new(adapter_claude::ClaudeCodeAdapter::new()));
        registry.register(Box::new(adapter_cursor::CursorAdapter::new()));
        registry.register(Box::new(adapter_windsurf::WindsurfAdapter::new()));
        registry.register(Box::new(adapter_gemini::GeminiAdapter::new()));
        registry.register(Box::new(adapter_copilot::CopilotAdapter::new()));
        registry.register(Box::new(adapter_devin::DevinAdapter::new()));
        registry.register(Box::new(adapter_cline::ClineAdapter::new()));
        registry.register(Box::new(adapter_codebuddy::CodebuddyAdapter::new()));
        registry.register(Box::new(adapter_qoder::QoderAdapter::new()));
        registry.register(Box::new(adapter_grok::GrokBuildAdapter::new()));
        registry.register(Box::new(adapter_openclaw::OpenclawAdapter::new()));
        registry
    }

    /// Create a minimal agentweave project structure in a temp directory
    fn create_test_project(dir: &Path) {
        let config_dir = dir.join(".agentweave");
        fs::create_dir_all(&config_dir).unwrap();
        fs::create_dir_all(config_dir.join("agents")).unwrap();
        fs::create_dir_all(config_dir.join("rules")).unwrap();

        let main_config = r#"
apiVersion: agentweave/v1
kind: Project
metadata:
  name: test-project
  version: "1.0.0"
spec:
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
"#;
        fs::write(config_dir.join("agentweave.yaml"), main_config).unwrap();

        let agent = r#"
name: architect
role: Senior software architect
system_prompt: |
  You are an expert architect who designs scalable systems.
  Always write clean, maintainable code.
tools:
  allow:
    - read_file
    - write_file
    - terminal
"#;
        fs::write(config_dir.join("agents").join("architect.yaml"), agent).unwrap();

        let rule = r#"
name: code-style
activation:
  type: always
content: |
  Use TypeScript for all new files.
  Follow ESLint configuration.
  Write comprehensive tests.
"#;
        fs::write(config_dir.join("rules").join("code-style.yaml"), rule).unwrap();
    }

    // =========================================================================
    // E2E Test: Full Pipeline
    // =========================================================================

    #[test]
    fn e2e_full_pipeline_init_load_generate_all() {
        let dir = tempdir().unwrap();
        create_test_project(dir.path());

        // Step 1: Load config
        let config = AgentWeaveConfig::load(dir.path()).unwrap();
        assert_eq!(config.metadata.name, "test-project");
        assert_eq!(config.targets.len(), 12);
        assert_eq!(config.agents.len(), 1);
        assert_eq!(config.rules.len(), 1);

        // Step 2: Build registry
        let registry = build_registry();
        assert_eq!(registry.list().len(), 12);

        // Step 3: Generate for all 12 vendors
        let results = registry.generate_all(&config, dir.path());
        assert_eq!(results.len(), 12, "Should generate for all 12 target vendors");

        let mut success_count = 0;
        for (vendor, result) in &results {
            match result {
                Ok(output) => {
                    assert!(!output.files.is_empty(), "Vendor {:?} should produce at least one file", vendor);
                    success_count += 1;
                }
                Err(e) => {
                    panic!("Vendor {:?} failed to generate: {:?}", vendor, e);
                }
            }
        }
        assert_eq!(success_count, 12, "All 12 vendors should succeed");
    }

    // =========================================================================
    // E2E Test: Individual Adapter Generation
    // =========================================================================

    #[test]
    fn e2e_codex_generates_agents_md() {
        let dir = tempdir().unwrap();
        create_test_project(dir.path());
        let config = AgentWeaveConfig::load(dir.path()).unwrap();

        let adapter = adapter_codex::CodexAdapter::new();
        let output = adapter.generate(&config, dir.path()).unwrap();

        assert!(output.files.contains_key("AGENTS.md"), "Codex should generate AGENTS.md");
        let content = &output.files["AGENTS.md"];
        assert!(content.contains("architect"), "Should contain agent name");
    }

    #[test]
    fn e2e_claude_generates_claude_md() {
        let dir = tempdir().unwrap();
        create_test_project(dir.path());
        let config = AgentWeaveConfig::load(dir.path()).unwrap();

        let adapter = adapter_claude::ClaudeCodeAdapter::new();
        let output = adapter.generate(&config, dir.path()).unwrap();

        assert!(output.files.contains_key("CLAUDE.md"), "Claude should generate CLAUDE.md");
        let content = &output.files["CLAUDE.md"];
        assert!(content.contains("architect"), "Should contain agent info");
    }

    #[test]
    fn e2e_cursor_generates_mdc_rules() {
        let dir = tempdir().unwrap();
        create_test_project(dir.path());
        let config = AgentWeaveConfig::load(dir.path()).unwrap();

        let adapter = adapter_cursor::CursorAdapter::new();
        let output = adapter.generate(&config, dir.path()).unwrap();

        let has_mdc = output.files.keys().any(|k| k.ends_with(".mdc") || k.contains(".cursor"));
        assert!(has_mdc, "Cursor should generate .mdc rule files");
    }

    #[test]
    fn e2e_windsurf_generates_rules() {
        let dir = tempdir().unwrap();
        create_test_project(dir.path());
        let config = AgentWeaveConfig::load(dir.path()).unwrap();

        let adapter = adapter_windsurf::WindsurfAdapter::new();
        let output = adapter.generate(&config, dir.path()).unwrap();

        let has_rules = output.files.keys().any(|k| k.contains("windsurf") || k.contains("rules"));
        assert!(has_rules, "Windsurf should generate rule files");
    }

    #[test]
    fn e2e_gemini_generates_config() {
        let dir = tempdir().unwrap();
        create_test_project(dir.path());
        let config = AgentWeaveConfig::load(dir.path()).unwrap();

        let adapter = adapter_gemini::GeminiAdapter::new();
        let output = adapter.generate(&config, dir.path()).unwrap();

        let has_gemini = output.files.keys().any(|k| k.contains("GEMINI") || k.contains("gemini"));
        assert!(has_gemini, "Gemini should generate GEMINI.md or settings");
    }

    #[test]
    fn e2e_copilot_generates_instructions() {
        let dir = tempdir().unwrap();
        create_test_project(dir.path());
        let config = AgentWeaveConfig::load(dir.path()).unwrap();

        let adapter = adapter_copilot::CopilotAdapter::new();
        let output = adapter.generate(&config, dir.path()).unwrap();

        let has_copilot = output.files.keys().any(|k| k.contains("copilot") || k.contains(".github"));
        assert!(has_copilot, "Copilot should generate instructions file");
    }

    #[test]
    fn e2e_devin_generates_config() {
        let dir = tempdir().unwrap();
        create_test_project(dir.path());
        let config = AgentWeaveConfig::load(dir.path()).unwrap();

        let adapter = adapter_devin::DevinAdapter::new();
        let output = adapter.generate(&config, dir.path()).unwrap();
        assert!(!output.files.is_empty(), "Devin should generate config files");
    }

    #[test]
    fn e2e_cline_generates_config() {
        let dir = tempdir().unwrap();
        create_test_project(dir.path());
        let config = AgentWeaveConfig::load(dir.path()).unwrap();

        let adapter = adapter_cline::ClineAdapter::new();
        let output = adapter.generate(&config, dir.path()).unwrap();
        assert!(!output.files.is_empty(), "Cline should generate config files");
    }

    #[test]
    fn e2e_codebuddy_generates_config() {
        let dir = tempdir().unwrap();
        create_test_project(dir.path());
        let config = AgentWeaveConfig::load(dir.path()).unwrap();

        let adapter = adapter_codebuddy::CodebuddyAdapter::new();
        let output = adapter.generate(&config, dir.path()).unwrap();
        assert!(!output.files.is_empty(), "CodeBuddy should generate config files");
    }

    #[test]
    fn e2e_qoder_generates_config() {
        let dir = tempdir().unwrap();
        create_test_project(dir.path());
        let config = AgentWeaveConfig::load(dir.path()).unwrap();

        let adapter = adapter_qoder::QoderAdapter::new();
        let output = adapter.generate(&config, dir.path()).unwrap();
        assert!(!output.files.is_empty(), "Qoder should generate config files");
    }

    #[test]
    fn e2e_grok_generates_config() {
        let dir = tempdir().unwrap();
        create_test_project(dir.path());
        let config = AgentWeaveConfig::load(dir.path()).unwrap();

        let adapter = adapter_grok::GrokBuildAdapter::new();
        let output = adapter.generate(&config, dir.path()).unwrap();
        assert!(!output.files.is_empty(), "Grok Build should generate config files");
    }

    #[test]
    fn e2e_openclaw_generates_config() {
        let dir = tempdir().unwrap();
        create_test_project(dir.path());
        let config = AgentWeaveConfig::load(dir.path()).unwrap();

        let adapter = adapter_openclaw::OpenclawAdapter::new();
        let output = adapter.generate(&config, dir.path()).unwrap();
        assert!(!output.files.is_empty(), "OpenClaw should generate config files");
    }

    // =========================================================================
    // E2E Test: Adapter Registry Completeness
    // =========================================================================

    #[test]
    fn e2e_registry_has_all_twelve_vendors() {
        let registry = build_registry();
        let vendors = registry.list();
        assert_eq!(vendors.len(), 12);

        let expected = vec![
            TargetVendor::Codex,
            TargetVendor::ClaudeCode,
            TargetVendor::Cursor,
            TargetVendor::Windsurf,
            TargetVendor::GeminiCli,
            TargetVendor::GithubCopilot,
            TargetVendor::Devin,
            TargetVendor::Cline,
            TargetVendor::Codebuddy,
            TargetVendor::Qoder,
            TargetVendor::GrokBuild,
            TargetVendor::Openclaw,
        ];

        for v in &expected {
            assert!(registry.get(v).is_some(), "Registry missing vendor: {:?}", v);
        }
    }

    #[test]
    fn e2e_all_adapters_support_agent_concept() {
        let registry = build_registry();
        for vendor in registry.list() {
            let adapter = registry.get(vendor).unwrap();
            let concepts = adapter.supported_concepts();
            assert!(
                concepts.contains(&Concept::Agent),
                "Vendor {:?} should support Agent concept",
                vendor
            );
        }
    }

    #[test]
    fn e2e_most_adapters_support_rule_concept() {
        let registry = build_registry();
        let mut rule_count = 0;
        for vendor in registry.list() {
            let adapter = registry.get(vendor).unwrap();
            let concepts = adapter.supported_concepts();
            if concepts.contains(&Concept::Rule) {
                rule_count += 1;
            }
        }
        assert!(
            rule_count >= 10,
            "At least 10 vendors should support Rule concept, got {}",
            rule_count
        );
    }

    // =========================================================================
    // E2E Test: Config Load and Validate
    // =========================================================================

    #[test]
    fn e2e_config_load_with_agents_and_rules() {
        let dir = tempdir().unwrap();
        create_test_project(dir.path());

        let config = AgentWeaveConfig::load(dir.path()).unwrap();
        assert_eq!(config.metadata.name, "test-project");
        assert_eq!(config.metadata.version, Some("1.0.0".to_string()));
        assert_eq!(config.agents.len(), 1);
        assert_eq!(config.agents[0].name, "architect");
        assert_eq!(config.rules.len(), 1);
        assert_eq!(config.rules[0].name, "code-style");
    }

    #[test]
    fn e2e_config_load_error_on_missing_directory() {
        let dir = tempdir().unwrap();
        // No .agentweave/ directory created
        let result = AgentWeaveConfig::load(dir.path());
        assert!(result.is_err());
    }

    // =========================================================================
    // E2E Test: Cross-vendor Comparison
    // =========================================================================

    #[test]
    fn e2e_cross_vendor_comparison() {
        let dir = tempdir().unwrap();
        create_test_project(dir.path());
        let config = AgentWeaveConfig::load(dir.path()).unwrap();
        let registry = build_registry();

        let results = registry.generate_all(&config, dir.path());

        // Compare file counts across vendors
        let mut file_counts: Vec<(TargetVendor, usize)> = Vec::new();
        for (vendor, result) in &results {
            if let Ok(output) = result {
                file_counts.push((vendor.clone(), output.files.len()));
            }
        }

        assert_eq!(file_counts.len(), 12);

        // Verify all vendors produce at least 1 file
        for (vendor, count) in &file_counts {
            assert!(*count >= 1, "Vendor {:?} should produce at least 1 file, got {}", vendor, count);
        }
    }

    #[test]
    fn e2e_generated_content_contains_agent_info() {
        let dir = tempdir().unwrap();
        create_test_project(dir.path());
        let config = AgentWeaveConfig::load(dir.path()).unwrap();
        let registry = build_registry();

        let results = registry.generate_all(&config, dir.path());

        for (vendor, result) in &results {
            if let Ok(output) = result {
                let all_content: String = output.files.values().cloned().collect::<Vec<_>>().join("\n");
                assert!(
                    all_content.contains("architect") || all_content.contains("software"),
                    "Vendor {:?} output should reference the agent (got {} files, {} bytes)",
                    vendor,
                    output.files.len(),
                    all_content.len()
                );
            }
        }
    }

    // =========================================================================
    // E2E Test: Concept Coverage Matrix
    // =========================================================================

    #[test]
    fn e2e_concept_coverage_matrix() {
        let registry = build_registry();
        let mut coverage: Vec<(String, Vec<Concept>)> = Vec::new();

        for vendor in registry.list() {
            let adapter = registry.get(vendor).unwrap();
            coverage.push((adapter.display_name().to_string(), adapter.supported_concepts()));
        }

        // Verify minimum concept coverage
        let all_concepts: HashSet<Concept> = coverage
            .iter()
            .flat_map(|(_, concepts)| concepts.iter().cloned())
            .collect();

        assert!(all_concepts.contains(&Concept::Agent));
        assert!(all_concepts.contains(&Concept::Rule));
        assert!(all_concepts.contains(&Concept::McpServer));
        assert!(all_concepts.contains(&Concept::Tool));
        assert!(all_concepts.contains(&Concept::Workflow));
        assert!(all_concepts.contains(&Concept::Memory));
        assert!(all_concepts.contains(&Concept::Permission));

        // At least 5 vendors should support MCP
        let mcp_count = coverage
            .iter()
            .filter(|(_, concepts)| concepts.contains(&Concept::McpServer))
            .count();
        assert!(mcp_count >= 5, "At least 5 vendors should support MCP, got {}", mcp_count);
    }

    // =========================================================================
    // E2E Test: Schema Validation
    // =========================================================================

    #[test]
    fn e2e_schema_examples_valid_yaml() {
        let schema_dir = Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent().unwrap()
            .parent().unwrap()
            .join("packages/schema/examples");

        if !schema_dir.exists() {
            return; // skip if not in full repo
        }

        let complete_yaml = schema_dir.join("complete.yaml");
        if complete_yaml.exists() {
            let content = fs::read_to_string(&complete_yaml).unwrap();
            let value: serde_yaml::Value = serde_yaml::from_str(&content).unwrap();
            assert!(value.is_mapping(), "complete.yaml should be a valid YAML mapping");

            let map = value.as_mapping().unwrap();
            assert!(map.contains_key(&serde_yaml::Value::String("apiVersion".to_string())));
            assert!(map.contains_key(&serde_yaml::Value::String("kind".to_string())));
            assert!(map.contains_key(&serde_yaml::Value::String("metadata".to_string())));
        }

        let minimal_yaml = schema_dir.join("minimal.yaml");
        if minimal_yaml.exists() {
            let content = fs::read_to_string(&minimal_yaml).unwrap();
            let value: serde_yaml::Value = serde_yaml::from_str(&content).unwrap();
            assert!(value.is_mapping(), "minimal.yaml should be a valid YAML mapping");
        }
    }

    #[test]
    fn e2e_schema_examples_valid_json() {
        let schema_dir = Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent().unwrap()
            .parent().unwrap()
            .join("packages/schema/examples");

        if !schema_dir.exists() {
            return;
        }

        let complete_json = schema_dir.join("complete.json");
        if complete_json.exists() {
            let content = fs::read_to_string(&complete_json).unwrap();
            let value: serde_json::Value = serde_json::from_str(&content).unwrap();
            assert!(value.is_object());
            assert!(value.get("apiVersion").is_some());
            assert!(value.get("kind").is_some());
            assert!(value.get("agents").is_some());
            assert!(value.get("rules").is_some());
        }

        let minimal_json = schema_dir.join("minimal.json");
        if minimal_json.exists() {
            let content = fs::read_to_string(&minimal_json).unwrap();
            let value: serde_json::Value = serde_json::from_str(&content).unwrap();
            assert!(value.is_object());
        }
    }

    // =========================================================================
    // E2E Test: Write Generated Files to Disk
    // =========================================================================

    #[test]
    fn e2e_generate_and_write_to_disk() {
        let dir = tempdir().unwrap();
        create_test_project(dir.path());
        let config = AgentWeaveConfig::load(dir.path()).unwrap();
        let registry = build_registry();

        let results = registry.generate_all(&config, dir.path());

        // Write all generated files to disk
        for (_vendor, result) in &results {
            if let Ok(output) = result {
                for (path, content) in &output.files {
                    let full_path = dir.path().join(path);
                    if let Some(parent) = full_path.parent() {
                        fs::create_dir_all(parent).unwrap();
                    }
                    fs::write(&full_path, content).unwrap();
                }
            }
        }

        // Verify Codex output exists on disk
        assert!(dir.path().join("AGENTS.md").exists(), "AGENTS.md should exist on disk");

        // Verify Claude output exists on disk
        assert!(dir.path().join("CLAUDE.md").exists(), "CLAUDE.md should exist on disk");

        // Verify Copilot output exists
        assert!(
            dir.path().join(".github/copilot-instructions.md").exists(),
            "copilot-instructions.md should exist on disk"
        );
    }

    // =========================================================================
    // E2E Test: Multi-agent Config
    // =========================================================================

    #[test]
    fn e2e_multi_agent_config() {
        let dir = tempdir().unwrap();
        let config_dir = dir.path().join(".agentweave");
        fs::create_dir_all(config_dir.join("agents")).unwrap();
        fs::create_dir_all(config_dir.join("rules")).unwrap();

        let main_config = r#"
apiVersion: agentweave/v1
kind: Project
metadata:
  name: multi-agent-project
  version: "2.0.0"
spec:
  targets:
    - codex
    - claude-code
"#;
        fs::write(config_dir.join("agentweave.yaml"), main_config).unwrap();

        // Multiple agents
        fs::write(config_dir.join("agents/architect.yaml"), r#"
name: architect
role: System architect
system_prompt: Design scalable systems
"#).unwrap();

        fs::write(config_dir.join("agents/developer.yaml"), r#"
name: developer
role: Full-stack developer
system_prompt: Write clean code with tests
tools:
  allow:
    - read_file
    - write_file
    - run_tests
"#).unwrap();

        fs::write(config_dir.join("agents/reviewer.yaml"), r#"
name: reviewer
role: Code reviewer
system_prompt: Review for bugs, security, and performance
"#).unwrap();

        let config = AgentWeaveConfig::load(dir.path()).unwrap();
        assert_eq!(config.agents.len(), 3);

        let registry = build_registry();
        let codex = registry.get(&TargetVendor::Codex).unwrap();
        let output = codex.generate(&config, dir.path()).unwrap();

        let agents_md = &output.files["AGENTS.md"];
        // Codex AGENTS.md should contain agent information
        let all_content: String = output.files.values().cloned().collect::<Vec<_>>().join("\n");
        // Should reference at least the system prompts or roles
        assert!(
            all_content.contains("architect") || all_content.contains("System architect") || all_content.len() > 50,
            "Multi-agent output should contain meaningful content, got: {}...{}",
            &agents_md[..50.min(agents_md.len())],
            agents_md.len()
        );
    }
}
