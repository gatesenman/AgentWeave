import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { Sparkles, Send, Lightbulb, Wrench, Plus, AlertTriangle } from "lucide-react";
import { getAiSuggestions, askAiQuestion, type AiSuggestion, type AiAnswer } from "../lib/tauri";
import { useConfigStore } from "../store/config";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AIAssist() {
  const { t } = useTranslation();
  const projectDir = useConfigStore((s) => s.projectDir) || "";
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [asking, setAsking] = useState(false);

  const load = useCallback(async () => {
    if (!projectDir) return;
    setLoading(true);
    try { setSuggestions(await getAiSuggestions(projectDir)); } catch (e) { console.error("getAiSuggestions", e); }
    setLoading(false);
  }, [projectDir]);
  useEffect(() => { load(); }, [load]);

  const handleAsk = async () => {
    if (!question.trim() || !projectDir || asking) return;
    const q = question.trim();
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setAsking(true);
    try {
      const answer: AiAnswer = await askAiQuestion(projectDir, q);
      setMessages((prev) => [...prev, { role: "assistant", content: answer.answer }]);
      if (answer.related_suggestions.length > 0) {
        setSuggestions((prev) => [...answer.related_suggestions, ...prev]);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: `错误: ${e}` }]);
    }
    setAsking(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); }
  };

  const typeIcon = (type: string) => {
    if (type === "optimization") return <Wrench size={12} className="text-blue-500" />;
    if (type === "warning") return <AlertTriangle size={12} className="text-amber-500" />;
    if (type === "recommendation") return <Lightbulb size={12} className="text-emerald-500" />;
    return <Plus size={12} className="text-indigo-500" />;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
          <Sparkles size={16} className="text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">{t("ai.title", "AI 助手")}</h2>
          <p className="text-[11px] text-zinc-400">智能配置建议与优化推荐</p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:opacity-50">
          <Sparkles size={12} /> {loading ? "分析中..." : "重新分析"}
        </button>
      </div>

      {!projectDir && (
        <div className="flex-1 flex items-center justify-center text-[12px] text-zinc-400">请先打开一个项目</div>
      )}

      <div className="flex-1 overflow-auto px-5 py-4 space-y-3">
        {/* Chat messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-lg text-[12px] ${
              msg.role === "user"
                ? "bg-violet-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {asking && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-lg text-[12px] bg-zinc-100 dark:bg-zinc-800 text-zinc-400">思考中...</div>
          </div>
        )}

        {/* Suggestions */}
        {messages.length === 0 && suggestions.length === 0 && !loading && projectDir && (
          <div className="text-center py-8 text-[12px] text-zinc-400">暂无建议。配置解析后 AI 会自动提供优化建议。</div>
        )}
        {loading && (
          <div className="text-center py-8 text-[12px] text-zinc-400">正在分析配置...</div>
        )}
        {suggestions.map((s, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              {typeIcon(s.suggestion_type)}
              <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-200">{s.title}</span>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{s.suggestion_type}</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{s.description}</p>
            {s.confidence > 0 && <p className="text-[10px] text-indigo-500 mt-1">置信度: {Math.round(s.confidence * 100)}%</p>}
          </div>
        ))}
      </div>

      <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="向 AI 提问关于配置的问题..."
            className="flex-1 px-3 py-2 text-[12px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-zinc-700 dark:text-zinc-200 placeholder-zinc-400"
          />
          <button onClick={handleAsk} disabled={asking || !question.trim()} className="p-2 text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:opacity-50">
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
