import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useConfigStore } from "../store/config";
import {
  Cpu, BookOpen, Server, Sparkles, GitBranch, Anchor,
  Wrench, Brain, FileText, Code2, FolderTree, Plus, ChevronRight, ChevronDown
} from "lucide-react";

type ConceptType = "agents" | "rules" | "mcp_servers" | "skills" | "workflows" | "hooks" | "tools" | "models" | "context" | "templates" | "source";

interface ConceptSection {
  key: ConceptType;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  labelKey: string;
  color: string;
}

const concepts: ConceptSection[] = [
  { key: "agents", icon: Cpu, labelKey: "config.agents", color: "text-blue-500" },
  { key: "rules", icon: BookOpen, labelKey: "config.rules", color: "text-purple-500" },
  { key: "mcp_servers", icon: Server, labelKey: "config.mcpServers", color: "text-emerald-500" },
  { key: "skills", icon: Sparkles, labelKey: "config.skills", color: "text-amber-500" },
  { key: "workflows", icon: GitBranch, labelKey: "config.workflows", color: "text-cyan-500" },
  { key: "hooks", icon: Anchor, labelKey: "config.hooks", color: "text-rose-500" },
  { key: "tools", icon: Wrench, labelKey: "config.tools", color: "text-orange-500" },
  { key: "models", icon: Brain, labelKey: "config.models", color: "text-indigo-500" },
  { key: "context", icon: FileText, labelKey: "config.context", color: "text-teal-500" },
  { key: "templates", icon: Code2, labelKey: "config.templates", color: "text-pink-500" },
  { key: "source", icon: FolderTree, labelKey: "config.source", color: "text-zinc-500" },
];

