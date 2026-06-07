import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useConfigStore } from "../store/config";
import { ShieldCheck, Users, FileText, Gauge } from "lucide-react";

export default function Governance() {
  const { t } = useTranslation();
  const { projectDir, governanceStatus, loadGovernance } = useConfigStore();
  const [activeTab, setActiveTab] = useState<"policies" | "roles" | "audit" | "quotas">("policies");

  useEffect(() => {
    if (projectDir) loadGovernance();
  }, [projectDir, loadGovernance]);

  if (!projectDir) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={22} className="text-zinc-400" />
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
          { key: "policies" as const, icon: FileText, label: t("governance.policies", "策略") },
          { key: "roles" as const, icon: Users, label: t("governance.roles", "角色") },
          { key: "audit" as const, icon: ShieldCheck, label: t("governance.audit", "审计") },
          { key: "quotas" as const, icon: Gauge, label: t("governance.quotas", "配额") },
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

      {/* Content */}
      <div className="flex-1 overflow-auto px-5 py-4">
        {activeTab === "policies" && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <tr className="text-left text-[11px] text-zinc-400 uppercase tracking-wider">
                  <th className="px-4 py-2 font-medium">策略名称</th>
                  <th className="px-4 py-2 font-medium">级别</th>
                  <th className="px-4 py-2 font-medium">状态</th>
                  <th className="px-4 py-2 font-medium">描述</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(governanceStatus?.policies ?? []).map((p, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-2.5 text-[12px] font-mono text-zinc-700 dark:text-zinc-200">{p.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        p.severity === "error" ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                          : p.severity === "warning" ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      }`}>{p.severity}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[11px] ${p.enabled ? "text-emerald-500" : "text-zinc-400"}`}>
                        {p.enabled ? "启用" : "禁用"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-zinc-500">{p.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "roles" && (
          <div className="grid grid-cols-3 gap-3">
            {(governanceStatus?.roles ?? []).map((role, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={14} className="text-indigo-500" />
                  <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100">{role.name}</span>
                </div>
                <div className="space-y-1">
                  {role.permissions.map((perm, j) => (
                    <p key={j} className="text-[11px] text-zinc-500">{perm}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "audit" && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <tr className="text-left text-[11px] text-zinc-400 uppercase tracking-wider">
                  <th className="px-4 py-2 font-medium">时间</th>
                  <th className="px-4 py-2 font-medium">用户</th>
                  <th className="px-4 py-2 font-medium">操作</th>
                  <th className="px-4 py-2 font-medium">详情</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(governanceStatus?.audit_log ?? []).map((log, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-2.5 text-[11px] font-mono text-zinc-400">{log.timestamp}</td>
                    <td className="px-4 py-2.5 text-[12px] text-zinc-700 dark:text-zinc-200">{log.user}</td>
                    <td className="px-4 py-2.5 text-[12px] text-zinc-700 dark:text-zinc-200">{log.action}</td>
                    <td className="px-4 py-2.5 text-[12px] text-zinc-500">{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "quotas" && (
          <div className="grid grid-cols-2 gap-3">
            {(governanceStatus?.quotas ?? []).map((q, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200">{q.name}</span>
                  <span className="text-[11px] font-mono text-zinc-400">{q.used}/{q.limit}</span>
                </div>
                <div className="h-1.5 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (q.used / q.limit) > 0.8 ? "bg-red-400" : "bg-indigo-500"
                    }`}
                    style={{ width: `${Math.min((q.used / q.limit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
