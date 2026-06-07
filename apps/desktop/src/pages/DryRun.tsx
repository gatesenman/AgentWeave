import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Eye,
  Play,
  FileCode2,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Info,
  Copy,
  FileText,
} from "lucide-react";

interface DryRunResult {
  vendor: string;
  files: { path: string; content: string; lines: number }[];
  warnings: string[];
  lostConcepts: string[];
}

const mockResults: DryRunResult[] = [
  {
    vendor: "Cursor",
    files: [
      { path: ".cursor/rules/main-architect.mdc", content: "---\ndescription: Senior software architect\nglobs: [\"**/*.ts\", \"**/*.tsx\"]\nalwaysApply: true\n---\n\n# Main Architect Agent\n\nYou are a senior software architect...\n\n## Rules\n- Always use TypeScript strict mode\n- Prefer functional components\n- Use existing utilities from lib/", lines: 24 },
      { path: ".cursor/rules/testing.mdc", content: "---\ndescription: Testing guidelines\nglobs: [\"**/*.test.*\"]\n---\n\n# Testing Rules\n\n- Use vitest for unit tests\n- Mock external dependencies\n- Aim for 80% coverage", lines: 12 },
    ],
    warnings: ["Cursor does not support workflow definitions"],
    lostConcepts: ["workflows", "hooks"],
  },
  {
    vendor: "Claude Code",
    files: [
      { path: "CLAUDE.md", content: "# Project Guidelines\n\n## Agent: main-architect\nSenior software architect with expertise in distributed systems.\n\n## Rules\n1. Always use TypeScript strict mode\n2. Prefer functional components\n3. Use existing utilities\n\n## MCP Servers\n- postgres: postgresql://localhost:5432/dev\n- filesystem: /workspace", lines: 18 },
    ],
    warnings: [],
    lostConcepts: ["workflows"],
  },
  {
    vendor: "Codex",
    files: [
      { path: "AGENTS.md", content: "# Agent Configuration\n\n## main-architect\n- Role: Senior software architect\n- Expertise: Distributed systems, TypeScript\n\n## Rules\n- TypeScript strict mode required\n- Functional components preferred\n- Utilize existing lib/ utilities", lines: 14 },
    ],
    warnings: ["Codex format limited to markdown only"],
    lostConcepts: ["mcp_servers", "workflows", "hooks"],
  },
];

export default function DryRun() {
  const { t } = useTranslation();
  const [results, setResults] = useState<DryRunResult[]>(mockResults);
  const [activeVendor, setActiveVendor] = useState(mockResults[0]?.vendor ?? "");
  const [activeFile, setActiveFile] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const activeResult = results.find((r) => r.vendor === activeVendor);

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => setIsRunning(false), 1500);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
          <Eye size={16} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
            {t("dryrun.title", "生成预览 (Dry-Run)")}
          </h2>
          <p className="text-[11px] text-zinc-400">
            {t("dryrun.subtitle", "预览每个厂商将生成的确切内容，无需实际写入文件")}
          </p>
        </div>
        <div className="flex-1" />
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
        >
          <Play size={12} />
          {isRunning ? t("dryrun.running", "预览中...") : t("dryrun.run", "运行预览")}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Vendor list */}
        <div className="w-[180px] border-r border-zinc-100 dark:border-zinc-800 overflow-y-auto shrink-0">
          {results.map((result) => (
            <button
              key={result.vendor}
              onClick={() => { setActiveVendor(result.vendor); setActiveFile(0); }}
              className={`w-full px-3 py-2.5 text-left border-b border-zinc-50 dark:border-zinc-800/50 transition-colors ${
                activeVendor === result.vendor
                  ? "bg-indigo-50 dark:bg-indigo-500/10"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200">{result.vendor}</span>
                {result.warnings.length > 0 ? (
                  <AlertCircle size={11} className="text-amber-500" />
                ) : (
                  <CheckCircle2 size={11} className="text-emerald-500" />
                )}
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                {result.files.length} files · {result.files.reduce((s, f) => s + f.lines, 0)} lines
              </p>
            </button>
          ))}
        </div>

        {/* Preview content */}
        {activeResult && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Warnings */}
            {activeResult.warnings.length > 0 && (
              <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 space-y-1">
                {activeResult.warnings.map((warn, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <AlertCircle size={11} className="text-amber-500 shrink-0" />
                    <span className="text-[11px] text-amber-600 dark:text-amber-400">{warn}</span>
                  </div>
                ))}
                {activeResult.lostConcepts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Info size={11} className="text-zinc-400 shrink-0" />
                    <span className="text-[11px] text-zinc-500">
                      不支持的概念: {activeResult.lostConcepts.join(", ")}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* File tabs */}
            <div className="px-4 py-1.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-1 overflow-x-auto shrink-0">
              {activeResult.files.map((file, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveFile(idx)}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md transition-colors whitespace-nowrap ${
                    activeFile === idx
                      ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 font-medium"
                      : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <FileCode2 size={10} />
                  {file.path}
                </button>
              ))}
            </div>

            {/* File content */}
            <div className="flex-1 overflow-auto">
              <div className="relative">
                <button className="absolute top-2 right-2 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 bg-white/80 dark:bg-zinc-800/80 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                  <Copy size={12} />
                </button>
                <pre className="p-4 text-[12px] font-mono text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {activeResult.files[activeFile]?.content ?? ""}
                </pre>
              </div>
            </div>

            {/* Footer info */}
            <div className="px-4 py-1.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-4 text-[10px] text-zinc-400 shrink-0">
              <span>{activeResult.files[activeFile]?.lines} lines</span>
              <span>{activeResult.files[activeFile]?.path}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
