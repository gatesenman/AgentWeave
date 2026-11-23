import { useTranslation } from "react-i18next";
import { useState, useCallback } from "react";
import { Truck, ArrowRight, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { startMigration, getMigrationStatus, type MigrationStatus } from "../lib/tauri";
import { useConfigStore } from "../store/config";

const VENDORS = ["cursor", "windsurf", "copilot", "cline", "roo-code", "aider", "claude-code", "codex", "devin", "tabnine", "continue-dev", "augment"];

export default function MigrationWizard() {
  const { t } = useTranslation();
  const projectDir = useConfigStore((s) => s.projectDir) || "";
  const [step, setStep] = useState(0);
  const [source, setSource] = useState("");
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStart = useCallback(async () => {
    if (!source || !projectDir) return;
    setLoading(true);
    try {
      await startMigration(source, projectDir);
      const st = await getMigrationStatus(projectDir);
      setStatus(st);
      setStep(2);
    } catch (e) { console.error("startMigration", e); }
    setLoading(false);
  }, [source, projectDir]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
          <Truck size={16} className="text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">{t("migration.title", "迁移向导")}</h2>
          <p className="text-[11px] text-zinc-400">{t("migration.subtitle")}</p>
        </div>
      </div>

      {!projectDir && (
        <div className="flex-1 flex items-center justify-center text-[12px] text-zinc-400">{t("common.openProject")}</div>
      )}

      {projectDir && (
        <div className="flex-1 overflow-auto px-5 py-6">
          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-8">
            {[t("migration.stepSource"), t("migration.stepScan"), t("migration.stepDone")].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                  step > i ? "bg-orange-600 text-white" : step === i ? "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                }`}>{i + 1}</div>
                <span className={`text-[12px] ${step >= i ? "text-zinc-700 dark:text-zinc-200 font-medium" : "text-zinc-400"}`}>{label}</span>
                {i < 2 && <ArrowRight size={12} className="text-zinc-300 mx-1" />}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">{t("migration.chooseSource")}</h3>
              <div className="grid grid-cols-4 gap-2">
                {VENDORS.map((v) => (
                  <button key={v} onClick={() => { setSource(v); setStep(1); }}
                    className={`px-3 py-2 text-[12px] rounded-md border ${
                      source === v ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/50" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    }`}>{v}</button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">
                {t("migration.fromSource", { source })}
              </h3>
              <p className="text-[12px] text-zinc-500">{t("migration.scanHint", { source })}</p>
              <div className="flex items-center gap-3">
                <button onClick={handleStart} disabled={loading} className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50">
                  {loading ? <><Loader2 size={12} className="animate-spin" /> {t("migration.running")}</> : <><Truck size={12} /> {t("migration.start")}</>}
                </button>
                <button onClick={() => setStep(0)} className="px-3 py-2 text-[12px] text-zinc-500 hover:text-zinc-700">{t("common.back")}</button>
              </div>
            </div>
          )}

          {step === 2 && status && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {status.success ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-red-500" />}
                <h3 className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">{status.success ? t("migration.success") : t("migration.failed")}</h3>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-[12px]">
                  <span className="text-zinc-500">{t("migration.imported")}</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-200">{status.imported_count}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-zinc-500">{t("migration.skipped")}</span>
                  <span className="text-zinc-700 dark:text-zinc-200">{status.skipped_count}</span>
                </div>
                {status.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] font-medium text-red-500 uppercase">{t("common.error")}</p>
                    {status.errors.map((e, i) => <p key={i} className="text-[11px] text-red-600 dark:text-red-400">{e}</p>)}
                  </div>
                )}
              </div>
              <button onClick={() => { setStep(0); setSource(""); setStatus(null); }} className="px-3 py-2 text-[12px] text-orange-600 hover:text-orange-700 font-medium">
                {t("migration.again")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
