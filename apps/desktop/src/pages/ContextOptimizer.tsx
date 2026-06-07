import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Scissors,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
} from "lucide-react";

interface VendorLimit {
  vendor: string;
  maxTokens: number;
  currentTokens: number;
  overflow: boolean;
  suggestions: string[];
}

const mockLimits: VendorLimit[] = [
  {
    vendor: "Cursor",
    maxTokens: 120000,
    currentTokens: 45000,
    overflow: false,
    suggestions: [],
  },
  {
    vendor: "Claude Code",
    maxTokens: 200000,
    currentTokens: 45000,
    overflow: false,
    suggestions: [],
  },
  {
    vendor: "Codex",
    maxTokens: 32000,
    currentTokens: 45000,
    overflow: true,
    suggestions: [
      "Remove agent 'docs-writer' context (saves ~8000 tokens)",
      "Trim rule descriptions to first paragraph (saves ~5000 tokens)",
      "Exclude context files > 500 lines (saves ~12000 tokens)",
    ],
  },
  {
    vendor: "Gemini CLI",
    maxTokens: 100000,
    currentTokens: 45000,
    overflow: false,
    suggestions: [],
  },
  {
    vendor: "GitHub Copilot",
    maxTokens: 64000,
    currentTokens: 45000,
    overflow: false,
    suggestions: [],
  },
  {
    vendor: "Windsurf",
    maxTokens: 128000,
    currentTokens: 45000,
    overflow: false,
    suggestions: [],
  },
];

export default function ContextOptimizer() {
  const { t } = useTranslation();
  const [limits] = useState<VendorLimit[]>(mockLimits);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const overflowCount = limits.filter((l) => l.overflow).length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center">
          <Scissors size={16} className="text-cyan-600 dark:text-cyan-400" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
            {t("optimizer.title", "Context Window 优化器")}
          </h2>
          <p className="text-[11px] text-zinc-400">
            {t("optimizer.subtitle", "按厂商 token 限制自动裁剪/优化上下文大小")}
          </p>
        </div>
        <div className="flex-1" />
        {overflowCount > 0 && (
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
            {overflowCount} 个厂商超限
          </span>
        )}
        <button
          onClick={() => { setIsOptimizing(true); setTimeout(() => setIsOptimizing(false), 1500); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 transition-colors shadow-sm"
        >
          <RefreshCw size={12} className={isOptimizing ? "animate-spin" : ""} />
          {t("optimizer.analyze", "重新分析")}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-5 py-4 space-y-3">
        {/* Summary bar */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-4 mb-3">
            <BarChart3 size={16} className="text-zinc-400" />
            <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200">
              当前配置总大小: ~45,000 tokens
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-[18px] font-bold text-zinc-800 dark:text-zinc-100">3</div>
              <div className="text-[10px] text-zinc-400">Agents</div>
            </div>
            <div className="text-center">
              <div className="text-[18px] font-bold text-zinc-800 dark:text-zinc-100">12</div>
              <div className="text-[10px] text-zinc-400">Rules</div>
            </div>
            <div className="text-center">
              <div className="text-[18px] font-bold text-zinc-800 dark:text-zinc-100">4</div>
              <div className="text-[10px] text-zinc-400">Context Files</div>
            </div>
          </div>
        </div>

        {/* Vendor cards */}
        {limits.map((limit) => {
          const pct = Math.min(100, (limit.currentTokens / limit.maxTokens) * 100);
          return (
            <div
              key={limit.vendor}
              className={`bg-white dark:bg-zinc-900 border rounded-lg p-4 ${
                limit.overflow
                  ? "border-amber-200 dark:border-amber-500/30"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {limit.overflow ? (
                    <AlertTriangle size={13} className="text-amber-500" />
                  ) : (
                    <CheckCircle2 size={13} className="text-emerald-500" />
                  )}
                  <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-200">
                    {limit.vendor}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400">
                  {(limit.currentTokens / 1000).toFixed(0)}K / {(limit.maxTokens / 1000).toFixed(0)}K tokens
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    limit.overflow ? "bg-amber-400" : pct > 75 ? "bg-yellow-400" : "bg-emerald-400"
                  }`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>

              {/* Suggestions */}
              {limit.suggestions.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    优化建议:
                  </p>
                  {limit.suggestions.map((suggestion, i) => (
                    <div key={i} className="flex items-start gap-2 pl-2">
                      <Info size={10} className="text-zinc-400 mt-0.5 shrink-0" />
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{suggestion}</span>
                    </div>
                  ))}
                  <button className="mt-1 text-[11px] font-medium text-cyan-600 dark:text-cyan-400 hover:underline">
                    自动优化此厂商 →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
