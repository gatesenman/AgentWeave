import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Sparkles,
  Send,
  Lightbulb,
  Wand2,
  CheckCircle2,
  Copy,
  RefreshCw,
  Zap,
} from "lucide-react";

interface Suggestion {
  id: string;
  type: "optimize" | "add" | "fix" | "recommend";
  title: string;
  description: string;
  diff: string;
  confidence: number;
}

const mockSuggestions: Suggestion[] = [
  {
    id: "1",
    type: "optimize",
    title: "Agent 'fullstack-dev' 规则冗余",
    description: "检测到 3 条规则内容高度重叠（相似度 > 85%），建议合并为 1 条通用规则以减少 token 消耗",
    diff: "- rules: [code-style, code-format, code-convention]\n+ rules: [unified-code-standards]",
    confidence: 92,
  },
  {
    id: "2",
    type: "add",
    title: "建议为 MCP Server 'postgres' 添加健康检查",
    description: "当前配置缺少 health_check 字段，生产环境建议添加以确保连接可用性",
    diff: "+ health_check:\n+   endpoint: /health\n+   interval: 30s\n+   timeout: 5s",
    confidence: 88,
  },
  {
    id: "3",
    type: "fix",
    title: "Cursor 适配器兼容性问题",
    description: "Agent 'security-auditor' 使用了 Cursor 不支持的 'hooks.onError' 功能，生成时会被忽略",
    diff: "- hooks:\n-   onError: notify-slack\n+ # hooks.onError 不受 Cursor 支持，建议使用 MCP Server 替代",
    confidence: 95,
  },
  {
    id: "4",
    type: "recommend",
    title: "推荐启用 Context Window 优化",
    description: "当前 Agent 配置总 token 约 45K，超过 Codex 限制 (32K)。建议按优先级裁剪 context_files",
    diff: "# 建议移除低优先级 context:\n- context_files: [docs/*, tests/*, src/*]\n+ context_files: [src/*]  # 节省约 18K tokens",
    confidence: 78,
  },
];

export default function AIAssist() {
  const { t } = useTranslation();
  const [suggestions] = useState<Suggestion[]>(mockSuggestions);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "ai"; text: string }>>([
    { role: "ai", text: "你好！我是 AgentWeave AI 助手。我可以帮你：\n• 分析配置质量并给出优化建议\n• 推荐最适合的厂商组合\n• 检测兼容性问题\n• 生成配置模板\n\n有什么可以帮助你的？" },
  ]);

  const typeIcons: Record<string, typeof Sparkles> = {
    optimize: Zap,
    add: Lightbulb,
    fix: Wand2,
    recommend: Sparkles,
  };
  const typeColors: Record<string, string> = {
    optimize: "text-amber-500 bg-amber-50 dark:bg-amber-500/10",
    add: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
    fix: "text-red-500 bg-red-50 dark:bg-red-500/10",
    recommend: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10",
  };

  const handleSend = () => {
    if (!chatInput.trim()) return;
    setChatHistory((prev) => [
      ...prev,
      { role: "user", text: chatInput },
      { role: "ai", text: "正在分析你的配置项目...\n\n基于当前 3 个 Agent、12 条 Rules 和 4 个 MCP Server 的配置，我发现以下优化空间：\n1. 合并重复规则可节省约 30% token\n2. 建议为 Codex 启用独立的精简配置\n3. 'postgres' MCP 建议添加重连策略" },
    ]);
    setChatInput("");
  };

  return (
    <div className="h-full flex">
      {/* Left: suggestions */}
      <div className="w-[360px] border-r border-zinc-100 dark:border-zinc-800 flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
          <Sparkles size={14} className="text-indigo-500" />
          <span className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">
            {t("ai.suggestions", "AI 建议")}
          </span>
          <div className="flex-1" />
          <button className="p-1 text-zinc-400 hover:text-indigo-500 rounded">
            <RefreshCw size={13} />
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {suggestions.map((s) => {
            const Icon = typeIcons[s.type];
            return (
              <div key={s.id} className="px-4 py-3 border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <div className="flex items-start gap-2">
                  <div className={`p-1 rounded ${typeColors[s.type]} shrink-0 mt-0.5`}>
                    <Icon size={11} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200 truncate">{s.title}</p>
                      <span className="text-[9px] text-zinc-400 shrink-0">{s.confidence}%</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{s.description}</p>
                    <pre className="text-[10px] font-mono text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded mt-1.5 overflow-hidden whitespace-pre-wrap">
                      {s.diff}
                    </pre>
                    <div className="flex items-center gap-2 mt-2">
                      <button className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700">
                        <CheckCircle2 size={9} /> 应用
                      </button>
                      <button className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200">
                        <Copy size={9} /> 复制
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: chat */}
      <div className="flex-1 flex flex-col">
        <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
            {t("ai.chat", "AI 对话")}
          </h2>
          <p className="text-[11px] text-zinc-400">基于当前项目配置的智能助手</p>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4 space-y-3">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-lg text-[12px] whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="问我关于配置优化的问题..."
              className="flex-1 px-3 py-2 text-[12px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={handleSend}
              className="p-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
