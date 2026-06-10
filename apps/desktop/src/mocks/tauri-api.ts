// Browser mock for @tauri-apps/api/core - used only in dev mode without Tauri
// All list_* commands return empty arrays — data is persisted in SQLite in Tauri mode.
// This mock exists only so the dev server doesn't crash when Tauri IPC is unavailable.

const mockData: Record<string, unknown> = {
  get_project_status: {
    name: "acme-platform",
    version: "2.1.0",
    targets: ["codex", "claude-code", "cursor", "windsurf", "gemini-cli", "github-copilot", "devin", "cline"],
    agents_count: 5, rules_count: 12, skills_count: 8, hooks_count: 6, mcp_count: 4, workflows_count: 3,
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
  health_check: { overall: "healthy", checks: [
    { name: "Config File", status: "pass", detail: "agentweave.yaml found" },
    { name: "Schema Valid", status: "pass", detail: "No validation errors" },
    { name: "Adapters Ready", status: "pass", detail: "12/12 adapters loaded" },
  ] },
  compare_vendors: [
    { vendor: "codex", file_count: 3, total_bytes: 4520, line_count: 142 },
    { vendor: "claude-code", file_count: 2, total_bytes: 3890, line_count: 118 },
    { vendor: "cursor", file_count: 5, total_bytes: 6210, line_count: 195 },
    { vendor: "windsurf", file_count: 3, total_bytes: 4100, line_count: 128 },
  ],
  validate_config: { valid: true, errors: [], warnings: [] },
  generate_configs: [
    { vendor: "codex", files: ["AGENTS.md"], success: true, error: null },
    { vendor: "claude-code", files: ["CLAUDE.md"], success: true, error: null },
    { vendor: "cursor", files: [".cursor/rules/main.mdc"], success: true, error: null },
  ],
  list_config_files: ["agentweave.yaml"],
  load_config: "apiVersion: agentweave/v1\nkind: Project\nmetadata:\n  name: acme-platform\n",
  export_config: "# Generated Configuration",
  check_update: { current_version: "0.1.0", latest_version: null, update_available: false, release_notes: null },
  get_app_version: "0.1.0",
  start_watch: "Watching started",
  stop_watch: "Watching stopped",

  // Persisted data — empty in dev mode (real data lives in SQLite)
  get_trace_spans: [],
  get_governance_status: { policies_count: 0, roles_count: 0, audit_entries: 0, compliance: "not configured" },
  list_governance_policies: [],
  list_governance_roles: [],
  list_mcp_servers: [],
  list_experiments: [],
  list_prompt_tests: [],
  get_ai_suggestions: [],
  get_config_analytics: { concepts: [], vendors: [], total_concepts: 0, avg_coverage: 0, rule_hit_rate: 0, unused_rules: 0 },
  list_environments: [],
  get_inheritance_tree: { nodes: [], resolved: [] },
  list_templates: [],
  list_team_members: [],
  list_webhooks: [],
  list_lint_rules: [],
  list_snapshots: [],
  list_cost_records: [],
  list_conflicts: [],
  detect_conflicts: 0,
  list_recent_projects: [],
  get_audit_log: [],
  get_config_concepts: [],
  detect_vendor_configs: [],
  get_vendor_preview: "# No project loaded",
  get_vendor_support_matrix: [],
  set_preference: undefined,
  get_preference: null,
  ask_ai_question: { answer: "当前项目概览: 5 Agent, 12 Rule, 4 MCP Server, 8 Skill, 3 Workflow, 6 Hook。", related_suggestions: [] },
  get_trace_logs: [],
  get_alerts: [{ id: "a1", level: "info", title: "适配器状态正常", description: "全部 12 个适配器就绪", timestamp: "2024-01-01 12:00:00" }],
  run_prompt_tests: undefined,
  set_routing_strategy: undefined,
  get_routing_strategy: "BestMatch",
  get_acp_metrics: { total_requests: 0, avg_latency_ms: 0, success_rate: 100, recent_logs: [] },

  // Write commands return success
  create_experiment: "exp-mock",
  create_prompt_test: "tc-mock",
  create_environment: "env-mock",
  create_template: "tmpl-mock",
  create_snapshot: "snap-mock",
  create_webhook: "wh-mock",
  create_lint_rule: "lint-mock",
  create_governance_policy: "policy-mock",
  create_governance_role: "role-mock",
  add_team_member: "member-mock",
  add_cost_record: undefined,
  add_trace_span_cmd: undefined,
  add_recent_project: undefined,
  export_project_zip: "/tmp/mock-export.zip",
  import_project_zip: "Imported 0 files",
  add_config_concept: undefined,
  run_experiment: undefined,
  global_search: [],
  update_env_overrides: undefined,
};

export async function invoke<T>(cmd: string, _args?: Record<string, unknown>): Promise<T> {
  await new Promise((r) => setTimeout(r, 100));
  const result = mockData[cmd];
  if (result !== undefined) return result as T;
  // For delete/update/toggle commands, return void
  return undefined as T;
}
