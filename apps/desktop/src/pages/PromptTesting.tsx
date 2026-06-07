import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  TestTube2,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  FileCode2,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

interface TestCase {
  id: string;
  name: string;
  prompt: string;
  expectedBehavior: string;
  vendors: string[];
  results: VendorResult[];
}

interface VendorResult {
  vendor: string;
  status: "pass" | "fail" | "pending" | "skip";
  responseTime: number;
  output: string;
}

const mockTestCases: TestCase[] = [
  {
    id: "1",
    name: "Code review — detects security issues",
    prompt: "Review this code for security vulnerabilities: `eval(user_input)`",
    expectedBehavior: "Should identify eval() as dangerous and suggest alternatives",
    vendors: ["Claude Code", "Cursor", "Codex"],
    results: [
      { vendor: "Claude Code", status: "pass", responseTime: 2100, output: "Detected: eval() injection vulnerability. Suggest using JSON.parse() or a safe parser." },
      { vendor: "Cursor", status: "pass", responseTime: 1800, output: "Security issue: eval(user_input) allows code injection. Use a sandboxed evaluator." },
      { vendor: "Codex", status: "fail", responseTime: 3200, output: "The code uses eval which processes user input." },
    ],
  },
  {
    id: "2",
    name: "Refactor — extract function correctly",
    prompt: "Extract the loop body into a separate function named `processItem`",
    expectedBehavior: "Should create processItem function and replace loop body with call",
    vendors: ["Claude Code", "Cursor", "Windsurf", "Copilot"],
    results: [
      { vendor: "Claude Code", status: "pass", responseTime: 2800, output: "Created processItem(item) and replaced loop body." },
      { vendor: "Cursor", status: "pass", responseTime: 2200, output: "Extracted processItem function with correct signature." },
      { vendor: "Windsurf", status: "pass", responseTime: 3100, output: "Function extracted with proper parameter passing." },
      { vendor: "Copilot", status: "pending", responseTime: 0, output: "" },
    ],
  },
  {
    id: "3",
    name: "Docs — generates JSDoc correctly",
    prompt: "Add JSDoc comments to all exported functions",
    expectedBehavior: "Should add @param, @returns, and @description for each export",
    vendors: ["Claude Code", "Gemini CLI"],
    results: [
      { vendor: "Claude Code", status: "pass", responseTime: 1500, output: "Added JSDoc with @param/@returns to 5 functions." },
      { vendor: "Gemini CLI", status: "fail", responseTime: 4200, output: "Added comments but missing @returns annotations." },
    ],
  },
];

export default function PromptTesting() {
  const { t } = useTranslation();
  const [testCases] = useState<TestCase[]>(mockTestCases);
  const [selectedTest, setSelectedTest] = useState<string>("1");

  const currentTest = testCases.find((tc) => tc.id === selectedTest);

  const statusIcon = (status: string) => {
    switch (status) {
      case "pass": return <CheckCircle2 size={12} className="text-emerald-500" />;
      case "fail": return <XCircle size={12} className="text-red-500" />;
      case "pending": return <Clock size={12} className="text-amber-500" />;
      default: return <AlertTriangle size={12} className="text-zinc-400" />;
    }
  };

  const getPassRate = (tc: TestCase) => {
    const completed = tc.results.filter((r) => r.status === "pass" || r.status === "fail");
    const passed = tc.results.filter((r) => r.status === "pass");
    if (completed.length === 0) return "—";
    return `${passed.length}/${completed.length}`;
  };

  return (
    <div className="h-full flex">
      {/* Left: test case list */}
      <div className="w-[300px] border-r border-zinc-100 dark:border-zinc-800 flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
          <TestTube2 size={14} className="text-violet-500" />
          <span className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">
            {t("promptTest.title", "Prompt 测试")}
          </span>
          <div className="flex-1" />
          <button className="p-1 text-zinc-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded">
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-auto">
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

      {/* Right: test detail */}
      <div className="flex-1 flex flex-col">
        {currentTest ? (
          <>
            <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">{currentTest.name}</h2>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700">
                  <Play size={12} /> 运行全部
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
              {/* Prompt & expected */}
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
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-300">{currentTest.expectedBehavior}</p>
                </div>
              </div>

              {/* Vendor results */}
              <div className="space-y-2">
                <h3 className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300">厂商结果</h3>
                {currentTest.results.map((result) => (
                  <div key={result.vendor} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {statusIcon(result.status)}
                      <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200">{result.vendor}</span>
                      {result.responseTime > 0 && (
                        <span className="text-[10px] text-zinc-400 ml-auto">{result.responseTime}ms</span>
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
            选择一个测试用例
          </div>
        )}
      </div>
    </div>
  );
}
