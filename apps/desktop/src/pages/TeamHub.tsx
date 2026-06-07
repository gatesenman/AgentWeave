import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Users,
  Lock,
  Unlock,
  GitBranch,
  GitPullRequest,
  Clock,
  Shield,
  Plus,
  MoreHorizontal,
  CheckCircle2,
  Circle,
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  online: boolean;
  lastActive: string;
}

interface ConfigBranch {
  name: string;
  author: string;
  status: "active" | "merged" | "review";
  updatedAt: string;
  changes: number;
}

interface LockEntry {
  concept: string;
  lockedBy: string;
  since: string;
}

const mockMembers: TeamMember[] = [
  { id: "1", name: "张三", email: "zhang@example.com", role: "admin", online: true, lastActive: "刚刚" },
  { id: "2", name: "李四", email: "li@example.com", role: "editor", online: true, lastActive: "5分钟前" },
  { id: "3", name: "王五", email: "wang@example.com", role: "editor", online: false, lastActive: "2小时前" },
  { id: "4", name: "赵六", email: "zhao@example.com", role: "viewer", online: false, lastActive: "1天前" },
];

const mockBranches: ConfigBranch[] = [
  { name: "feat/add-mcp-postgres", author: "李四", status: "review", updatedAt: "10分钟前", changes: 3 },
  { name: "fix/cursor-rules-format", author: "张三", status: "active", updatedAt: "1小时前", changes: 1 },
  { name: "feat/workflow-ci-pipeline", author: "王五", status: "merged", updatedAt: "昨天", changes: 5 },
];

const mockLocks: LockEntry[] = [
  { concept: "agents[0] (main-architect)", lockedBy: "李四", since: "15分钟前" },
  { concept: "mcp_servers[2] (postgres)", lockedBy: "李四", since: "15分钟前" },
];

export default function TeamHub() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"members" | "branches" | "locks">("members");

  const tabs = [
    { key: "members" as const, label: t("team.members", "成员"), icon: Users },
    { key: "branches" as const, label: t("team.branches", "配置分支"), icon: GitBranch },
    { key: "locks" as const, label: t("team.locks", "锁定"), icon: Lock },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
            <Users size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
              {t("team.title", "团队协作")}
            </h2>
            <p className="text-[11px] text-zinc-400">
              {t("team.subtitle", "多人共享配置管理、分支与锁定")}
            </p>
          </div>
          <div className="flex-1" />
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus size={12} />
            {t("team.invite", "邀请成员")}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                activeTab === tab.key
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-5 py-4">
        {activeTab === "members" && <MembersPanel />}
        {activeTab === "branches" && <BranchesPanel />}
        {activeTab === "locks" && <LocksPanel />}
      </div>
    </div>
  );
}

function MembersPanel() {
  const roleColors: Record<string, string> = {
    admin: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10",
    editor: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10",
    viewer: "text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800",
  };
  const roleLabels: Record<string, string> = {
    admin: "管理员",
    editor: "编辑者",
    viewer: "查看者",
  };

  return (
    <div className="space-y-2">
      {mockMembers.map((member) => (
        <div
          key={member.id}
          className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[12px] font-medium text-zinc-600 dark:text-zinc-300">
              {member.name[0]}
            </div>
            {member.online && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-zinc-900" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100">{member.name}</span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${roleColors[member.role]}`}>
                {roleLabels[member.role]}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">{member.email}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-400">{member.lastActive}</p>
          </div>
          <button className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <MoreHorizontal size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function BranchesPanel() {
  const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
    active: { color: "text-blue-500", icon: Circle, label: "活跃" },
    review: { color: "text-amber-500", icon: GitPullRequest, label: "审核中" },
    merged: { color: "text-emerald-500", icon: CheckCircle2, label: "已合并" },
  };

  return (
    <div className="space-y-2">
      {mockBranches.map((branch) => {
        const cfg = statusConfig[branch.status];
        return (
          <div
            key={branch.name}
            className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
          >
            <cfg.icon size={14} className={cfg.color} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-mono font-medium text-zinc-700 dark:text-zinc-200">{branch.name}</span>
                <span className={`text-[10px] ${cfg.color}`}>{cfg.label}</span>
              </div>
              <p className="text-[11px] text-zinc-400">{branch.author} · {branch.updatedAt} · {branch.changes} 项变更</p>
            </div>
            {branch.status === "review" && (
              <button className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                <GitPullRequest size={10} />
                审核
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LocksPanel() {
  return (
    <div className="space-y-3">
      <div className="px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg">
        <p className="text-[11px] text-amber-700 dark:text-amber-300">
          锁定的概念在释放前其他成员无法编辑。编辑完成后请及时释放锁定。
        </p>
      </div>
      {mockLocks.length === 0 ? (
        <p className="text-[12px] text-zinc-400 text-center py-8">当前没有锁定的概念</p>
      ) : (
        mockLocks.map((lock, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
          >
            <Lock size={14} className="text-amber-500 shrink-0" />
            <div className="flex-1">
              <span className="text-[12px] font-mono text-zinc-700 dark:text-zinc-200">{lock.concept}</span>
              <p className="text-[11px] text-zinc-400">{lock.lockedBy} · 锁定于 {lock.since}</p>
            </div>
            <button className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-md hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
              <Unlock size={10} />
              释放
            </button>
          </div>
        ))
      )}
    </div>
  );
}
