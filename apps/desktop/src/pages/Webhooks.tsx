import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Webhook,
  Plus,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";

interface WebhookEntry {
  id: string;
  name: string;
  url: string;
  events: string[];
  channel: "slack" | "discord" | "teams" | "custom";
  enabled: boolean;
  lastTriggered: string;
  lastStatus: "success" | "failed" | "pending";
}

const mockWebhooks: WebhookEntry[] = [
  {
    id: "1",
    name: "Slack: Config Changes",
    url: "https://hooks.slack.com/services/T00.../B00.../xxx",
    events: ["config.generated", "config.validated"],
    channel: "slack",
    enabled: true,
    lastTriggered: "5 分钟前",
    lastStatus: "success",
  },
  {
    id: "2",
    name: "Discord: Conflict Alerts",
    url: "https://discord.com/api/webhooks/123.../abc...",
    events: ["sync.conflict"],
    channel: "discord",
    enabled: true,
    lastTriggered: "2 小时前",
    lastStatus: "success",
  },
  {
    id: "3",
    name: "Teams: Deploy Notifications",
    url: "https://outlook.office.com/webhook/...",
    events: ["config.generated", "sync.conflict", "lint.error"],
    channel: "teams",
    enabled: false,
    lastTriggered: "3 天前",
    lastStatus: "failed",
  },
];

const eventOptions = [
  { value: "config.generated", label: "配置生成完成" },
  { value: "config.validated", label: "配置验证通过" },
  { value: "sync.conflict", label: "同步冲突" },
  { value: "lint.error", label: "Lint 检查错误" },
  { value: "health.degraded", label: "健康检查降级" },
  { value: "team.lock", label: "概念被锁定" },
];

export default function Webhooks() {
  const { t } = useTranslation();
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>(mockWebhooks);
  const [showAdd, setShowAdd] = useState(false);

  const toggleWebhook = (id: string) => {
    setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)));
  };

  const channelColors: Record<string, string> = {
    slack: "text-purple-600 bg-purple-50 dark:bg-purple-500/10 dark:text-purple-400",
    discord: "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400",
    teams: "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400",
    custom: "text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300",
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
          <Webhook size={16} className="text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
            {t("webhooks.title", "Webhook 集成")}
          </h2>
          <p className="text-[11px] text-zinc-400">
            {t("webhooks.subtitle", "配置事件通知到 Slack/Discord/Teams")}
          </p>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors shadow-sm"
        >
          <Plus size={12} />
          {t("webhooks.add", "添加 Webhook")}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-5 py-4 space-y-3">
        {/* Event legend */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 mb-4">
          <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 mb-2">可用事件:</p>
          <div className="flex flex-wrap gap-1.5">
            {eventOptions.map((evt) => (
              <span key={evt.value} className="text-[10px] text-zinc-500 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded">
                {evt.value} — {evt.label}
              </span>
            ))}
          </div>
        </div>

        {/* Webhook list */}
        {webhooks.map((webhook) => (
          <div
            key={webhook.id}
            className={`bg-white dark:bg-zinc-900 border rounded-lg p-4 ${
              webhook.enabled
                ? "border-zinc-200 dark:border-zinc-800"
                : "border-zinc-100 dark:border-zinc-800/50 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${channelColors[webhook.channel]}`}>
                  {webhook.channel}
                </span>
                <h4 className="text-[13px] font-medium text-zinc-700 dark:text-zinc-200">{webhook.name}</h4>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleWebhook(webhook.id)}
                  className={`p-1 rounded-md ${webhook.enabled ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                >
                  {webhook.enabled ? <Play size={13} /> : <Pause size={13} />}
                </button>
                <button className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <p className="text-[11px] font-mono text-zinc-400 truncate mb-2">{webhook.url}</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {webhook.events.map((evt) => (
                  <span key={evt} className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                    {evt}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                {webhook.lastStatus === "success" ? (
                  <CheckCircle2 size={10} className="text-emerald-500" />
                ) : webhook.lastStatus === "failed" ? (
                  <XCircle size={10} className="text-red-500" />
                ) : (
                  <Clock size={10} />
                )}
                <span>{webhook.lastTriggered}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
