# AgentWeave 深度审查报告

---

## 一、4 个真实用户模拟

### 用户 A：独立开发者（从 Cursor 迁移到 Claude Code）

**场景**：已有 `.cursorrules` + `.cursor/rules/` 配置，想同时支持 Claude Code。

| 步骤 | 操作 | 结果 | 问题 |
|------|------|------|------|
| 1 | `agentweave init` | 生成 `.agentweave/` 脚手架 | 正常 |
| 2 | `agentweave import cursor` | 读取 .cursorrules → 生成 agentweave.yaml | 正常，adapter 有 `parse()` 实现 |
| 3 | 编辑 agentweave.yaml 添加 targets: [claude-code] | 手动编辑 | 正常 |
| 4 | `agentweave generate --vendor claude-code` | 生成 CLAUDE.md + .claude/settings.json | 正常 |
| 5 | `agentweave watch` | 启动 file watch，修改 agentweave.yaml 后自动重新生成 | 正常 |
| 6 | 同时在 Cursor 和 Claude Code 中修改 | 冲突检测 | **⚠️ 冲突检测仅基于 mtime，无真正 3-way merge 算法** |
| 7 | 想验证生成结果是否正确 | `agentweave validate` | 正常（schema + semantic 校验） |

**结论**：核心流程通畅。**Gap**：真正的 3-way merge 只有前端 UI 展示，后端 conflict.rs 只有 mtime 检测，没有实际的内容合并算法。

---

### 用户 B：团队 Tech Lead（管理 5 人团队统一规范）

**场景**：需要统一 Agent 规则，限制某些厂商，设置 token 配额。

| 步骤 | 操作 | 结果 | 问题 |
|------|------|------|------|
| 1 | 在 agentweave.yaml 中设置 governance 节点 | policies + roles + quotas | 正常，schema 支持 |
| 2 | `agentweave generate` 全量生成 | 12 厂商输出 | 正常 |
| 3 | 团队成员 clone 项目，运行 watch | 各自本地生成 | 正常 |
| 4 | 想查看谁修改了什么 | 审计日志 | **⚠️ AuditLogger 仅内存存储，重启后丢失** |
| 5 | 想锁定某个配置不让修改 | LockStrategy::Lock | **⚠️ Lock 仅文件级别 mtime，无分布式锁** |
| 6 | 想分享模板给团队 | Templates 页面 | **⚠️ 纯前端 UI mock，无后端模板注册/下载** |
| 7 | 想对比两个成员的配置差异 | `agentweave compare` | 正常 |

**结论**：单机使用正常。**Gap**：团队协作的「分享」「锁定」「审计持久化」都只有 UI 壳子，后端无网络能力（无 HTTP API 可供多客户端交互）。

---

### 用户 C：企业架构师（评估是否能在组织级落地）

**场景**：需要 SSO 集成、合规报告、跨部门配置继承。

| 步骤 | 操作 | 结果 | 问题 |
|------|------|------|------|
| 1 | 查看 Governance 页面 | 有 RBAC + 策略 + 审计 | **⚠️ 仅本地数据，无认证系统** |
| 2 | 想生成 SOC2 合规报告 | UI 显示 "SOC2, GDPR" | **⚠️ 仅展示文本，无真正合规检查逻辑** |
| 3 | 想集成到 CI/CD | 无 GitHub Action / GitLab CI 集成 | **缺失** |
| 4 | 想配置继承（org → team → project） | extends 支持 | 正常（schema 有 extends 字段） |
| 5 | 想查看跨项目的使用统计 | Analytics 页面 | **⚠️ 仅单项目内存数据** |

**结论**：企业级使用目前不可行。**Gap**：认证/持久化/网络 API 全部缺失。这对于 v0.1.0 是合理的，但后续必须补充。

---

### 用户 D：AI 工具开发者（想添加自己的 AI 工具适配器）

**场景**：开发了新的 AI coding assistant "MyCopilot"，想接入 AgentWeave。

