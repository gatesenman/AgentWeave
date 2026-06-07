// Browser mock for @tauri-apps/api/core - used only in dev mode without Tauri
const mockData: Record<string, unknown> = {
  get_project_status: {
    name: "acme-platform",
    version: "2.1.0",
    targets: ["codex", "claude-code", "cursor", "windsurf", "gemini-cli", "github-copilot", "devin", "cline"],
    agents_count: 5,
    rules_count: 12,
    skills_count: 8,
    hooks_count: 6,
    mcp_count: 4,
    workflows_count: 3,
  },
  list_vendors: [
    { name: "codex", display_name: "OpenAI Codex", concepts: ["agent", "rule", "tool", "mcp-server", "workflow"] },
    { name: "claude-code", display_name: "Claude Code", concepts: ["agent", "rule", "mcp-server", "permission", "memory"] },
    { name: "cursor", display_name: "Cursor", concepts: ["agent", "rule", "mcp-server", "context", "model"] },
    { name: "windsurf", display_name: "Windsurf", concepts: ["agent", "rule", "mcp-server", "workflow", "memory"] },
    { name: "gemini-cli", display_name: "Gemini CLI", concepts: ["agent", "rule", "tool", "extension"] },
    { name: "github-copilot", display_name: "GitHub Copilot", concepts: ["agent", "rule", "context"] },
    { name: "devin", display_name: "Devin", concepts: ["agent", "rule", "skill", "mcp-server", "workflow", "memory"] },
    { name: "cline", display_name: "Cline", concepts: ["agent", "rule", "mcp-server", "tool", "permission"] },
    { name: "codebuddy", display_name: "CodeBuddy", concepts: ["agent", "rule", "mcp-server"] },
    { name: "qoder", display_name: "Qoder", concepts: ["agent", "rule", "tool"] },
    { name: "grok-build", display_name: "Grok Build", concepts: ["agent", "rule"] },
    { name: "openclaw", display_name: "OpenClaw", concepts: ["agent", "rule", "workflow", "hook"] },
  ],
  health_check: {
    overall: "healthy",
    checks: [
      { name: "Config File", status: "pass", detail: "agentweave.yaml found" },
      { name: "Schema Valid", status: "pass", detail: "No validation errors" },
      { name: "Adapters Ready", status: "pass", detail: "12/12 adapters loaded" },
      { name: "Sync Engine", status: "pass", detail: "File watcher active" },
    ],
  },
  compare_vendors: [
    { vendor: "codex", file_count: 3, total_bytes: 4520, line_count: 142 },
    { vendor: "claude-code", file_count: 2, total_bytes: 3890, line_count: 118 },
    { vendor: "cursor", file_count: 5, total_bytes: 6210, line_count: 195 },
    { vendor: "windsurf", file_count: 3, total_bytes: 4100, line_count: 128 },
    { vendor: "gemini-cli", file_count: 1, total_bytes: 2800, line_count: 85 },
    { vendor: "github-copilot", file_count: 1, total_bytes: 1950, line_count: 62 },
    { vendor: "devin", file_count: 4, total_bytes: 5600, line_count: 175 },
    { vendor: "cline", file_count: 3, total_bytes: 3400, line_count: 105 },
  ],
  get_trace_spans: [
    { id: "span-001", name: "generate:codex", vendor: "codex", duration_ms: 45, status: "ok", timestamp: "2026-06-06T18:30:00Z" },
    { id: "span-002", name: "generate:claude-code", vendor: "claude-code", duration_ms: 52, status: "ok", timestamp: "2026-06-06T18:30:01Z" },
    { id: "span-003", name: "generate:cursor", vendor: "cursor", duration_ms: 38, status: "ok", timestamp: "2026-06-06T18:30:02Z" },
    { id: "span-004", name: "validate:schema", vendor: "core", duration_ms: 12, status: "ok", timestamp: "2026-06-06T18:30:03Z" },
    { id: "span-005", name: "sync:file-watch", vendor: "core", duration_ms: 5, status: "ok", timestamp: "2026-06-06T18:30:04Z" },
  ],
  get_governance_status: {
    policies_count: 5,
    roles_count: 3,
    audit_entries: 247,
    compliance: "SOC2, GDPR",
  },
  list_mcp_servers: [
    { name: "filesystem", command: "npx @mcp/server-filesystem ./", transport: "stdio", status: "running" },
    { name: "postgres", command: "npx @mcp/server-postgres", transport: "stdio", status: "running" },
    { name: "github", command: "npx @mcp/server-github", transport: "stdio", status: "stopped" },
    { name: "kubernetes", command: "npx @mcp/server-k8s", transport: "sse", status: "running" },
  ],
  validate_config: { valid: true, errors: [], warnings: ["Consider adding 'description' to metadata"] },
  generate_configs: [
    { vendor: "codex", files: ["AGENTS.md"], success: true, error: null },
    { vendor: "claude-code", files: ["CLAUDE.md", ".claude/settings.json"], success: true, error: null },
    { vendor: "cursor", files: [".cursor/rules/main.mdc"], success: true, error: null },
  ],
  list_config_files: ["agentweave.yaml", ".agentweave/rules/strict.yaml", ".agentweave/agents/main.yaml"],
  load_config: "apiVersion: agentweave/v1\nkind: Project\nmetadata:\n  name: acme-platform\n  version: \"2.1.0\"\n\ntargets:\n  - codex\n  - claude-code\n  - cursor\n  - windsurf\n\nagents:\n  - name: main-architect\n    role: Senior software architect\n    tools: [read_file, write_file, terminal]\n",
  export_config: "# Generated Codex Configuration\n\nYou are a senior software architect...",
  check_update: { current_version: "0.1.0", latest_version: null, update_available: false, release_notes: null },
  get_app_version: "0.1.0",
  start_watch: "Watching started",
  stop_watch: "Watching stopped",
  list_experiments: [
    { id: "exp-001", name: "Verbose vs Concise", status: "completed", config_a: "verbose-agent", config_b: "concise-agent", vendor: "claude-code", runs: 200, winner: "B", created_at: "2025-01-15", metrics: { response_time: [2.4, 1.8], accuracy: [0.91, 0.89], token_usage: [1200, 680], success_rate: [0.94, 0.96] } },
    { id: "exp-002", name: "GPT-4o vs Claude", status: "running", config_a: "gpt4o-agent", config_b: "claude-agent", vendor: "cursor", runs: 87, winner: null, created_at: "2025-01-20", metrics: { response_time: [3.1, 2.6], accuracy: [0.88, 0.92], token_usage: [1500, 1100], success_rate: [0.90, 0.93] } },
  ],
  list_prompt_tests: [
    { id: "tc-001", name: "Security vulnerability detection", prompt: "Review this code for security vulnerabilities", expected_behavior: "Identifies SQL injection risk", vendors: ["cursor", "claude-code", "codex"], results: [{ vendor: "cursor", status: "pass", response_time: 2.1, output: "Found SQL injection..." }, { vendor: "claude-code", status: "pass", response_time: 1.8, output: "Detected unsafe query..." }, { vendor: "codex", status: "fail", response_time: 3.2, output: "No issues found" }] },
    { id: "tc-002", name: "Code refactoring", prompt: "Refactor this function", expected_behavior: "Reduces complexity", vendors: ["cursor", "windsurf"], results: [{ vendor: "cursor", status: "pass", response_time: 4.5, output: "Split into 3 functions..." }, { vendor: "windsurf", status: "pending", response_time: 0.0, output: "" }] },
  ],
  get_ai_suggestions: [
    { id: "sug-001", suggestion_type: "optimize", title: "Reduce token usage", description: "Restructure system prompt to save 800 tokens", diff: "- verbose prompt\n+ concise prompt", confidence: 0.87 },
    { id: "sug-002", suggestion_type: "add", title: "Add error handling rule", description: "No explicit error handling guidance found", diff: "+ - name: error-handling\n+   severity: error", confidence: 0.92 },
  ],
  get_config_analytics: {
    concepts: [
      { concept: "Agent", count: 3, coverage: 1.0, trend: "stable" },
      { concept: "Rule", count: 12, coverage: 0.83, trend: "up" },
      { concept: "MCP Server", count: 5, coverage: 0.75, trend: "up" },
      { concept: "Skill", count: 4, coverage: 0.58, trend: "stable" },
      { concept: "Workflow", count: 2, coverage: 0.42, trend: "down" },
    ],
    vendors: [
      { vendor: "codex", supported: 28, total: 46, gaps: [] },
      { vendor: "claude-code", supported: 35, total: 46, gaps: [] },
      { vendor: "cursor", supported: 32, total: 46, gaps: [] },
    ],
    total_concepts: 46,
    avg_coverage: 0.74,
    rule_hit_rate: 0.67,
    unused_rules: 4,
  },
  list_environments: [
    { id: "dev", name: "development", label: "Development", is_active: true, last_deployed: "2 minutes ago", overrides: [{ concept: "MCP 'postgres'", field: "host", base_value: "prod-db", override_value: "localhost:5432" }] },
    { id: "staging", name: "staging", label: "Staging", is_active: false, last_deployed: "3 hours ago", overrides: [{ concept: "MCP 'postgres'", field: "host", base_value: "prod-db", override_value: "staging-db" }] },
    { id: "prod", name: "production", label: "Production", is_active: false, last_deployed: "1 day ago", overrides: [] },
  ],
  get_inheritance_tree: {
    nodes: [
      { id: "root", name: "agentweave.yaml", path: "agentweave.yaml", is_remote: false, children: ["shared", "team"], field_count: 12 },
      { id: "shared", name: "shared-rules", path: "https://registry.agentweave.dev/templates/shared-rules@v2", is_remote: true, children: [], field_count: 8 },
      { id: "team", name: "team-overrides", path: "../shared/team.yaml", is_remote: false, children: [], field_count: 5 },
    ],
    resolved: [
      { key: "agents[0].model", value: "claude-3-opus", source: "agentweave.yaml" },
      { key: "rules.style", value: "strict", source: "agentweave.yaml (overrides shared-rules)" },
      { key: "rules.naming", value: "camelCase", source: "shared-rules" },
    ],
  },
};

export async function invoke<T>(cmd: string, _args?: Record<string, unknown>): Promise<T> {
  await new Promise((r) => setTimeout(r, 100));
  const result = mockData[cmd];
  if (result !== undefined) return result as T;
  return {} as T;
}
