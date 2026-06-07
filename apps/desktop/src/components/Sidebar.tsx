import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Layers,
  Workflow,
  GitCompare,
  Eye,
  Network,
  Radio,
  ListTree,
  ShieldCheck,
  Archive,
  Settings,
  Search,
  GitMerge,
  Package,
  Users,
  Scissors,
  ArrowRightLeft,
  ShieldAlert,
  DollarSign,
  Webhook,
  FlaskConical,
  TestTube2,
  Sparkles,
  PieChart,
  Layers as LayersIcon,
  GitBranch,
} from "lucide-react";

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface NavItem {
  path: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  labelKey: string;
}

const navGroups: NavGroup[] = [
  {
    label: "nav.groupWorkspace",
    items: [
      { path: "/", icon: LayoutDashboard, labelKey: "nav.dashboard" },
      { path: "/config", icon: Layers, labelKey: "nav.configHub" },
      { path: "/graph", icon: Network, labelKey: "nav.graph" },
    ],
  },
  {
    label: "nav.groupGenerate",
    items: [
      { path: "/generate", icon: Workflow, labelKey: "nav.generate" },
      { path: "/dryrun", icon: Eye, labelKey: "nav.dryrun" },
      { path: "/compare", icon: GitCompare, labelKey: "nav.compare" },
      { path: "/optimizer", icon: Scissors, labelKey: "nav.optimizer" },
      { path: "/migration", icon: ArrowRightLeft, labelKey: "nav.migration" },
      { path: "/perf", icon: FlaskConical, labelKey: "nav.perf" },
      { path: "/prompt-test", icon: TestTube2, labelKey: "nav.promptTest" },
    ],
  },
  {
    label: "nav.groupRuntime",
    items: [
      { path: "/acp", icon: Radio, labelKey: "nav.acp" },
      { path: "/trace", icon: ListTree, labelKey: "nav.trace" },
      { path: "/conflicts", icon: GitMerge, labelKey: "nav.conflicts" },
    ],
  },
  {
    label: "nav.groupManage",
    items: [
      { path: "/governance", icon: ShieldCheck, labelKey: "nav.governance" },
      { path: "/lint", icon: ShieldAlert, labelKey: "nav.lint" },
      { path: "/team", icon: Users, labelKey: "nav.team" },
      { path: "/templates", icon: Package, labelKey: "nav.templates" },
      { path: "/webhooks", icon: Webhook, labelKey: "nav.webhooks" },
      { path: "/cost", icon: DollarSign, labelKey: "nav.cost" },
      { path: "/ai-assist", icon: Sparkles, labelKey: "nav.aiAssist" },
      { path: "/analytics", icon: PieChart, labelKey: "nav.analytics" },
      { path: "/environments", icon: LayersIcon, labelKey: "nav.environments" },
      { path: "/inheritance", icon: GitBranch, labelKey: "nav.inheritance" },
      { path: "/backup", icon: Archive, labelKey: "nav.backup" },
      { path: "/settings", icon: Settings, labelKey: "nav.settings" },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <aside className="w-[200px] h-full bg-zinc-50 dark:bg-[#1f1f23] border-r border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0">
      {/* Global search trigger */}
      <div className="px-2 pt-2 pb-1">
        <button
          onClick={() => navigate("/search")}
          className="w-full flex items-center gap-2 px-2.5 py-[6px] rounded-md text-[12px] text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-colors"
        >
          <Search size={13} strokeWidth={1.8} />
          <span>{t("nav.search", "搜索...")}</span>
          <span className="ml-auto text-[10px] text-zinc-300 dark:text-zinc-600 font-mono">⌘K</span>
        </button>
      </div>

      <nav className="flex-1 px-2 py-1 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-3" : ""}>
            <div className="px-2.5 py-1 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              {t(group.label)}
            </div>
            <div className="space-y-0.5 mt-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-all ${
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    <Icon
                      size={16}
                      strokeWidth={1.8}
                      className={isActive ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 dark:text-zinc-500"}
                    />
                    <span>{t(item.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
