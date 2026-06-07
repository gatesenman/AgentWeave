import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Layers,
  Plus,
  GitBranch,
  CheckCircle2,
  Copy,
  Settings,
  ArrowRight,
  Globe,
  Server,
  Laptop,
} from "lucide-react";

interface Environment {
  id: string;
  name: string;
  label: string;
  icon: "dev" | "staging" | "prod";
  overrides: Override[];
  isActive: boolean;
  lastDeployed: string;
}

interface Override {
  concept: string;
  field: string;
  baseValue: string;
  overrideValue: string;
}

const mockEnvs: Environment[] = [
  {
    id: "dev",
    name: "development",
    label: "开发环境",
    icon: "dev",
    isActive: true,
    lastDeployed: "2 分钟前",
    overrides: [
      { concept: "MCP Server 'postgres'", field: "host", baseValue: "prod-db.internal", overrideValue: "localhost:5432" },
      { concept: "Agent 'fullstack-dev'", field: "model", baseValue: "claude-3-opus", overrideValue: "claude-3-haiku" },
      { concept: "Config", field: "log_level", baseValue: "warn", overrideValue: "debug" },
    ],
  },
  {
    id: "staging",
    name: "staging",
    label: "预发布环境",
    icon: "staging",
    isActive: false,
    lastDeployed: "3 小时前",
    overrides: [
      { concept: "MCP Server 'postgres'", field: "host", baseValue: "prod-db.internal", overrideValue: "staging-db.internal" },
      { concept: "Config", field: "log_level", baseValue: "warn", overrideValue: "info" },
    ],
  },
  {
    id: "prod",
    name: "production",
    label: "生产环境",
    icon: "prod",
    isActive: false,
    lastDeployed: "1 天前",
    overrides: [],
  },
];

export default function Environments() {
  const { t } = useTranslation();
  const [envs] = useState<Environment[]>(mockEnvs);
  const [selectedEnv, setSelectedEnv] = useState<string>("dev");

  const currentEnv = envs.find((e) => e.id === selectedEnv);

  const envIcon = (type: string) => {
    switch (type) {
      case "dev": return <Laptop size={14} className="text-emerald-500" />;
      case "staging": return <Server size={14} className="text-amber-500" />;
      case "prod": return <Globe size={14} className="text-red-500" />;
      default: return <Layers size={14} />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
        <Layers size={14} className="text-teal-500" />
        <span className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">
          {t("env.title", "环境管理")}
        </span>
        <div className="flex-1" />
        <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700">
          <Plus size={12} /> 新建环境
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: env list */}
        <div className="w-[220px] border-r border-zinc-100 dark:border-zinc-800 flex flex-col">
          <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-[10px] font-medium text-zinc-400 uppercase">变体</p>
          </div>
          {envs.map((env) => (
            <button
              key={env.id}
              onClick={() => setSelectedEnv(env.id)}
              className={`w-full text-left px-4 py-3 border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                selectedEnv === env.id ? "bg-teal-50/50 dark:bg-teal-500/5 border-l-2 border-l-teal-500" : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {envIcon(env.icon)}
                <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200">{env.label}</span>
              </div>
              <div className="flex items-center gap-2 ml-[22px]">
                <span className="text-[10px] text-zinc-400 font-mono">{env.name}</span>
                {env.isActive && (
                  <span className="text-[8px] px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded font-medium">当前</span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400 ml-[22px] mt-0.5">{env.overrides.length} 个覆盖 · {env.lastDeployed}</p>
            </button>
          ))}
        </div>

        {/* Right: env detail */}
        <div className="flex-1 overflow-auto px-5 py-4">
          {currentEnv && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {envIcon(currentEnv.icon)}
                  <div>
                    <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">{currentEnv.label}</h2>
                    <p className="text-[11px] text-zinc-400 font-mono">{currentEnv.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!currentEnv.isActive && (
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700">
                      <CheckCircle2 size={11} /> 激活
                    </button>
                  )}
                  <button className="p-1.5 text-zinc-400 hover:text-zinc-600 bg-zinc-100 dark:bg-zinc-800 rounded">
                    <Copy size={12} />
                  </button>
                  <button className="p-1.5 text-zinc-400 hover:text-zinc-600 bg-zinc-100 dark:bg-zinc-800 rounded">
                    <Settings size={12} />
                  </button>
                </div>
              </div>

              {/* Overrides */}
              {currentEnv.overrides.length > 0 ? (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                    <GitBranch size={12} className="text-teal-500" />
                    <h3 className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-200">配置覆盖</h3>
                    <span className="text-[10px] text-zinc-400 ml-auto">{currentEnv.overrides.length} 项</span>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {currentEnv.overrides.map((ov, i) => (
                      <div key={i} className="px-4 py-3">
                        <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 mb-1.5">{ov.concept}.{ov.field}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded line-through">
                            {ov.baseValue}
                          </span>
                          <ArrowRight size={10} className="text-zinc-300" />
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 rounded font-medium">
                            {ov.overrideValue}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 text-center">
                  <Globe size={24} className="text-zinc-300 mx-auto mb-2" />
                  <p className="text-[12px] text-zinc-500">生产环境使用基线配置（无覆盖）</p>
                </div>
              )}

              {/* Info box */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3">
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  环境变体允许你为不同部署环境定制配置，而不影响基线。
                  覆盖值在生成时自动合并（环境特定值优先于基线值）。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
