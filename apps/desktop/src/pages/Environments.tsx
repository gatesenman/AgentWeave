import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { Layers, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { listEnvironments, createEnvironment, activateEnvironment, deleteEnvironment, updateEnvOverrides, type EnvironmentInfo, type EnvironmentOverride } from "../lib/tauri";
import { useConfigStore } from "../store/config";

export default function Environments() {
  const { t } = useTranslation();
  const projectDir = useConfigStore((s) => s.projectDir) || "";
  const [envs, setEnvs] = useState<EnvironmentInfo[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingOverrides, setEditingOverrides] = useState<string | null>(null);
  const [overrideConcept, setOverrideConcept] = useState("");
  const [overrideField, setOverrideField] = useState("");
  const [overrideValue, setOverrideValue] = useState("");

  const load = useCallback(async () => {
    if (!projectDir) return;
    try { setEnvs(await listEnvironments(projectDir)); } catch (e) { console.error("listEnvironments", e); }
  }, [projectDir]);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim() || !projectDir) return;
    try {
      await createEnvironment(newName, newLabel || newName, projectDir);
      setShowNew(false); setNewName(""); setNewLabel("");
      await load();
    } catch (e) { console.error("createEnvironment", e); }
  };

  const handleActivate = async (id: string) => {
    if (!projectDir) return;
    try { await activateEnvironment(id, projectDir); await load(); } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteEnvironment(id); await load(); } catch (e) { console.error(e); }
  };

  const handleAddOverride = async (envId: string) => {
    if (!overrideConcept.trim() || !overrideField.trim()) return;
    const env = envs.find(e => e.id === envId);
    if (!env) return;
    const newOverrides: EnvironmentOverride[] = [...env.overrides, { concept: overrideConcept, field: overrideField, base_value: "", override_value: overrideValue }];
    try {
      await updateEnvOverrides(envId, JSON.stringify(newOverrides));
      setOverrideConcept(""); setOverrideField(""); setOverrideValue("");
      await load();
    } catch (e) { console.error("updateEnvOverrides", e); }
  };

  const handleRemoveOverride = async (envId: string, idx: number) => {
    const env = envs.find(e => e.id === envId);
    if (!env) return;
    const newOverrides = env.overrides.filter((_, i) => i !== idx);
    try {
      await updateEnvOverrides(envId, JSON.stringify(newOverrides));
      await load();
    } catch (e) { console.error("updateEnvOverrides", e); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
          <Layers size={16} className="text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">{t("env.title", "环境管理")}</h2>
          <p className="text-[11px] text-zinc-400">dev / staging / prod 配置变体</p>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700">
          <Plus size={12} /> 新增
        </button>
      </div>

      {!projectDir && (
        <div className="flex-1 flex items-center justify-center text-[12px] text-zinc-400">请先打开一个项目</div>
      )}

      {projectDir && showNew && (
        <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="环境名 (如 dev)" className="px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="标签 (如 开发环境)" className="px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="flex-1 px-2 py-1 text-[11px] font-medium text-white bg-purple-600 rounded hover:bg-purple-700">创建</button>
            <button onClick={() => setShowNew(false)} className="px-2 py-1 text-[11px] text-zinc-500">取消</button>
          </div>
        </div>
      )}

      {projectDir && (
        <div className="flex-1 overflow-auto px-5 py-4 space-y-2">
          {envs.length === 0 && !showNew && (
            <div className="text-center py-8 text-[12px] text-zinc-400">暂无环境，点击新增</div>
          )}
          {envs.map((env) => (
            <div key={env.id} className={`bg-white dark:bg-zinc-900 border rounded-lg px-4 py-3 group ${env.is_active ? "border-purple-300 dark:border-purple-500/50" : "border-zinc-200 dark:border-zinc-800"}`}>
              <div className="flex items-center gap-3">
                <button onClick={() => handleActivate(env.id)} className="shrink-0">
                  {env.is_active ? <CheckCircle2 size={16} className="text-purple-500" /> : <Circle size={16} className="text-zinc-300" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100">{env.name}</span>
                    <span className="text-[10px] text-zinc-400">{env.label}</span>
                    {env.is_active && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">活跃</span>}
                  </div>
                  {env.last_deployed && <p className="text-[10px] text-zinc-400 mt-0.5">上次部署: {env.last_deployed}</p>}
                </div>
                <button onClick={() => setEditingOverrides(editingOverrides === env.id ? null : env.id)} className="px-2 py-1 text-[10px] text-zinc-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded">
                  覆盖 ({env.overrides.length})
                </button>
                <button onClick={() => handleDelete(env.id)} className="p-1 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                  <Trash2 size={12} />
                </button>
              </div>
              {editingOverrides === env.id && (
                <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                  {env.overrides.map((ov, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px]">
                      <span className="text-zinc-500">{ov.concept}</span>
                      <span className="text-zinc-400">.</span>
                      <span className="text-zinc-600 dark:text-zinc-300">{ov.field}</span>
                      <span className="text-zinc-400">=</span>
                      <span className="text-purple-600 dark:text-purple-400 font-mono">{ov.override_value}</span>
                      <button onClick={() => handleRemoveOverride(env.id, idx)} className="ml-auto p-0.5 text-zinc-300 hover:text-red-500"><Trash2 size={10} /></button>
                    </div>
                  ))}
                  <div className="flex items-center gap-1">
                    <input value={overrideConcept} onChange={(e) => setOverrideConcept(e.target.value)} placeholder="概念" className="w-[80px] px-1 py-0.5 text-[10px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
                    <input value={overrideField} onChange={(e) => setOverrideField(e.target.value)} placeholder="字段" className="w-[80px] px-1 py-0.5 text-[10px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
                    <input value={overrideValue} onChange={(e) => setOverrideValue(e.target.value)} placeholder="值" className="flex-1 px-1 py-0.5 text-[10px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
                    <button onClick={() => handleAddOverride(env.id)} className="px-1.5 py-0.5 text-[10px] text-white bg-purple-600 rounded hover:bg-purple-700">+</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