export default function ConfigHub() {
  const { t } = useTranslation();
  const { projectDir, projectStatus } = useConfigStore();
  const [activeConcept, setActiveConcept] = useState<ConceptType>("agents");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["agents", "rules", "mcp_servers"]));

  if (!projectDir) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
            <Layers size={22} className="text-zinc-400" />
          </div>
          <p className="text-[13px] text-zinc-500">{t("common.selectProject")}</p>
        </div>
      </div>
    );
  }

  const toggleSection = (key: string) => {
    const next = new Set(expandedSections);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedSections(next);
  };

  const getCount = (key: ConceptType): number => {
    if (!projectStatus) return 0;
    switch (key) {
      case "agents": return projectStatus.agents_count;
      case "rules": return projectStatus.rules_count;
      case "mcp_servers": return projectStatus.mcp_count;
      case "skills": return projectStatus.skills_count;
      case "workflows": return projectStatus.workflows_count;
      case "hooks": return projectStatus.hooks_count;
      default: return 0;
    }
  };

  return (
    <div className="h-full flex">
      {/* Left: Concept tree */}
      <div className="w-[220px] h-full border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto shrink-0">
        <div className="px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            {t("config.conceptTree", "概念导航")}
          </h3>
        </div>
        <div className="py-1">
          {concepts.map((concept) => {
            const Icon = concept.icon;
            const count = getCount(concept.key);
            const isExpanded = expandedSections.has(concept.key);
            const isActive = activeConcept === concept.key;
            return (
              <div key={concept.key}>
                <button
                  onClick={() => { setActiveConcept(concept.key); toggleSection(concept.key); }}
                  className={`w-full flex items-center gap-2 px-3 py-[6px] text-[12px] font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {isExpanded ? <ChevronDown size={12} className="text-zinc-400 shrink-0" /> : <ChevronRight size={12} className="text-zinc-400 shrink-0" />}
                  <Icon size={14} className={`shrink-0 ${concept.color}`} />
                  <span className="flex-1 text-left truncate">{t(concept.labelKey)}</span>
                  {count > 0 && (
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
                      {count}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {(() => { const c = concepts.find(c => c.key === activeConcept); const Icon = c?.icon ?? Cpu; return <Icon size={16} className={c?.color ?? ""} />; })()}
            <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
              {t(concepts.find(c => c.key === activeConcept)?.labelKey ?? "")}
            </h2>
            <span className="text-[11px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
              {getCount(activeConcept)} {t("config.items", "项")}
            </span>
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus size={12} />
            {t("config.add", "新增")}
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          <ConceptContent type={activeConcept} />
        </div>
      </div>
    </div>
  );
}

function Layers({ size, className }: { size?: number; className?: string }) {
  return <FolderTree size={size} className={className} />;
}

function ConceptContent({ type }: { type: ConceptType }) {
  const { t } = useTranslation();

  switch (type) {
    case "agents":
      return <AgentsPanel />;
    case "rules":
      return <RulesPanel />;
    case "mcp_servers":
      return <McpPanel />;
    case "skills":
      return <GenericListPanel concept="skills" fields={["name", "description", "steps"]} />;
    case "workflows":
      return <GenericListPanel concept="workflows" fields={["name", "trigger", "steps"]} />;
    case "hooks":
      return <GenericListPanel concept="hooks" fields={["name", "event", "run"]} />;
    case "tools":
      return <GenericListPanel concept="tools" fields={["name", "type", "command"]} />;
    case "models":
      return <GenericListPanel concept="models" fields={["name", "provider", "model"]} />;
    case "context":
      return <ContextPanel />;
    case "templates":
      return <GenericListPanel concept="templates" fields={["name", "description"]} />;
    case "source":
      return <SourcePanel />;
    default:
      return null;
  }
}

function AgentsPanel() {
  const { t } = useTranslation();
  const { projectStatus } = useConfigStore();

  const mockAgents = [
    { name: "main-architect", role: "Senior software architect", model: "claude-sonnet-4", tools: 5, rules: 3 },
    { name: "docs-writer", role: "Technical documentation specialist", model: "claude-sonnet-4", tools: 3, rules: 1 },
    { name: "security-auditor", role: "Application security specialist", model: "gpt-4o", tools: 3, rules: 2 },
  ];

  return (
    <div className="space-y-2">
      {mockAgents.slice(0, projectStatus?.agents_count ?? 3).map((agent) => (
        <div key={agent.name} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-colors cursor-pointer">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100">{agent.name}</h4>
              <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">{agent.role}</p>
            </div>
            <span className="text-[11px] px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full font-medium">
              {agent.model}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-3 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1"><Server size={11} /> {agent.tools} MCP</span>
            <span className="flex items-center gap-1"><BookOpen size={11} /> {agent.rules} Rules</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RulesPanel() {
  const mockRules = [
    { name: "typescript-strict", scope: "**/*.{ts,tsx}", severity: "error", priority: 100 },
    { name: "api-versioning", scope: "src/api/**", severity: "error", priority: 90 },
    { name: "commit-format", scope: "always", severity: "warning", priority: 50 },
  ];

  return (
    <div className="space-y-2">
      {mockRules.map((rule) => (
        <div key={rule.name} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-colors cursor-pointer">
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100">{rule.name}</h4>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
              rule.severity === "error"
                ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}>
              {rule.severity}
            </span>
          </div>
          <div className="mt-1.5 text-[11px] text-zinc-400 font-mono">{rule.scope}</div>
        </div>
      ))}
    </div>
  );
}

function McpPanel() {
  const { mcpServers, loadMcpServers } = useConfigStore();
  useEffect(() => { loadMcpServers(); }, [loadMcpServers]);

  const displayServers = mcpServers.length > 0 ? mcpServers : [
    { name: "filesystem", command: "npx", transport: "stdio", status: "running" },
    { name: "postgres", command: "npx", transport: "stdio", status: "stopped" },
    { name: "github", command: "npx", transport: "stdio", status: "running" },
  ];

  return (
    <div className="space-y-2">
      {displayServers.map((server) => (
        <div key={server.name} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-colors cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server size={14} className="text-emerald-500" />
              <h4 className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100">{server.name}</h4>
            </div>
            <span className={`w-2 h-2 rounded-full ${server.status === "running" ? "bg-emerald-400" : "bg-zinc-300 dark:bg-zinc-600"}`} />
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-zinc-400">
            <span>command: {server.command}</span>
            <span>transport: {server.transport}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function GenericListPanel({ concept, fields }: { concept: string; fields: string[] }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center h-[200px]">
      <div className="text-center">
        <p className="text-[13px] text-zinc-500">{t("config.emptySection", "暂无配置项")}</p>
        <p className="text-[11px] text-zinc-400 mt-1">{t("config.addHint")}</p>
      </div>
    </div>
  );
}

function ContextPanel() {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
        <h4 className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 mb-2">{t("config.contextFiles", "上下文文件")}</h4>
        <div className="space-y-1">
          {["README.md", "docs/architecture.md", ".env.example"].map(f => (
            <div key={f} className="text-[12px] text-zinc-500 dark:text-zinc-400 font-mono px-2 py-1 bg-zinc-50 dark:bg-zinc-800 rounded">{f}</div>
          ))}
        </div>
      </div>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
        <h4 className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 mb-2">{t("config.contextDynamic", "动态上下文")}</h4>
        <div className="space-y-1">
          <div className="text-[12px] text-zinc-500 font-mono px-2 py-1 bg-zinc-50 dark:bg-zinc-800 rounded">git log --oneline -10</div>
        </div>
      </div>
    </div>
  );
}

function SourcePanel() {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
      <p className="text-[12px] text-zinc-500 mb-2">{t("config.sourceHint", "直接编辑 agentweave.yaml 源文件")}</p>
      <div className="h-[400px] bg-zinc-50 dark:bg-zinc-800 rounded-md border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
        <p className="text-[12px] text-zinc-400">{t("config.editorPlaceholder", "YAML 编辑器")}</p>
      </div>
    </div>
  );
}
