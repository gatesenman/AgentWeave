import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { Network, FileCode2, ChevronRight, ArrowRight } from "lucide-react";
import { getInheritanceTree, type InheritanceData, type InheritanceNode, type ResolvedField } from "../lib/tauri";
import { useConfigStore } from "../store/config";

export default function InheritanceView() {
  const { t } = useTranslation();
  const projectDir = useConfigStore((s) => s.projectDir) || "";
  const [data, setData] = useState<InheritanceData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectDir) return;
    try { setData(await getInheritanceTree(projectDir)); } catch (e) { console.error("getInheritanceTree", e); }
  }, [projectDir]);
  useEffect(() => { load(); }, [load]);

  const nodes = data?.nodes ?? [];
  const resolved = data?.resolved ?? [];

  const findNode = (id: string): InheritanceNode | undefined => nodes.find((n) => n.id === id);

  const renderNode = (node: InheritanceNode, depth: number = 0) => (
    <div key={node.id} style={{ marginLeft: depth * 20 }}>
      <button
        onClick={() => setSelected(node.id)}
        className={`w-full text-left px-3 py-2 rounded-md text-[12px] flex items-center gap-2 mb-1 ${
          selected === node.id
            ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
            : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        }`}
      >
        {depth > 0 && <ArrowRight size={10} className="text-zinc-400" />}
        <FileCode2 size={12} className={node.is_remote ? "text-orange-400" : "text-zinc-400"} />
        <span className="font-medium">{node.name}</span>
        {node.is_remote && <span className="text-[9px] px-1 py-0.5 rounded bg-orange-50 dark:bg-orange-500/10 text-orange-500">remote</span>}
        <span className="text-[10px] text-zinc-400 ml-auto">{node.field_count} 字段</span>
      </button>
      {node.children.map((childId) => {
        const child = findNode(childId);
        return child ? renderNode(child, depth + 1) : null;
      })}
    </div>
  );

  const rootNodes = nodes.filter((n) => !nodes.some((p) => p.children.includes(n.id)));
  const selectedNode = selected ? findNode(selected) : undefined;
  const selectedFields: ResolvedField[] = selectedNode
    ? resolved.filter((f) => f.source === selectedNode.name || f.source === selectedNode.path)
    : [];

  return (
    <div className="h-full flex">
      <div className="w-[300px] border-r border-zinc-100 dark:border-zinc-800 flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
          <Network size={14} className="text-teal-500" />
          <span className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">{t("inherit.title", "继承链")}</span>
        </div>
        <div className="flex-1 overflow-auto p-3">
          {!projectDir && <p className="text-[12px] text-zinc-400 text-center py-4">请先打开一个项目</p>}
          {projectDir && !data && <p className="text-[12px] text-zinc-400 text-center py-4">加载中...</p>}
          {nodes.length === 0 && data && <p className="text-[12px] text-zinc-400 text-center py-4">暂无继承关系</p>}
          {rootNodes.map((n) => renderNode(n))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        {selectedNode ? (
          <div className="flex-1 overflow-auto px-5 py-4">
            <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100 mb-1">{selectedNode.name}</h2>
            <p className="text-[11px] text-zinc-400 mb-3">路径: {selectedNode.path} · {selectedNode.field_count} 个字段</p>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
              <h3 className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 mb-2">字段溯源（最终生效值）</h3>
              {selectedFields.length === 0 ? (
                <p className="text-[11px] text-zinc-400">无字段信息</p>
              ) : (
                <div className="space-y-1">
                  {selectedFields.map((f) => (
                    <div key={f.key} className="flex items-center gap-2 text-[11px]">
                      <span className="font-mono text-zinc-700 dark:text-zinc-200 w-[120px] truncate">{f.key}</span>
                      <ChevronRight size={10} className="text-zinc-300" />
                      <span className="text-zinc-500 truncate">{f.value}</span>
                      <span className="text-[9px] text-zinc-400 ml-auto">{f.source}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedNode.children.length > 0 && (
              <div className="mt-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                <h3 className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 mb-2">继承自</h3>
                <div className="space-y-1">
                  {selectedNode.children.map((cid) => {
                    const child = findNode(cid);
                    return (
                      <div key={cid} className="text-[11px] text-zinc-500 flex items-center gap-2">
                        <ArrowRight size={10} className="text-zinc-400" />
                        {child ? child.name : cid}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[12px] text-zinc-400">选择节点查看详情</div>
        )}
      </div>
    </div>
  );
}
