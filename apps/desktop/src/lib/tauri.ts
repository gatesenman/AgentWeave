import { invoke } from "@tauri-apps/api/core";

// ============================================================
// Types
// ============================================================

export interface ProjectStatus {
  name: string;
  version: string;
  targets: string[];
  agents_count: number;
  rules_count: number;
  skills_count: number;
  hooks_count: number;
  mcp_count: number;
  workflows_count: number;
}

export interface GenerateResult {
  vendor: string;
  files: string[];
  success: boolean;
  error: string | null;
}

export interface VendorInfo {
  name: string;
  display_name: string;
  concepts: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CompareEntry {
  vendor: string;
  file_count: number;
  total_bytes: number;
  line_count: number;
}

export interface HealthStatus {
  overall: string;
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: string;
  detail: string;
}

export interface TraceSpan {
  id: string;
  name: string;
  vendor: string;
  duration_ms: number;
  status: string;
  timestamp: string;
}

export interface GovernanceStatus {
  policies_count: number;
  roles_count: number;
  audit_entries: number;
  compliance: string;
}

export interface GovernancePolicyInfo {
  id: string;
  name: string;
  description: string;
  severity: string;
  enabled: boolean;
}

export interface GovernanceRoleInfo {
  id: string;
  name: string;
  permissions: string[];
}

export interface McpServerInfo {
  name: string;
  command: string;
  transport: string;
  status: string;
}

export interface UpdateInfo {
  current_version: string;
  latest_version: string | null;
  update_available: boolean;
  release_notes: string | null;
}

export interface ExperimentMetrics {
  response_time: [number, number];
  accuracy: [number, number];
  token_usage: [number, number];
  success_rate: [number, number];
}

export interface Experiment {
  id: string;
  name: string;
  status: string;
  config_a: string;
  config_b: string;
  vendor: string;
  runs: number;
  winner: string | null;
  created_at: string;
  metrics: ExperimentMetrics;
}

export interface PromptTestResult {
  vendor: string;
  status: string;
  response_time: number;
  output: string;
}

export interface PromptTestCase {
  id: string;
  name: string;
  prompt: string;
  expected_behavior: string;
  vendors: string[];
  results: PromptTestResult[];
}

export interface AiSuggestion {
  id: string;
  suggestion_type: string;
  title: string;
  description: string;
  diff: string;
  confidence: number;
}

export interface ConceptUsage {
  concept: string;
  count: number;
  coverage: number;
  trend: string;
}

export interface VendorCoverageInfo {
  vendor: string;
  supported: number;
  total: number;
  gaps: string[];
}

export interface AnalyticsData {
  concepts: ConceptUsage[];
  vendors: VendorCoverageInfo[];
  total_concepts: number;
  avg_coverage: number;
  rule_hit_rate: number;
  unused_rules: number;
}

export interface EnvironmentOverride {
  concept: string;
  field: string;
  base_value: string;
  override_value: string;
}

export interface EnvironmentInfo {
  id: string;
  name: string;
  label: string;
  is_active: boolean;
  last_deployed: string;
  overrides: EnvironmentOverride[];
}

export interface InheritanceNode {
  id: string;
  name: string;
  path: string;
  is_remote: boolean;
  children: string[];
  field_count: number;
}

export interface ResolvedField {
  key: string;
  value: string;
  source: string;
}

export interface InheritanceData {
  nodes: InheritanceNode[];
  resolved: ResolvedField[];
}

export interface RecentProject {
  path: string;
  name: string;
  last_opened: string;
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  detail: string;
}

export interface ConceptItem {
  concept_type: string;
  name: string;
  description: string;
  fields: string[];
}

export interface TemplateInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  author: string;
  downloads: number;
  tags: string[];
  config_json: string;
  created_at: string;
}

export interface TeamMemberInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  joined_at: string;
}

export interface WebhookInfo {
  id: string;
  name: string;
  url: string;
  platform: string;
  events: string[];
  enabled: boolean;
  created_at: string;
}

export interface LintRuleInfo {
  id: string;
  name: string;
  description: string;
  severity: string;
  pattern: string;
  enabled: boolean;
}

export interface SnapshotInfo {
  id: string;
  name: string;
  date: string;
  size_bytes: number;
  vendors_count: number;
}

