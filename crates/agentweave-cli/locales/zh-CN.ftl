## AgentWeave CLI — 简体中文

app-name = AgentWeave
app-description = 统一跨厂商AI智能体配置管理
app-long-description = AgentWeave - 跨厂商统一智能体配置管理系统。
    一次定义，全平台生成。无缝迁移AI编程工具。

# 命令
cmd-init = 初始化项目的AgentWeave配置
cmd-generate = 生成厂商特定的配置文件
cmd-validate = 验证AgentWeave配置
cmd-diff = 显示版本或厂商之间的配置差异
cmd-watch = 监控配置变更并自动重新生成
cmd-import = 将现有厂商配置导入AgentWeave格式
cmd-vendors = 列出支持的厂商及其功能
cmd-status = 显示当前配置状态
cmd-sync = 跨多个IDE实时同步配置

# 初始化
init-success = 已在 { $path } 初始化AgentWeave项目 '{ $name }'
init-created-dirs = 已创建配置目录

# 生成
generate-start = 正在为 { $vendor } 生成配置...
generate-all = 正在为所有目标厂商生成配置...
generate-success = 已成功生成 { $vendor } 配置
generate-no-targets = 未配置目标厂商。请在agentweave.yaml中添加targets
generate-complete = 生成完成：已处理 { $count } 个厂商

# 验证
validate-success = 配置有效
validate-error = 验证错误：{ $error }

# 导入
import-start = 正在从 { $vendor } 导入配置...
import-success = 已成功导入 { $vendor } 配置
import-no-adapter = 未找到厂商 '{ $vendor }' 的适配器

# 厂商
vendors-header = 支持的厂商：
vendors-row = { $name } — 支持 { $concepts } 个概念

# 状态
status-header = AgentWeave 状态
status-project = 项目：{ $name }
status-agents = 智能体：{ $count }
status-rules = 规则：{ $count }
status-skills = 技能：{ $count }
status-hooks = 钩子：{ $count }
status-mcp = MCP服务器：{ $count }
status-targets = 目标：{ $targets }

# 监控与同步
watch-start = 正在监控 { $path } 的变更...
watch-dev = （功能开发中 - 将使用notify库监听文件系统事件）
sync-start = 正在以 '{ $mode }' 模式启动同步...
sync-dev = （功能开发中）

# 差异
diff-label = 差异：{ $from } → { $to }
diff-dev = （功能开发中）

# 错误
error-config-not-found = 在 { $path } 未找到配置。请先运行 'agentweave init'。
error-vendor-unknown = 未知厂商：{ $vendor }

# 治理
governance-policy-violation = 策略违规：{ $message }
governance-quota-exceeded = 配额超限 { $subject }/{ $resource }：{ $current }/{ $limit }
governance-permission-denied = 权限拒绝：用户 '{ $user }' 缺少 '{ $permission }' 权限
