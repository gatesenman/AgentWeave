import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { Webhook, Plus, Trash2, ToggleLeft, ToggleRight, Bell } from "lucide-react";
import { listWebhooks, createWebhook, toggleWebhook, deleteWebhook, type WebhookInfo } from "../lib/tauri";

export default function Webhooks() {
  const { t } = useTranslation();
  const [webhooks, setWebhooks] = useState<WebhookInfo[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newPlatform, setNewPlatform] = useState("slack");
  const [newEvents, setNewEvents] = useState("config_changed,generate_completed");

  const load = useCallback(async () => {
    try { setWebhooks(await listWebhooks()); } catch (e) { console.error("listWebhooks", e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    try {
      const events = newEvents.split(",").map((e) => e.trim()).filter(Boolean);
      await createWebhook(newName, newUrl, newPlatform, events);
      setShowNew(false); setNewName(""); setNewUrl("");
      await load();
    } catch (e) { console.error("createWebhook", e); }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try { await toggleWebhook(id, !enabled); await load(); } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteWebhook(id); await load(); } catch (e) { console.error(e); }
  };

  const platformColors: Record<string, string> = {
    slack: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
    discord: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
    teams: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    dingtalk: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400",
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
          <Webhook size={16} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">{t("webhooks.title", "Webhook 集成")}</h2>
          <p className="text-[11px] text-zinc-400">配置变更时自动通知 Slack / Discord / 钉钉</p>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700">
          <Plus size={12} /> 新建
        </button>
      </div>

      {showNew && (
        <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="名称" className="px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
            <select value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} className="px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200">
              <option value="slack">Slack</option>
              <option value="discord">Discord</option>
              <option value="teams">Teams</option>
              <option value="dingtalk">钉钉</option>
            </select>
          </div>
          <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="Webhook URL" className="w-full px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
          <input value={newEvents} onChange={(e) => setNewEvents(e.target.value)} placeholder="事件 (逗号分隔)" className="w-full px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="flex-1 px-2 py-1 text-[11px] font-medium text-white bg-amber-600 rounded hover:bg-amber-700">创建</button>
            <button onClick={() => setShowNew(false)} className="px-2 py-1 text-[11px] text-zinc-500">取消</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto px-5 py-4 space-y-2">
        {webhooks.length === 0 && !showNew && (
          <div className="text-center py-8 text-[12px] text-zinc-400">暂无 Webhook，点击新建</div>
        )}
        {webhooks.map((wh) => (
          <div key={wh.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 group">
            <div className="flex items-center gap-3">
              <button onClick={() => handleToggle(wh.id, wh.enabled)} className="shrink-0">
                {wh.enabled ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-zinc-300" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100">{wh.name}</span>
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${platformColors[wh.platform] || "bg-zinc-100 text-zinc-500"}`}>{wh.platform}</span>
                </div>
                <p className="text-[10px] text-zinc-400 font-mono truncate">{wh.url}</p>
                <div className="flex items-center gap-1 mt-1">
                  {wh.events.map((ev) => (
                    <span key={ev} className="text-[9px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">{ev}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => handleDelete(wh.id)} className="p-1 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
