import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import {
  FlaskConical,
  Play,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowUpDown,
} from "lucide-react";
import {
  listExperiments,
  createExperiment,
  updateExperimentStatus,
  deleteExperiment,
  runExperiment,
  type Experiment,
} from "../lib/tauri";

export default function PerformanceAB() {
  const { t } = useTranslation();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newA, setNewA] = useState("");
  const [newB, setNewB] = useState("");
  const [newVendor, setNewVendor] = useState("claude-code");

  const load = useCallback(async () => {
    try {
      const data = await listExperiments();
      setExperiments(data);
      if (data.length > 0 && !selected) setSelected(data[0].id);
    } catch (e) { console.error("listExperiments", e); }
  }, [selected]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const id = await createExperiment(newName, newA, newB, newVendor);
      setShowNew(false);
      setNewName(""); setNewA(""); setNewB("");
      await load();
      setSelected(id);
    } catch (e) { console.error("createExperiment", e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExperiment(id);
      if (selected === id) setSelected(null);
      await load();
    } catch (e) { console.error("deleteExperiment", e); }
  };

  const handleStart = async (id: string) => {
    try {
      await updateExperimentStatus(id, "running");
      await load();
      await runExperiment(id);
      await load();
    } catch (e) { console.error("runExperiment", e); }
  };

  const selectedExp = experiments.find((e) => e.id === selected);

  const statusColors: Record<string, string> = {
    running: "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400",
    completed: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400",
    pending: "text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400",
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
          <button onClick={() => setShowNew(true)} className="p-1 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded">
            <Plus size={14} />
          </button>
        </div>

        {showNew && (
          <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 space-y-2 bg-zinc-50/50 dark:bg-zinc-900/50">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="实验名称" className="w-full px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
            <input value={newA} onChange={(e) => setNewA(e.target.value)} placeholder="Config A" className="w-full px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
            <input value={newB} onChange={(e) => setNewB(e.target.value)} placeholder="Config B" className="w-full px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
            <input value={newVendor} onChange={(e) => setNewVendor(e.target.value)} placeholder="Vendor" className="w-full px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
            <div className="flex gap-2">
              <button onClick={handleCreate} className="flex-1 px-2 py-1 text-[11px] font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700">创建</button>
              <button onClick={() => setShowNew(false)} className="px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">取消</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {experiments.length === 0 && !showNew && (
            <div className="p-4 text-center text-[12px] text-zinc-400">暂无实验，点击 + 创建</div>
          )}
          {experiments.map((exp) => (
            <button
              key={exp.id}
              onClick={() => setSelected(exp.id)}
              className={`w-full text-left px-4 py-3 border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                selected === exp.id ? "bg-indigo-50/50 dark:bg-indigo-500/5 border-l-2 border-l-indigo-500" : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${statusColors[exp.status] || statusColors.pending}`}>
                  {exp.status === "running" ? "运行中" : exp.status === "completed" ? "已完成" : "待启动"}
                </span>
                <span className="text-[10px] text-zinc-400">{exp.vendor}</span>
              </div>
              <p className="text-[12px] text-zinc-700 dark:text-zinc-200 font-medium line-clamp-2">{exp.name}</p>
              <p className="text-[10px] text-zinc-400 mt-1">{exp.runs} 次运行 · {exp.created_at}</p>
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
                <div className="flex items-center gap-2">
                  {selectedExp.status === "pending" && (
                    <button onClick={() => handleStart(selectedExp.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                      <Play size={12} /> 开始实验
                    </button>
                  )}
                  <button onClick={() => handleDelete(selectedExp.id)} className="p-1.5 text-zinc-400 hover:text-red-500 rounded">
                    <Trash2 size={13} />
                  </button>
                </div>
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
                  <p className="text-[11px] font-mono text-zinc-600 dark:text-zinc-300 truncate">{selectedExp.config_a}</p>
                </div>
                <div className={`p-3 rounded-lg border ${selectedExp.winner === "B" ? "border-indigo-300 dark:border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-500/5" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">B</span>
                    {selectedExp.winner === "B" && <CheckCircle2 size={11} className="text-indigo-500" />}
                  </div>
                  <p className="text-[11px] font-mono text-zinc-600 dark:text-zinc-300 truncate">{selectedExp.config_b}</p>
                </div>
              </div>

              {/* Metrics */}
              {selectedExp.status !== "pending" && (
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
                      {metricBar(selectedExp.metrics.response_time[0], selectedExp.metrics.response_time[1], true)}
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
                      {metricBar(selectedExp.metrics.token_usage[0], selectedExp.metrics.token_usage[1], true)}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1"><TrendingUp size={10} /> 成功率 (%)</span>
                        <span className="text-[9px] text-zinc-400">越高越好</span>
                      </div>
                      {metricBar(selectedExp.metrics.success_rate[0], selectedExp.metrics.success_rate[1], false)}
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