| 步骤 | 操作 | 结果 | 问题 |
|------|------|------|------|
| 1 | 阅读 adapter-protocol.md | 有 SDK 文档 | 正常 |
| 2 | 实现 VendorAdapter trait | 需要 implement generate/parse/diff/supported_concepts | 正常 |
| 3 | 注册到 AdapterRegistry | 需要修改 build_registry() | **⚠️ 必须修改源码，无插件化加载** |
| 4 | 想动态加载（不改源码） | 无 dylib/wasm 插件系统 | **缺失** |
| 5 | 想发布到「模板市场」 | 无注册/发布 API | **缺失** |

**结论**：可以通过代码贡献添加适配器，但无动态插件加载能力。

---

## 二、架构师视角 — 架构合理性评审

### 架构图（实际实现）

```
┌──────────────────────────────────────────────────────────────────┐
│                      Desktop (Tauri v2 + React)                    │
│   26 Pages ─── 24 IPC Commands ─── Mock fallback for dev mode    │
└──────────────────────┬───────────────────────────────────────────┘
                       │ tauri::invoke
┌──────────────────────▼───────────────────────────────────────────┐
│                      commands.rs (IPC Layer)                       │
│   Orchestrates: core + adapters + governance + trace + sync       │
└──────────────────────┬───────────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────────┐
│                      agentweave-core                               │
│   Config parser ─ Schema types ─ AdapterRegistry ─ Error types    │
└──────────┬───────────┬───────────┬──────────────────────────────┘
           │           │           │
    ┌──────▼──┐  ┌─────▼────┐  ┌──▼────────┐
    │ 12 Adapters │  │ ACP Gateway │  │ Sync Engine │
    │ (codex,     │  │ (5 routing  │  │ (watcher +  │
    │  cursor...) │  │  strategies)│  │  debounce)  │
    └─────────┘  └──────────┘  └───────────┘
           │           │           │
    ┌──────▼──┐  ┌─────▼────┐  ┌──▼────────┐
    │ Governance│  │   Trace   │  │  Updater   │
    │ (RBAC +   │  │ (OTLP     │  │ (GitHub    │
    │  Policy)  │  │  Spans)   │  │  Releases) │
    └─────────┘  └──────────┘  └───────────┘
```

### 评价

| 维度 | 评分 | 说明 |
|------|------|------|
| **模块化** | 8/10 | 每个 crate 职责清晰，adapters 单独封装，trait 设计合理 |
| **可扩展性** | 6/10 | 新增适配器需改源码。Schema 有 x-* 扩展字段。无动态插件加载 |
| **数据层** | 4/10 | **无持久化层** — 所有状态内存存储或读文件系统。无 SQLite/KV store |
| **网络层** | 5/10 | CLI 有 `serve` 命令（ACP HTTP），但桌面端纯本地。无多客户端 sync |
| **错误处理** | 7/10 | 统一 `AgentWeaveError` 枚举 + `Result<T>` 类型，但部分 IPC 返回简单 String error |
| **测试覆盖** | 7/10 | 140 个测试（unit + e2e），但前端 0 测试（无 vitest/playwright） |
| **类型安全** | 9/10 | Rust 强类型，TypeScript strict mode，前后端类型同步 |
| **性能** | 8/10 | Rust 引擎 + 文件操作 async + debounce。大项目暂未测试 |

### 关键架构问题

1. **无持久化层** — Trace spans、Audit logs、Experiment results、Analytics 数据全部临时存储。重启应用后全部丢失。建议：嵌入 SQLite (rusqlite/sqlx) 存储操作历史。

2. **前后端 IPC 命令边界不清** — commands.rs 直接构造大量 mock 数据结构（如 Experiment、PromptTestCase）。真正的业务逻辑应在 core crate 中，IPC 层只做薄转发。

3. **无事件系统连接前后端** — Sync Engine 有 EventBus，但未通过 Tauri 的 event system 推送到前端。前端无法接收后端的实时通知（如：watch 检测到变更、冲突发生）。

4. **Desktop 和 CLI 共享逻辑不足** — CLI 有完整的 cmd_* 实现，Desktop 的 commands.rs 有很多重复逻辑。建议抽取 `agentweave-service` crate 统一。

---

## 三、产品经理视角 — 终极目标缺失的必备能力

