## AgentWeave CLI — English (US)

app-name = AgentWeave
app-description = Unified AI Agent Configuration Management
app-long-description = AgentWeave - Cross-vendor unified agent configuration management system.
    Define once, generate for all vendors. Seamlessly migrate between AI coding tools.

# Commands
cmd-init = Initialize AgentWeave configuration in a project
cmd-generate = Generate vendor-specific configuration files
cmd-validate = Validate AgentWeave configuration
cmd-diff = Show configuration diff between versions or vendors
cmd-watch = Watch for config changes and auto-regenerate
cmd-import = Import existing vendor configuration into AgentWeave format
cmd-vendors = List supported vendors and their capabilities
cmd-status = Show current configuration status
cmd-sync = Sync configuration across multiple IDEs in real-time

# Init
init-success = Initialized AgentWeave project '{ $name }' at { $path }
init-created-dirs = Created configuration directories

# Generate
generate-start = Generating configuration for { $vendor }...
generate-all = Generating configuration for all target vendors...
generate-success = Successfully generated { $vendor } configuration
generate-no-targets = No target vendors configured. Add targets to agentweave.yaml
generate-complete = Generation complete: { $count } vendor(s) processed

# Validate
validate-success = Configuration is valid
validate-error = Validation error: { $error }

# Import
import-start = Importing configuration from { $vendor }...
import-success = Successfully imported { $vendor } configuration
import-no-adapter = No adapter found for vendor '{ $vendor }'

# Vendors
vendors-header = Supported Vendors:
vendors-row = { $name } — { $concepts } concepts supported

# Status
status-header = AgentWeave Status
status-project = Project: { $name }
status-agents = Agents: { $count }
status-rules = Rules: { $count }
status-skills = Skills: { $count }
status-hooks = Hooks: { $count }
status-mcp = MCP Servers: { $count }
status-targets = Targets: { $targets }

# Watch & Sync
watch-start = Watching for changes in { $path }...
watch-dev = (Feature in development - will use notify crate for fs events)
sync-start = Starting sync in '{ $mode }' mode...
sync-dev = (Feature in development)

# Diff
diff-label = Diff: { $from } → { $to }
diff-dev = (Feature in development)

# Errors
error-config-not-found = Configuration not found at { $path }. Run 'agentweave init' first.
error-vendor-unknown = Unknown vendor: { $vendor }

# Governance
governance-policy-violation = Policy violation: { $message }
governance-quota-exceeded = Quota exceeded for { $subject }/{ $resource }: { $current }/{ $limit }
governance-permission-denied = Permission denied: user '{ $user }' lacks '{ $permission }'
