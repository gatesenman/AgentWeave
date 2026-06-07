import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  ArrowRightLeft,
  Check,
  ChevronRight,
  FileCode2,
  FolderOpen,
  Loader2,
  AlertCircle,
} from "lucide-react";

type Step = "select" | "scan" | "preview" | "complete";

interface DetectedFile {
  path: string;
  vendor: string;
  concepts: { agents: number; rules: number; mcp: number };
}

const vendorSources = [
  { id: "cursor", name: "Cursor", files: [".cursorrules", ".cursor/rules/*.mdc"] },
  { id: "claude", name: "Claude Code", files: ["CLAUDE.md", ".claude/settings.json"] },
  { id: "codex", name: "Codex", files: ["AGENTS.md", "codex.md"] },
  { id: "windsurf", name: "Windsurf", files: [".windsurfrules", ".windsurf/rules/*.md"] },
  { id: "copilot", name: "GitHub Copilot", files: [".github/copilot-instructions.md"] },
  { id: "cline", name: "Cline", files: [".clinerules", ".cline/rules.md"] },
];

const mockDetected: DetectedFile[] = [
  { path: ".cursorrules", vendor: "Cursor", concepts: { agents: 1, rules: 5, mcp: 0 } },
  { path: ".cursor/rules/testing.mdc", vendor: "Cursor", concepts: { agents: 0, rules: 3, mcp: 0 } },
  { path: "CLAUDE.md", vendor: "Claude Code", concepts: { agents: 1, rules: 2, mcp: 2 } },
];

export default function MigrationWizard() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("select");
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [detected, setDetected] = useState<DetectedFile[]>([]);

  const toggleVendor = (id: string) => {
    setSelectedVendors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startScan = () => {
    setIsScanning(true);
    setStep("scan");
    setTimeout(() => {
      setDetected(mockDetected);
      setIsScanning(false);
      setStep("preview");
    }, 2000);
  };

  const doImport = () => {
    setStep("complete");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
          <ArrowRightLeft size={16} className="text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
            {t("migration.title", "迁移向导")}
          </h2>
          <p className="text-[11px] text-zinc-400">
            {t("migration.subtitle", "从现有厂商配置一键迁移到 AgentWeave 统一管理")}
          </p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2 shrink-0">
        {(["select", "scan", "preview", "complete"] as Step[]).map((s, i) => {
          const labels = ["选择来源", "扫描文件", "预览结果", "完成导入"];
          const isActive = step === s;
          const isPast = ["select", "scan", "preview", "complete"].indexOf(step) > i;
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <ChevronRight size={12} className="text-zinc-300 dark:text-zinc-600" />}
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium ${
                isActive ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" :
                isPast ? "text-emerald-600 dark:text-emerald-400" :
                "text-zinc-400"
              }`}>
                {isPast ? <Check size={11} /> : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[9px]">{i + 1}</span>}
                {labels[i]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-5 py-4">
        {step === "select" && (
          <div className="space-y-3">
            <p className="text-[12px] text-zinc-500 mb-4">
              选择要导入的厂商配置来源，AgentWeave 将自动扫描并解析这些配置文件。
            </p>
            <div className="grid grid-cols-2 gap-2">
              {vendorSources.map((vendor) => (
                <button
                  key={vendor.id}
                  onClick={() => toggleVendor(vendor.id)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedVendors.has(vendor.id)
                      ? "border-indigo-300 dark:border-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/10"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {selectedVendors.has(vendor.id) && <Check size={12} className="text-indigo-500" />}
                    <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200">{vendor.name}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 font-mono">{vendor.files.join(", ")}</p>
                </button>
              ))}
            </div>
            <button
              onClick={startScan}
              disabled={selectedVendors.size === 0}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-40 transition-colors shadow-sm"
            >
              <FolderOpen size={13} />
              开始扫描
            </button>
          </div>
        )}

        {step === "scan" && (
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-center">
              <Loader2 size={28} className="text-indigo-500 animate-spin mx-auto mb-3" />
              <p className="text-[13px] text-zinc-600 dark:text-zinc-300">正在扫描项目文件...</p>
              <p className="text-[11px] text-zinc-400 mt-1">检测已有配置文件并解析概念</p>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Check size={14} className="text-emerald-500" />
              <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200">
                检测到 {detected.length} 个配置文件
              </span>
            </div>
            {detected.map((file) => (
              <div key={file.path} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <FileCode2 size={13} className="text-zinc-400" />
                  <span className="text-[12px] font-mono text-zinc-700 dark:text-zinc-200">{file.path}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-500">{file.vendor}</span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[10px] text-zinc-400">
                  {file.concepts.agents > 0 && <span>{file.concepts.agents} agents</span>}
                  {file.concepts.rules > 0 && <span>{file.concepts.rules} rules</span>}
                  {file.concepts.mcp > 0 && <span>{file.concepts.mcp} MCP servers</span>}
                </div>
              </div>
            ))}
            <button
              onClick={doImport}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <ArrowRightLeft size={13} />
              确认导入
            </button>
          </div>
        )}

        {step === "complete" && (
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <Check size={28} className="text-emerald-500" />
              </div>
              <h3 className="text-[15px] font-semibold text-zinc-800 dark:text-zinc-100">迁移完成</h3>
              <p className="text-[12px] text-zinc-500 mt-1">已成功导入 {detected.length} 个文件的配置到 AgentWeave</p>
              <p className="text-[11px] text-zinc-400 mt-2">你可以在「配置中心」查看和编辑导入的内容</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
