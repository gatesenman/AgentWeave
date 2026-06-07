import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface LintRule {
  id: string;
  name: string;
  description: string;
  severity: "error" | "warning" | "info";
  enabled: boolean;
  builtIn: boolean;
}

interface LintResult {
  rule: string;
  severity: "error" | "warning" | "info";
  message: string;
  location: string;
}

const mockRules: LintRule[] = [
  { id: "1", name: "no-hardcoded-paths", description: "禁止硬编码绝对路径", severity: "error", enabled: true, builtIn: true },
  { id: "2", name: "no-secrets-in-config", description: "禁止在配置中明文存储密钥/token", severity: "error", enabled: true, builtIn: true },
  { id: "3", name: "agent-must-have-description", description: "Agent 必须有描述字段", severity: "warning", enabled: true, builtIn: true },
  { id: "4", name: "mcp-must-have-health-check", description: "MCP Server 应配置健康检查", severity: "warning", enabled: true, builtIn: true },
  { id: "5", name: "rule-max-length", description: "Rule content 长度不超过 2000 字符", severity: "info", enabled: true, builtIn: true },
  { id: "6", name: "no-duplicate-rules", description: "检测重复的规则定义", severity: "warning", enabled: true, builtIn: true },
  { id: "7", name: "model-must-exist", description: "引用的模型必须在 models 列表中定义", severity: "error", enabled: false, builtIn: false },
  { id: "8", name: "workflow-max-steps", description: "Workflow 步骤数不超过 20", severity: "info", enabled: false, builtIn: false },
];

const mockResults: LintResult[] = [
  { rule: "no-hardcoded-paths", severity: "error", message: "硬编码路径: /Users/dev/project/src", location: "agents[0].tools[2].path" },
  { rule: "agent-must-have-description", severity: "warning", message: "Agent 'security-auditor' 缺少 description 字段", location: "agents[2]" },
  { rule: "mcp-must-have-health-check", severity: "warning", message: "MCP Server 'redis' 未配置健康检查", location: "mcp_servers[1]" },
  { rule: "rule-max-length", severity: "info", message: "Rule 'code-style' 内容长度 1856/2000", location: "rules[4]" },
];

export default function ConfigLint() {
  const { t } = useTranslation();
  const [rules, setRules] = useState<LintRule[]>(mockRules);
  const [results, setResults] = useState<LintResult[]>(mockResults);
  const [activeTab, setActiveTab] = useState<"results" | "rules">("results");
  const [isRunning, setIsRunning] = useState(false);

  const toggleRule = (id: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const errorCount = results.filter((r) => r.severity === "error").length;
  const warnCount = results.filter((r) => r.severity === "warning").length;

  const severityIcon = (severity: string) => {
    switch (severity) {
      case "error": return <XCircle size={12} className="text-red-500" />;
      case "warning": return <AlertTriangle size={12} className="text-amber-500" />;
      default: return <CheckCircle2 size={12} className="text-blue-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
          <ShieldAlert size={16} className="text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
            {t("lint.title", "配置 Lint")}
          </h2>
          <p className="text-[11px] text-zinc-400">
            {t("lint.subtitle", "自定义规则检查配置质量和安全性")}
          </p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-[11px]">
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full font-medium">
              <XCircle size={10} /> {errorCount} errors
            </span>
          )}
          {warnCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full font-medium">
              <AlertTriangle size={10} /> {warnCount} warnings
            </span>
          )}
        </div>
        <button
          onClick={() => { setIsRunning(true); setTimeout(() => setIsRunning(false), 1000); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors shadow-sm"
        >
          <Play size={12} />
          {t("lint.run", "运行检查")}
        </button>
      </div>

      {/* Tabs */}
      <div className="px-5 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2 shrink-0">
        <button
          onClick={() => setActiveTab("results")}
          className={`px-3 py-1 text-[12px] font-medium rounded-md ${activeTab === "results" ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
        >
          检查结果 ({results.length})
        </button>
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-3 py-1 text-[12px] font-medium rounded-md ${activeTab === "rules" ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
        >
          规则配置 ({rules.filter((r) => r.enabled).length}/{rules.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-5 py-3">
        {activeTab === "results" ? (
          <div className="space-y-2">
            {results.map((result, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                {severityIcon(result.severity)}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-zinc-700 dark:text-zinc-200">{result.message}</p>
                  <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{result.location}</p>
                </div>
                <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                  {result.rule}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <button onClick={() => toggleRule(rule.id)} className="shrink-0">
                  {rule.enabled ? (
                    <ToggleRight size={18} className="text-indigo-500" />
                  ) : (
                    <ToggleLeft size={18} className="text-zinc-300 dark:text-zinc-600" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-mono font-medium text-zinc-700 dark:text-zinc-200">{rule.name}</span>
                    {severityIcon(rule.severity)}
                    {rule.builtIn && <span className="text-[9px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1 rounded">内置</span>}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{rule.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
