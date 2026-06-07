import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { PieChart, BarChart3, TrendingUp, AlertCircle } from "lucide-react";
import { getConfigAnalyticsEx, type ConfigAnalyticsData } from "../lib/tauri";
import { useConfigStore } from "../store/config";

export default function ConfigAnalytics() {
  const { t } = useTranslation();
  const projectDir = useConfigStore((s) => s.projectDir) || "";
  const [data, setData] = useState<ConfigAnalyticsData | null>(null);

  const load = useCallback(async () => {
    if (!projectDir) return;
    try { setData(await getConfigAnalyticsEx(projectDir)); } catch (e) { console.error("getConfigAnalyticsEx", e); }
  }, [projectDir]);
  useEffect(() => { load(); }, [load]);

  if (!projectDir) {
    return <div className="h-full flex items-center justify-center text-[12px] text-zinc-400">请先打开一个项目</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center">
          <PieChart size={16} className="text-cyan-600 dark:text-cyan-400" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">{t("analytics.title", "配置分析")}</h2>
          <p className="text-[11px] text-zinc-400">概念使用分布、厂商覆盖率与缺口分析</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
        {!data && <div className="text-center py-8 text-[12px] text-zinc-400">加载中...</div>}
        {data && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                <p className="text-[10px] text-zinc-400 uppercase font-medium mb-1">总概念数</p>
                <p className="text-[18px] font-bold text-zinc-800 dark:text-zinc-100">{data.total_concepts}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                <p className="text-[10px] text-zinc-400 uppercase font-medium mb-1">覆盖厂商</p>
                <p className="text-[18px] font-bold text-zinc-800 dark:text-zinc-100">{data.vendor_count}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                <p className="text-[10px] text-zinc-400 uppercase font-medium mb-1">平均覆盖率</p>
                <p className="text-[18px] font-bold text-emerald-600">{data.avg_coverage}%</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                <p className="text-[10px] text-zinc-400 uppercase font-medium mb-1">缺口数</p>
                <p className="text-[18px] font-bold text-red-500">{data.gaps.length}</p>
              </div>
            </div>

            {/* Concept distribution */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
              <h3 className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-2 mb-3">
                <BarChart3 size={13} /> 概念分布
              </h3>
              <div className="space-y-2">
                {data.concept_distribution.map((item) => (
                  <div key={item.type} className="flex items-center gap-3">
                    <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200 w-[100px]">{item.type}</span>
                    <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${data.total_concepts > 0 ? (item.count / data.total_concepts) * 100 : 0}%` }} />
                    </div>
                    <span className="text-[11px] text-zinc-500 w-[30px] text-right">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Vendor coverage */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
              <h3 className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-2 mb-3">
                <TrendingUp size={13} /> 厂商覆盖率
              </h3>
              <div className="space-y-2">
                {data.vendor_coverage.map((v) => (
                  <div key={v.vendor} className="flex items-center gap-3">
                    <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200 w-[100px]">{v.vendor}</span>
                    <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${v.coverage >= 80 ? "bg-emerald-500" : v.coverage >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${v.coverage}%` }} />
                    </div>
                    <span className="text-[11px] text-zinc-500 w-[40px] text-right">{v.coverage}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gaps */}
            {data.gaps.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                <h3 className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-2 mb-3">
                  <AlertCircle size={13} className="text-red-500" /> 覆盖缺口
                </h3>
                <div className="space-y-1">
                  {data.gaps.map((g, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] px-2 py-1 rounded bg-red-50/50 dark:bg-red-500/5">
                      <span className="text-red-600 dark:text-red-400 font-medium">{g.vendor}</span>
                      <span className="text-zinc-500">缺失</span>
                      <span className="text-zinc-700 dark:text-zinc-200">{g.missing_concept}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
