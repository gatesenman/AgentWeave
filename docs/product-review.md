# AgentWeave 产品架构审核报告

> 视角：资深产品经理 + 跨AI软件使用者 + 开发工程师
> 日期：2026-06-07

---

## 一、终极目标回顾

AgentWeave 的终极目标是：**一套超集规范 + 一个跨平台桌面工具，实现所有 AI 厂商（Codex/Claude Code/Cursor/Windsurf/Gemini/Copilot/Devin/Cline 等）的 Agent 配置统一管理、无缝迁移、实时同步、企业治理和全链路追踪。**

核心用户场景：
1. 「我在 Cursor 配好了 Agent、MCP、Rules，换到 Claude Code 要重新配一遍」→ AgentWeave 一键迁移
2. 「我同时用 3 个 IDE 开发同一项目，配置要实时同步」→ AgentWeave 实时 watch
3. 「团队有 20 人，要统一管控谁能用什么模型、API 额度多少」→ AgentWeave 企业治理

---

## 二、当前信息架构问题诊断

### 当前导航（10 个一级入口）

```
仪表盘 | 配置编辑器 | 适配器 | 配置对比 | ACP调度中心 | 链路追踪 | 企业治理 | 插件市场 | 备份恢复 | 设置
```

### 核心问题

| # | 问题 | 说明 |
|---|------|------|
| 1 | **分类维度混乱** | 「配置编辑器」是操作动词（编辑），「适配器」是对象名词，「配置对比」是功能动词，「企业治理」是领域。没有统一分类原则 |
| 2 | **插件不应是顶级入口** | MCP Server / Plugin 是 Agent 配置的**子元素**（等同于 rules、skills、hooks），不是独立模块。用户心智模型是「我在配 Agent 时顺便配 MCP」而不是「我去插件市场逛逛」 |
| 3 | **「配置编辑器」和「适配器」割裂** | 用户真正的流程是：编辑配置 → 选择目标厂商 → 生成。现在拆成 3 个独立页面，流程断裂 |
| 4 | **ACP 调度定位模糊** | ACP 是「运行时」概念，但和「配置管理」混在同一层级，用户不清楚什么时候用 |
| 5 | **链路追踪 + 企业治理 = 运维关注点** | 这两个和「配置管理」是不同的关注领域，应该归到「运营/监控」区域 |
| 6 | **缺少层级分组** | 10 个平铺入口太多，用户认知负荷高。应按「做什么」分组 |

---

## 三、建议的信息架构（重新设计）

### 设计原则
- **以用户任务为中心**（不是以系统模块为中心）
- **配置内容层级化**（Agent > Rules/MCP/Skills/Hooks/...）
- **按关注点分离**（配置 vs 运行 vs 治理）

### 建议导航结构

```
┌────────────────────────────────────────────┐
│  一级导航（侧边栏分组）                      │
├────────────────────────────────────────────┤
│                                            │
│  ── 工作区 ──                               │
│  ⬡ 项目概览          (Dashboard)           │
│  ⊞ 配置中心          (Config Hub)          │
│      ├ 智能体 (Agents)                      │
│      ├ 规则 (Rules)                         │
│      ├ MCP 服务                             │
│      ├ 技能 (Skills)                        │
│      ├ 工作流 (Workflows)                   │
│      ├ 钩子 (Hooks)                         │
│      ├ 工具 (Tools)                         │
│      ├ 模型 (Models)                        │
│      ├ 上下文 (Context)                     │
│      ├ 记忆 (Memory)                        │
│      ├ 模板 (Templates)                     │
│      └ 源文件 (YAML)                        │
│                                            │
│  ── 生成与对比 ──                            │
│  ⇄ 厂商生成          (Generate)            │
│  ⚖ 对比与差异         (Compare/Diff)        │
│                                            │
│  ── 运行时 ──                               │
│  ▷ 调度中心           (ACP Runtime)         │
│  ◎ 链路追踪           (Trace)              │
│                                            │
│  ── 管理 ──                                 │
│  ⛨ 治理中心           (Governance)         │
│  ↻ 版本与备份         (Backup/Version)      │
│  ⚙ 设置              (Settings)            │
│                                            │
└────────────────────────────────────────────┘
```

