use crate::config::AgentWeaveConfig;
use crate::error::Result;
use crate::schema::TargetVendor;
use std::collections::HashMap;
use std::path::Path;

/// Output from an adapter generation
#[derive(Debug, Clone)]
pub struct AdapterOutput {
    /// Map of relative file path → file content
    pub files: HashMap<String, String>,
}

/// Concept supported by this adapter
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum Concept {
    Agent,
    SubAgent,
    Rule,
    Skill,
    Workflow,
    Hook,
    Memory,
    Context,
    McpServer,
    Plugin,
    Tool,
    Permission,
    Command,
    Model,
    OutputStyle,
    Schedule,
    Automation,
}

/// Diff entry between superset and vendor config
#[derive(Debug, Clone)]
pub struct DiffEntry {
    pub path: String,
    pub kind: DiffKind,
    pub description: String,
}

#[derive(Debug, Clone, PartialEq)]
pub enum DiffKind {
    Added,
    Removed,
    Modified,
    Unsupported,
}

/// Core trait that all vendor adapters must implement
pub trait VendorAdapter: Send + Sync {
    /// Unique vendor identifier
    fn vendor_id(&self) -> TargetVendor;

    /// Human-readable name
    fn display_name(&self) -> &str;

    /// Generate vendor-specific configuration files from AgentWeave config
    fn generate(&self, config: &AgentWeaveConfig, project_root: &Path) -> Result<AdapterOutput>;

    /// Parse existing vendor configuration into AgentWeave format (import)
    fn parse(&self, project_root: &Path) -> Result<AgentWeaveConfig>;

    /// List of concepts this adapter supports
    fn supported_concepts(&self) -> Vec<Concept>;

    /// Compute diff between AgentWeave config and existing vendor config
    fn diff(&self, config: &AgentWeaveConfig, project_root: &Path) -> Result<Vec<DiffEntry>>;
}

/// Registry of all available adapters
pub struct AdapterRegistry {
    adapters: HashMap<TargetVendor, Box<dyn VendorAdapter>>,
}

impl AdapterRegistry {
    pub fn new() -> Self {
        Self {
            adapters: HashMap::new(),
        }
    }

    pub fn register(&mut self, adapter: Box<dyn VendorAdapter>) {
        let vendor = adapter.vendor_id();
        self.adapters.insert(vendor, adapter);
    }

    pub fn get(&self, vendor: &TargetVendor) -> Option<&dyn VendorAdapter> {
        self.adapters.get(vendor).map(|a| a.as_ref())
    }

    pub fn list(&self) -> Vec<&TargetVendor> {
        self.adapters.keys().collect()
    }

    /// Generate configs for all target vendors
    pub fn generate_all(
        &self,
        config: &AgentWeaveConfig,
        project_root: &Path,
    ) -> HashMap<TargetVendor, Result<AdapterOutput>> {
        let mut results = HashMap::new();
        for target in &config.targets {
            if let Some(adapter) = self.adapters.get(target) {
                results.insert(target.clone(), adapter.generate(config, project_root));
            }
        }
        results
    }
}

impl Default for AdapterRegistry {
    fn default() -> Self {
        Self::new()
    }
}
