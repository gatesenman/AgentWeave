import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useConfigStore } from "../store/config";
import { Download, Upload, Camera, Clock, Trash2, HardDrive } from "lucide-react";
import { listSnapshots, createSnapshot, deleteSnapshot, exportProjectZip, importProjectZip, type SnapshotInfo } from "../lib/tauri";

export default function Backup() {
  const { t } = useTranslation();
  const projectDir = useConfigStore((s) => s.projectDir) || "";
  const [activeTab, setActiveTab] = useState<"export" | "import" | "snapshots">("snapshots");
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPath, setImportPath] = useState("");

  const load = useCallback(async () => {
    if (!projectDir) return;
    try { setSnapshots(await listSnapshots(projectDir)); } catch (e) { console.error("listSnapshots", e); }
  }, [projectDir]);
  useEffect(() => { load(); }, [load]);

  const handleSnapshot = async () => {
    if (!projectDir) return;
    try {
      await createSnapshot(snapshotLabel || "snapshot", projectDir);
      setSnapshotLabel("");
      await load();
    } catch (e) { console.error("createSnapshot", e); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteSnapshot(id); await load(); } catch (e) { console.error(e); }
  };

  const handleExport = async () => {
    if (!projectDir) return;
    setExporting(true);
    try { await exportProjectZip(projectDir); } catch (e) { console.error(e); }
    setExporting(false);
  };

  const handleImport = async () => {
    if (!importPath.trim()) return;
    setImporting(true);
    try { await importProjectZip(projectDir, importPath); setImportPath(""); } catch (e) { console.error(e); }
    setImporting(false);
  };

  const tabs = [
    { key: "snapshots" as const, label: "快照", icon: Camera },
    { key: "export" as const, label: "导出", icon: Download },
    { key: "import" as const, label: "导入", icon: Upload },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center">
            <HardDrive size={16} className="text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">{t("backup.title", "版本备份")}</h2>
            <p className="text-[11px] text-zinc-400">快照管理、配置导出与导入</p>
          </div>
        </div>
        <div className="flex gap-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md ${activeTab === key ? "bg-sky-600 text-white" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400"}`}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      </div>

      {!projectDir && (
        <div className="flex-1 flex items-center justify-center text-[12px] text-zinc-400">请先打开一个项目</div>
      )}

      {projectDir && (
        <div className="flex-1 overflow-auto px-5 py-4">
          {activeTab === "snapshots" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input value={snapshotLabel} onChange={(e) => setSnapshotLabel(e.target.value)} placeholder="快照标签 (可选)" className="flex-1 px-2 py-1.5 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
                <button onClick={handleSnapshot} className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700">
                  <Camera size={12} /> 创建快照
                </button>
              </div>
              {snapshots.length === 0 && <p className="text-center text-[12px] text-zinc-400 py-4">暂无快照</p>}
              {snapshots.map((s) => (
                <div key={s.id} className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 group">
                  <Clock size={14} className="text-zinc-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200">{s.name || "自动快照"}</p>
                    <p className="text-[10px] text-zinc-400">{s.date} · {s.size_bytes ? `${(s.size_bytes / 1024).toFixed(1)} KB` : ""} · {s.vendors_count} 厂商</p>
                  </div>
                  <button onClick={() => handleDelete(s.id)} className="p-1 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === "export" && (
            <div className="space-y-3">
              <p className="text-[12px] text-zinc-500">将项目配置导出为 ZIP 文件</p>
              <button onClick={handleExport} disabled={exporting} className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:opacity-50">
                <Download size={14} /> {exporting ? "导出中..." : "导出 ZIP"}
              </button>
            </div>
          )}

          {activeTab === "import" && (
            <div className="space-y-3">
              <p className="text-[12px] text-zinc-500">从 ZIP 文件导入配置</p>
              <div className="flex items-center gap-2">
                <input value={importPath} onChange={(e) => setImportPath(e.target.value)} placeholder="ZIP 文件路径" className="flex-1 px-2 py-1.5 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
                <button onClick={handleImport} disabled={importing} className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:opacity-50">
                  <Upload size={14} /> {importing ? "导入中..." : "导入"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
