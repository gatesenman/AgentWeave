import { useTranslation } from "react-i18next";
import { useConfigStore } from "../store/config";
import { useEffect, useState, useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  FolderOpen,
  Play,
  CheckCircle2,
  Eye,
  EyeOff,
  Cpu,
  Zap,
  Shield,
  Activity,
  RefreshCw,
  Download,
  ArrowRight,
} from "lucide-react";
import { detectVendorConfigs, startMigration, type DetectedVendorConfig } from "../lib/tauri";

export default function Dashboard() {
  const { t } = useTranslation();
  const {
    projectDir,
    projectStatus,
    healthStatus,
    vendors,
    isLoading,
    isWatching,
    error,
    setProjectDir,
    loadProject,
    loadHealth,
    loadVendors,
    runGenerate,
    runValidate,
    toggleWatch,
  } = useConfigStore();
  const [showMigrate, setShowMigrate] = useState(false);
  const [detectedVendors, setDetectedVendors] = useState<DetectedVendorConfig[]>([]);
  const [dismissedDetection, setDismissedDetection] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const detectConfigs = useCallback(async () => {
    if (!projectDir) return;
    try {
      const configs = await detectVendorConfigs(projectDir);
      setDetectedVendors(configs.filter((c) => c.exists));
    } catch (e) {
      console.error("detectVendorConfigs", e);
    }
  }, [projectDir]);

  useEffect(() => {
    if (projectDir) {
      loadProject();
      loadHealth();
      detectConfigs();
    }
  }, [projectDir, loadProject, loadHealth, detectConfigs]);

  const handleImportDetected = async () => {
    if (!projectDir || detectedVendors.length === 0) return;
    setImporting(true);
    try {
      for (const v of detectedVendors) {
        await startMigration(v.vendor, projectDir);
      }
      setDismissedDetection(true);
      loadProject();
    } catch (e) {
      console.error("import", e);
    } finally {
      setImporting(false);
    }
  };

  const handleSelectProject = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected) {
      setProjectDir(selected as string);
    }
  };

  if (!projectDir) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mx-auto">
            <Activity size={28} className="text-indigo-500" />
          </div>
          <div>
            <p className="text-[14px] font-medium text-zinc-700 dark:text-zinc-200">
              {t("dashboard.noProject")}
            </p>
            <p className="text-[12px] text-zinc-400 mt-1">
              {t("common.selectProject")}
            </p>
          </div>
          <button
            onClick={handleSelectProject}
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <FolderOpen size={14} />
            {t("dashboard.selectFolder")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Actions bar */}
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2 shrink-0">
        <button
          onClick={handleSelectProject}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <FolderOpen size={13} />
          {t("dashboard.openProject")}
        </button>
        <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700" />
        <button
          onClick={() => runGenerate()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
        >
          <Play size={12} />
          {t("dashboard.generate")}
        </button>
        <button
          onClick={() => runValidate()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <CheckCircle2 size={12} />
          {t("dashboard.validate")}
        </button>
        <button
          onClick={() => toggleWatch()}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
            isWatching
              ? "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10"
              : "text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          }`}
        >
          {isWatching ? <EyeOff size={12} /> : <Eye size={12} />}
          {isWatching ? t("dashboard.stopWatch") : t("dashboard.startWatch")}
        </button>
        <div className="flex-1" />
        <button
          onClick={() => { loadProject(); loadHealth(); }}
          className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
        {error && (
          <div className="px-3 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-[12px] text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Config detection banner */}
        {detectedVendors.length > 0 && !dismissedDetection && (
          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Download size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-blue-800 dark:text-blue-200">
                  {t("dashboard.detectedConfig")}
                </p>
                <p className="text-[12px] text-blue-600 dark:text-blue-300 mt-0.5">
                  {t("dashboard.detectedConfigDesc")} {detectedVendors.map((v) => v.vendor).join(", ")}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={handleImportDetected}
                    disabled={importing}
                    className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Download size={11} />
                    {importing ? t("common.loading", "导入中...") : t("dashboard.importNow")}
                  </button>
                  <button
                    onClick={() => setDismissedDetection(true)}
                    className="px-3 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t("dashboard.importLater")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard icon={<Cpu size={16} />} label={t("dashboard.agents")} value={String(projectStatus?.agents_count ?? 0)} color="blue" />
          <StatCard icon={<Zap size={16} />} label={t("dashboard.activeVendors")} value={`${projectStatus?.targets.length ?? 0}/${vendors.length}`} color="emerald" />
          <StatCard icon={<Shield size={16} />} label={t("dashboard.health")} value={healthStatus?.overall === "healthy" ? "OK" : (healthStatus?.overall ?? "--")} color={healthStatus?.overall === "healthy" ? "emerald" : "amber"} />
          <StatCard icon={<Eye size={16} />} label="Watch" value={isWatching ? "Active" : "Off"} color={isWatching ? "emerald" : "zinc"} />
        </div>

        {/* Two-column info */}
        <div className="grid grid-cols-2 gap-3">
          {/* Health */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">
                {t("dashboard.health")}
              </h3>
            </div>
            <div className="px-4 py-2 space-y-1.5">
              {healthStatus?.checks?.map((check, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[12px] text-zinc-600 dark:text-zinc-300">{check.name}</span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    check.status === "pass"
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                  }`}>
                    {check.status}
                  </span>
                </div>
              )) ?? (
                <p className="text-[12px] text-zinc-400">--</p>
              )}
            </div>
          </div>

          {/* Vendors */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">
                {t("dashboard.vendorStatus")}
              </h3>
            </div>
            <div className="px-4 py-2 space-y-1.5">
              {vendors.slice(0, 6).map((vendor) => (
                <div key={vendor.name} className="flex items-center justify-between">
                  <span className="text-[12px] text-zinc-600 dark:text-zinc-300">{vendor.display_name}</span>
                  <span className={`w-2 h-2 rounded-full ${
                    projectStatus?.targets.includes(vendor.name) ? "bg-emerald-400" : "bg-zinc-300 dark:bg-zinc-600"
                  }`} />
                </div>
              ))}
              {vendors.length > 6 && (
                <p className="text-[11px] text-zinc-400">+{vendors.length - 6} more</p>
              )}
            </div>
          </div>
        </div>

        {/* Migration wizard card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
              <ArrowRight size={18} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100">{t("dashboard.migrate")}</h3>
              <p className="text-[11px] text-zinc-400">{t("dashboard.migrateDesc")}</p>
            </div>
            <button
              onClick={() => setShowMigrate(!showMigrate)}
              className="px-3 py-1.5 text-[12px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
            >
              {t("dashboard.startMigrate")}
            </button>
          </div>
          {showMigrate && (
            <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <p className="text-[12px] text-zinc-500 mb-2">{t("dashboard.migrateFrom")}</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "cursor", label: "Cursor" },
                  { key: "claude-code", label: "Claude Code" },
                  { key: "windsurf", label: "Windsurf" },
                  { key: "cline", label: "Cline" },
                  { key: "copilot", label: "Copilot" },
                  { key: "codex", label: "Codex" },
                ].map(v => (
                  <button
                    key={v.key}
                    onClick={async () => {
                      if (!projectDir) return;
                      try {
                        await startMigration(v.key, projectDir);
                        loadProject();
                      } catch (e) { console.error("migrate", e); }
                    }}
                    className="px-3 py-1.5 text-[12px] font-medium text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-md hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Project info */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">
              {t("dashboard.project")}
            </h3>
            <span className="text-[11px] text-zinc-400 font-mono truncate max-w-[300px]">{projectDir}</span>
          </div>
          <div className="px-4 py-3 grid grid-cols-3 gap-y-2 gap-x-6">
            <InfoRow label="Name" value={projectStatus?.name ?? "--"} />
            <InfoRow label="Version" value={projectStatus?.version ?? "--"} />
            <InfoRow label="Agents" value={String(projectStatus?.agents_count ?? 0)} />
            <InfoRow label="Rules" value={String(projectStatus?.rules_count ?? 0)} />
            <InfoRow label="Skills" value={String(projectStatus?.skills_count ?? 0)} />
            <InfoRow label="MCP" value={String(projectStatus?.mcp_count ?? 0)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10",
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10",
    zinc: "text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800",
  };
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${colorMap[color] ?? colorMap.zinc}`}>
          {icon}
        </div>
        <div>
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider">{label}</div>
          <div className="text-[15px] font-semibold text-zinc-800 dark:text-zinc-100">{value}</div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-zinc-400">{label}</span>
      <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200">{value}</span>
    </div>
  );
}
