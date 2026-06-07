import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useConfigStore } from "../store/config";
import { getConfigConcepts, type ConceptItem } from "../lib/tauri";
import {
  Cpu, BookOpen, Server, Sparkles, GitBranch, Anchor,
  Wrench, Brain, FileText, Code2, FolderTree, Plus, ChevronRight, ChevronDown
} from "lucide-react";

type ConceptType = "agents" | "rules" | "mcp_servers" | "skills" | "workflows" | "hooks" | "tools" | "models" | "context" | "templates" | "source";

interface ConceptSection {
  key: ConceptType;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  labelKey: string;
  color: string;
  backendType: string;
}

const conceptSections: ConceptSection[] = [
  { key: "agents", icon: Cpu, labelKey: "config.agents", color: "text-blue-500", backendType: "agents" },
  { key: "rules", icon: BookOpen, labelKey: "config.rules", color: "text-purple-500", backendType: "rules" },
  { key: "mcp_servers", icon: Server, labelKey: "config.mcpServers", color: "text-emerald-500", backendType: "mcp_servers" },
  { key: "skills", icon: Sparkles, labelKey: "config.skills", color: "text-amber-500", backendType: "skills" },
  { key: "workflows", icon: GitBranch, labelKey: "config.workflows", color: "text-cyan-500", backendType: "workflows" },
  { key: "hooks", icon: Anchor, labelKey: "config.hooks", color: "text-rose-500", backendType: "hooks" },
  { key: "tools", icon: Wrench, labelKey: "config.tools", color: "text-orange-500", backendType: "tools" },
  { key: "models", icon: Brain, labelKey: "config.models", color: "text-indigo-500", backendType: "models" },
  { key: "context", icon: FileText, labelKey: "config.context", color: "text-teal-500", backendType: "context" },
  { key: "templates", icon: Code2, labelKey: "config.templates", color: "text-pink-500", backendType: "templates" },
  { key: "source", icon: FolderTree, labelKey: "config.source", color: "text-zinc-500", backendType: "source" },
];

export default function ConfigHub() {
  const { t } = useTranslation();
  const { projectDir } = useConfigStore();
  const [activeConcept, setActiveConcept] = useState<ConceptType>("agents");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["agents", "rules", "mcp_servers"]));
  const [concepts, setConcepts] = useState<ConceptItem[]>([]);

  const load = useCallback(async () => {
    if (!projectDir) return;
    try { setConcepts(await getConfigConcepts(projectDir)); } catch (e) { console.error("getConfigConcepts", e); }
  }, [projectDir]);
  useEffect(() => { load(); }, [load]);

  if (!projectDir) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
            <FolderTree size={22} className="text-zinc-400" />
          </div>
          <p className="text-[13px] text-zinc-500">{t("common.selectProject")}</p>
        </div>
      </div>
    );
  }

  const toggleSection = (key: string) => {
    const next = new Set(expandedSections);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedSections(next);
  };

  const getConceptsByType = (type: string): ConceptItem[] =>
    concepts.filter((c) => c.concept_type === type);

  const getCount = (key: ConceptType): number => {
    const section = conceptSections.find((s) => s.key === key);
    return section ? getConceptsByType(section.backendType).length : 0;
  };

  return (
    <div className="h-full flex">
      <div className="w-[220px] h-full border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto shrink-0">
        <div className="px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            {t("config.conceptTree", "概念导航")}
          </h3>
        </div>
        <div className="py-1">
          {conceptSections.map((section) => {
            const Icon = section.icon;
            const count = getCount(section.key);
            const isExpanded = expandedSections.has(section.key);
            const isActive = activeConcept === section.key;
            return (
              <div key={section.key}>
                <button
                  onClick={() => { setActiveConcept(section.key); toggleSection(section.key); }}
                  className={`w-full flex items-center gap-2 px-3 py-[6px] text-[12px] font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {isExpanded ? <ChevronDown size={12} className="text-zinc-400 shrink-0" /> : <ChevronRight size={12} className="text-zinc-400 shrink-0" />}
                  <Icon size={14} className={`shrink-0 ${section.color}`} />
                  <span className="flex-1 text-left truncate">{t(section.labelKey)}</span>
                  {count > 0 && (
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
                      {count}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {(() => { const c = conceptSections.find(s => s.key === activeConcept); const Icon = c?.icon ?? Cpu; return <Icon size={16} className={c?.color ?? ""} />; })()}
            <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
              {t(conceptSections.find(s => s.key === activeConcept)?.labelKey ?? "")}
            </h2>
            <span className="text-[11px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
              {getCount(activeConcept)} {t("config.items", "项")}
            </span>
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus size={12} />
            {t("config.add", "新增")}
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          <ConceptContent
            type={activeConcept}
            items={getConceptsByType(conceptSections.find(s => s.key === activeConcept)?.backendType ?? "")}
          />
        </div>
      </div>
    </div>
  );
}

function ConceptContent({ type, items }: { type: ConceptType; items: ConceptItem[] }) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <div className="text-center">
          <p className="text-[13px] text-zinc-500">{t("config.emptySection", "暂无配置项")}</p>
          <p className="text-[11px] text-zinc-400 mt-1">{t("config.addHint")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-colors cursor-pointer">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100">{item.name}</h4>
              {item.description && (
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">{item.description}</p>
              )}
            </div>
            <span className="text-[11px] px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full font-medium">
              {item.concept_type}
            </span>
          </div>
          {item.fields.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {item.fields.slice(0, 6).map((f) => (
                <span key={f} className="text-[10px] px-1.5 py-0.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 rounded font-mono">{f}</span>
              ))}
              {item.fields.length > 6 && (
                <span className="text-[10px] px-1.5 py-0.5 text-zinc-400">+{item.fields.length - 6}</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
