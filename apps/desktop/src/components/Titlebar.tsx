import { useConfigStore } from "../store/config";
import { Minus, Square, X, Activity } from "lucide-react";

export default function Titlebar() {
  const { projectDir } = useConfigStore();
  const projectName = projectDir
    ? (projectDir.split("/").pop() || projectDir.split("\\").pop())
    : "";

  return (
    <div
      className="h-10 bg-white dark:bg-[#1f1f23] flex items-center border-b border-zinc-200 dark:border-zinc-800 shrink-0 select-none"
      data-tauri-drag-region=""
    >
      {/* Left: brand */}
      <div className="flex items-center gap-2 px-4">
        <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
          <Activity size={13} className="text-white" />
        </div>
        <span className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">
          AgentWeave
        </span>
        {projectName && (
          <>
            <span className="text-zinc-300 dark:text-zinc-600">/</span>
            <span className="text-[12px] text-zinc-500 dark:text-zinc-400">{projectName}</span>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Right: window controls */}
      <div className="flex items-center h-full">
        <button className="w-10 h-full flex items-center justify-center text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <Minus size={14} />
        </button>
        <button className="w-10 h-full flex items-center justify-center text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <Square size={11} />
        </button>
        <button className="w-10 h-full flex items-center justify-center text-zinc-400 hover:bg-red-500 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
