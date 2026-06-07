import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { listLintRules, createLintRule, toggleLintRule, deleteLintRule, type LintRuleInfo } from "../lib/tauri";

export default function ConfigLint() {
  const { t } = useTranslation();
  const [rules, setRules] = useState<LintRuleInfo[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPattern, setNewPattern] = useState("");
  const [newSeverity, setNewSeverity] = useState("warning");
  const [newMessage, setNewMessage] = useState("");

  const load = useCallback(async () => {
    try { setRules(await listLintRules()); } catch (e) { console.error("listLintRules", e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createLintRule(newName, newPattern, newSeverity, newMessage);
      setShowNew(false); setNewName(""); setNewPattern(""); setNewMessage("");
      await load();
    } catch (e) { console.error("createLintRule", e); }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try { await toggleLintRule(id, !enabled); await load(); } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteLintRule(id); await load(); } catch (e) { console.error(e); }
  };

  const sevIcon = (sev: string) => {
    if (sev === "error") return <XCircle size={12} className="text-red-500" />;
    if (sev === "warning") return <AlertTriangle size={12} className="text-amber-500" />;
    return <CheckCircle2 size={12} className="text-blue-500" />;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
          <ShieldAlert size={16} className="text-orange-600 dark:text-orange-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">{t("lint.title", "配置 Lint")}</h2>
          <p className="text-[11px] text-zinc-400">自定义检查规则，保证配置质量</p>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700">
          <Plus size={12} /> 新建规则
        </button>
      </div>

      {showNew && (
        <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="规则名称" className="px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
            <select value={newSeverity} onChange={(e) => setNewSeverity(e.target.value)} className="px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200">
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
          <input value={newPattern} onChange={(e) => setNewPattern(e.target.value)} placeholder="匹配模式 (regex)" className="w-full px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
          <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="提示信息" className="w-full px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="flex-1 px-2 py-1 text-[11px] font-medium text-white bg-orange-600 rounded hover:bg-orange-700">创建</button>
            <button onClick={() => setShowNew(false)} className="px-2 py-1 text-[11px] text-zinc-500">取消</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto px-5 py-4 space-y-2">
        {rules.length === 0 && !showNew && (
          <div className="text-center py-8 text-[12px] text-zinc-400">暂无 Lint 规则，点击新建</div>
        )}
        {rules.map((rule) => (
          <div key={rule.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 group">
            <div className="flex items-center gap-3">
              <button onClick={() => handleToggle(rule.id, rule.enabled)} className="shrink-0">
                {rule.enabled ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-zinc-300" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {sevIcon(rule.severity)}
                  <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100">{rule.name}</span>
                </div>
                {rule.pattern && <p className="text-[10px] text-zinc-400 font-mono mt-0.5">/{rule.pattern}/</p>}
                {rule.description && <p className="text-[10px] text-zinc-500 mt-0.5">{rule.description}</p>}
              </div>
              <button onClick={() => handleDelete(rule.id)} className="p-1 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
