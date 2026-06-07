import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  FlaskConical,
  Play,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  ArrowUpDown,
} from "lucide-react";

interface Experiment {
  id: string;
  name: string;
  status: "running" | "completed" | "draft";
  configA: string;
  configB: string;
  vendor: string;
  metrics: {
    responseTime: [number, number];
    accuracy: [number, number];
    tokenUsage: [number, number];
    successRate: [number, number];
  };
  runs: number;
  winner: "A" | "B" | null;
  createdAt: string;
}

const mockExperiments: Experiment[] = [
  {
    id: "1",
    name: "Code review agent — verbose vs concise",
    status: "completed",
    configA: "agents/code-review-verbose.yaml",
    configB: "agents/code-review-concise.yaml",
    vendor: "Claude Code",
    metrics: {
      responseTime: [3200, 1800],
      accuracy: [92, 88],
      tokenUsage: [4500, 2100],
      successRate: [96, 94],
    },
    runs: 50,
    winner: "B",
    createdAt: "2 天前",
  },
  {
    id: "2",
    name: "Security audit — GPT-4o vs Claude 3.5",
    status: "running",
    configA: "agents/security-gpt4o.yaml",
    configB: "agents/security-claude35.yaml",
    vendor: "Cursor",
    metrics: {
      responseTime: [5400, 4200],
      accuracy: [85, 91],
      tokenUsage: [8200, 6800],
      successRate: [88, 93],
    },
    runs: 23,
    winner: null,
    createdAt: "5 小时前",
  },
  {
    id: "3",
    name: "Docs generator — template style comparison",
    status: "draft",
    configA: "agents/docs-formal.yaml",
    configB: "agents/docs-casual.yaml",
    vendor: "Codex",
    metrics: {
      responseTime: [0, 0],
      accuracy: [0, 0],
      tokenUsage: [0, 0],
      successRate: [0, 0],
    },
    runs: 0,
    winner: null,
    createdAt: "刚刚",
  },
];

export default function PerformanceAB() {
  const { t } = useTranslation();
  const [experiments] = useState<Experiment[]>(mockExperiments);
  const [selected, setSelected] = useState<string | null>("1");

  const selectedExp = experiments.find((e) => e.id === selected);

  const statusColors: Record<string, string> = {
    running: "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400",
    completed: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400",
    draft: "text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400",
  };

  const metricBar = (valA: number, valB: number, lowerBetter: boolean) => {
    if (valA === 0 && valB === 0) return null;
    const max = Math.max(valA, valB);
    const pctA = (valA / max) * 100;
    const pctB = (valB / max) * 100;
    const aWins = lowerBetter ? valA < valB : valA > valB;
    return (
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1">
          <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${aWins ? "bg-indigo-500" : "bg-zinc-300 dark:bg-zinc-600"}`} style={{ width: `${pctA}%` }} />
          </div>
        </div>
        <span className={`text-[10px] font-mono w-[50px] text-right ${aWins ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-zinc-400"}`}>
          {valA.toLocaleString()}
        </span>
        <span className="text-[10px] text-zinc-300">vs</span>
        <span className={`text-[10px] font-mono w-[50px] ${!aWins ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-zinc-400"}`}>
          {valB.toLocaleString()}
        </span>
        <div className="flex-1">
          <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${!aWins ? "bg-indigo-500" : "bg-zinc-300 dark:bg-zinc-600"}`} style={{ width: `${pctB}%` }} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex">
      {/* Left panel: experiment list */}
      <div className="w-[280px] border-r border-zinc-100 dark:border-zinc-800 flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
          <FlaskConical size={14} className="text-indigo-500" />
          <span className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">
            {t("perf.title", "A/B 实验")}
          </span>
          <div className="flex-1" />
          <button className="p-1 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded">
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {experiments.map((exp) => (
            <button
              key={exp.id}
              onClick={() => setSelected(exp.id)}
              className={`w-full text-left px-4 py-3 border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                selected === exp.id ? "bg-indigo-50/50 dark:bg-indigo-500/5 border-l-2 border-l-indigo-500" : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${statusColors[exp.status]}`}>
                  {exp.status === "running" ? "运行中" : exp.status === "completed" ? "已完成" : "草稿"}
                </span>
                <span className="text-[10px] text-zinc-400">{exp.vendor}</span>
              </div>
              <p className="text-[12px] text-zinc-700 dark:text-zinc-200 font-medium line-clamp-2">{exp.name}</p>
              <p className="text-[10px] text-zinc-400 mt-1">{exp.runs} 次运行 · {exp.createdAt}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel: experiment detail */}
      <div className="flex-1 flex flex-col">
        {selectedExp ? (
          <>
            <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">{selectedExp.name}</h2>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {selectedExp.vendor} · {selectedExp.runs} 次运行
                    {selectedExp.winner && ` · 胜者: Config ${selectedExp.winner}`}
                  </p>
                </div>
                {selectedExp.status === "draft" && (
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                    <Play size={12} /> 开始实验
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
              {/* Config comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-lg border ${selectedExp.winner === "A" ? "border-indigo-300 dark:border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-500/5" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">A</span>
                    {selectedExp.winner === "A" && <CheckCircle2 size={11} className="text-indigo-500" />}
                  </div>
                  <p className="text-[11px] font-mono text-zinc-600 dark:text-zinc-300 truncate">{selectedExp.configA}</p>
                </div>
                <div className={`p-3 rounded-lg border ${selectedExp.winner === "B" ? "border-indigo-300 dark:border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-500/5" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">B</span>
                    {selectedExp.winner === "B" && <CheckCircle2 size={11} className="text-indigo-500" />}
                  </div>
                  <p className="text-[11px] font-mono text-zinc-600 dark:text-zinc-300 truncate">{selectedExp.configB}</p>
                </div>
              </div>

              {/* Metrics */}
              {selectedExp.status !== "draft" && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
                  <h3 className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                    <BarChart3 size={13} /> 指标对比
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1"><Clock size={10} /> 响应时间 (ms)</span>
                        <span className="text-[9px] text-zinc-400">越低越好</span>
                      </div>
                      {metricBar(selectedExp.metrics.responseTime[0], selectedExp.metrics.responseTime[1], true)}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1"><CheckCircle2 size={10} /> 准确率 (%)</span>
                        <span className="text-[9px] text-zinc-400">越高越好</span>
                      </div>
                      {metricBar(selectedExp.metrics.accuracy[0], selectedExp.metrics.accuracy[1], false)}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1"><ArrowUpDown size={10} /> Token 用量</span>
                        <span className="text-[9px] text-zinc-400">越低越好</span>
                      </div>
                      {metricBar(selectedExp.metrics.tokenUsage[0], selectedExp.metrics.tokenUsage[1], true)}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1"><TrendingUp size={10} /> 成功率 (%)</span>
                        <span className="text-[9px] text-zinc-400">越高越好</span>
                      </div>
                      {metricBar(selectedExp.metrics.successRate[0], selectedExp.metrics.successRate[1], false)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[12px] text-zinc-400">
            选择或创建一个 A/B 实验
          </div>
        )}
      </div>
    </div>
  );
}
