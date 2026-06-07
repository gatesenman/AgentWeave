import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { yaml } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";
import { useThemeStore } from "../store/theme";
import { useConfigStore } from "../store/config";
import { getVendorPreview } from "../lib/tauri";

export default function Compare() {
  const { t } = useTranslation();
  const { theme } = useThemeStore();
  const { vendors, projectDir, loadVendors } = useConfigStore();
  const [leftVendor, setLeftVendor] = useState("codex");
  const [rightVendor, setRightVendor] = useState("claude-code");
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  useEffect(() => {
    if (projectDir) {
      loadPreview(leftVendor, "left");
      loadPreview(rightVendor, "right");
    }
  }, [projectDir, leftVendor, rightVendor]);

  const loadPreview = async (vendor: string, side: "left" | "right") => {
    if (!projectDir) return;
    try {
      const content = await getVendorPreview(projectDir, vendor);
      if (side === "left") setLeft(content);
      else setRight(content);
    } catch (e) {
      const errorMsg = `# Error loading ${vendor} preview\n# ${String(e)}`;
      if (side === "left") setLeft(errorMsg);
      else setRight(errorMsg);
    }
  };

  const vendorNames = vendors.map((v) => v.name);

  if (!projectDir) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[13px] text-zinc-500">{t("common.selectProject", "Select a project from Dashboard first")}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3 shrink-0">
        <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">{t("compare.title")}</h2>
        <div className="flex-1" />
        <select
          value={leftVendor}
          onChange={(e) => setLeftVendor(e.target.value)}
          className="px-2.5 py-1.5 text-[12px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-md focus:border-indigo-500 focus:outline-none"
        >
          {vendorNames.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <span className="text-[12px] text-zinc-400 font-medium">vs</span>
        <select
          value={rightVendor}
          onChange={(e) => setRightVendor(e.target.value)}
          className="px-2.5 py-1.5 text-[12px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-md focus:border-indigo-500 focus:outline-none"
        >
          {vendorNames.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      {/* Editor panels */}
      <div className="flex-1 grid grid-cols-2 divide-x divide-zinc-200 dark:divide-zinc-800 min-h-0">
        <div className="flex flex-col overflow-hidden">
          <div className="px-4 py-1.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-[11px] font-mono text-zinc-500">{leftVendor}</span>
          </div>
          <div className="flex-1 overflow-auto">
            <CodeMirror
              value={left}
              height="100%"
              extensions={[yaml()]}
              theme={theme === "dark" ? oneDark : undefined}
              onChange={setLeft}
              className="h-full text-[12px]"
            />
          </div>
        </div>
        <div className="flex flex-col overflow-hidden">
          <div className="px-4 py-1.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-[11px] font-mono text-zinc-500">{rightVendor}</span>
          </div>
          <div className="flex-1 overflow-auto">
            <CodeMirror
              value={right}
              height="100%"
              extensions={[yaml()]}
              theme={theme === "dark" ? oneDark : undefined}
              onChange={setRight}
              className="h-full text-[12px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
