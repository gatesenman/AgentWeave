use anyhow::Result;
use std::path::{Path, PathBuf};

/// Import existing vendor configuration into AgentWeave format
pub fn import_vendor(project_dir: &Path, vendor: &str) -> Result<ImportResult> {
    let config_dir = project_dir.join(".agentweave");
    std::fs::create_dir_all(&config_dir)?;
    std::fs::create_dir_all(config_dir.join("agents"))?;
    std::fs::create_dir_all(config_dir.join("rules"))?;

    match vendor {
        "codex" => import_codex(project_dir, &config_dir),
        "claude-code" | "claude" => import_claude(project_dir, &config_dir),
        "cursor" => import_cursor(project_dir, &config_dir),
        "windsurf" => import_windsurf(project_dir, &config_dir),
        "gemini-cli" | "gemini" => import_gemini(project_dir, &config_dir),
        "github-copilot" | "copilot" => import_copilot(project_dir, &config_dir),
        "cline" => import_cline(project_dir, &config_dir),
        "devin" => import_devin(project_dir, &config_dir),
        _ => anyhow::bail!("Unsupported vendor for import: {}", vendor),
    }
}

#[derive(Debug)]
pub struct ImportResult {
    #[allow(dead_code)]
    pub vendor: String,
    pub agents_imported: usize,
    pub rules_imported: usize,
    pub files_read: Vec<PathBuf>,
}

fn import_codex(project_dir: &Path, config_dir: &Path) -> Result<ImportResult> {
    let mut result = ImportResult {
        vendor: "codex".to_string(),
        agents_imported: 0,
        rules_imported: 0,
        files_read: Vec::new(),
    };

    let agents_md = project_dir.join("AGENTS.md");
    if agents_md.exists() {
        let content = std::fs::read_to_string(&agents_md)?;
        result.files_read.push(agents_md);

        // Parse AGENTS.md into a rule
        let rule_yaml = format!(
            r#"name: codex-imported
description: "Imported from Codex AGENTS.md"
activation:
  type: always
content: |
{}
"#,
            content
                .lines()
                .map(|l| format!("  {}", l))
                .collect::<Vec<_>>()
                .join("\n")
        );
        std::fs::write(config_dir.join("rules/codex-imported.rule.yaml"), rule_yaml)?;
        result.rules_imported += 1;
    }

    Ok(result)
}

fn import_claude(project_dir: &Path, config_dir: &Path) -> Result<ImportResult> {
    let mut result = ImportResult {
        vendor: "claude-code".to_string(),
        agents_imported: 0,
        rules_imported: 0,
        files_read: Vec::new(),
    };

    let claude_md = project_dir.join("CLAUDE.md");
    if claude_md.exists() {
        let content = std::fs::read_to_string(&claude_md)?;
        result.files_read.push(claude_md);

        let rule_yaml = format!(
            r#"name: claude-imported
description: "Imported from Claude Code CLAUDE.md"
activation:
  type: always
content: |
{}
"#,
            content
                .lines()
                .map(|l| format!("  {}", l))
                .collect::<Vec<_>>()
                .join("\n")
        );
        std::fs::write(config_dir.join("rules/claude-imported.rule.yaml"), rule_yaml)?;
        result.rules_imported += 1;
    }

    // Check .claude/settings.json for MCP and permissions
    let settings_path = project_dir.join(".claude/settings.json");
    if settings_path.exists() {
        let content = std::fs::read_to_string(&settings_path)?;
        result.files_read.push(settings_path);

        if let Ok(settings) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(permissions) = settings.get("permissions") {
                let perm_yaml = format!(
                    r#"name: claude-permissions
description: "Imported permissions from .claude/settings.json"
activation:
  type: always
content: |
  Permissions: {}
"#,
                    serde_json::to_string_pretty(permissions).unwrap_or_default()
                );
                std::fs::write(config_dir.join("rules/claude-permissions.rule.yaml"), perm_yaml)?;
                result.rules_imported += 1;
            }
        }
    }

    Ok(result)
}