### 关键变化说明

| 变化 | 理由 |
|------|------|
| 「配置中心」替代「配置编辑器」 | 不仅是编辑 YAML，而是按概念分门别类管理。用户可以直接进入"Agents"子页面新增/编辑 Agent，而不是面对一堆 YAML |
| MCP/Plugin 收入「配置中心」子级 | MCP Server 是 Agent 的工具配置，不是独立功能。Plugin 是 AgentWeave 自身扩展，可以放在设置里 |
| 「适配器」改为「厂商生成」 | 适配器是实现细节，用户不关心"适配器"是什么，他们关心的是"生成 Cursor 的配置" |
| 分组标签 | 侧边栏用 section divider 分组（工作区 / 生成与对比 / 运行时 / 管理），减少认知负荷 |
| 「配置对比」与「适配器」合并 | 对比是生成后的验证动作，属于同一个流程 |

---

## 四、功能缺失分析（关键能力 Gap）

### P0 — 核心缺失（没有这些，产品不可用）

| # | 缺失能力 | 说明 | 影响 |
|---|---------|------|------|
| 1 | **配置可视化编辑** | 当前只有 YAML 编辑器，用户必须手写 YAML 才能配置 Agent。应该有表单式 UI 来新增/编辑 Agent、Rule、MCP | 直接决定产品易用性。非技术用户无法使用 |
| 2 | **项目向导 (Onboarding)** | 没有引导流程。新用户打开软件不知道做什么。应有：选择项目 → 检测已有配置 → 导入 → 选择目标厂商 | 决定首次体验 |
| 3 | **概念关联可视化** | Agent 引用了哪些 MCP Server、用了哪些 Rules、触发哪些 Hooks — 没有可视化关系图 | 配置复杂后无法理解全貌 |
| 4 | **配置验证反馈** | 编辑时没有实时校验（红色波浪线、错误提示）。只有保存后手动 validate | 基础编辑体验问题 |
| 5 | **迁移向导** | 用户最核心的需求是"从 Cursor 迁移到 Claude Code"，但没有引导式迁移流程 | 核心价值主张无法兑现 |

### P1 — 重要缺失（影响日常使用效率）

| # | 缺失能力 | 说明 |
|---|---------|------|
| 6 | **环境/变体管理** | 同一项目的 dev/staging/prod 环境可能有不同配置（不同 API Key、不同 model）。目前不支持 |
| 7 | **配置继承与复用可视化** | `extends` 引用链不可见，不知道最终生效的配置是什么 |
| 8 | **厂商能力矩阵** | 用户不知道"这个 Agent 配置生成到 Cursor 时哪些字段会丢失"。应有覆盖率/兼容性矩阵 |
| 9 | **批量操作** | 12 厂商批量生成 → 批量对比 → 批量部署。当前一个一个操作 |
| 10 | **搜索** | 全局搜索配置内容（agent name、rule content、mcp server name） |

### P2 — 增强体验（竞争力）

| # | 缺失能力 | 说明 |
|---|---------|------|
| 11 | **AI 辅助配置** | 用 AI 帮用户写 Agent instructions、推荐合适的 MCP Server |
| 12 | **模板市场/社区** | 预置常见项目类型的 Agent 模板（TypeScript 项目、Python ML 项目、全栈项目） |
| 13 | **成本估算** | 各厂商的 Token 用量/费用对比 |
| 14 | **团队协作** | 多人编辑同一配置的冲突解决、变更审批工作流 |
| 15 | **Webhook 通知集成** | 配置变更时通知 Slack/企业微信/钉钉 |

---

## 五、完整端到端示例验证

### 场景：全栈 SaaS 项目 — 从 Cursor 迁移到 Claude Code + Codex 并行开发

