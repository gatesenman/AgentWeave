import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { Scissors, BarChart3, AlertCircle, CheckCircle2 } from "lucide-react";
import { getContextOptimization, type ContextOptResult } from "../lib/tauri";
import { useConfigStore } from "../store/config";

export default function ContextOptimizer() {
  const { t } = useTranslation();
  const projectDir = useConfigStore((s) => s.projectDir) || "";
  const [results, setResults] = useState<ContextOptResult[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!projectDir) return;
    setLoading(true);
    try { setResults(await getContextOptimization(projectDir)); } catch (e) { console.error("getContextOptimization", e); }
    setLoading(false);
  }, [projectDir]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center">
          <Scissors size={16} className="text-pink-600 dark:text-pink-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">{t("context.title", "上下文优化")}</h2>
          <p className="text-[11px] text-zinc-400">按厂商 Token 限制分析与优化</p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-white bg-pink-600 rounded-md hover:bg-pink-700 disabled:opacity-50">
          <BarChart3 size={12} /> {loading ? "分析中..." : "重新分析"}
        </button>
      </div>

      {!projectDir && (
        <div className="flex-1 flex items-center justify-center text-[12px] text-zinc-400">请先打开一个项目</div>
      )}

      <div className="flex-1 overflow-auto px-5 py-4 space-y-3">
        {loading && <div className="text-center py-8 text-[12px] text-zinc-400">分析中...</div>}
        {!loading && results.length === 0 && projectDir && (
          <div className="text-center py-8 text-[12px] text-zinc-400">打开项目后自动分析各厂商上下文占用</div>
        )}
        {results.map((r) => (
          <div key={r.vendor} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              {r.is_over_limit ? <AlertCircle size={13} className="text-red-500" /> : <CheckCircle2 size={13} className="text-emerald-500" />}
              <span className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">{r.vendor}</span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${r.is_over_limit ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"}`}>
                {r.is_over_limit ? "超出限制" : "正常"}
              </span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[11px] text-zinc-500">已用 Token:</span>
              <span className="text-[12px] font-mono text-zinc-700 dark:text-zinc-200">{r.current_tokens.toLocaleString()}</span>
              <span className="text-[11px] text-zinc-400">/</span>
              <span className="text-[11px] text-zinc-500">{r.max_tokens.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full ${r.is_over_limit ? "bg-red-500" : r.usage_percent > 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${Math.min(r.usage_percent, 100)}%` }}
              />
            </div>
            {r.suggestions.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-zinc-500 uppercase">优化建议</p>
                {r.suggestions.map((s, i) => (
                  <p key={i} className="text-[11px] text-zinc-600 dark:text-zinc-400 pl-2 border-l-2 border-pink-300 dark:border-pink-500/50">{s}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
