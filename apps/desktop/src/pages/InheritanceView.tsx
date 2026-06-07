import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Network,
  FileCode2,
  ChevronRight,
  ArrowDown,
  Eye,
  Layers,
  Link,
} from "lucide-react";

interface ConfigNode {
  id: string;
  name: string;
  path: string;
  isRemote: boolean;
  fields: Record<string, { value: string; source: string; overridden: boolean }>;
  children: string[];
}

const mockNodes: ConfigNode[] = [
  {
    id: "root",
    name: "base-config",
    path: "agentweave.yaml",
    isRemote: false,
    fields: {
      "metadata.name": { value: "fullstack-project", source: "self", overridden: false },
      "agents[0].name": { value: "code-reviewer", source: "self", overridden: true },
      "agents[0].model": { value: "claude-3-opus", source: "self", overridden: true },
      "rules.style": { value: "strict", source: "self", overridden: false },
      "mcp.postgres.host": { value: "localhost", source: "self", overridden: true },
    },
    children: ["shared-lib", "team-config"],
  },
  {
    id: "shared-lib",
    name: "shared-rules",
    path: "https://registry.agentweave.dev/templates/shared-rules@v2.1",
    isRemote: true,
    fields: {
      "rules.style": { value: "standard", source: "self", overridden: true },
      "rules.naming": { value: "camelCase", source: "self", overridden: false },
      "rules.security": { value: "strict", source: "self", overridden: false },
      "rules.docs": { value: "required", source: "self", overridden: false },
    },
    children: [],
  },
  {
    id: "team-config",
    name: "team-overrides",
    path: "../shared/team.yaml",
    isRemote: false,
    fields: {
      "agents[0].name": { value: "team-reviewer", source: "self", overridden: true },
      "agents[0].model": { value: "gpt-4o", source: "self", overridden: true },
      "mcp.postgres.host": { value: "team-db.internal", source: "self", overridden: true },
      "team.lead": { value: "alice", source: "self", overridden: false },
    },
    children: [],
  },
];

const resolvedConfig: Record<string, { value: string; source: string }> = {
  "metadata.name": { value: "fullstack-project", source: "base-config" },
  "agents[0].name": { value: "code-reviewer", source: "base-config (overrides team-overrides)" },
  "agents[0].model": { value: "claude-3-opus", source: "base-config (overrides team-overrides)" },
  "rules.style": { value: "strict", source: "base-config (overrides shared-rules)" },
  "rules.naming": { value: "camelCase", source: "shared-rules" },
  "rules.security": { value: "strict", source: "shared-rules" },
  "rules.docs": { value: "required", source: "shared-rules" },
  "mcp.postgres.host": { value: "localhost", source: "base-config (overrides team-overrides)" },
  "team.lead": { value: "alice", source: "team-overrides" },
};

export default function InheritanceView() {
  const { t } = useTranslation();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
        <Network size={14} className="text-purple-500" />
        <span className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">
          {t("inherit.title", "继承链可视化")}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setShowResolved(!showResolved)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md ${
            showResolved
              ? "bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
          }`}
        >
          <Eye size={11} /> {showResolved ? "查看继承链" : "查看最终值"}
        </button>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4">
        {!showResolved ? (
          <div className="space-y-4">
            {/* Inheritance tree visualization */}
            <div className="flex flex-col items-center gap-2">
              {/* Root node */}
              <button
                onClick={() => setSelectedNode(selectedNode === "root" ? null : "root")}
                className={`w-[320px] px-4 py-3 rounded-lg border transition-all ${
                  selectedNode === "root"
                    ? "border-purple-300 dark:border-purple-500/50 bg-purple-50/50 dark:bg-purple-500/5 shadow-sm"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-purple-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileCode2 size={13} className="text-purple-500" />
                  <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-200">{mockNodes[0].name}</span>
                  <span className="text-[10px] text-zinc-400 ml-auto font-mono">{mockNodes[0].path}</span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1 ml-[21px]">
                  extends: shared-rules, team-overrides
                </p>
              </button>

              {/* Arrow down */}
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="text-[9px] text-zinc-400">extends</span>
                <ArrowDown size={14} />
              </div>

              {/* Children */}
              <div className="flex gap-4">
                {mockNodes.slice(1).map((node) => (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                    className={`w-[260px] px-4 py-3 rounded-lg border transition-all ${
                      selectedNode === node.id
                        ? "border-purple-300 dark:border-purple-500/50 bg-purple-50/50 dark:bg-purple-500/5 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-purple-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {node.isRemote ? <Link size={12} className="text-blue-500" /> : <FileCode2 size={12} className="text-zinc-400" />}
                      <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-200">{node.name}</span>
                    </div>
                    <p className="text-[10px] font-mono text-zinc-400 mt-1 ml-[20px] truncate">{node.path}</p>
                    {node.isRemote && (
                      <span className="text-[8px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded ml-[20px] mt-1 inline-block">
                        远程
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected node fields */}
            {selectedNode && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden mt-4">
                <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                  <Layers size={12} className="text-purple-500" />
                  <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                    {mockNodes.find((n) => n.id === selectedNode)?.name} 的字段
                  </span>
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {Object.entries(mockNodes.find((n) => n.id === selectedNode)?.fields || {}).map(([key, info]) => (
                    <div key={key} className="px-4 py-2 flex items-center">
                      <span className="text-[11px] font-mono text-zinc-500 w-[200px]">{key}</span>
                      <ChevronRight size={10} className="text-zinc-300 mx-2" />
                      <span className={`text-[11px] font-mono ${info.overridden ? "text-amber-600 dark:text-amber-400" : "text-zinc-600 dark:text-zinc-300"}`}>
                        {info.value}
                      </span>
                      {info.overridden && (
                        <span className="text-[8px] px-1.5 py-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded ml-2">
                          被上层覆盖
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Resolved/final config */
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                <Eye size={12} className="text-purple-500" /> 最终生效配置
              </h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">合并 extends 后的最终值（高优先级覆盖低优先级）</p>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {Object.entries(resolvedConfig).map(([key, info]) => (
                <div key={key} className="px-4 py-2 flex items-center">
                  <span className="text-[11px] font-mono text-zinc-500 w-[180px]">{key}</span>
                  <span className="text-[11px] font-mono text-zinc-800 dark:text-zinc-100 font-medium w-[150px]">{info.value}</span>
                  <span className="text-[9px] text-zinc-400 ml-auto">{info.source}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