**背景**：一个 TypeScript + Rust 的 SaaS 项目，目前在 Cursor 中使用 AI 辅助开发。需要：
- 保留 Cursor 配置继续使用
- 同时生成 Claude Code 配置（给后端开发者用）
- 生成 Codex 配置（给 CI/CD 自动化用）
- 统一管理，修改一处全部同步

---

### Step 1: 初始化项目

```bash
cd ~/projects/acme-saas
agentweave init
```

**期望结果**：生成 `agentweave.yaml` 骨架

**当前状态**：✅ 可用（CLI init 命令存在）

**桌面端体验**：❌ 没有项目初始化向导 UI。用户只能通过 CLI 或手动创建 YAML

---

### Step 2: 导入已有 Cursor 配置

```bash
agentweave import cursor
```

**期望结果**：读取 `.cursorrules` + `.cursor/rules/*.mdc` → 转换为 AgentWeave 超集格式

**当前状态**：✅ CLI 可用

**桌面端体验**：❌ 没有"导入已有配置"的 UI 入口。Dashboard 应该检测到项目目录下有 `.cursorrules` 时自动提示"检测到 Cursor 配置，是否导入？"

---

### Step 3: 编辑配置 — 添加 3 个 Agent

用户想配置：
1. `architect` — 负责架构决策
2. `implementer` — 负责写代码
3. `reviewer` — 负责 code review

每个 Agent 需要配置：
- 角色描述、模型选择、温度
- 使用的 MCP Server（filesystem, postgres, github）
- 适用规则（typescript-strict, commit-format）
- 权限（read/write/terminal）

**当前体验**：用户必须手写 YAML

```yaml
agents:
  - name: architect
    role: ...
    model: ...
    tools: [...]
    # 继续写 50 行 YAML
```

**理想体验**：
1. 进入「配置中心 → 智能体」页面
2. 点击「+ 新增智能体」
3. 填写表单（名称、角色、模型选择下拉、MCP Server 多选、Rules 多选）
4. 实时预览生成的 YAML

**Gap**：🔴 当前完全没有可视化表单编辑。这是最大的体验缺失。

---

### Step 4: 配置 MCP Server

用户需要 3 个 MCP Server：
- filesystem — 文件读写
- postgres — 数据库查询
- github — PR/Issue 操作

**当前体验**：同样是手写 YAML

**理想体验**：
1. 进入「配置中心 → MCP 服务」
2. 从预置列表选择常用 MCP Server
3. 填写连接参数（env 变量引用）
4. 测试连接

**Gap**：🟡 「插件市场」页面有列表但没有关联到配置。应该是"在配置里引用 MCP"而不是"去插件市场安装"

---

### Step 5: 选择目标厂商并生成

```bash
agentweave generate --targets cursor,claude-code,codex
```

**期望**：
- 生成 `.cursorrules` + `.cursor/rules/architect.mdc` + `.cursor/rules/implementer.mdc`
- 生成 `CLAUDE.md` + `.claude/settings.json`
- 生成 `AGENTS.md`（Codex 格式）

**当前状态**：✅ CLI 可用，12 厂商适配器工作正常

**桌面端体验**：🟡 「适配器」页面有生成按钮，但：
- 不显示上次生成结果
- 不显示哪些字段在目标厂商中会丢失（兼容性提示）
- 没有生成前的 Preview/Dry-run

---

### Step 6: 对比生成结果

**期望**：查看 3 个厂商的输出差异，了解 Cursor 配置和 Claude Code 配置有什么不同

**当前状态**：✅ CLI `agentweave compare` + `agentweave diff cursor claude-code`

**桌面端体验**：🟡 「配置对比」页面存在，但：
- 没有文件内容 side-by-side 对比（只有统计数据）
- 没有"丢失字段"高亮（某个 agent 的 sub_agents 在 Copilot 中不支持）

---

### Step 7: 实时同步开发

