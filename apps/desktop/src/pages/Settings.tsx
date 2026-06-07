import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "../store/theme";
import { Monitor, Moon, Sun, Globe, Server, FolderCog, Bell, Shield } from "lucide-react";
import type { Theme } from "../store/theme";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState<"system" | "user">("system");

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header tabs */}
      <div className="px-5 py-0 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-0 shrink-0">
        <button
          onClick={() => setActiveTab("system")}
          className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
            activeTab === "system"
              ? "border-indigo-600 text-indigo-700 dark:text-indigo-300"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          <Server size={13} className="inline mr-1.5 -mt-0.5" />
          {t("settings.systemTab")}
        </button>
        <button
          onClick={() => setActiveTab("user")}
          className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
            activeTab === "user"
              ? "border-indigo-600 text-indigo-700 dark:text-indigo-300"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          <Monitor size={13} className="inline mr-1.5 -mt-0.5" />
          {t("settings.userTab")}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-5 py-4">
        {activeTab === "system" ? (
          <div className="space-y-4 max-w-[560px]">
            <Section icon={<FolderCog size={14} className="text-blue-500" />} title={t("settings.adapterDefaults")}>
              <SettingRow label={t("settings.outputDir")}>
                <input
                  type="text"
                  defaultValue=".agentweave/output"
                  className="w-[200px] px-2.5 py-1.5 text-[12px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-md focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                />
              </SettingRow>
              <SettingRow label={t("settings.watchDebounce")}>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    defaultValue={300}
                    className="w-[70px] px-2.5 py-1.5 text-[12px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-md focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-zinc-400">ms</span>
                </div>
              </SettingRow>
              <SettingRow label={t("settings.autoGenerate")}>
                <Toggle defaultChecked />
              </SettingRow>
            </Section>

            <Section icon={<Bell size={14} className="text-amber-500" />} title={t("settings.notifications")}>
              <SettingRow label={t("settings.notifyGenFail")}>
                <Toggle defaultChecked />
              </SettingRow>
              <SettingRow label={t("settings.notifyUpdate")}>
                <Toggle defaultChecked />
              </SettingRow>
              <SettingRow label={t("settings.notifyConflict")}>
                <Toggle />
              </SettingRow>
            </Section>

            <Section icon={<Shield size={14} className="text-red-400" />} title={t("settings.security")}>
              <SettingRow label={t("settings.encryptSecrets")}>
                <Toggle defaultChecked />
              </SettingRow>
              <SettingRow label={t("settings.telemetry")}>
                <Toggle />
              </SettingRow>
            </Section>
          </div>
        ) : (
          <div className="space-y-4 max-w-[560px]">
            <Section icon={<Sun size={14} className="text-purple-500" />} title={t("settings.appearance")}>
              <SettingRow label={t("settings.theme")}>
                <div className="flex gap-1">
                  {(["light", "dark", "system"] as const).map((themeOption: Theme) => (
                    <button
                      key={themeOption}
                      onClick={() => setTheme(themeOption)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-md border transition-colors ${
                        theme === themeOption
                          ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300"
                          : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {themeOption === "light" && <Sun size={12} />}
                      {themeOption === "dark" && <Moon size={12} />}
                      {themeOption === "system" && <Monitor size={12} />}
                      {themeOption}
                    </button>
                  ))}
                </div>
              </SettingRow>
            </Section>

            <Section icon={<Globe size={14} className="text-teal-500" />} title={t("settings.language")}>
              <SettingRow label={t("settings.uiLanguage")}>
                <div className="flex gap-1">
                  <button
                    onClick={() => changeLanguage("zh-CN")}
                    className={`px-3 py-1.5 text-[12px] font-medium rounded-md border transition-colors ${
                      i18n.language === "zh-CN"
                        ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300"
                        : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    }`}
                  >
                    中文
                  </button>
                  <button
                    onClick={() => changeLanguage("en-US")}
                    className={`px-3 py-1.5 text-[12px] font-medium rounded-md border transition-colors ${
                      i18n.language === "en-US"
                        ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300"
                        : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    }`}
                  >
                    English
                  </button>
                </div>
              </SettingRow>
            </Section>

            <Section icon={<Monitor size={14} className="text-zinc-400" />} title={t("settings.about")}>
              <div className="space-y-2">
                <AboutRow label="版本" value="v0.1.0" />
                <AboutRow label="运行时" value="Tauri v2" />
                <AboutRow label="框架" value="React 18 + TypeScript" />
                <AboutRow label="适配器" value="12 vendors" />
                <AboutRow label="平台" value="Windows / macOS / Linux" />
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
        {icon}
        <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-200">{title}</span>
      </div>
      <div className="px-4 py-3 space-y-3">{children}</div>
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-zinc-600 dark:text-zinc-300">{label}</span>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

function Toggle({ defaultChecked }: { defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked ?? false);
  return (
    <button
      onClick={() => setOn(!on)}
      className={`w-9 h-5 rounded-full transition-colors relative ${
        on ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-600"
      }`}
    >
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
        on ? "translate-x-[18px]" : "translate-x-0.5"
      }`} />
    </button>
  );
}

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-zinc-400">{label}</span>
      <span className="text-[12px] text-zinc-700 dark:text-zinc-200 font-mono">{value}</span>
    </div>
  );
}
