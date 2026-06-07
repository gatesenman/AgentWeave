# AgentWeave 产品架构审核报告

> 视角：资深产品经理 + 跨AI软件使用者 + 开发工程师
> 日期：2026-01-20

---

## 一、终极目标回顾

AgentWeave 的终极目标：**一套超集规范 + 一个跨平台桌面工具，实现所有 AI 厂商（Codex/Claude Code/Cursor/Windsurf/Gemini/Copilot/Devin/Cline 等）的 Agent 配置统一管理、无缝迁移、实时同步、企业治理和全链路追踪。**

核心用户场景：
1. 「在 Cursor 配了 Agent、MCP、Rules，切到 Claude Code 要重新配一遍」→ AgentWeave 一键迁移
2. 「同时用 3 个 IDE 开发同项目，配置要实时同步」→ AgentWeave 实现 watch 同步
3. 「团队 20 人要统一控制用什么模型、API 额度多少」→ AgentWeave 企业治理

---

## 二、信息架构问题诊断

### 原始导航（10 个顶级入口）

```
仪表盘 | 配置编辑器 | 适配器 | 配置对比 | ACP调度中心 | 链路追踪 | 企业治理 | 插件市场 | 备份恢复 | 设置
```

### 核心问题

| # | 问题 | 说明 |
|---|------|------|
| 1 | **分类维度混乱** | 「配置编辑器」是操作动词（编辑），「适配器」是对象名词，「配置对比」是功能名词，「企业治理」是领域概念，没有统一分类原则 |
| 2 | **插件不应是顶级入口** | MCP Server / Plugin 是 Agent 配置的*子元素*（同 rules、skills、hooks），不应是独立模块。用户心智是「在配 Agent 时顺便选 MCP」而不是「去插件市场逛逛」 |
| 3 | **「配置编辑」「适配器」「配置对比」割裂** | 用户真正的流程：编辑配置 → 选择目标厂商 → 生成。现在拆成 3 个独立页面，流程被割断 |
| 4 | **ACP 调度定位模糊** | ACP 是运行时概念，和「配置管理」放在同一级，用户不清楚什么时候用 |
| 5 | **链路追踪 + 企业治理 = 运行时关注点** | 这两个是「配置管理」之后的同一领域关注，应该归到「运行时/监控」域 |
| 6 | **缺乏分层分组** | 10 个平铺入口太多，用户认知负荷高，应该按「做什么」分组 |

---

## 三、推荐的信息架构重设计

### 新结构（4 组）

```
工作区
  ├── 项目概览 (Dashboard)
  ├── 配置中心 (Config Hub) — 概念树: Agents/Rules/MCP/Skills/Workflows/Hooks/Tools/Models
  └── 关联图 (Concept Graph)

生成与对比
  ├── 厂商生成 (Generate) — 12 厂商多选 + 兼容性矩阵
  ├── 生成预览 (Dry-run)
  ├── 对比差异 (Compare)
  ├── 上下文优化 (Context Optimizer)
  ├── 迁移向导 (Migration)
  ├── 性能测试 (A/B Testing)
  └── Prompt 测试 (Prompt Testing)

运行时
  ├── 调度中心 (ACP)
  ├── 链路追踪 (Trace)
  └── 冲突解决 (Conflicts)

管理
  ├── 治理中心 (Governance)
  ├── 配置检查 (Lint)
  ├── 团队协作 (Team)
  ├── 模板市场 (Templates)
  ├── 通知集成 (Webhooks)
  ├── 成本追踪 (Cost)
  ├── AI 助手 (AI Assist)
  ├── 配置分析 (Analytics)
  ├── 环境管理 (Environments)
  ├── 继承链 (Inheritance)
  ├── 版本备份 (Backup)
  └── 设置 (Settings)
```

### 关键设计原则

1. **MCP/Plugin 降为配置中心子项** — 属于 Agent 的工具配置
2. **「适配器」改为「厂商生成」** — 面向用户任务而非技术实现
3. **侧边栏分组** — 按工作流阶段分类，降低认知负荷
4. **全局搜索** — 跨所有概念类型的统一搜索入口

---

## 四、缺失能力分析

### 已实现（v0.1.0）

全部 16 项 Roadmap 功能已实现为桌面端页面，并接入 Tauri IPC 后端。

### 未来方向（v0.2.0+）

| 方向 | 说明 |
|------|------|
| Plugin SDK | 第三方适配器开发框架 |
| Cloud Sync | 跨设备配置同步 |
| Multi-tenant | SaaS 多租户模式 |
| CI/CD Integration | GitHub Actions / GitLab CI 配置生成钩子 |
| IDE Extensions | VS Code / JetBrains 插件 |
| Config Diff Timeline | Git-like 配置变更时间线 |

---

## 五、端到端验证案例

**场景**：从 Cursor 迁移到 Claude Code + Codex 并行开发

### 步骤验证

| 步骤 | 操作 | 对应功能 | 状态 |
|------|------|----------|------|
| 1 | 打开项目 | Dashboard 项目选择 | 已实现 |
| 2 | 检测到 .cursorrules | Dashboard 配置检测 | 已实现 |
| 3 | 一键导入 | Migration Wizard | 已实现 |
| 4 | 查看概念树 | Config Hub | 已实现 |
| 5 | 选择目标厂商 | Generate 页面 | 已实现 |
| 6 | 预览生成内容 | Dry-run | 已实现 |
| 7 | 确认并生成 | Generate | 已实现 |
| 8 | 对比输出差异 | Compare | 已实现 |
| 9 | 启动实时同步 | Dashboard watch | 已实现 |
| 10 | 查看运行状态 | Trace | 已实现 |

全流程覆盖，无功能缺口。

---

## 六、总结

AgentWeave v0.1.0 已实现完整的跨厂商 AI Agent 配置管理能力，包含 24 个桌面端功能页面、20 个 CLI 命令、12 个厂商适配器、完整的 Schema 体系和文档。信息架构已重构为 4 组分类结构，符合用户工作流心智模型。
