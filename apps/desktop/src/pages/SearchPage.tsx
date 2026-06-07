import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Search, Cpu, BookOpen, Server, Sparkles, GitBranch, Anchor } from "lucide-react";
import { getConfigConcepts, type ConceptItem } from "../lib/tauri";
import { useConfigStore } from "../store/config";

const typeIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  agents: Cpu, agent: Cpu,
  rules: BookOpen, rule: BookOpen,
  mcp_servers: Server, mcp: Server,
  skills: Sparkles, skill: Sparkles,
  workflows: GitBranch, workflow: GitBranch,
  hooks: Anchor, hook: Anchor,
};

const typeColors: Record<string, string> = {
  agents: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
  rules: "text-purple-500 bg-purple-50 dark:bg-purple-500/10",
  mcp_servers: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
  skills: "text-amber-500 bg-amber-50 dark:bg-amber-500/10",
  workflows: "text-cyan-500 bg-cyan-50 dark:bg-cyan-500/10",
  hooks: "text-rose-500 bg-rose-50 dark:bg-rose-500/10",
};

export default function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const projectDir = useConfigStore((s) => s.projectDir) || "";
  const [query, setQuery] = useState("");
  const [concepts, setConcepts] = useState<ConceptItem[]>([]);

  const load = useCallback(async () => {
    if (!projectDir) return;
    try { setConcepts(await getConfigConcepts(projectDir)); } catch (e) { console.error("getConfigConcepts", e); }
  }, [projectDir]);
  useEffect(() => { load(); }, [load]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return concepts.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.concept_type.toLowerCase().includes(q)
    );
  }, [query, concepts]);

  const handleSelect = (_result: ConceptItem) => {
    navigate("/config");
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
        <div className="relative max-w-[600px] mx-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t("search.placeholder", "搜索 Agent、Rule、MCP Server、Skill...")}
            autoFocus
            className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-zinc-700 dark:text-zinc-200 placeholder:text-zinc-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4">
        {!projectDir && (
          <div className="text-center py-12 text-[13px] text-zinc-400">请先打开一个项目</div>
        )}
        {projectDir && query.trim() === "" ? (
          <div className="text-center py-12">
            <Search size={32} className="text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-[13px] text-zinc-500">{t("search.hint", "输入关键词搜索配置中的所有概念")}</p>
            <p className="text-[11px] text-zinc-400 mt-1">共 {concepts.length} 个概念</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {["agents", "rules", "mcp_servers", "skills", "workflows", "hooks"].map(type => {
                const Icon = typeIcons[type] || Search;
                return (
                  <span key={type} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${typeColors[type] || "text-zinc-500 bg-zinc-100"}`}>
                    <Icon size={11} /> {type}
                  </span>
                );
              })}
            </div>
          </div>
        ) : results.length === 0 && query.trim() !== "" ? (
          <div className="text-center py-12">
            <p className="text-[13px] text-zinc-500">{t("search.noResults", "没有找到匹配的结果")}</p>
          </div>
        ) : (
          <div className="max-w-[600px] mx-auto space-y-1">
            <p className="text-[11px] text-zinc-400 mb-2">{results.length} {t("search.results", "个结果")}</p>
            {results.map((result, i) => {
              const Icon = typeIcons[result.concept_type] || Search;
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(result)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${typeColors[result.concept_type] || "text-zinc-500 bg-zinc-100"}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100">{result.name}</div>
                    <div className="text-[11px] text-zinc-400 truncate">{result.description}</div>
                  </div>
                  <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                    {result.concept_type}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
