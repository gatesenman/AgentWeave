import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback, useMemo } from "react";
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
import { getConfigConcepts, type ConceptItem } from "../lib/tauri";
import { useConfigStore } from "../store/config";

interface GraphNode {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
}

interface GraphEdge {
  from: string;
  to: string;
  label: string;
}

const typeConfig: Record<string, { color: string; bg: string; icon: typeof Cpu }> = {
  agent: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30", icon: Cpu },
  rule: { color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30", icon: BookOpen },
  mcp: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30", icon: Server },
  skill: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30", icon: Sparkles },
  workflow: { color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30", icon: GitBranch },
  hook: { color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30", icon: Anchor },
};

function buildGraph(concepts: ConceptItem[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const typeGroups: Record<string, ConceptItem[]> = {};
  concepts.forEach((c) => {
    const t = c.concept_type.toLowerCase().replace(/s$/, "");
    if (!typeGroups[t]) typeGroups[t] = [];
    typeGroups[t].push(c);
  });

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const typeOrder = ["agent", "rule", "mcp", "skill", "workflow", "hook"];
  const columnX: Record<string, number> = { agent: 400, rule: 200, mcp: 600, skill: 350, workflow: 150, hook: 650 };
  const startY: Record<string, number> = { agent: 80, rule: 100, mcp: 100, skill: 380, workflow: 380, hook: 380 };

  typeOrder.forEach((type) => {
    const items = typeGroups[type] || [];
    items.forEach((item, i) => {
      const id = `${type}-${i}`;
      const x = columnX[type] || 400;
      const y = (startY[type] || 80) + i * 70;
      nodes.push({ id, type, name: item.name, x, y });
    });
  });

  const agentNodes = nodes.filter((n) => n.type === "agent");
  const ruleNodes = nodes.filter((n) => n.type === "rule");
  const mcpNodes = nodes.filter((n) => n.type === "mcp");
  const skillNodes = nodes.filter((n) => n.type === "skill");
  const workflowNodes = nodes.filter((n) => n.type === "workflow");
  const hookNodes = nodes.filter((n) => n.type === "hook");

  agentNodes.forEach((agent, ai) => {
    ruleNodes.forEach((rule, ri) => {
      if (ri % agentNodes.length === ai || agentNodes.length === 1) {
        edges.push({ from: agent.id, to: rule.id, label: "uses" });
      }
    });
    mcpNodes.forEach((mcp, mi) => {
      if (mi % agentNodes.length === ai || agentNodes.length === 1) {
        edges.push({ from: agent.id, to: mcp.id, label: "connects" });
      }
    });
    skillNodes.forEach((skill, si) => {
      if (si % agentNodes.length === ai || agentNodes.length === 1) {
        edges.push({ from: agent.id, to: skill.id, label: "has" });
      }
    });
  });
  workflowNodes.forEach((wf) => {
    if (agentNodes.length > 0) edges.push({ from: wf.id, to: agentNodes[0].id, label: "triggers" });
  });
  hookNodes.forEach((hk) => {
    if (agentNodes.length > 0) edges.push({ from: hk.id, to: agentNodes[agentNodes.length - 1].id, label: "triggers" });
  });

  return { nodes, edges };
}

export default function ConceptGraph() {
  const { t } = useTranslation();
  const projectDir = useConfigStore((s) => s.projectDir) || "";
  const [concepts, setConcepts] = useState<ConceptItem[]>([]);
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectDir) return;
    try { setConcepts(await getConfigConcepts(projectDir)); } catch (e) { console.error("getConfigConcepts", e); }
  }, [projectDir]);
  useEffect(() => { load(); }, [load]);

  const { nodes, edges } = useMemo(() => buildGraph(concepts), [concepts]);

  const connectedEdges = useMemo(() => {
    if (!selectedNode) return edges;
    return edges.filter((e) => e.from === selectedNode || e.to === selectedNode);
  }, [selectedNode, edges]);

  const connectedNodeIds = useMemo(() => {
    if (!selectedNode) return new Set(nodes.map((n) => n.id));
    const ids = new Set<string>([selectedNode]);
    connectedEdges.forEach((e) => { ids.add(e.from); ids.add(e.to); });
    return ids;
  }, [selectedNode, connectedEdges, nodes]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
          <Network size={16} className="text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
            {t("graph.title", "概念关联图")}
          </h2>
          <p className="text-[11px] text-zinc-400">
            {t("graph.subtitle", "Agent -> MCP -> Rule 依赖关系可视化")}
          </p>
        </div>
        <div className="flex-1" />
        <span className="text-[11px] text-zinc-400">{nodes.length} 节点 · {edges.length} 连接</span>
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

      <div className="flex-1 overflow-hidden relative bg-zinc-50/50 dark:bg-zinc-900/50">
        {!projectDir && (
          <div className="absolute inset-0 flex items-center justify-center text-[12px] text-zinc-400">请先打开一个项目</div>
        )}
        {projectDir && nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[12px] text-zinc-400">暂无概念数据</div>
        )}
        {nodes.length > 0 && (
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 800 550"
            className="absolute inset-0"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
          >
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-zinc-200 dark:text-zinc-800" />
              </pattern>
            </defs>
            <rect width="800" height="550" fill="url(#grid)" />

            {connectedEdges.map((edge, i) => {
              const from = nodes.find((n) => n.id === edge.from);
              const to = nodes.find((n) => n.id === edge.to);
              if (!from || !to) return null;
              return (
                <g key={i}>
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="currentColor" strokeWidth="1.5" className="text-zinc-300 dark:text-zinc-600" strokeDasharray={edge.label === "triggers" ? "4 2" : undefined} />
                  <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 6} textAnchor="middle" className="fill-zinc-400 text-[9px]">{edge.label}</text>
                </g>
              );
            })}

            {nodes.map((node) => {
              const config = typeConfig[node.type] || typeConfig["agent"];
              const isActive = connectedNodeIds.has(node.id);
              const isSelected = selectedNode === node.id;
              return (
                <g key={node.id} onClick={() => setSelectedNode(isSelected ? null : node.id)} className="cursor-pointer" opacity={isActive ? 1 : 0.3}>
                  <rect x={node.x - 55} y={node.y - 16} width={110} height={32} rx={6} fill="white" stroke={isSelected ? "#6366f1" : "#e4e4e7"} strokeWidth={isSelected ? 2 : 1} className="dark:fill-zinc-800" />
                  <text x={node.x} y={node.y + 4} textAnchor="middle" className={`text-[10px] font-medium ${config.color} fill-current`}>{node.name}</text>
                  <text x={node.x} y={node.y - 8} textAnchor="middle" className="fill-zinc-400 text-[8px] uppercase">{node.type}</text>
                </g>
              );
            })}
          </svg>
        )}

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

        {selectedNode && (
          <div className="absolute top-3 right-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 shadow-sm w-[200px]">
            <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-200">
              {nodes.find((n) => n.id === selectedNode)?.name}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {connectedEdges.length} 个连接
            </p>
            <div className="mt-1.5 space-y-0.5">
              {connectedEdges.slice(0, 5).map((e, i) => (
                <p key={i} className="text-[10px] text-zinc-500">
                  {e.label} {"->"} {e.from === selectedNode ? nodes.find(n => n.id === e.to)?.name : nodes.find(n => n.id === e.from)?.name}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