3 个开发者分别在 Cursor / Claude Code / Codex 中工作。修改了 `agentweave.yaml` 中的 rule。

```bash
agentweave watch
```

**期望**：修改 YAML → 自动重新生成 3 个厂商配置 → 各 IDE 自动加载新配置

**当前状态**：✅ CLI watch 命令可用

**桌面端体验**：🟡 Statusbar 显示 watch 状态，但：
- 没有"最近一次同步时间"
- 没有"同步失败记录"
- 没有"手动触发全量同步"按钮

---

### Step 8: 日志追踪

某个 Agent 在 Claude Code 中行为异常，需要追踪它的执行链路。

**当前桌面端体验**：🟡 「链路追踪」页面有 Span 列表，但：
- 没有和具体 Agent 关联
- 没有和厂商关联（这个 span 是 Cursor 产生的还是 Claude Code 产生的？）
- 没有可视化时间线

---

### Step 9: 治理 — 设置预算和权限

管理员限制团队每月 API 调用不超过 10 万次，只允许使用 `cursor` 和 `claude-code` 两个厂商。

**当前桌面端体验**：🟡 「企业治理」页面有策略/配额 tab，但：
- 是只读展示，没有新增/编辑表单
- 没有和 YAML 中的 governance 节点关联

---

### Step 10: 备份并分享给新成员

打包整个项目配置为 ZIP 发给新加入的开发者。

**当前桌面端体验**：🟡 「备份恢复」页面有导出按钮，但：
- 没有选择性导出（只导出 agents 不导出 governance）
- 没有导入后的冲突解决 UI

---

## 六、概念归属关系（正确的层级结构）

```
agentweave.yaml (项目根配置)
│
├── metadata          → 项目元信息
├── extends           → 继承/复用
├── targets           → 目标厂商列表
├── default_model     → 默认模型
│
├── agents[]          → 智能体定义 ★ 核心一级概念
│   ├── name/role/instructions
│   ├── model         → 使用的模型
│   ├── tools[]       → 引用的工具
│   ├── permissions   → 权限
│   ├── constraints   → 约束
│   ├── triggers      → 触发条件
│   └── sub_agents[]  → 子智能体
│
├── rules[]           → 行为规则 ★ 核心一级概念
├── skills[]          → 技能/多步骤任务 ★ 核心一级概念
├── workflows[]       → 工作流/编排 ★ 核心一级概念
├── hooks[]           → 生命周期钩子
│
├── mcp_servers[]     → MCP Server ★ 工具层
├── plugins[]         → 插件（AgentWeave 扩展）
├── tools[]           → 自定义工具
│
├── models[]          → 模型配置池
├── context           → 上下文注入
├── memory            → 记忆配置
├── sessions          → 会话配置
├── code_index        → 代码索引
├── wiki              → 文档/知识库
│
├── templates[]       → 代码模板
├── snippets[]        → 代码片段
├── prompts[]         → 提示词模板
│
├── permissions       → 全局权限
├── sync              → 同步配置
├── governance        → 治理配置
├── telemetry         → 遥测/追踪
├── notifications     → 通知配置
├── updater           → 自动更新
├── event_bus         → 事件总线
├── webhooks[]        → Webhook
└── api_endpoints[]   → 外部 API
```

### 关键归属结论

| 概念 | 正确归属 | 当前问题 |
|------|---------|---------|
| MCP Server | 智能体的工具配置 → 属于「配置中心」子级 | 被独立为「插件市场」顶级页面 ❌ |
| Plugin | AgentWeave 自身的扩展 → 属于「设置」 | 和 MCP Server 混在一起 ❌ |
| 适配器 | 生成目标 → 属于「厂商生成」 | 独立页面，名字太技术化 ⚠️ |
| 配置对比 | 生成结果的验证 → 属于「厂商生成」子功能 | 独立顶级页面，和生成割裂 ⚠️ |
| ACP 调度 | 运行时能力 → 属于「运行时」分组 | 和配置管理混在同一层 ⚠️ |
| 链路追踪 | 运行时监控 → 属于「运行时」分组 | 同上 ⚠️ |

