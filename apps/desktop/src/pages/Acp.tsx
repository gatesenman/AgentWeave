import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useConfigStore } from "../store/config";
import { Radio, Zap, BarChart3, Check } from "lucide-react";

export default function Acp() {
  const { t } = useTranslation();
  const { vendors, compareEntries, projectDir, loadVendors, loadCompare } = useConfigStore();
  const [activeTab, setActiveTab] = useState<"agents" | "routing" | "monitor">("agents");

  useEffect(() => {
    loadVendors();
    if (projectDir) loadCompare();
  }, [loadVendors, loadCompare, projectDir]);

  const routingStrategies = [
    { name: "BestMatch", description: "Route to vendor with highest concept coverage", active: true },
    { name: "RoundRobin", description: "Distribute requests evenly across vendors", active: false },
    { name: "LeastLatency", description: "Pick fastest responding vendor", active: false },
    { name: "RaceFirst", description: "Send to all, use first response", active: false },
    { name: "Fanout", description: "Broadcast to all vendors in parallel", active: false },
  ];

  if (!projectDir) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
            <Radio size={22} className="text-zinc-400" />
          </div>
          <p className="text-[13px] text-zinc-500">{t("common.selectProject", "Please select a project first")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="px-5 py-0 border-b border-zinc-100 dark:border-zinc-800 flex items-center shrink-0">
        {[
          { key: "agents" as const, icon: Zap, label: t("acp.agents", "Agents") },
          { key: "routing" as const, icon: Radio, label: t("acp.routing", "路由策略") },
          { key: "monitor" as const, icon: BarChart3, label: t("acp.monitor", "监控") },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-indigo-600 text-indigo-700 dark:text-indigo-300"
                : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <tab.icon size={13} className="inline mr-1.5 -mt-0.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-5 py-4">
        {activeTab === "agents" && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <tr className="text-left text-[11px] text-zinc-400 uppercase tracking-wider">
                  <th className="px-4 py-2 font-medium">Vendor</th>
                  <th className="px-4 py-2 font-medium">Agent 数量</th>
                  <th className="px-4 py-2 font-medium">概念覆盖</th>
                  <th className="px-4 py-2 font-medium text-center">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {vendors.map((vendor) => (
                  <tr key={vendor.name} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-2.5 text-[12px] font-medium text-zinc-700 dark:text-zinc-200">{vendor.display_name}</td>
                    <td className="px-4 py-2.5 text-[12px] text-zinc-500">
                      {compareEntries.find((e) => e.vendor === vendor.name)?.file_count ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {vendor.concepts.slice(0, 4).map((c) => (
                          <span key={c} className="px-1.5 py-0.5 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500">
                        <Check size={11} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "routing" && (
          <div className="space-y-2 max-w-[520px]">
            {routingStrategies.map((s) => (
              <div
                key={s.name}
                className={`bg-white dark:bg-zinc-900 border rounded-lg p-3 flex items-center justify-between cursor-pointer transition-colors ${
                  s.active
                    ? "border-indigo-300 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/5"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100">{s.name}</span>
                    {s.active && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{s.description}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  s.active ? "border-indigo-600 bg-indigo-600" : "border-zinc-300 dark:border-zinc-600"
                }`}>
                  {s.active && <Check size={10} className="text-white" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "monitor" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <MonitorCard label="总请求" value="1,247" />
              <MonitorCard label="平均延迟" value="120ms" />
              <MonitorCard label="成功率" value="99.2%" />
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
              <h3 className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide mb-3">
                近期调度
              </h3>
              <div className="space-y-2">
                {[
                  { time: "14:32:01", vendor: "codex", agent: "code-writer", latency: "89ms", status: "ok" },
                  { time: "14:31:58", vendor: "claude-code", agent: "reviewer", latency: "156ms", status: "ok" },
                  { time: "14:31:45", vendor: "cursor", agent: "code-writer", latency: "67ms", status: "ok" },
                ].map((log, i) => (
                  <div key={i} className="flex items-center gap-4 text-[11px]">
                    <span className="font-mono text-zinc-400 w-[60px]">{log.time}</span>
                    <span className="text-zinc-600 dark:text-zinc-300 w-[90px]">{log.vendor}</span>
                    <span className="text-zinc-500 w-[80px]">{log.agent}</span>
                    <span className="text-zinc-400 w-[50px]">{log.latency}</span>
                    <span className="text-emerald-500">{log.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MonitorCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
      <p className="text-[18px] font-semibold text-zinc-800 dark:text-zinc-100">{value}</p>
      <p className="text-[11px] text-zinc-400 mt-0.5">{label}</p>
    </div>
  );
}