export interface CostRecord {
  id: number;
  vendor: string;
  date: string;
  requests: number;
  tokens: number;
  cost_usd: number;
}

export interface ConflictInfo {
  id: string;
  file_path: string;
  local_content: string;
  remote_content: string;
  status: string;
  detected_at: string;
}

export interface DryRunResult {
  vendor: string;
  output_lines: number;
  missing_concepts: number;
  output_path: string;
  preview_content: string;
}

export interface ContextOptResult {
  vendor: string;
  current_tokens: number;
  max_tokens: number;
  usage_percent: number;
  is_over_limit: boolean;
  suggestions: string[];
}

export interface MigrationStatus {
  success: boolean;
  imported_count: number;
  skipped_count: number;
  errors: string[];
}

export interface ConfigAnalyticsData {
  total_concepts: number;
  vendor_count: number;
  avg_coverage: number;
  concept_distribution: { type: string; count: number }[];
  vendor_coverage: { vendor: string; coverage: number }[];
  gaps: { vendor: string; missing_concept: string }[];
}

// ============================================================
// Core Project Commands
// ============================================================

export async function getProjectStatus(projectDir: string): Promise<ProjectStatus> {
  return invoke<ProjectStatus>("get_project_status", { projectDir });
}

export async function generateConfigs(projectDir: string, vendor?: string): Promise<GenerateResult[]> {
  return invoke<GenerateResult[]>("generate_configs", { projectDir, vendor: vendor ?? null });
}

export async function validateConfig(projectDir: string): Promise<ValidationResult> {
  return invoke<ValidationResult>("validate_config", { projectDir });
}

export async function listVendors(): Promise<VendorInfo[]> {
  return invoke<VendorInfo[]>("list_vendors");
}

export async function compareVendors(projectDir: string): Promise<CompareEntry[]> {
  return invoke<CompareEntry[]>("compare_vendors", { projectDir });
}

export async function loadConfig(path: string): Promise<string> {
  return invoke<string>("load_config", { path });
}

export async function saveConfig(path: string, content: string): Promise<void> {
  return invoke<void>("save_config", { path, content });
}

export async function listConfigFiles(projectDir: string): Promise<string[]> {
  return invoke<string[]>("list_config_files", { projectDir });
}

export async function healthCheck(projectDir: string): Promise<HealthStatus> {
  return invoke<HealthStatus>("health_check", { projectDir });
}

export async function exportConfig(projectDir: string, format: string): Promise<string> {
  return invoke<string>("export_config", { projectDir, format });
}

export async function importVendor(projectDir: string, vendor: string): Promise<string> {
  return invoke<string>("import_vendor", { projectDir, vendor });
}

export async function startWatch(projectDir: string): Promise<string> {
  return invoke<string>("start_watch", { projectDir });
}

export async function stopWatch(): Promise<string> {
  return invoke<string>("stop_watch");
}

export async function listMcpServers(projectDir: string): Promise<McpServerInfo[]> {
  return invoke<McpServerInfo[]>("list_mcp_servers", { projectDir });
}

export async function checkUpdate(): Promise<UpdateInfo> {
  return invoke<UpdateInfo>("check_update");
}

export async function getAppVersion(): Promise<string> {
  return invoke<string>("get_app_version");
}

// ============================================================
// Trace Spans (persisted)
// ============================================================

export async function getTraceSpans(): Promise<TraceSpan[]> {
  return invoke<TraceSpan[]>("get_trace_spans");
}

export async function addTraceSpan(name: string, vendor: string, durationMs: number, status: string, projectDir: string): Promise<void> {
  return invoke<void>("add_trace_span_cmd", { name, vendor, durationMs, status, projectDir });
}

// ============================================================
// Governance (persisted)
// ============================================================

export async function getGovernanceStatus(projectDir: string): Promise<GovernanceStatus> {
  return invoke<GovernanceStatus>("get_governance_status", { projectDir });
}

export async function listGovernancePolicies(): Promise<GovernancePolicyInfo[]> {
  return invoke<GovernancePolicyInfo[]>("list_governance_policies");
}

export async function createGovernancePolicy(name: string, description: string, severity: string): Promise<string> {
  return invoke<string>("create_governance_policy", { name, description, severity });
}