---

## 七、优化后的页面设计建议

### 「配置中心」— 最核心的页面改造

**当前**：一个 CodeMirror YAML 编辑器

**建议改为**：左侧概念树 + 右侧表单/编辑器混合

```
┌─────────────────────────────────────────────────────────┐
│ 配置中心                                    [源码视图]    │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  概念导航树    │   智能体: main-architect                 │
│              │   ┌──────────────────────────────────┐   │
│  ▼ 智能体 (3) │   │ 名称: main-architect              │   │
│    architect │   │ 角色: Senior software architect   │   │
│    implement │   │ 模型: claude-sonnet-4 ▼           │   │
│    reviewer  │   │ 温度: 0.2 [━━━━━░░░░░]            │   │
│              │   │                                  │   │
│  ▼ 规则 (5)   │   │ MCP 服务:                        │   │
│    ts-strict │   │  ☑ filesystem  ☑ postgres        │   │
│    api-ver   │   │  ☑ github     ☐ browser          │   │
│    commit    │   │                                  │   │
│              │   │ 适用规则:                          │   │
│  ▼ MCP (3)   │   │  ☑ typescript-strict             │   │
│    filesystem│   │  ☑ commit-format                  │   │
│    postgres  │   │  ☐ api-versioning                │   │
│    github    │   │                                  │   │
│              │   │ 权限: [配置按钮]                    │   │
│  ▼ 工作流 (2) │   └──────────────────────────────────┘   │
│  ▼ 钩子 (4)   │                                          │
│  ▼ 技能 (2)   │   [保存]  [验证]  [预览YAML]             │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

### 「厂商生成」— 合并适配器 + 对比

```
┌─────────────────────────────────────────────────────────┐
│ 厂商生成                                                 │
├─────────────────────────────────────────────────────────┤
│  目标厂商:  ☑ Cursor  ☑ Claude Code  ☑ Codex  ☐ Windsurf │
│                                                         │
│  [全部生成]  [预览]   最后生成: 2 分钟前 ✓                  │
│                                                         │
│ ┌─── Cursor ─────────┬─── Claude Code ──┬─── Codex ───┐ │
│ │ .cursorrules       │ CLAUDE.md        │ AGENTS.md   │ │
│ │ .cursor/rules/     │ .claude/         │             │ │
│ │  architect.mdc     │  settings.json   │             │ │
│ │  implementer.mdc   │                  │             │ │
│ │  reviewer.mdc      │                  │             │ │
│ ├────────────────────┴──────────────────┴─────────────┤ │
│ │ 兼容性: Cursor 100% | Claude 95% | Codex 80%       │ │
│ │ 丢失: Codex 不支持 sub_agents, triggers            │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [对比差异]  [导出所有]  [部署到项目目录]                    │
└─────────────────────────────────────────────────────────┘
```

---

## 八、总结：优先修改建议

### 立即执行（影响产品可用性）

1. **信息架构重构** — 侧边栏分组，MCP/Plugin 降级为配置子项
2. **配置中心概念树** — 替代纯 YAML 编辑器，支持表单式编辑
3. **项目检测与导入提示** — Dashboard 检测已有厂商配置并提示导入
4. **厂商兼容性矩阵** — 生成时展示字段覆盖率

### 短期优化（1-2 周）

5. **全局搜索** — Cmd+K 快速搜索 Agent/Rule/MCP 名称
6. **生成预览** — 生成前看到输出内容差异
7. **同步状态面板** — 最近同步记录、失败重试

### 中期规划（1 月）

8. **可视化关系图** — Agent → MCP → Rule 依赖关系
9. **配置模板库** — 预置常见项目类型的 Agent 模板
10. **环境变体** — dev/staging/prod 配置切换

---

*报告结束。以上分析基于对超集 Schema（46+ 概念）、CLI 20 命令、桌面端 10 页面的完整审核。*
