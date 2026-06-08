import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useConfigStore } from "../store/config";
import { RefreshCw, ListTree } from "lucide-react";
import { getTraceLogs, getAlerts, type TraceLogEntry, type AlertInfo } from "../lib/tauri";

export default function Trace() {
  const { t } = useTranslation();
  const { traceSpans, loadTraces } = useConfigStore();
  const [activeTab, setActiveTab] = useState<"traces" | "logs" | "alerts">("traces");
  const [selectedSpan, setSelectedSpan] = useState<string | null>(null);
  const [logs, setLogs] = useState<TraceLogEntry[]>([]);
  const [alerts, setAlerts] = useState<AlertInfo[]>([]);

  const loadAll = useCallback(async () => {
    loadTraces();
    try { setLogs(await getTraceLogs()); } catch (e) { console.error("getTraceLogs", e); }
    try { setAlerts(await getAlerts()); } catch (e) { console.error("getAlerts", e); }
  }, [loadTraces]);

  useEffect(() => { loadAll(); }, [loadAll]);

  return (
    <div className="h-full flex flex-col">
      {/* Tabs + Actions */}
      <div className="px-5 py-0 border-b border-zinc-100 dark:border-zinc-800 flex items-center shrink-0">
        {(["traces", "logs", "alerts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? "border-indigo-600 text-indigo-700 dark:text-indigo-300"
                : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            {t(`trace.${tab}`, tab)}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => loadAll()}
          className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Content */}
      {activeTab === "traces" && (
        <div className="flex-1 flex overflow-hidden">
          {/* Span list */}
          <div className="w-[280px] border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
            <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-zinc-50 dark:bg-[#18181b]">
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider">
                Spans ({traceSpans.length})
              </span>
            </div>
            {traceSpans.length === 0 ? (
              <div className="py-8 text-center">
                <ListTree size={24} className="text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-[12px] text-zinc-400">No trace data</p>
              </div>
            ) : (
              traceSpans.map((span) => (
                <button
                  key={span.id}
                  onClick={() => setSelectedSpan(span.id)}
                  className={`w-full text-left px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 transition-colors ${
                    selectedSpan === span.id
                      ? "bg-indigo-50 dark:bg-indigo-500/10"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-mono text-zinc-700 dark:text-zinc-200 truncate">{span.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      span.status === "ok"
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                    }`}>
                      {span.status}
                    </span>
                  </div>
                  <div className="flex gap-3 text-[11px] text-zinc-400 mt-0.5">
                    <span>{span.vendor}</span>
                    <span>{span.duration_ms}ms</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Detail panel */}
          <div className="flex-1 overflow-auto">
            {selectedSpan ? (
              (() => {
                const span = traceSpans.find((s) => s.id === selectedSpan);
                if (!span) return null;
                return (
                  <div className="p-4 space-y-3">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                        <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-200">Span Detail</span>
                      </div>
                      <div className="px-4 py-3 space-y-2">
                        <DetailRow label="ID" value={span.id} mono />
                        <DetailRow label="Name" value={span.name} />
                        <DetailRow label="Vendor" value={span.vendor} />
                        <DetailRow label="Duration" value={`${span.duration_ms}ms`} />
                        <DetailRow label="Status" value={span.status} color={span.status === "ok" ? "text-emerald-500" : "text-red-500"} />
                        <DetailRow label="Timestamp" value={span.timestamp} mono />
                      </div>
                    </div>
                    {/* Waterfall */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                      <span className="text-[11px] text-zinc-400 uppercase tracking-wider">Waterfall</span>
                      <div className="mt-2 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${span.status === "ok" ? "bg-indigo-500" : "bg-red-400"}`}
                          style={{ width: `${Math.min(span.duration_ms / 5, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-[12px] text-zinc-400">Select a span to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="flex-1 overflow-auto font-mono text-[11px] px-5 py-3 space-y-0.5">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-[12px] text-zinc-400">暂无日志记录。执行操作（生成、验证等）后日志会自动记录。</div>
          ) : (
            logs.map((log, i) => (
              <LogLine key={i} level={log.level as "info" | "debug" | "warn" | "error"} text={`${log.timestamp} ${log.message}`} />
            ))
          )}
        </div>
      )}

      {activeTab === "alerts" && (
        <div className="flex-1 overflow-auto px-5 py-4 space-y-2">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-[12px] text-zinc-400">暂无告警</div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className={`bg-white dark:bg-zinc-900 border rounded-lg p-3 ${
                alert.level === "error" ? "border-red-200 dark:border-red-500/20" :
                alert.level === "warning" ? "border-amber-200 dark:border-amber-500/20" :
                "border-emerald-200 dark:border-emerald-500/20"
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    alert.level === "error" ? "bg-red-400" :
                    alert.level === "warning" ? "bg-amber-400" : "bg-emerald-400"
                  }`} />
                  <span className="text-[12px] font-medium text-zinc-800 dark:text-zinc-100">{alert.title}</span>
                  <span className="text-[10px] text-zinc-400 ml-auto">{alert.timestamp}</span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1 pl-4">{alert.description}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div className="flex items-center">
      <span className="w-[80px] text-[12px] text-zinc-400 shrink-0">{label}</span>
      <span className={`text-[12px] ${mono ? "font-mono text-[11px]" : ""} ${color || "text-zinc-700 dark:text-zinc-200"}`}>{value}</span>
    </div>
  );
}

function LogLine({ level, text }: { level: "info" | "debug" | "warn" | "error"; text: string }) {
  const colors = { info: "text-emerald-500", debug: "text-blue-400", warn: "text-amber-500", error: "text-red-400" };
  return (
    <div className="flex gap-2">
      <span className={colors[level]}>[{level.toUpperCase().padEnd(5)}]</span>
      <span className="text-zinc-600 dark:text-zinc-300">{text}</span>
    </div>
  );
}