export async function toggleGovernancePolicy(id: string, enabled: boolean): Promise<void> {
  return invoke<void>("toggle_governance_policy_cmd", { id, enabled });
}

export async function deleteGovernancePolicy(id: string): Promise<void> {
  return invoke<void>("delete_governance_policy_cmd", { id });
}

export async function listGovernanceRoles(): Promise<GovernanceRoleInfo[]> {
  return invoke<GovernanceRoleInfo[]>("list_governance_roles");
}

export async function createGovernanceRole(name: string, permissions: string[]): Promise<string> {
  return invoke<string>("create_governance_role", { name, permissions });
}

export async function deleteGovernanceRole(id: string): Promise<void> {
  return invoke<void>("delete_governance_role_cmd", { id });
}

// ============================================================
// Experiments (persisted)
// ============================================================

export async function listExperiments(): Promise<Experiment[]> {
  return invoke<Experiment[]>("list_experiments");
}

export async function createExperiment(name: string, configA: string, configB: string, vendor: string): Promise<string> {
  return invoke<string>("create_experiment", { name, configA, configB, vendor });
}

export async function updateExperimentStatus(id: string, status: string, winner?: string): Promise<void> {
  return invoke<void>("update_experiment_status", { id, status, winner: winner ?? null });
}

export async function deleteExperiment(id: string): Promise<void> {
  return invoke<void>("delete_experiment", { id });
}

// ============================================================
// Prompt Tests (persisted)
// ============================================================

export async function listPromptTests(): Promise<PromptTestCase[]> {
  return invoke<PromptTestCase[]>("list_prompt_tests");
}

export async function createPromptTest(name: string, prompt: string, expectedBehavior: string, vendors: string[]): Promise<string> {
  return invoke<string>("create_prompt_test", { name, prompt, expectedBehavior, vendors });
}

export async function deletePromptTest(id: string): Promise<void> {
  return invoke<void>("delete_prompt_test", { id });
}

// ============================================================
// AI Suggestions (real analysis)
// ============================================================

export async function getAiSuggestions(projectDir: string): Promise<AiSuggestion[]> {
  return invoke<AiSuggestion[]>("get_ai_suggestions", { projectDir });
}

// ============================================================
// Config Analytics (real analysis)
// ============================================================

export async function getConfigAnalytics(projectDir: string): Promise<AnalyticsData> {
  return invoke<AnalyticsData>("get_config_analytics", { projectDir });
}

// ============================================================
// Environments (persisted)
// ============================================================

export async function listEnvironments(projectDir: string): Promise<EnvironmentInfo[]> {
  return invoke<EnvironmentInfo[]>("list_environments", { projectDir });
}

export async function createEnvironment(name: string, label: string, projectDir: string): Promise<string> {
  return invoke<string>("create_environment", { name, label, projectDir });
}

export async function activateEnvironment(id: string, projectDir: string): Promise<void> {
  return invoke<void>("activate_environment", { id, projectDir });
}

export async function deleteEnvironment(id: string): Promise<void> {
  return invoke<void>("delete_environment", { id });
}

// ============================================================
// Inheritance (real config)
// ============================================================

export async function getInheritanceTree(projectDir: string): Promise<InheritanceData> {
  return invoke<InheritanceData>("get_inheritance_tree", { projectDir });
}

// ============================================================
// Templates (persisted)
// ============================================================

export async function listTemplates(category?: string): Promise<TemplateInfo[]> {
  return invoke<TemplateInfo[]>("list_templates", { category: category ?? null });
}

export async function createTemplate(name: string, category: string, description: string, author: string, tags: string[], configJson: string): Promise<string> {
  return invoke<string>("create_template", { name, category, description, author, tags, configJson });
}

export async function deleteTemplate(id: string): Promise<void> {
  return invoke<void>("delete_template", { id });
}

// ============================================================
// Team Members (persisted)
// ============================================================

export async function listTeamMembers(): Promise<TeamMemberInfo[]> {
  return invoke<TeamMemberInfo[]>("list_team_members");
}

export async function addTeamMember(name: string, email: string, role: string): Promise<string> {
  return invoke<string>("add_team_member", { name, email, role });
}

