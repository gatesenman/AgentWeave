import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useConfigStore } from "../store/config";
import {
  Play, Check, AlertTriangle, FileOutput, Layers, Eye
} from "lucide-react";
import { getVendorSupportMatrix, type VendorConceptSupport } from "../lib/tauri";

export default function Generate() {
  const { t } = useTranslation();
  const { projectDir, vendors, generateResults, isLoading, loadVendors, runGenerate } = useConfigStore();
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [supportMatrix, setSupportMatrix] = useState<VendorConceptSupport[]>([]);

  const loadMatrix = useCallback(async () => {
    try {
      const data = await getVendorSupportMatrix();
      setSupportMatrix(data);
    } catch (e) { console.error("getVendorSupportMatrix", e); }
  }, []);

  useEffect(() => { loadVendors(); loadMatrix(); }, [loadVendors, loadMatrix]);

  if (!projectDir) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
            <FileOutput size={22} className="text-zinc-400" />
          </div>
          <p className="text-[13px] text-zinc-500">{t("common.selectProject")}</p>
        </div>
      </div>
    );
  }

  const toggleVendor = (name: string) => {
    const next = new Set(selectedVendors);
    if (next.has(name)) next.delete(name); else next.add(name);
    setSelectedVendors(next);
  };

  const selectAll = () => {
    if (selectedVendors.size === vendors.length) {
      setSelectedVendors(new Set());
    } else {
      setSelectedVendors(new Set(vendors.map(v => v.name)));
    }
  };

  const handleGenerate = () => {
    if (selectedVendors.size === 0) {
      runGenerate();
    } else {
      selectedVendors.forEach(v => runGenerate(v));
    }
  };

  // Build concept keys from real adapter data
  const conceptKeysSet = new Set<string>();
  for (const v of supportMatrix) {
    for (const c of v.supported) {
      conceptKeysSet.add(c);
    }
  }
  const conceptKeys = ["agents", "rules", "mcp", "skills", "workflows", "hooks", "sub_agents"].filter(
    (k) => conceptKeysSet.has(k)
  );
  // Add any extra concepts from real data not in the default list
  for (const c of conceptKeysSet) {
    if (!conceptKeys.includes(c)) conceptKeys.push(c);
  }

  // Build lookup from real matrix
  const conceptSupport: Record<string, Record<string, boolean>> = {};
  for (const v of supportMatrix) {
    const map: Record<string, boolean> = {};
    for (const k of conceptKeys) {
      map[k] = v.supported.includes(k);
    }
    conceptSupport[v.vendor] = map;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3 shrink-0">
        <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
          {t("generate.title", "厂商生成")}
        </h2>
        <div className="flex-1" />
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <Eye size={12} />
          {t("generate.preview", "预览")}
        </button>
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <Play size={12} />
          {isLoading ? t("generate.generating", "生成中...") : t("generate.generateAll", "生成配置")}
        </button>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
        {/* Vendor selection */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">
              {t("generate.targetVendors", "目标厂商")}
            </h3>
            <button onClick={selectAll} className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline">
              {selectedVendors.size === vendors.length ? t("generate.deselectAll", "取消全选") : t("generate.selectAll", "全选")}
            </button>
          </div>
          <div className="p-3 grid grid-cols-4 gap-2">
            {vendors.map((vendor) => {
              const isSelected = selectedVendors.has(vendor.name);
              const support = conceptSupport[vendor.name];
              const coverage = support ? Math.round((Object.values(support).filter(Boolean).length / conceptKeys.length) * 100) : 0;
              return (
                <button
                  key={vendor.name}
                  onClick={() => toggleVendor(vendor.name)}
                  className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-500/10"
                      : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-indigo-600 border-indigo-600" : "border-zinc-300 dark:border-zinc-600"
                    }`}>
                      {isSelected && <Check size={10} className="text-white" />}
                    </div>
                    <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200 truncate">{vendor.display_name}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 w-full">
                    <div className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${coverage}%` }} />
                    </div>
                    <span className="text-[10px] text-zinc-400 shrink-0">{coverage}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Compatibility matrix */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">
              {t("generate.compatMatrix", "概念兼容性矩阵")}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="text-left px-3 py-2 text-zinc-500 font-medium">{t("generate.vendor", "厂商")}</th>
                  {conceptKeys.map(k => (
                    <th key={k} className="text-center px-2 py-2 text-zinc-500 font-medium">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendors.slice(0, 8).map((vendor) => {
                  const support = conceptSupport[vendor.name] ?? {};
                  return (
                    <tr key={vendor.name} className="border-b border-zinc-50 dark:border-zinc-800/50">
                      <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300 font-medium">{vendor.display_name}</td>
                      {conceptKeys.map(k => (
                        <td key={k} className="text-center px-2 py-1.5">
                          {support[k] ? (
                            <Check size={12} className="inline text-emerald-500" />
                          ) : (
                            <span className="inline-block w-3 h-[2px] bg-zinc-300 dark:bg-zinc-600 rounded" />
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Generate results */}
        {generateResults.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">
                {t("generate.results", "生成结果")}
              </h3>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {generateResults.map((result) => (
                <div key={result.vendor} className="px-4 py-2.5 flex items-center gap-3">
                  {result.success ? (
                    <Check size={14} className="text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle size={14} className="text-red-500 shrink-0" />
                  )}
                  <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200">{result.vendor}</span>
                  <span className="text-[11px] text-zinc-400">{result.files.length} files</span>
                  {result.error && <span className="text-[11px] text-red-500 ml-auto">{result.error}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
