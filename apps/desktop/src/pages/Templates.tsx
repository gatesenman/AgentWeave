import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import {
  Package,
  Download,
  Star,
  Search,
  Plus,
  Trash2,
  User,
  Clock,
} from "lucide-react";
import {
  listTemplates,
  createTemplate,
  deleteTemplate,
  type TemplateInfo,
} from "../lib/tauri";

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
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("web");
  const [newDesc, setNewDesc] = useState("");

  const load = useCallback(async () => {
    try {
      const cat = activeCategory === "all" ? undefined : activeCategory;
      const data = await listTemplates(cat);
      setTemplates(data);
    } catch (e) { console.error("listTemplates", e); }
  }, [activeCategory]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createTemplate(newName, newCategory, newDesc, "user", [], "{}");
      setShowNew(false); setNewName(""); setNewDesc("");
      await load();
    } catch (e) { console.error("createTemplate", e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate(id);
      await load();
    } catch (e) { console.error("deleteTemplate", e); }
  };

  const filtered = templates.filter((tpl) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return tpl.name.toLowerCase().includes(q) || tpl.description.toLowerCase().includes(q) || tpl.tags.some((tag) => tag.includes(q));
  });

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
            <Package size={16} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
              {t("templates.title", "模板市场")}
            </h2>
            <p className="text-[11px] text-zinc-400">
              {t("templates.subtitle", "社区共享的 Agent/Rule/Workflow 配置模板")}
            </p>
          </div>
          <button onClick={() => setShowNew(true)} className="p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded">
            <Plus size={14} />
          </button>
        </div>

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

      {showNew && (
        <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="模板名称" className="w-full px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="描述" className="w-full px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200" />
          <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full px-2 py-1 text-[12px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200">
            {categories.filter((c) => c.key !== "all").map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="flex-1 px-2 py-1 text-[11px] font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700">创建</button>
            <button onClick={() => setShowNew(false)} className="px-2 py-1 text-[11px] text-zinc-500">取消</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto px-5 py-4">
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((tpl) => (
            <div key={tpl.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-colors group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {tpl.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1"><User size={9} /> {tpl.author}</span>
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1"><Clock size={9} /> {tpl.created_at}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(tpl.id)} className="p-1.5 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3">{tpl.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 overflow-hidden">
                  {tpl.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
                <span className="flex items-center gap-0.5 text-[10px] text-zinc-400"><Download size={9} /> {tpl.downloads}</span>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-[200px]">
            <p className="text-[13px] text-zinc-400">{templates.length === 0 ? "暂无模板，点击 + 添加" : "没有找到匹配的模板"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
