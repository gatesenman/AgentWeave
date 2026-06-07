import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import {
  Network,
  Cpu,
  BookOpen,
  Server,
  Sparkles,
  GitBranch,
  Anchor,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";

interface GraphNode {
  id: string;
  type: "agent" | "rule" | "mcp" | "skill" | "workflow" | "hook";
  name: string;
  x: number;
  y: number;
}

interface GraphEdge {
  from: string;
  to: string;
  label: string;
}

const mockNodes: GraphNode[] = [
  { id: "agent-1", type: "agent", name: "main-architect", x: 400, y: 100 },
  { id: "agent-2", type: "agent", name: "code-reviewer", x: 400, y: 300 },
  { id: "rule-1", type: "rule", name: "typescript-strict", x: 200, y: 150 },
  { id: "rule-2", type: "rule", name: "no-any-types", x: 200, y: 220 },
  { id: "rule-3", type: "rule", name: "test-coverage", x: 200, y: 290 },
  { id: "mcp-1", type: "mcp", name: "postgres-db", x: 600, y: 130 },
  { id: "mcp-2", type: "mcp", name: "filesystem", x: 600, y: 210 },
  { id: "mcp-3", type: "mcp", name: "github-api", x: 600, y: 290 },
  { id: "skill-1", type: "skill", name: "code-gen", x: 350, y: 450 },
  { id: "skill-2", type: "skill", name: "refactor", x: 500, y: 450 },
  { id: "workflow-1", type: "workflow", name: "pr-review", x: 150, y: 420 },
  { id: "hook-1", type: "hook", name: "pre-commit", x: 650, y: 420 },
];

const mockEdges: GraphEdge[] = [
  { from: "agent-1", to: "rule-1", label: "uses" },
  { from: "agent-1", to: "rule-2", label: "uses" },
  { from: "agent-1", to: "mcp-1", label: "connects" },
  { from: "agent-1", to: "mcp-2", label: "connects" },
  { from: "agent-1", to: "skill-1", label: "has" },
  { from: "agent-2", to: "rule-3", label: "uses" },
  { from: "agent-2", to: "mcp-3", label: "connects" },
  { from: "agent-2", to: "skill-2", label: "has" },
  { from: "workflow-1", to: "agent-2", label: "triggers" },
  { from: "hook-1", to: "agent-1", label: "triggers" },
  { from: "agent-2", to: "rule-1", label: "uses" },
];

const typeConfig: Record<string, { color: string; bg: string; icon: typeof Cpu }> = {
  agent: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30", icon: Cpu },
  rule: { color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30", icon: BookOpen },
  mcp: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30", icon: Server },
  skill: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30", icon: Sparkles },
  workflow: { color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30", icon: GitBranch },
  hook: { color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30", icon: Anchor },
};

export default function ConceptGraph() {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const connectedEdges = useMemo(() => {
    if (!selectedNode) return mockEdges;
    return mockEdges.filter((e) => e.from === selectedNode || e.to === selectedNode);
  }, [selectedNode]);

  const connectedNodeIds = useMemo(() => {
    if (!selectedNode) return new Set(mockNodes.map((n) => n.id));
    const ids = new Set<string>([selectedNode]);
    connectedEdges.forEach((e) => { ids.add(e.from); ids.add(e.to); });
    return ids;
  }, [selectedNode, connectedEdges]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
          <Network size={16} className="text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
            {t("graph.title", "概念关联图")}
          </h2>
          <p className="text-[11px] text-zinc-400">
            {t("graph.subtitle", "Agent → MCP → Rule 依赖关系可视化")}
          </p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
            <ZoomOut size={14} />
          </button>
          <span className="text-[11px] text-zinc-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
            <ZoomIn size={14} />
          </button>
          <button onClick={() => { setZoom(1); setSelectedNode(null); }} className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Graph canvas */}
      <div className="flex-1 overflow-hidden relative bg-zinc-50/50 dark:bg-zinc-900/50">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 800 550"
          className="absolute inset-0"
          style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
        >
          {/* Grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-zinc-200 dark:text-zinc-800" />
            </pattern>
          </defs>
          <rect width="800" height="550" fill="url(#grid)" />

          {/* Edges */}
          {connectedEdges.map((edge, i) => {
            const from = mockNodes.find((n) => n.id === edge.from);
            const to = mockNodes.find((n) => n.id === edge.to);
            if (!from || !to) return null;
            return (
              <g key={i}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-zinc-300 dark:text-zinc-600"
                  strokeDasharray={edge.label === "triggers" ? "4 2" : undefined}
                />
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 6}
                  textAnchor="middle"
                  className="fill-zinc-400 text-[9px]"
                >
                  {edge.label}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {mockNodes.map((node) => {
            const config = typeConfig[node.type];
            const isActive = connectedNodeIds.has(node.id);
            const isSelected = selectedNode === node.id;
            return (
              <g
                key={node.id}
                onClick={() => setSelectedNode(isSelected ? null : node.id)}
                className="cursor-pointer"
                opacity={isActive ? 1 : 0.3}
              >
                <rect
                  x={node.x - 55}
                  y={node.y - 16}
                  width={110}
                  height={32}
                  rx={6}
                  fill="white"
                  stroke={isSelected ? "#6366f1" : "#e4e4e7"}
                  strokeWidth={isSelected ? 2 : 1}
                  className="dark:fill-zinc-800"
                />
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  className={`text-[10px] font-medium ${config.color} fill-current`}
                >
                  {node.name}
                </text>
                <text
                  x={node.x}
                  y={node.y - 8}
                  textAnchor="middle"
                  className="fill-zinc-400 text-[8px] uppercase"
                >
                  {node.type}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 shadow-sm">
          <div className="flex items-center gap-3">
            {Object.entries(typeConfig).map(([type, config]) => (
              <div key={type} className="flex items-center gap-1">
                <config.icon size={10} className={config.color} />
                <span className="text-[9px] text-zinc-500">{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected info */}
        {selectedNode && (
          <div className="absolute top-3 right-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 shadow-sm w-[200px]">
            <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-200">
              {mockNodes.find((n) => n.id === selectedNode)?.name}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {connectedEdges.length} 个连接
            </p>
            <div className="mt-1.5 space-y-0.5">
              {connectedEdges.slice(0, 5).map((e, i) => (
                <p key={i} className="text-[10px] text-zinc-500">
                  {e.label} → {e.from === selectedNode ? e.to.split("-").pop() : e.from.split("-").pop()}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
