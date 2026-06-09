import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useConfigStore } from "../store/config";
import { ShieldCheck, Users, FileText, Gauge, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import {
  getGovernanceStatus, type GovernanceStatus,
  listGovernancePolicies, createGovernancePolicy, toggleGovernancePolicy, deleteGovernancePolicy, type GovernancePolicyInfo,
  listGovernanceRoles, createGovernanceRole, deleteGovernanceRole, type GovernanceRoleInfo,
  getAuditLog, type AuditEntry,
} from "../lib/tauri";

export default function Governance() {
  const { t } = useTranslation();
  const projectDir = useConfigStore((s) => s.projectDir) || "";
  const [activeTab, setActiveTab] = useState<"policies" | "roles" | "audit">("policies");
  const [status, setStatus] = useState<GovernanceStatus | null>(null);
  const [policies, setPolicies] = useState<GovernancePolicyInfo[]>([]);
  const [roles, setRoles] = useState<GovernanceRoleInfo[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [showNewPolicy, setShowNewPolicy] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSev, setNewSev] = useState("warning");

  const load = useCallback(async () => {
    try {
      if (projectDir) setStatus(await getGovernanceStatus(projectDir));
      setPolicies(await listGovernancePolicies());
      setRoles(await listGovernanceRoles());
      setAuditLog(await getAuditLog());
    } catch (e) { console.error("governance load", e); }
  }, [projectDir]);
  useEffect(() => { load(); }, [load]);

  const handleCreatePolicy = async () => {
    if (!newName) return;
    try {
      await createGovernancePolicy(newName, newDesc, newSev);
      setShowNewPolicy(false); setNewName(""); setNewDesc("");
      await load();
    } catch (e) { console.error(e); }
  };

  const handleTogglePolicy = async (id: string, enabled: boolean) => {
    try { await toggleGovernancePolicy(id, !enabled); await load(); } catch (e) { console.error(e); }
  };

  const handleDeletePolicy = async (id: string) => {
    try { await deleteGovernancePolicy(id); await load(); } catch (e) { console.error(e); }
  };

  const handleDeleteRole = async (id: string) => {
    try { await deleteGovernanceRole(id); await load(); } catch (e) { console.error(e); }
  };

  if (!projectDir) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={22} className="text-zinc-400" />
          </div>
          <p className="text-[13px] text-zinc-500">{t("common.selectProject", "请先选择项目")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-0 border-b border-zinc-100 dark:border-zinc-800 flex items-center shrink-0">
        {[
          { key: "policies" as const, icon: FileText, label: t("governance.policies", "策略") },
          { key: "roles" as const, icon: Users, label: t("governance.roles", "角色") },
          { key: "audit" as const, icon: ShieldCheck, label: t("governance.audit", "审计") },
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
        {status && (
          <div className="ml-auto flex items-center gap-3 text-[11px] text-zinc-400">
            <span>{status.policies_count} 策略</span>
            <span>{status.roles_count} 角色</span>
            <span className={status.compliance === "compliant" ? "text-emerald-500" : "text-red-500"}>{status.compliance}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-5 py-4">
        {activeTab === "policies" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300">治理策略</h3>
              <button onClick={() => setShowNewPolicy(true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                <Plus size={11} /> 新增
              </button>
            </div>
            {showNewPolicy && (
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="策略名" className="px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
                  <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="描述" className="px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
                  <select value={newSev} onChange={(e) => setNewSev(e.target.value)} className="px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200">
                    <option value="error">error</option>
                    <option value="warning">warning</option>
                    <option value="info">info</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCreatePolicy} className="px-3 py-1 text-[11px] text-white bg-indigo-600 rounded hover:bg-indigo-700">创建</button>
                  <button onClick={() => setShowNewPolicy(false)} className="px-3 py-1 text-[11px] text-zinc-500">取消</button>
                </div>
              </div>
            )}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                  <tr className="text-left text-[11px] text-zinc-400 uppercase tracking-wider">
                    <th className="px-4 py-2 font-medium">策略</th>
                    <th className="px-4 py-2 font-medium">级别</th>
                    <th className="px-4 py-2 font-medium">状态</th>
                    <th className="px-4 py-2 font-medium">描述</th>
                    <th className="px-4 py-2 font-medium w-[80px]">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {policies.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-[12px] text-zinc-400">暂无策略</td></tr>}
                  {policies.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-4 py-2.5 text-[12px] font-mono text-zinc-700 dark:text-zinc-200">{p.name}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          p.severity === "error" ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                            : p.severity === "warning" ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        }`}>{p.severity}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => handleTogglePolicy(p.id, p.enabled)} className="text-[11px]">
                          {p.enabled ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} className="text-zinc-400" />}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-zinc-500">{p.description}</td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => handleDeletePolicy(p.id)} className="p-0.5 text-zinc-300 hover:text-red-500"><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "roles" && (
          <RolesTab roles={roles} onDelete={handleDeleteRole} onCreated={load} />
        )}

        {activeTab === "audit" && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <tr className="text-left text-[11px] text-zinc-400 uppercase tracking-wider">
                  <th className="px-4 py-2 font-medium">时间</th>
                  <th className="px-4 py-2 font-medium">操作</th>
                  <th className="px-4 py-2 font-medium">详情</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {auditLog.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-[12px] text-zinc-400">暂无记录</td></tr>}
                {auditLog.map((log, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-2.5 text-[11px] font-mono text-zinc-400">{log.timestamp}</td>
                    <td className="px-4 py-2.5 text-[12px] text-zinc-700 dark:text-zinc-200">{log.action}</td>
                    <td className="px-4 py-2.5 text-[12px] text-zinc-500">{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RolesTab({ roles, onDelete, onCreated }: { roles: GovernanceRoleInfo[]; onDelete: (id: string) => void; onCreated: () => void }) {
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPerms, setNewPerms] = useState("read,write");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createGovernanceRole(newName.trim(), newPerms.split(",").map(p => p.trim()).filter(Boolean));
      setNewName(""); setNewPerms("read,write"); setShowNew(false);
      onCreated();
    } catch (e) { console.error("createGovernanceRole", e); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300">角色管理</h3>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
          <Plus size={11} /> 新增
        </button>
      </div>
      {showNew && (
        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="角色名" className="px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
            <input value={newPerms} onChange={(e) => setNewPerms(e.target.value)} placeholder="权限 (逗号分隔)" className="px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-3 py-1 text-[11px] text-white bg-indigo-600 rounded hover:bg-indigo-700">创建</button>
            <button onClick={() => setShowNew(false)} className="px-3 py-1 text-[11px] text-zinc-500">取消</button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        {roles.length === 0 && <p className="col-span-3 text-center text-[12px] text-zinc-400 py-4">暂无角色</p>}
        {roles.map((role) => (
          <div key={role.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-indigo-500" />
                <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100">{role.name}</span>
              </div>
              <button onClick={() => onDelete(role.id)} className="p-0.5 text-zinc-300 hover:text-red-500"><Trash2 size={11} /></button>
            </div>
            <div className="space-y-1">
              {role.permissions.map((perm: string, j: number) => (
                <p key={j} className="text-[11px] text-zinc-500">{perm}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