export async function updateTeamMemberRole(id: string, role: string): Promise<void> {
  return invoke<void>("update_team_member_role", { id, role });
}

export async function deleteTeamMember(id: string): Promise<void> {
  return invoke<void>("delete_team_member", { id });
}

// ============================================================
// Webhooks (persisted)
// ============================================================

export async function listWebhooks(): Promise<WebhookInfo[]> {
  return invoke<WebhookInfo[]>("list_webhooks");
}

export async function createWebhook(name: string, url: string, platform: string, events: string[]): Promise<string> {
  return invoke<string>("create_webhook", { name, url, platform, events });
}

export async function toggleWebhook(id: string, enabled: boolean): Promise<void> {
  return invoke<void>("toggle_webhook", { id, enabled });
}

export async function deleteWebhook(id: string): Promise<void> {
  return invoke<void>("delete_webhook", { id });
}

// ============================================================
// Lint Rules (persisted)
// ============================================================

export async function listLintRules(): Promise<LintRuleInfo[]> {
  return invoke<LintRuleInfo[]>("list_lint_rules");
}

export async function createLintRule(name: string, description: string, severity: string, pattern: string): Promise<string> {
  return invoke<string>("create_lint_rule", { name, description, severity, pattern });
}

export async function toggleLintRule(id: string, enabled: boolean): Promise<void> {
  return invoke<void>("toggle_lint_rule", { id, enabled });
}

export async function deleteLintRule(id: string): Promise<void> {
  return invoke<void>("delete_lint_rule", { id });
}

// ============================================================
// Snapshots / Backup (persisted)
// ============================================================

export async function listSnapshots(projectDir?: string): Promise<SnapshotInfo[]> {
  return invoke<SnapshotInfo[]>("list_snapshots", { projectDir: projectDir ?? null });
}

export async function createSnapshot(name: string, projectDir: string): Promise<string> {
  return invoke<string>("create_snapshot", { name, projectDir });
}

export async function deleteSnapshot(id: string): Promise<void> {
  return invoke<void>("delete_snapshot", { id });
}

export async function exportProjectZip(projectDir: string): Promise<string> {
  return invoke<string>("export_project_zip", { projectDir });
}

export async function importProjectZip(projectDir: string, importPath: string): Promise<string> {
  return invoke<string>("import_project_zip", { projectDir, importPath });
}

// ============================================================
// Cost Records (persisted)
// ============================================================

export async function listCostRecords(vendor?: string): Promise<CostRecord[]> {
  return invoke<CostRecord[]>("list_cost_records", { vendor: vendor ?? null });
}

export async function addCostRecord(vendor: string, date: string, requests: number, tokens: number, costUsd: number): Promise<void> {
  return invoke<void>("add_cost_record", { vendor, date, requests, tokens, costUsd });
}

// ============================================================
// Conflicts (persisted)
// ============================================================

export async function listConflicts(): Promise<ConflictInfo[]> {
  return invoke<ConflictInfo[]>("list_conflicts");
}

export async function resolveConflict(id: string, resolution: string): Promise<void> {
  return invoke<void>("resolve_conflict", { id, resolution });
}

// ============================================================
// Recent Projects & Persistence
// ============================================================

export async function addRecentProject(path: string, name: string): Promise<void> {
  return invoke<void>("add_recent_project", { path, name });
}

export async function listRecentProjects(): Promise<RecentProject[]> {
  return invoke<RecentProject[]>("list_recent_projects");
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  return invoke<AuditEntry[]>("get_audit_log");
}

export async function logAuditEvent(action: string, detail: string): Promise<void> {
  return invoke<void>("log_audit_event", { action, detail });
}

export async function setPreference(key: string, value: string): Promise<void> {
  return invoke<void>("set_preference", { key, value });
}

export async function getPreference(key: string): Promise<string | null> {
  return invoke<string | null>("get_preference", { key });
}

// ============================================================
// Config Hub
// ============================================================

export async function getConfigConcepts(projectDir: string): Promise<ConceptItem[]> {
  return invoke<ConceptItem[]>("get_config_concepts", { projectDir });
}

// ============================================================
// Events
// ============================================================

export async function emitConfigChanged(projectDir: string): Promise<void> {
  return invoke<void>("emit_config_changed", { projectDir });
}

