import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import {
  TestTube2,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Trash2,
  FileCode2,
  AlertTriangle,
} from "lucide-react";
import {
  listPromptTests,
  createPromptTest,
  deletePromptTest,
  type PromptTestCase,
} from "../lib/tauri";

export default function PromptTesting() {
  const { t } = useTranslation();
  const [testCases, setTestCases] = useState<PromptTestCase[]>([]);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newExpected, setNewExpected] = useState("");
  const [newVendors, setNewVendors] = useState("cursor,claude-code,codex");

  const load = useCallback(async () => {
    try {
      const data = await listPromptTests();
      setTestCases(data);
      if (data.length > 0 && !selectedTest) setSelectedTest(data[0].id);
    } catch (e) { console.error("listPromptTests", e); }
  }, [selectedTest]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const vendors = newVendors.split(",").map((v) => v.trim()).filter(Boolean);
      const id = await createPromptTest(newName, newPrompt, newExpected, vendors);
      setShowNew(false);
      setNewName(""); setNewPrompt(""); setNewExpected("");
      await load();
      setSelectedTest(id);
    } catch (e) { console.error("createPromptTest", e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePromptTest(id);
      if (selectedTest === id) setSelectedTest(null);
      await load();
    } catch (e) { console.error("deletePromptTest", e); }
  };

  const currentTest = testCases.find((tc) => tc.id === selectedTest);

  const statusIcon = (status: string) => {
    switch (status) {
      case "pass": return <CheckCircle2 size={12} className="text-emerald-500" />;
      case "fail": return <XCircle size={12} className="text-red-500" />;
      case "pending": return <Clock size={12} className="text-amber-500" />;
      default: return <AlertTriangle size={12} className="text-zinc-400" />;
    }
  };

  const getPassRate = (tc: PromptTestCase) => {
    const completed = tc.results.filter((r) => r.status === "pass" || r.status === "fail");
    const passed = tc.results.filter((r) => r.status === "pass");
    if (completed.length === 0) return "—";
    return `${passed.length}/${completed.length}`;
  };

  return (
    <div className="h-full flex">
      <div className="w-[300px] border-r border-zinc-100 dark:border-zinc-800 flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
          <TestTube2 size={14} className="text-violet-500" />
          <span className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">
            {t("promptTest.title", "Prompt 测试")}
          </span>
          <div className="flex-1" />
          <button onClick={() => setShowNew(true)} className="p-1 text-zinc-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded">
            <Plus size={14} />
          </button>
        </div>

        {showNew && (
          <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 space-y-2 bg-zinc-50/50 dark:bg-zinc-900/50">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="测试名称" className="w-full px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
            <textarea value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} placeholder="Prompt 内容" rows={2} className="w-full px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 resize-none" />
            <input value={newExpected} onChange={(e) => setNewExpected(e.target.value)} placeholder="期望行为" className="w-full px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
            <input value={newVendors} onChange={(e) => setNewVendors(e.target.value)} placeholder="厂商 (逗号分隔)" className="w-full px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
            <div className="flex gap-2">
              <button onClick={handleCreate} className="flex-1 px-2 py-1 text-[11px] font-medium text-white bg-violet-600 rounded hover:bg-violet-700">创建</button>
              <button onClick={() => setShowNew(false)} className="px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">取消</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {testCases.length === 0 && !showNew && (
            <div className="p-4 text-center text-[12px] text-zinc-400">暂无测试，点击 + 创建</div>
          )}
          {testCases.map((tc) => (
            <button
              key={tc.id}
              onClick={() => setSelectedTest(tc.id)}
              className={`w-full text-left px-4 py-3 border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                selectedTest === tc.id ? "bg-violet-50/50 dark:bg-violet-500/5 border-l-2 border-l-violet-500" : ""
              }`}
            >
              <p className="text-[12px] text-zinc-700 dark:text-zinc-200 font-medium">{tc.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-zinc-400">{tc.vendors.length} 厂商</span>
                <span className="text-[10px] text-zinc-300">·</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  通过 {getPassRate(tc)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {currentTest ? (
          <>
            <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">{currentTest.name}</h2>
                <div className="flex items-center gap-2">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700">
                    <Play size={12} /> 运行全部
                  </button>
                  <button onClick={() => handleDelete(currentTest.id)} className="p-1.5 text-zinc-400 hover:text-red-500 rounded">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileCode2 size={11} className="text-zinc-400" />
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase">Prompt</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-300 font-mono">{currentTest.prompt}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <CheckCircle2 size={11} className="text-zinc-400" />
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase">期望行为</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-300">{currentTest.expected_behavior}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300">厂商结果</h3>
                {currentTest.results.length === 0 && (
                  <p className="text-[11px] text-zinc-400">尚无运行结果，点击"运行全部"开始测试</p>
                )}
                {currentTest.results.map((result) => (
                  <div key={result.vendor} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {statusIcon(result.status)}
                      <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200">{result.vendor}</span>
                      {result.response_time > 0 && (
                        <span className="text-[10px] text-zinc-400 ml-auto">{result.response_time}ms</span>
                      )}
                    </div>
                    {result.output && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1.5 rounded font-mono">
                        {result.output}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[12px] text-zinc-400">
            选择或创建一个测试用例
          </div>
        )}
      </div>
    </div>
  );
}
