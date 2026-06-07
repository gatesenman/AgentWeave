import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { Eye, Play, CheckCircle2, AlertTriangle, FileCode2 } from "lucide-react";
import { getDryRunPreview, type DryRunResult } from "../lib/tauri";
import { useConfigStore } from "../store/config";

export default function DryRun() {
  const { t } = useTranslation();
  const projectDir = useConfigStore((s) => s.projectDir) || "";
  const [results, setResults] = useState<DryRunResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectDir) return;
    setLoading(true);
    try {
      const data = await getDryRunPreview(projectDir);
      setResults(data);
      if (data.length > 0) setSelected(data[0].vendor);
    } catch (e) { console.error("getDryRunPreview", e); }
    setLoading(false);
  }, [projectDir]);
  useEffect(() => { load(); }, [load]);

  const current = results.find((r) => r.vendor === selected);

  return (
    <div className="h-full flex">
      <div className="w-[240px] border-r border-zinc-100 dark:border-zinc-800 flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
          <Eye size={14} className="text-amber-500" />
          <span className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">{t("dryrun.title", "生成预览")}</span>
          <div className="flex-1" />
          <button onClick={load} disabled={loading} className="p-1 text-zinc-400 hover:text-amber-500 rounded">
            <Play size={12} />
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {!projectDir && <p className="p-4 text-[12px] text-zinc-400 text-center">请先打开一个项目</p>}
          {loading && <p className="p-4 text-[12px] text-zinc-400 text-center">生成中...</p>}
          {results.length === 0 && !loading && projectDir && <p className="p-4 text-[12px] text-zinc-400 text-center">点击运行预览</p>}
          {results.map((r) => (
            <button
              key={r.vendor}
              onClick={() => setSelected(r.vendor)}
              className={`w-full text-left px-4 py-3 border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                selected === r.vendor ? "bg-amber-50/50 dark:bg-amber-500/5 border-l-2 border-l-amber-500" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                {r.missing_concepts === 0 ? <CheckCircle2 size={11} className="text-emerald-500" /> : <AlertTriangle size={11} className="text-amber-500" />}
                <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200">{r.vendor}</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">{r.output_lines} 行 · {r.missing_concepts > 0 ? `${r.missing_concepts} 丢失` : "完整"}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        {current ? (
          <>
            <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">{current.vendor} 预览</h2>
              <p className="text-[11px] text-zinc-400">{current.output_lines} 行 · 输出文件: {current.output_path}</p>
            </div>
            <div className="flex-1 overflow-auto px-5 py-4">
              <pre className="text-[11px] font-mono text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 whitespace-pre-wrap">{current.preview_content}</pre>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[12px] text-zinc-400">选择厂商查看预览</div>
        )}
      </div>
    </div>
  );
}
