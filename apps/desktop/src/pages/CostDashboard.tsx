import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { DollarSign, Plus, Trash2, BarChart3 } from "lucide-react";
import { listCostRecords, addCostRecord, deleteCostRecord, type CostRecord } from "../lib/tauri";

export default function CostDashboard() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<CostRecord[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newVendor, setNewVendor] = useState("cursor");
  const [newTokens, setNewTokens] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newRequests, setNewRequests] = useState("");

  const load = useCallback(async () => {
    try { setRecords(await listCostRecords()); } catch (e) { console.error("listCostRecords", e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newTokens || !newCost) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      await addCostRecord(newVendor, today, parseInt(newRequests) || 1, parseInt(newTokens), parseFloat(newCost));
      setShowNew(false); setNewTokens(""); setNewCost(""); setNewRequests("");
      await load();
    } catch (e) { console.error("addCostRecord", e); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteCostRecord(id); await load(); } catch (e) { console.error(e); }
  };

  const totalCost = records.reduce((sum, r) => sum + r.cost_usd, 0);
  const totalTokens = records.reduce((sum, r) => sum + r.tokens, 0);
  const vendorMap = new Map<string, { cost: number; tokens: number }>();
  records.forEach((r) => {
    const cur = vendorMap.get(r.vendor) || { cost: 0, tokens: 0 };
    cur.cost += r.cost_usd;
    cur.tokens += r.tokens;
    vendorMap.set(r.vendor, cur);
  });

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
          <DollarSign size={16} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">{t("cost.title", "成本仪表盘")}</h2>
          <p className="text-[11px] text-zinc-400">API 用量追踪与费用分析</p>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700">
          <Plus size={12} /> 记录
        </button>
      </div>

      {showNew && (
        <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-2">
          <div className="grid grid-cols-4 gap-2">
            <input value={newVendor} onChange={(e) => setNewVendor(e.target.value)} placeholder="厂商" className="px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
            <input value={newRequests} onChange={(e) => setNewRequests(e.target.value)} placeholder="请求数" type="number" className="px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
            <input value={newTokens} onChange={(e) => setNewTokens(e.target.value)} placeholder="Tokens" type="number" className="px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
            <input value={newCost} onChange={(e) => setNewCost(e.target.value)} placeholder="费用 ($)" type="number" step="0.01" className="px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 px-2 py-1 text-[11px] font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700">添加</button>
            <button onClick={() => setShowNew(false)} className="px-2 py-1 text-[11px] text-zinc-500">取消</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
            <p className="text-[10px] text-zinc-400 uppercase font-medium mb-1">总费用</p>
            <p className="text-[18px] font-bold text-zinc-800 dark:text-zinc-100">${totalCost.toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
            <p className="text-[10px] text-zinc-400 uppercase font-medium mb-1">总 Token</p>
            <p className="text-[18px] font-bold text-zinc-800 dark:text-zinc-100">{totalTokens.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
            <p className="text-[10px] text-zinc-400 uppercase font-medium mb-1">厂商数</p>
            <p className="text-[18px] font-bold text-zinc-800 dark:text-zinc-100">{vendorMap.size}</p>
          </div>
        </div>

        {vendorMap.size > 0 && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            <h3 className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-2 mb-3">
              <BarChart3 size={13} /> 厂商分布
            </h3>
            <div className="space-y-2">
              {Array.from(vendorMap.entries()).map(([vendor, { cost, tokens }]) => (
                <div key={vendor} className="flex items-center gap-3">
                  <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200 w-[100px]">{vendor}</span>
                  <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalCost > 0 ? (cost / totalCost) * 100 : 0}%` }} />
                  </div>
                  <span className="text-[11px] text-zinc-500 w-[60px] text-right">${cost.toFixed(2)}</span>
                  <span className="text-[10px] text-zinc-400 w-[70px] text-right">{tokens.toLocaleString()} tk</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <h3 className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 mb-2">记录明细</h3>
          {records.length === 0 && <p className="text-center text-[12px] text-zinc-400 py-4">暂无费用记录</p>}
          {records.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded group">
              <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200 w-[80px]">{r.vendor}</span>
              <span className="text-[11px] text-zinc-500 flex-1">{r.tokens.toLocaleString()} tokens · {r.requests} 次</span>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">${r.cost_usd.toFixed(2)}</span>
              <span className="text-[10px] text-zinc-400">{r.date}</span>
              <button onClick={() => handleDelete(String(r.id))} className="p-0.5 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
