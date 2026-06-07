import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Clock,
  Zap,
} from "lucide-react";

interface VendorUsage {
  vendor: string;
  calls: number;
  tokens: number;
  cost: number;
  trend: number;
}

interface BudgetAlert {
  vendor: string;
  limit: number;
  used: number;
  percent: number;
}

const mockUsage: VendorUsage[] = [
  { vendor: "Claude Code", calls: 1240, tokens: 4500000, cost: 67.50, trend: 12 },
  { vendor: "Cursor", calls: 890, tokens: 2100000, cost: 31.50, trend: -5 },
  { vendor: "Codex", calls: 450, tokens: 1800000, cost: 27.00, trend: 8 },
  { vendor: "Gemini CLI", calls: 320, tokens: 900000, cost: 9.00, trend: 25 },
  { vendor: "Copilot", calls: 1560, tokens: 3200000, cost: 0, trend: 3 },
  { vendor: "Windsurf", calls: 210, tokens: 600000, cost: 12.00, trend: -2 },
];

const mockAlerts: BudgetAlert[] = [
  { vendor: "Claude Code", limit: 100, used: 67.50, percent: 67 },
  { vendor: "Codex", limit: 50, used: 27, percent: 54 },
];

export default function CostDashboard() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<"day" | "week" | "month">("month");

  const totalCost = mockUsage.reduce((s, u) => s + u.cost, 0);
  const totalCalls = mockUsage.reduce((s, u) => s + u.calls, 0);
  const totalTokens = mockUsage.reduce((s, u) => s + u.tokens, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
          <DollarSign size={16} className="text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
            {t("cost.title", "成本仪表盘")}
          </h2>
          <p className="text-[11px] text-zinc-400">
            {t("cost.subtitle", "API 用量追踪与预算告警")}
          </p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          {(["day", "week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md ${
                period === p ? "bg-indigo-600 text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {p === "day" ? "今日" : p === "week" ? "本周" : "本月"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={13} className="text-green-500" />
              <span className="text-[11px] text-zinc-400">总费用</span>
            </div>
            <div className="text-[20px] font-bold text-zinc-800 dark:text-zinc-100">${totalCost.toFixed(2)}</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={13} className="text-blue-500" />
              <span className="text-[11px] text-zinc-400">API 调用</span>
            </div>
            <div className="text-[20px] font-bold text-zinc-800 dark:text-zinc-100">{totalCalls.toLocaleString()}</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={13} className="text-purple-500" />
              <span className="text-[11px] text-zinc-400">总 Tokens</span>
            </div>
            <div className="text-[20px] font-bold text-zinc-800 dark:text-zinc-100">{(totalTokens / 1000000).toFixed(1)}M</div>
          </div>
        </div>

        {/* Budget alerts */}
        {mockAlerts.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={13} className="text-amber-500" />
              <span className="text-[12px] font-medium text-amber-700 dark:text-amber-300">预算告警</span>
            </div>
            <div className="space-y-2">
              {mockAlerts.map((alert) => (
                <div key={alert.vendor} className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-300 w-[100px]">{alert.vendor}</span>
                  <div className="flex-1 h-1.5 bg-amber-100 dark:bg-amber-500/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${alert.percent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 w-[80px] text-right">
                    ${alert.used}/{alert.limit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vendor usage table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-zinc-500">厂商</th>
                <th className="text-right px-3 py-2 text-[11px] font-semibold text-zinc-500">调用次数</th>
                <th className="text-right px-3 py-2 text-[11px] font-semibold text-zinc-500">Tokens</th>
                <th className="text-right px-3 py-2 text-[11px] font-semibold text-zinc-500">费用</th>
                <th className="text-right px-3 py-2 text-[11px] font-semibold text-zinc-500">趋势</th>
              </tr>
            </thead>
            <tbody>
              {mockUsage.map((usage) => (
                <tr key={usage.vendor} className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0">
                  <td className="px-3 py-2.5 text-[12px] font-medium text-zinc-700 dark:text-zinc-200">{usage.vendor}</td>
                  <td className="px-3 py-2.5 text-[12px] text-zinc-500 text-right">{usage.calls.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-[12px] text-zinc-500 text-right">{(usage.tokens / 1000).toFixed(0)}K</td>
                  <td className="px-3 py-2.5 text-[12px] text-zinc-700 dark:text-zinc-200 text-right font-medium">
                    {usage.cost > 0 ? `$${usage.cost.toFixed(2)}` : "Free"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
                      usage.trend > 0 ? "text-red-500" : usage.trend < 0 ? "text-emerald-500" : "text-zinc-400"
                    }`}>
                      <TrendingUp size={10} className={usage.trend < 0 ? "rotate-180" : ""} />
                      {Math.abs(usage.trend)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
