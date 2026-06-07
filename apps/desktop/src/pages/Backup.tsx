import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useConfigStore } from "../store/config";
import { Download, Upload, Camera, Clock, RotateCcw, HardDrive, FileArchive } from "lucide-react";

interface Snapshot {
  id: string;
  name: string;
  date: string;
  size: string;
  vendors: number;
}

const mockSnapshots: Snapshot[] = [
  { id: "1", name: "pre-migration-backup", date: "2024-01-15 14:30", size: "2.4 MB", vendors: 12 },
  { id: "2", name: "stable-v0.1.0", date: "2024-01-10 09:15", size: "1.8 MB", vendors: 8 },
  { id: "3", name: "initial-setup", date: "2024-01-05 16:45", size: "0.9 MB", vendors: 4 },
];

export default function Backup() {
  const { t } = useTranslation();
  const { projectDir } = useConfigStore();
  const [activeTab, setActiveTab] = useState<"export" | "import" | "snapshots">("export");

  if (!projectDir) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
            <FileArchive size={22} className="text-zinc-400" />
          </div>
          <p className="text-[13px] text-zinc-500">{t("backup.noProject")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="px-5 py-0 border-b border-zinc-100 dark:border-zinc-800 flex items-center shrink-0">
        <button
          onClick={() => setActiveTab("export")}
          className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
            activeTab === "export" ? "border-indigo-600 text-indigo-700 dark:text-indigo-300" : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          <Download size={13} className="inline mr-1.5 -mt-0.5" />
          {t("backup.export")}
        </button>
        <button
          onClick={() => setActiveTab("import")}
          className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
            activeTab === "import" ? "border-indigo-600 text-indigo-700 dark:text-indigo-300" : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          <Upload size={13} className="inline mr-1.5 -mt-0.5" />
          {t("backup.import")}
        </button>
        <button
          onClick={() => setActiveTab("snapshots")}
          className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
            activeTab === "snapshots" ? "border-indigo-600 text-indigo-700 dark:text-indigo-300" : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          <Camera size={13} className="inline mr-1.5 -mt-0.5" />
          {t("backup.snapshots")}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-5 py-4">
        {activeTab === "export" && (
          <div className="max-w-[480px]">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-200">{t("backup.exportConfig")}</span>
              </div>
              <div className="px-4 py-4 space-y-3">
                <label className="flex items-center gap-2.5 text-[12px] text-zinc-600 dark:text-zinc-300 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" />
                  包含已生成的厂商配置
                </label>
                <label className="flex items-center gap-2.5 text-[12px] text-zinc-600 dark:text-zinc-300 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" />
                  包含版本历史
                </label>
                <label className="flex items-center gap-2.5 text-[12px] text-zinc-600 dark:text-zinc-300 cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" />
                  包含凭证信息（加密）
                </label>
              </div>
              <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <button className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm">
                  <Download size={13} />
                  导出为 ZIP
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "import" && (
          <div className="max-w-[480px]">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-200">{t("backup.importConfig")}</span>
              </div>
              <div className="px-4 py-6">
                <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg p-8 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 flex items-center justify-center mx-auto mb-3 transition-colors">
                    <Upload size={18} className="text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <p className="text-[12px] text-zinc-500">拖拽 ZIP 文件到此处，或点击选择</p>
                  <p className="text-[11px] text-zinc-400 mt-1">支持 .zip 格式的 AgentWeave 导出文件</p>
                </div>
              </div>
              <div className="px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800 bg-amber-50 dark:bg-amber-500/5">
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  注意：导入将覆盖当前配置，建议先创建快照备份
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "snapshots" && (
          <div className="space-y-3">
            <button className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
              <Camera size={13} />
              创建快照
            </button>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                  <tr className="text-left text-[11px] text-zinc-400 uppercase tracking-wider">
                    <th className="px-4 py-2 font-medium">名称</th>
                    <th className="px-4 py-2 font-medium">日期</th>
                    <th className="px-4 py-2 font-medium">大小</th>
                    <th className="px-4 py-2 font-medium">厂商</th>
                    <th className="px-4 py-2 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {mockSnapshots.map((snap) => (
                    <tr key={snap.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <HardDrive size={12} className="text-indigo-500" />
                          <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200">{snap.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[12px] text-zinc-500 flex items-center gap-1">
                          <Clock size={11} /> {snap.date}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-zinc-500">{snap.size}</td>
                      <td className="px-4 py-2.5 text-[12px] text-zinc-500">{snap.vendors}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded transition-colors">
                            <RotateCcw size={11} /> 恢复
                          </button>
                          <button className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded transition-colors">
                            <Download size={11} /> 下载
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
