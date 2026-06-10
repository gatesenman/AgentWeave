import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { GitMerge, ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, Search, RefreshCw } from "lucide-react";
import { listConflicts, resolveConflict, detectConflicts, type ConflictInfo } from "../lib/tauri";
import { useConfigStore } from "../store/config";

export default function ConflictResolver() {
  const { t } = useTranslation();
  const projectDir = useConfigStore((s) => s.projectDir) || "";
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listConflicts();
      setConflicts(data);
      if (data.length > 0 && !selected) setSelected(data[0].id);
    } catch (e) { console.error("listConflicts", e); }
  }, [selected]);
  useEffect(() => { load(); }, [load]);

  const handleDetect = async () => {
    if (!projectDir) return;
    setDetecting(true);
    try {
      await detectConflicts(projectDir);
      await load();
    } catch (e) { console.error("detectConflicts", e); }
    setDetecting(false);
  };

  const handleResolve = async (id: string, winner: string) => {
    try { await resolveConflict(id, winner); await load(); } catch (e) { console.error(e); }
  };

  const current = conflicts.find((c) => c.id === selected);
  const isResolved = (c: ConflictInfo) => c.status === "resolved";

  return (
    <div className="h-full flex">
      <div className="w-[260px] border-r border-zinc-100 dark:border-zinc-800 flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
          <GitMerge size={14} className="text-red-500" />
          <span className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">{t("conflict.title", "冲突解决")}</span>
          <div className="flex-1" />
          <button onClick={handleDetect} disabled={detecting || !projectDir}
            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded disabled:opacity-50"
            title="扫描配置冲突">
            {detecting ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {conflicts.length === 0 && (
            <div className="p-4 text-center text-[12px] text-zinc-400">暂无冲突</div>
          )}
          {conflicts.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`w-full text-left px-4 py-3 border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                selected === c.id ? "bg-red-50/50 dark:bg-red-500/5 border-l-2 border-l-red-500" : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {isResolved(c) ? <CheckCircle2 size={11} className="text-emerald-500" /> : <AlertTriangle size={11} className="text-red-500" />}
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{c.status}</span>
              </div>
              <p className="text-[12px] text-zinc-700 dark:text-zinc-200 font-medium truncate">{c.file_path}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{c.detected_at}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {current ? (
          <>
            <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">{current.file_path}</h2>
              <p className="text-[11px] text-zinc-400">{isResolved(current) ? "已解决" : "待解决"} · {current.detected_at}</p>
            </div>
            <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowLeft size={12} className="text-blue-500" />
                    <span className="text-[11px] font-semibold text-zinc-500">本地版本</span>
                  </div>
                  <pre className="text-[11px] text-zinc-600 dark:text-zinc-300 font-mono whitespace-pre-wrap">{current.local_content}</pre>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowRight size={12} className="text-orange-500" />
                    <span className="text-[11px] font-semibold text-zinc-500">远端版本</span>
                  </div>
                  <pre className="text-[11px] text-zinc-600 dark:text-zinc-300 font-mono whitespace-pre-wrap">{current.remote_content}</pre>
                </div>
              </div>
              {!isResolved(current) && (
                <div className="flex items-center gap-2">
                  <button onClick={() => handleResolve(current.id, "local")} className="flex-1 px-3 py-2 text-[12px] font-medium border border-blue-300 text-blue-600 rounded-md hover:bg-blue-50 dark:border-blue-500/50 dark:text-blue-400 dark:hover:bg-blue-500/10">
                    使用本地
                  </button>
                  <button onClick={() => handleResolve(current.id, "remote")} className="flex-1 px-3 py-2 text-[12px] font-medium border border-orange-300 text-orange-600 rounded-md hover:bg-orange-50 dark:border-orange-500/50 dark:text-orange-400 dark:hover:bg-orange-500/10">
                    使用远端
                  </button>
                  <button onClick={() => handleResolve(current.id, "merge")} className="flex-1 px-3 py-2 text-[12px] font-medium border border-emerald-300 text-emerald-600 rounded-md hover:bg-emerald-50 dark:border-emerald-500/50 dark:text-emerald-400 dark:hover:bg-emerald-500/10">
                    手动合并
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[12px] text-zinc-400">选择冲突项查看详情</div>
        )}
      </div>
    </div>
  );
}
