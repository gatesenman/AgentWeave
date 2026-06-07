import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Package,
  Download,
  Star,
  Search,
  Filter,
  ExternalLink,
  User,
  Clock,
  Tag,
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  author: string;
  category: string;
  tags: string[];
  downloads: number;
  stars: number;
  updatedAt: string;
  concepts: { agents: number; rules: number; mcp: number; workflows: number };
}

const mockTemplates: Template[] = [
  {
    id: "1",
    name: "fullstack-web-dev",
    description: "Full-stack web development with React, Node.js, and TypeScript. Includes code style rules, testing patterns, and deployment workflows.",
    author: "agentweave",
    category: "web",
    tags: ["react", "nodejs", "typescript", "testing"],
    downloads: 2340,
    stars: 89,
    updatedAt: "2024-12-15",
    concepts: { agents: 3, rules: 12, mcp: 4, workflows: 2 },
  },
  {
    id: "2",
    name: "data-science-ml",
    description: "Data science and ML engineering setup with Python, Jupyter, and MLflow integration. Includes data validation rules and experiment tracking.",
    author: "community",
    category: "ml",
    tags: ["python", "jupyter", "mlflow", "pandas"],
    downloads: 1560,
    stars: 67,
    updatedAt: "2024-12-10",
    concepts: { agents: 2, rules: 8, mcp: 3, workflows: 1 },
  },
  {
    id: "3",
    name: "devops-infra",
    description: "Infrastructure as code with Terraform, Kubernetes, and CI/CD pipelines. Security-hardened rules and deployment automation.",
    author: "agentweave",
    category: "devops",
    tags: ["terraform", "kubernetes", "docker", "security"],
    downloads: 980,
    stars: 45,
    updatedAt: "2024-12-08",
    concepts: { agents: 2, rules: 15, mcp: 2, workflows: 4 },
  },
  {
    id: "4",
    name: "mobile-cross-platform",
    description: "Cross-platform mobile development with React Native and Flutter. Includes platform-specific rules and performance optimization patterns.",
    author: "community",
    category: "mobile",
    tags: ["react-native", "flutter", "ios", "android"],
    downloads: 720,
    stars: 32,
    updatedAt: "2024-11-28",
    concepts: { agents: 2, rules: 10, mcp: 2, workflows: 1 },
  },
  {
    id: "5",
    name: "enterprise-governance",
    description: "Enterprise-grade governance templates with RBAC policies, audit logging, compliance rules, and security scanning workflows.",
    author: "agentweave",
    category: "enterprise",
    tags: ["rbac", "compliance", "audit", "security"],
    downloads: 450,
    stars: 28,
    updatedAt: "2024-12-12",
    concepts: { agents: 1, rules: 20, mcp: 1, workflows: 3 },
  },
  {
    id: "6",
    name: "rust-systems",
    description: "Systems programming with Rust. Includes memory safety rules, async patterns, and performance benchmarking workflows.",
    author: "community",
    category: "systems",
    tags: ["rust", "async", "performance", "safety"],
    downloads: 380,
    stars: 41,
    updatedAt: "2024-12-05",
    concepts: { agents: 2, rules: 14, mcp: 3, workflows: 2 },
  },
];

const categories = [
  { key: "all", label: "全部" },
  { key: "web", label: "Web 开发" },
  { key: "ml", label: "数据/ML" },
  { key: "devops", label: "DevOps" },
  { key: "mobile", label: "移动端" },
  { key: "enterprise", label: "企业级" },
  { key: "systems", label: "系统编程" },
];

export default function Templates() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = mockTemplates.filter((tpl) => {
    const matchesCategory = activeCategory === "all" || tpl.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.tags.some((tag) => tag.includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
            <Package size={16} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
              {t("templates.title", "模板市场")}
            </h2>
            <p className="text-[11px] text-zinc-400">
              {t("templates.subtitle", "社区共享的 Agent/Rule/Workflow 配置模板")}
            </p>
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("templates.search", "搜索模板...")}
              className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400 text-zinc-700 dark:text-zinc-200 placeholder-zinc-400"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-colors ${
                  activeCategory === cat.key
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Template grid */}
      <div className="flex-1 overflow-auto px-5 py-4">
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((tpl) => (
            <TemplateCard key={tpl.id} template={tpl} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-[200px]">
            <p className="text-[13px] text-zinc-400">{t("templates.noResults", "没有找到匹配的模板")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ template }: { template: Template }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-colors group">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {template.name}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-zinc-400 flex items-center gap-1">
              <User size={9} /> {template.author}
            </span>
            <span className="text-[10px] text-zinc-400 flex items-center gap-1">
              <Clock size={9} /> {template.updatedAt}
            </span>
          </div>
        </div>
        <button className="p-1.5 rounded-md text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors opacity-0 group-hover:opacity-100">
          <Download size={14} />
        </button>
      </div>

      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3">
        {template.description}
      </p>

      {/* Concept counts */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
          {template.concepts.agents} agents
        </span>
        <span className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
          {template.concepts.rules} rules
        </span>
        <span className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
          {template.concepts.mcp} mcp
        </span>
        <span className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
          {template.concepts.workflows} workflows
        </span>
      </div>

      {/* Tags + stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 overflow-hidden">
          {template.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-400 shrink-0">
          <span className="flex items-center gap-0.5"><Download size={9} /> {template.downloads}</span>
          <span className="flex items-center gap-0.5"><Star size={9} /> {template.stars}</span>
        </div>
      </div>
    </div>
  );
}
