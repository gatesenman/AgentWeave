import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Lock,
  Unlock,
  GitBranch,
  Clock,
  Shield,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
} from "lucide-react";
import {
  listTeamMembers,
  addTeamMember,
  updateTeamMemberRole,
  deleteTeamMember,
  type TeamMemberInfo,
} from "../lib/tauri";

export default function TeamHub() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"members" | "branches" | "locks">("members");
  const [members, setMembers] = useState<TeamMemberInfo[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("editor");

  const load = useCallback(async () => {
    try {
      const data = await listTeamMembers();
      setMembers(data);
    } catch (e) { console.error("listTeamMembers", e); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newName.trim() || !newEmail.trim()) return;
    try {
      await addTeamMember(newName, newEmail, newRole);
      setShowNew(false); setNewName(""); setNewEmail("");
      await load();
    } catch (e) { console.error("addTeamMember", e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTeamMember(id);
      await load();
    } catch (e) { console.error("deleteTeamMember", e); }
  };

  const handleRoleChange = async (id: string, role: string) => {
    try {
      await updateTeamMemberRole(id, role);
      await load();
    } catch (e) { console.error("updateTeamMemberRole", e); }
  };

  const roleColors: Record<string, string> = {
    admin: "text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400",
    editor: "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400",
    viewer: "text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400",
  };

  const tabs = [
    { key: "members" as const, label: t("team.members", "成员"), icon: Users },
    { key: "branches" as const, label: t("team.branches", "分支"), icon: GitBranch },
    { key: "locks" as const, label: t("team.locks", "锁定"), icon: Lock },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
            <Users size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
              {t("team.title", "团队协作")}
            </h2>
            <p className="text-[11px] text-zinc-400">{t("team.subtitle", "成员管理、配置分支与锁定")}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md ${
                activeTab === key
                  ? "bg-blue-600 text-white"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4">
        {activeTab === "members" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300">{members.length} 成员</span>
              <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded">
                <Plus size={12} /> 添加
              </button>
            </div>

            {showNew && (
              <div className="bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-2 mb-3">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="姓名" className="w-full px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
                <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="邮箱" className="w-full px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200">
                  <option value="admin">管理员</option>
                  <option value="editor">编辑者</option>
                  <option value="viewer">只读</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={handleAdd} className="flex-1 px-2 py-1 text-[11px] font-medium text-white bg-blue-600 rounded hover:bg-blue-700">添加</button>
                  <button onClick={() => setShowNew(false)} className="px-2 py-1 text-[11px] text-zinc-500">取消</button>
                </div>
              </div>
            )}

            {members.length === 0 && !showNew && (
              <p className="text-center text-[12px] text-zinc-400 py-8">暂无成员，点击添加</p>
            )}

            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 group">
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[12px] font-medium text-zinc-600 dark:text-zinc-300">
                  {m.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100">{m.name}</span>
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${roleColors[m.role] || roleColors.viewer}`}>{m.role}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate">{m.email}</p>
                </div>
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.id, e.target.value)}
                  className="text-[10px] px-1 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent text-zinc-500 opacity-0 group-hover:opacity-100"
                >
                  <option value="admin">admin</option>
                  <option value="editor">editor</option>
                  <option value="viewer">viewer</option>
                </select>
                <button onClick={() => handleDelete(m.id)} className="p-1 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "branches" && (
          <div className="text-center py-8 text-[12px] text-zinc-400">
            配置分支功能将在多人网络协作模式中启用
          </div>
        )}

        {activeTab === "locks" && (
          <div className="text-center py-8 text-[12px] text-zinc-400">
            概念锁定功能将在多人协作模式中启用
          </div>
        )}
      </div>
    </div>
  );
}
