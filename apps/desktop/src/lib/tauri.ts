import { invoke } from "@tauri-apps/api/core";

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
  files: number;
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

export interface GovernancePolicy {
  name: string;
  severity: string;
  enabled: boolean;
  description: string;
}

export interface GovernanceRole {
  name: string;
  permissions: string[];
}

export interface AuditLog {
  timestamp: string;
  user: string;
  action: string;
  detail: string;
}

export interface Quota {
  name: string;
  used: number;
  limit: number;
}

export interface GovernanceStatus {
  policies_count: number;
  roles_count: number;
  audit_entries: number;
  compliance: string;
  policies: GovernancePolicy[];
  roles: GovernanceRole[];
  audit_log: AuditLog[];
  quotas: Quota[];
}

export interface McpServerInfo {
  name: string;
  command: string;
  transport: string;
  status: string;
  args?: string[];
}

// Project management
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

// File operations
export async function loadConfig(path: string): Promise<string> {
  return invoke<string>("load_config", { path });
}

export async function saveConfig(path: string, content: string): Promise<void> {
  return invoke<void>("save_config", { path, content });
}

export async function listConfigFiles(projectDir: string): Promise<string[]> {
  return invoke<string[]>("list_config_files", { projectDir });
}

// Health & diagnostics
export async function healthCheck(projectDir: string): Promise<HealthStatus> {
  return invoke<HealthStatus>("health_check", { projectDir });
}

// Export
export async function exportConfig(projectDir: string, format: string): Promise<string> {
  return invoke<string>("export_config", { projectDir, format });
}

// Import
export async function importVendor(projectDir: string, vendor: string): Promise<string> {
  return invoke<string>("import_vendor", { projectDir, vendor });
}

// Watch
export async function startWatch(projectDir: string): Promise<string> {
  return invoke<string>("start_watch", { projectDir });
}

export async function stopWatch(): Promise<string> {
  return invoke<string>("stop_watch");
}

// Trace
export async function getTraceSpans(): Promise<TraceSpan[]> {
  return invoke<TraceSpan[]>("get_trace_spans");
}

// Governance
export async function getGovernanceStatus(projectDir: string): Promise<GovernanceStatus> {
  return invoke<GovernanceStatus>("get_governance_status", { projectDir });
}

// MCP
export async function listMcpServers(projectDir: string): Promise<McpServerInfo[]> {
  return invoke<McpServerInfo[]>("list_mcp_servers", { projectDir });
}

// Update
export interface UpdateInfo {
  current_version: string;
  latest_version: string | null;
  update_available: boolean;
  release_notes: string | null;
}

export async function checkUpdate(): Promise<UpdateInfo> {
  return invoke<UpdateInfo>("check_update");
}

export async function getAppVersion(): Promise<string> {
  return invoke<string>("get_app_version");
}

// --- Performance A/B Testing ---

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

export async function listExperiments(): Promise<Experiment[]> {
  return invoke<Experiment[]>("list_experiments");
}

// --- Prompt Testing ---

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

export async function listPromptTests(): Promise<PromptTestCase[]> {
  return invoke<PromptTestCase[]>("list_prompt_tests");
}

// --- AI Assist ---

export interface AiSuggestion {
  id: string;
  suggestion_type: string;
  title: string;
  description: string;
  diff: string;
  confidence: number;
}

export async function getAiSuggestions(projectDir: string): Promise<AiSuggestion[]> {
  return invoke<AiSuggestion[]>("get_ai_suggestions", { projectDir });
}

// --- Config Analytics ---

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

export async function getConfigAnalytics(projectDir: string): Promise<AnalyticsData> {
  return invoke<AnalyticsData>("get_config_analytics", { projectDir });
}

// --- Environments ---

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

export async function listEnvironments(projectDir: string): Promise<EnvironmentInfo[]> {
  return invoke<EnvironmentInfo[]>("list_environments", { projectDir });
}

// --- Inheritance ---

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

export async function getInheritanceTree(projectDir: string): Promise<InheritanceData> {
  return invoke<InheritanceData>("get_inheritance_tree", { projectDir });
}