### 终极目标定义

> 一个跨平台桌面工具，让开发者在**一个地方**管理所有 AI coding assistant 的配置，实现无缝迁移、实时同步、团队协作和企业治理。

### 必须有但当前缺失的能力（按阻断程度排序）

| # | 能力 | 阻断级别 | 说明 |
|---|------|----------|------|
| 1 | **持久化存储** | 🔴 P0 | 用户操作历史、实验数据、审计日志重启后全丢。用户感知：「我上次做的对比结果呢？」 |
| 2 | **文件系统真实联动** | 🔴 P0 | 当前 `generate` 命令写文件正常，但桌面端的 Config Hub 只展示 mock 概念树。用户打开项目后看不到真实的 agents/rules 列表 |
| 3 | **实时事件推送到前端** | 🟡 P1 | watch 模式检测到变更后，前端无感知。应通过 Tauri event 通知前端刷新 |
| 4 | **Onboarding / 首次使用引导** | 🟡 P1 | 新用户打开应用看到空状态，不知道该做什么。需要：项目选择 → 配置检测 → 一键导入 向导流程 |
| 5 | **配置表单编辑器** | 🟡 P1 | Config Hub 有概念树但点进去无法真正编辑 Agent/Rule/MCP 的字段。用户只能手写 YAML |
| 6 | **动态适配器加载** | 🟡 P1 | 社区贡献新 AI 工具时不需要修改核心代码。需要 WASM 或 dylib 插件 |
| 7 | **多项目管理** | 🟡 P1 | 当前绑定单一项目目录。开发者通常有 5-10 个活跃项目 |
| 8 | **Undo/Redo** | 🟢 P2 | 配置修改后无法撤销。对于破坏性操作（如覆盖生成），需要恢复手段 |
| 9 | **Diff 可视化** | 🟢 P2 | Compare 页面显示数字统计，但不展示具体文本差异（缺 Monaco diff editor 或 unified diff 视图） |
| 10 | **通知/Toast 系统** | 🟢 P2 | 后台操作完成后无反馈。生成成功/失败、watch 检测变更 — 用户无法感知 |

### 竞品对比差距（vs 现有工具）

| 对比项 | AgentWeave 当前 | 需要达到的水平 |
|--------|----------------|---------------|
| 打开即用 | 需要先 `init` + 手写 YAML | 选择项目文件夹后自动检测并展示 |
| 配置编辑 | 只有文本编辑器 | 表单 + 文本双模式 (like VS Code settings) |
| 实时反馈 | 无 | 编辑时立即预览生成结果 |
| 持久状态 | 无 | 历史记录、最近项目、偏好全部持久化 |

---

## 四、总结 — 当前状态定性

| 维度 | 完成度 | 评价 |
|------|--------|------|
| **Schema/类型系统** | 95% | 46 concepts，JSON/XML Schema，extends 继承，x-* 扩展 — 很完整 |
| **适配器引擎** | 90% | 12 个真实实现，generate + parse + diff 全部有逻辑 |
| **CLI** | 90% | 20 命令全部真实实现，async watch/sync 正常 |
| **桌面端 UI** | 70% | 26 页面框架全部有，但部分页面数据来自 mock 而非真实后端 |
| **端到端联通** | 60% | 核心流程（generate/validate/compare）端到端通，但新增功能页面多为展示层 |
| **生产可用性** | 40% | 缺持久化、缺实时事件、缺 onboarding、缺真正的配置表单编辑 |

### 结论

**Roadmap 列表上的功能"有了"，但部分功能只完成了 UI 展示层，缺少真正的后端业务逻辑联通。** 核心流程（配置加载→生成→校验→对比→同步）是真正端到端可用的。而 A/B 实验、Prompt 测试、成本追踪、模板市场等功能目前是"带 mock 数据的 UI 原型"，尚未接入真正的数据采集和持久化。

对于 v0.1.0 作为 MVP 发布，当前状态是**合理的**。但要达到"用户真正愿意用"的水平，需要优先补充：
1. SQLite 持久化层
2. Config Hub 真实数据联通
3. Tauri 事件推送到前端
4. 首次使用向导