fn import_cursor(project_dir: &Path, config_dir: &Path) -> Result<ImportResult> {
    let mut result = ImportResult {
        vendor: "cursor".to_string(),
        agents_imported: 0,
        rules_imported: 0,
        files_read: Vec::new(),
    };

    // Import .cursorrules
    let cursorrules = project_dir.join(".cursorrules");
    if cursorrules.exists() {
        let content = std::fs::read_to_string(&cursorrules)?;
        result.files_read.push(cursorrules);

        let rule_yaml = format!(
            r#"name: cursor-global
description: "Imported from .cursorrules"
activation:
  type: always
content: |
{}
"#,
            content
                .lines()
                .map(|l| format!("  {}", l))
                .collect::<Vec<_>>()
                .join("\n")
        );
        std::fs::write(config_dir.join("rules/cursor-global.rule.yaml"), rule_yaml)?;
        result.rules_imported += 1;
    }

    // Import .cursor/rules/*.mdc
    let rules_dir = project_dir.join(".cursor/rules");
    if rules_dir.exists() {
        for entry in std::fs::read_dir(&rules_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().map(|e| e == "mdc").unwrap_or(false) {
                let content = std::fs::read_to_string(&path)?;
                result.files_read.push(path.clone());

                let name = path
                    .file_stem()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| "unnamed".to_string());

                // Parse MDC frontmatter for globs
                let (globs, body) = parse_mdc_frontmatter(&content);

                let activation = if globs.is_empty() {
                    "  type: always".to_string()
                } else {
                    format!(
                        "  type: glob\n  globs:\n{}",
                        globs
                            .iter()
                            .map(|g| format!("    - \"{}\"", g))
                            .collect::<Vec<_>>()
                            .join("\n")
                    )
                };

                let rule_yaml = format!(
                    r#"name: cursor-{}
description: "Imported from .cursor/rules/{}.mdc"
activation:
{}
content: |
{}
"#,
                    name,
                    name,
                    activation,
                    body.lines()
                        .map(|l| format!("  {}", l))
                        .collect::<Vec<_>>()
                        .join("\n")
                );
                std::fs::write(
                    config_dir.join(format!("rules/cursor-{}.rule.yaml", name)),
                    rule_yaml,
                )?;
                result.rules_imported += 1;
            }
        }
    }

    Ok(result)
}

fn import_windsurf(project_dir: &Path, config_dir: &Path) -> Result<ImportResult> {
    let mut result = ImportResult {
        vendor: "windsurf".to_string(),
        agents_imported: 0,
        rules_imported: 0,
        files_read: Vec::new(),
    };

    let windsurfrules = project_dir.join(".windsurfrules");
    if windsurfrules.exists() {
        let content = std::fs::read_to_string(&windsurfrules)?;
        result.files_read.push(windsurfrules);

        let rule_yaml = format!(
            r#"name: windsurf-global
description: "Imported from .windsurfrules"
activation:
  type: always
content: |
{}
"#,
            content
                .lines()
                .map(|l| format!("  {}", l))
                .collect::<Vec<_>>()
                .join("\n")
        );
        std::fs::write(config_dir.join("rules/windsurf-global.rule.yaml"), rule_yaml)?;
        result.rules_imported += 1;
    }

    // Import .windsurf/rules/*.md
    let rules_dir = project_dir.join(".windsurf/rules");
    if rules_dir.exists() {
        for entry in std::fs::read_dir(&rules_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().map(|e| e == "md").unwrap_or(false) {
                let content = std::fs::read_to_string(&path)?;
                result.files_read.push(path.clone());

                let name = path
                    .file_stem()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| "unnamed".to_string());

                let rule_yaml = format!(
                    r#"name: windsurf-{}
description: "Imported from .windsurf/rules/{}.md"
activation:
  type: always
content: |
{}
"#,
                    name,
                    name,
                    content
                        .lines()
                        .map(|l| format!("  {}", l))
                        .collect::<Vec<_>>()
                        .join("\n")
                );
                std::fs::write(
                    config_dir.join(format!("rules/windsurf-{}.rule.yaml", name)),
                    rule_yaml,
                )?;
                result.rules_imported += 1;
            }
        }
    }

    Ok(result)
}

fn import_gemini(project_dir: &Path, config_dir: &Path) -> Result<ImportResult> {
    let mut result = ImportResult {
        vendor: "gemini-cli".to_string(),
        agents_imported: 0,
        rules_imported: 0,
        files_read: Vec::new(),
    };

    let gemini_md = project_dir.join("GEMINI.md");
    if gemini_md.exists() {
        let content = std::fs::read_to_string(&gemini_md)?;
        result.files_read.push(gemini_md);

        let rule_yaml = format!(
            r#"name: gemini-imported
description: "Imported from GEMINI.md"
activation:
  type: always
content: |
{}
"#,
            content
                .lines()
                .map(|l| format!("  {}", l))
                .collect::<Vec<_>>()
                .join("\n")
        );
        std::fs::write(config_dir.join("rules/gemini-imported.rule.yaml"), rule_yaml)?;
        result.rules_imported += 1;
    }

    Ok(result)
}

fn import_copilot(project_dir: &Path, config_dir: &Path) -> Result<ImportResult> {
    let mut result = ImportResult {
        vendor: "github-copilot".to_string(),
        agents_imported: 0,
        rules_imported: 0,
        files_read: Vec::new(),
    };

    let instructions = project_dir.join(".github/copilot-instructions.md");
    if instructions.exists() {
        let content = std::fs::read_to_string(&instructions)?;
        result.files_read.push(instructions);

        let rule_yaml = format!(
            r#"name: copilot-imported
description: "Imported from .github/copilot-instructions.md"
activation:
  type: always
content: |
{}
"#,
            content
                .lines()
                .map(|l| format!("  {}", l))
                .collect::<Vec<_>>()
                .join("\n")
        );
        std::fs::write(config_dir.join("rules/copilot-imported.rule.yaml"), rule_yaml)?;
        result.rules_imported += 1;
    }

    Ok(result)
}

