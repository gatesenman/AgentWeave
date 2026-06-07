import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  GitMerge,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";

interface ConflictEntry {
  id: string;
  file: string;
  concept: string;
  field: string;
  local: string;
  remote: string;
  resolved: boolean;
  resolution?: "local" | "remote" | "merged";
}

const mockConflicts: ConflictEntry[] = [
  {
    id: "1",
    file: "agentweave.yaml",
    concept: "agents[0]",
    field: "description",
    local: "Senior software architect with 10+ years of experience in distributed systems.",
    remote: "Full-stack architect specializing in microservices and cloud-native applications.",
    resolved: false,
  },
  {
    id: "2",
    file: "agentweave.yaml",
    concept: "rules[2]",
    field: "content",
    local: "Always use TypeScript strict mode with noImplicitAny enabled.",
    remote: "Use TypeScript strict mode. Prefer explicit return types on all public functions.",
    resolved: false,
  },
  {
    id: "3",
    file: "agentweave.yaml",
    concept: "mcp_servers[0]",
    field: "args",
    local: '["--port", "3000", "--host", "localhost"]',
    remote: '["--port", "8080", "--host", "0.0.0.0", "--cors"]',
    resolved: false,
  },
];

export default function ConflictResolver() {
  const { t } = useTranslation();
  const [conflicts, setConflicts] = useState<ConflictEntry[]>(mockConflicts);
  const [activeConflict, setActiveConflict] = useState<string>(mockConflicts[0]?.id ?? "");

  const resolveConflict = (id: string, resolution: "local" | "remote" | "merged") => {
    setConflicts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, resolved: true, resolution } : c))
    );
  };

  const resolvedCount = conflicts.filter((c) => c.resolved).length;
  const active = conflicts.find((c) => c.id === activeConflict);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
          <GitMerge size={16} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
            {t("conflict.title", "冲突解决")}
          </h2>
          <p className="text-[11px] text-zinc-400">
            {resolvedCount}/{conflicts.length} {t("conflict.resolved", "已解决")}
          </p>
        </div>
        <div className="flex-1" />
        <button
          disabled={resolvedCount < conflicts.length}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-40 shadow-sm"
        >
          <Check size={12} />
          {t("conflict.applyAll", "应用全部")}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Conflict list (left) */}
        <div className="w-[240px] border-r border-zinc-100 dark:border-zinc-800 overflow-y-auto shrink-0">
          {conflicts.map((conflict) => (
            <button
              key={conflict.id}
              onClick={() => setActiveConflict(conflict.id)}
              className={`w-full px-3 py-2.5 text-left border-b border-zinc-50 dark:border-zinc-800/50 transition-colors ${
                activeConflict === conflict.id
                  ? "bg-indigo-50 dark:bg-indigo-500/10"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <div className="flex items-center gap-2">
                {conflict.resolved ? (
                  <Check size={12} className="text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                )}
                <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200 truncate">
                  {conflict.concept}.{conflict.field}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5 truncate pl-5">{conflict.file}</p>
            </button>
          ))}
        </div>

        {/* Diff view (right) */}
        {active && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Diff header */}
            <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-4 shrink-0">
              <span className="text-[11px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                {active.concept}.{active.field}
              </span>
              {active.resolved && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {active.resolution === "local" ? "Local" : active.resolution === "remote" ? "Remote" : "Merged"}
                </span>
              )}
            </div>

            {/* Three-way compare */}
            <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
              {/* Local (ours) */}
              <div className="border-r border-zinc-100 dark:border-zinc-800 flex flex-col overflow-hidden">
                <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-500/5 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2 shrink-0">
                  <ArrowLeft size={11} className="text-blue-500" />
                  <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                    {t("conflict.local", "本地 (Ours)")}
                  </span>
                </div>
                <div className="flex-1 p-3 overflow-auto">
                  <pre className="text-[12px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed bg-blue-50/50 dark:bg-blue-500/5 p-2 rounded border border-blue-100 dark:border-blue-500/10">
                    {active.local}
                  </pre>
                </div>
              </div>

              {/* Remote (theirs) */}
              <div className="flex flex-col overflow-hidden">
                <div className="px-3 py-1.5 bg-purple-50 dark:bg-purple-500/5 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2 shrink-0">
                  <ArrowRight size={11} className="text-purple-500" />
                  <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
                    {t("conflict.remote", "远端 (Theirs)")}
                  </span>
                </div>
                <div className="flex-1 p-3 overflow-auto">
                  <pre className="text-[12px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed bg-purple-50/50 dark:bg-purple-500/5 p-2 rounded border border-purple-100 dark:border-purple-500/10">
                    {active.remote}
                  </pre>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 shrink-0">
              <button
                onClick={() => resolveConflict(active.id, "local")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 rounded-md hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
              >
                <ArrowLeft size={11} />
                {t("conflict.useLocal", "使用本地")}
              </button>
              <button
                onClick={() => resolveConflict(active.id, "remote")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 rounded-md hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors"
              >
                <ArrowRight size={11} />
                {t("conflict.useRemote", "使用远端")}
              </button>
              <button
                onClick={() => resolveConflict(active.id, "merged")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-md hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
              >
                <GitMerge size={11} />
                {t("conflict.merge", "手动合并")}
              </button>
              <div className="flex-1" />
              <button className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                <X size={11} />
                {t("conflict.skip", "跳过")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
