import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  PieChart,
  BarChart3,
  TrendingUp,
  Target,
  FileCode2,
  Layers,
  AlertTriangle,
} from "lucide-react";

interface ConceptUsage {
  concept: string;
  count: number;
  coverage: number;
  trend: "up" | "down" | "stable";
}

interface VendorCoverage {
  vendor: string;
  supported: number;
  total: number;
  gaps: string[];
}

const mockConcepts: ConceptUsage[] = [
  { concept: "Agent", count: 8, coverage: 100, trend: "up" },
  { concept: "Rule", count: 24, coverage: 100, trend: "stable" },
  { concept: "MCP Server", count: 6, coverage: 83, trend: "up" },
  { concept: "Skill", count: 12, coverage: 75, trend: "up" },
  { concept: "Workflow", count: 3, coverage: 50, trend: "stable" },
  { concept: "Hook", count: 5, coverage: 58, trend: "down" },
  { concept: "Tool", count: 15, coverage: 67, trend: "up" },
  { concept: "Model", count: 4, coverage: 92, trend: "stable" },
  { concept: "Context", count: 9, coverage: 75, trend: "up" },
  { concept: "Template", count: 2, coverage: 42, trend: "down" },
];

const mockVendorCoverage: VendorCoverage[] = [
  { vendor: "Claude Code", supported: 42, total: 46, gaps: ["Hook.onError", "Tool.browser", "Workflow.parallel", "Context.remote"] },
  { vendor: "Cursor", supported: 38, total: 46, gaps: ["Hook.onError", "Hook.onSuccess", "Workflow.*", "Skill.multifile", "Context.remote", "MCP.stdio-only", "Tool.browser", "Model.custom"] },
  { vendor: "Codex", supported: 35, total: 46, gaps: ["Hook.*", "Workflow.*", "MCP.http", "Skill.multifile", "Context.remote", "Template.*", "Tool.browser", "Model.custom", "Agent.team", "Rule.conditional", "Skill.async"] },
  { vendor: "Windsurf", supported: 40, total: 46, gaps: ["Hook.onError", "Workflow.parallel", "Context.remote", "Template.remote", "Tool.browser", "MCP.http"] },
  { vendor: "Gemini CLI", supported: 36, total: 46, gaps: ["Hook.*", "Workflow.*", "Skill.multifile", "Context.remote", "Template.*", "Tool.browser", "MCP.stdio-only", "Rule.conditional", "Agent.team", "Model.custom"] },
  { vendor: "Copilot", supported: 34, total: 46, gaps: ["Hook.*", "Workflow.*", "MCP.*", "Skill.multifile", "Context.remote", "Template.*", "Tool.browser", "Model.custom", "Agent.team", "Rule.conditional", "Skill.async", "Context.priority"] },
];

const mockStats = {
  totalConcepts: 88,
  avgCoverage: 74,
  ruleHitRate: 67,
  unusedRules: 4,
};

export default function ConfigAnalytics() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"overview" | "vendors">("overview");

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChart size={14} className="text-orange-500" />
          <span className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">
            {t("analytics.title", "配置分析")}
          </span>
        </div>
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-md p-0.5">
          <button
            onClick={() => setTab("overview")}
            className={`px-3 py-1 text-[11px] font-medium rounded ${tab === "overview" ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 shadow-sm" : "text-zinc-500"}`}
          >
            概览
          </button>
          <button
            onClick={() => setTab("vendors")}
            className={`px-3 py-1 text-[11px] font-medium rounded ${tab === "vendors" ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 shadow-sm" : "text-zinc-500"}`}
          >
            厂商覆盖
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4">
        {tab === "overview" && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Layers size={11} className="text-indigo-500" />
                  <span className="text-[10px] text-zinc-400">概念总数</span>
                </div>
                <p className="text-[18px] font-bold text-zinc-800 dark:text-zinc-100">{mockStats.totalConcepts}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Target size={11} className="text-emerald-500" />
                  <span className="text-[10px] text-zinc-400">平均覆盖</span>
                </div>
                <p className="text-[18px] font-bold text-zinc-800 dark:text-zinc-100">{mockStats.avgCoverage}%</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <BarChart3 size={11} className="text-blue-500" />
                  <span className="text-[10px] text-zinc-400">规则命中率</span>
                </div>
                <p className="text-[18px] font-bold text-zinc-800 dark:text-zinc-100">{mockStats.ruleHitRate}%</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={11} className="text-amber-500" />
                  <span className="text-[10px] text-zinc-400">未使用规则</span>
                </div>
                <p className="text-[18px] font-bold text-zinc-800 dark:text-zinc-100">{mockStats.unusedRules}</p>
              </div>
            </div>

            {/* Concept usage table */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                  <FileCode2 size={12} /> 概念使用分布
                </h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className="text-left text-[10px] font-medium text-zinc-400 px-4 py-2">概念</th>
                    <th className="text-left text-[10px] font-medium text-zinc-400 px-4 py-2">数量</th>
                    <th className="text-left text-[10px] font-medium text-zinc-400 px-4 py-2">厂商覆盖率</th>
                    <th className="text-left text-[10px] font-medium text-zinc-400 px-4 py-2">趋势</th>
                  </tr>
                </thead>
                <tbody>
                  {mockConcepts.map((c) => (
                    <tr key={c.concept} className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-2 text-[12px] font-medium text-zinc-700 dark:text-zinc-200">{c.concept}</td>
                      <td className="px-4 py-2 text-[12px] text-zinc-500">{c.count}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${c.coverage >= 80 ? "bg-emerald-500" : c.coverage >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                              style={{ width: `${c.coverage}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-zinc-400">{c.coverage}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <TrendingUp
                          size={12}
                          className={`${c.trend === "up" ? "text-emerald-500" : c.trend === "down" ? "text-red-500 rotate-180" : "text-zinc-400 rotate-90"}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "vendors" && (
          <div className="space-y-3">
            {mockVendorCoverage.map((v) => (
              <div key={v.vendor} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-200">{v.vendor}</span>
                  <span className={`text-[11px] font-medium ${v.supported / v.total >= 0.8 ? "text-emerald-600" : v.supported / v.total >= 0.7 ? "text-amber-600" : "text-red-600"}`}>
                    {v.supported}/{v.total} ({Math.round((v.supported / v.total) * 100)}%)
                  </span>
                </div>
                <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full ${v.supported / v.total >= 0.8 ? "bg-emerald-500" : v.supported / v.total >= 0.7 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${(v.supported / v.total) * 100}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {v.gaps.map((gap) => (
                    <span key={gap} className="text-[9px] px-1.5 py-0.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded">
                      {gap}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