fn import_cline(project_dir: &Path, config_dir: &Path) -> Result<ImportResult> {
    let mut result = ImportResult {
        vendor: "cline".to_string(),
        agents_imported: 0,
        rules_imported: 0,
        files_read: Vec::new(),
    };

    // Single .clinerules file
    let clinerules_file = project_dir.join(".clinerules");
    if clinerules_file.is_file() {
        let content = std::fs::read_to_string(&clinerules_file)?;
        result.files_read.push(clinerules_file);

        let rule_yaml = format!(
            r#"name: cline-imported
description: "Imported from .clinerules"
activation:
  type: always
content: |
{}
"#,
            content
                .lines()
                .map(|l| format!("  {}", l))
                .collect::<Vec<_>>()
                .join("\n")
        );
        std::fs::write(config_dir.join("rules/cline-imported.rule.yaml"), rule_yaml)?;
        result.rules_imported += 1;
    }

    // Directory-based .clinerules/
    let clinerules_dir = project_dir.join(".clinerules");
    if clinerules_dir.is_dir() {
        for entry in std::fs::read_dir(&clinerules_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().map(|e| e == "md").unwrap_or(false) {
                let content = std::fs::read_to_string(&path)?;
                result.files_read.push(path.clone());
                let name = path
                    .file_stem()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| "unnamed".to_string());

                let rule_yaml = format!(
                    r#"name: cline-{}
description: "Imported from .clinerules/{}.md"
activation:
  type: always
content: |
{}
"#,
                    name,
                    name,
                    content
                        .lines()
                        .map(|l| format!("  {}", l))
                        .collect::<Vec<_>>()
                        .join("\n")
                );
                std::fs::write(
                    config_dir.join(format!("rules/cline-{}.rule.yaml", name)),
                    rule_yaml,
                )?;
                result.rules_imported += 1;
            }
        }
    }

    Ok(result)
}

fn import_devin(project_dir: &Path, config_dir: &Path) -> Result<ImportResult> {
    let mut result = ImportResult {
        vendor: "devin".to_string(),
        agents_imported: 0,
        rules_imported: 0,
        files_read: Vec::new(),
    };

    // Import .devin/agents/*.md
    let agents_dir = project_dir.join(".devin/agents");
    if agents_dir.exists() {
        for entry in std::fs::read_dir(&agents_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().map(|e| e == "md").unwrap_or(false) {
                let content = std::fs::read_to_string(&path)?;
                result.files_read.push(path.clone());
                let name = path
                    .file_stem()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| "agent".to_string());

                let agent_yaml = format!(
                    r#"name: {}
description: "Imported from .devin/agents/{}.md"
role: "Agent"
systemPrompt: |
{}
tools:
  allow: ["*"]
  deny: []
"#,
                    name,
                    name,
                    content
                        .lines()
                        .map(|l| format!("  {}", l))
                        .collect::<Vec<_>>()
                        .join("\n")
                );
                std::fs::write(
                    config_dir.join(format!("agents/{}.agent.yaml", name)),
                    agent_yaml,
                )?;
                result.agents_imported += 1;
            }
        }
    }

    Ok(result)
}

/// Parse Cursor MDC frontmatter (---\nglobs: [...]\n---)
fn parse_mdc_frontmatter(content: &str) -> (Vec<String>, String) {
    let lines: Vec<&str> = content.lines().collect();
    if lines.first() != Some(&"---") {
        return (Vec::new(), content.to_string());
    }

    let mut end_idx = None;
    for (i, line) in lines.iter().enumerate().skip(1) {
        if *line == "---" {
            end_idx = Some(i);
            break;
        }
    }

    let Some(end) = end_idx else {
        return (Vec::new(), content.to_string());
    };

    let frontmatter = &lines[1..end];
    let body = lines[end + 1..].join("\n");

    let mut globs = Vec::new();
    for line in frontmatter {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("globs:") {
            // Inline array: globs: ["*.ts", "*.tsx"]
            let rest = rest.trim();
            if rest.starts_with('[') {
                let inner = rest.trim_start_matches('[').trim_end_matches(']');
                for item in inner.split(',') {
                    let g = item.trim().trim_matches('"').trim_matches('\'');
                    if !g.is_empty() {
                        globs.push(g.to_string());
                    }
                }
            }
        } else if trimmed.starts_with('-') && !globs.is_empty() {
            let g = trimmed
                .trim_start_matches('-')
                .trim()
                .trim_matches('"')
                .trim_matches('\'');
            if !g.is_empty() {
                globs.push(g.to_string());
            }
        }
    }

    (globs, body)
}
