import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Search, Cpu, BookOpen, Server, Sparkles, GitBranch, Anchor, Users, Bell, FlaskConical, FileText, FolderTree } from "lucide-react";
import { globalSearch, type SearchResult } from "../lib/tauri";
import { useConfigStore } from "../store/config";

const typeIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Agent: Cpu,
  Rule: BookOpen,
  "MCP Server": Server,
  Skill: Sparkles,
  Workflow: GitBranch,
  Hook: Anchor,
  Template: FileText,
  "Team Member": Users,
  Webhook: Bell,
  Policy: FolderTree,
  Experiment: FlaskConical,
};

const typeColors: Record<string, string> = {
  Agent: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
  Rule: "text-purple-500 bg-purple-50 dark:bg-purple-500/10",
  "MCP Server": "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
  Skill: "text-amber-500 bg-amber-50 dark:bg-amber-500/10",
  Workflow: "text-cyan-500 bg-cyan-50 dark:bg-cyan-500/10",
  Hook: "text-rose-500 bg-rose-50 dark:bg-rose-500/10",
  Template: "text-pink-500 bg-pink-50 dark:bg-pink-500/10",
  "Team Member": "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10",
  Webhook: "text-orange-500 bg-orange-50 dark:bg-orange-500/10",
  Policy: "text-teal-500 bg-teal-50 dark:bg-teal-500/10",
  Experiment: "text-violet-500 bg-violet-50 dark:bg-violet-500/10",
};

const typeRoutes: Record<string, string> = {
  Agent: "/config", Rule: "/config", "MCP Server": "/config", Skill: "/config",
  Workflow: "/config", Hook: "/config", Template: "/templates",
  "Team Member": "/team", Webhook: "/webhooks", Policy: "/governance",
  Experiment: "/perf",
};

export default function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const projectDir = useConfigStore((s) => s.projectDir) || "";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await globalSearch(projectDir, q.trim());
      setResults(r);
    } catch (e) { console.error("globalSearch", e); }
    setSearching(false);
  }, [projectDir]);

  const handleSelect = (result: SearchResult) => {
    navigate(typeRoutes[result.entity_type] || "/config");
  };

  const entityTypes = useMemo(() => {
    const types = new Set(results.map(r => r.entity_type));
    return Array.from(types);
  }, [results]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
        <div className="relative max-w-[600px] mx-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder={t("search.placeholder", "搜索 Agent、Rule、MCP、模板、成员、Webhook...")}
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
            <p className="text-[13px] text-zinc-500">{t("search.hint", "搜索配置概念、模板、团队成员、Webhook 等")}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {Object.keys(typeColors).map(type => {
                const Icon = typeIcons[type] || Search;
                return (
                  <span key={type} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${typeColors[type] || "text-zinc-500 bg-zinc-100"}`}>
                    <Icon size={11} /> {type}
                  </span>
                );
              })}
            </div>
          </div>
        ) : searching ? (
          <div className="text-center py-12 text-[13px] text-zinc-400">搜索中...</div>
        ) : results.length === 0 && query.trim() !== "" ? (
          <div className="text-center py-12">
            <p className="text-[13px] text-zinc-500">{t("search.noResults", "没有找到匹配的结果")}</p>
          </div>
        ) : (
          <div className="max-w-[600px] mx-auto space-y-1">
            <p className="text-[11px] text-zinc-400 mb-2">
              {results.length} {t("search.results", "个结果")}
              {entityTypes.length > 1 && ` · ${entityTypes.length} 种类型`}
            </p>
            {results.map((result, i) => {
              const Icon = typeIcons[result.entity_type] || Search;
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(result)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${typeColors[result.entity_type] || "text-zinc-500 bg-zinc-100"}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100">{result.name}</div>
                    <div className="text-[11px] text-zinc-400 truncate">{result.detail}</div>
                  </div>
                  <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                    {result.entity_type}
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