export async function emitWatchEvent(eventType: string, detail: string): Promise<void> {
  return invoke<void>("emit_watch_event", { eventType, detail });
}

// ============================================================
// Cost Records - delete
// ============================================================

export async function deleteCostRecord(id: string): Promise<void> {
  return invoke<void>("delete_cost_record", { id });
}

// ============================================================
// Dry Run Preview
// ============================================================

export async function getDryRunPreview(projectDir: string): Promise<DryRunResult[]> {
  return invoke<DryRunResult[]>("get_dry_run_preview", { projectDir });
}

// ============================================================
// Context Optimization
// ============================================================

export async function getContextOptimization(projectDir: string): Promise<ContextOptResult[]> {
  return invoke<ContextOptResult[]>("get_context_optimization", { projectDir });
}

// ============================================================
// Migration
// ============================================================

export async function startMigration(source: string, projectDir: string): Promise<void> {
  return invoke<void>("start_migration", { source, projectDir });
}

export async function getMigrationStatus(projectDir: string): Promise<MigrationStatus> {
  return invoke<MigrationStatus>("get_migration_status", { projectDir });
}

// ============================================================
// Config Analytics (extended)
// ============================================================

export async function getConfigAnalyticsEx(projectDir: string): Promise<ConfigAnalyticsData> {
  return invoke<ConfigAnalyticsData>("get_config_analytics_ex", { projectDir });
}

// ============================================================
// Detect vendor config files
// ============================================================

export interface DetectedVendorConfig {
  vendor: string;
  file_path: string;
  exists: boolean;
}

export async function detectVendorConfigs(projectDir: string): Promise<DetectedVendorConfig[]> {
  return invoke<DetectedVendorConfig[]>("detect_vendor_configs", { projectDir });
}

// ============================================================
// Vendor preview (single vendor, no disk write)
// ============================================================

export async function getVendorPreview(projectDir: string, vendor: string): Promise<string> {
  return invoke<string>("get_vendor_preview", { projectDir, vendor });
}

// ============================================================
// Vendor concept support matrix
// ============================================================

export interface VendorConceptSupport {
  vendor: string;
  display_name: string;
  supported: string[];
}

export async function getVendorSupportMatrix(): Promise<VendorConceptSupport[]> {
  return invoke<VendorConceptSupport[]>("get_vendor_support_matrix");
}

// ============================================================
// AI Question (conversational)
// ============================================================

export interface AiAnswer {
  answer: string;
  related_suggestions: AiSuggestion[];
}

export async function askAiQuestion(projectDir: string, question: string): Promise<AiAnswer> {
  return invoke<AiAnswer>("ask_ai_question", { projectDir, question });
}

// ============================================================
// Trace logs & alerts
// ============================================================

export interface TraceLogEntry {
  timestamp: string;
  level: string;
  message: string;
}

export async function getTraceLogs(): Promise<TraceLogEntry[]> {
  return invoke<TraceLogEntry[]>("get_trace_logs");
}

export interface AlertInfo {
  id: string;
  level: string;
  title: string;
  description: string;
  timestamp: string;
}

export async function getAlerts(): Promise<AlertInfo[]> {
  return invoke<AlertInfo[]>("get_alerts");
}

// ============================================================
// Run prompt tests
// ============================================================

export async function runPromptTests(testId: string): Promise<void> {
  return invoke<void>("run_prompt_tests", { testId });
}

// ============================================================
// Routing strategy
// ============================================================

export async function setRoutingStrategy(strategy: string): Promise<void> {
  return invoke<void>("set_routing_strategy", { strategy });
}

export async function getRoutingStrategy(): Promise<string> {
  return invoke<string>("get_routing_strategy");
}

// ============================================================
// ACP Metrics
// ============================================================

export interface AcpLogEntry {
  timestamp: string;
  vendor: string;
  name: string;
  latency_ms: number;
  status: string;
}

export interface AcpMetrics {
  total_requests: number;
  avg_latency_ms: number;
  success_rate: number;
  recent_logs: AcpLogEntry[];
}

export async function getAcpMetrics(): Promise<AcpMetrics> {
  return invoke<AcpMetrics>("get_acp_metrics");
}
