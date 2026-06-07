import { useConfigStore } from "../store/config";
import { useTranslation } from "react-i18next";
import { Radio } from "lucide-react";

export default function Statusbar() {
  const { t } = useTranslation();
  const { projectDir, isWatching, vendors } = useConfigStore();

  return (
    <div className="h-6 bg-white dark:bg-[#1f1f23] border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-3 shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">
      <div className="flex items-center gap-4">
        {isWatching && (
          <span className="flex items-center gap-1 text-emerald-500">
            <Radio size={10} className="animate-pulse" />
            {t("statusbar.syncing", "同步中")}
          </span>
        )}
        <span>{vendors.length} {t("statusbar.adapters", "适配器就绪")}</span>
      </div>
      <div className="flex items-center gap-4">
        {projectDir && (
          <span className="max-w-[220px] truncate">
            {projectDir}
          </span>
        )}
        <span>v0.1.0</span>
      </div>
    </div>
  );
}
