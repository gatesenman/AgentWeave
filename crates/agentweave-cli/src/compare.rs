use agentweave_core::adapter::AdapterRegistry;
use agentweave_core::config::AgentWeaveConfig;
use anyhow::Result;
use std::path::Path;

/// Compare output between multiple vendors
pub fn compare_vendors(
    project_dir: &Path,
    registry: &AdapterRegistry,
    vendors: &[&str],
) -> Result<CompareResult> {
    let config = AgentWeaveConfig::load(project_dir)?;
    let all_results = registry.generate_all(&config, project_dir);

    let mut entries = Vec::new();
    let filter_set: Vec<String> = vendors.iter().map(|v| v.to_string()).collect();

    for (vendor, result) in &all_results {
        let vendor_str = vendor.to_string();
        if !filter_set.is_empty() && !filter_set.contains(&vendor_str) {
            continue;
        }
        match result {
            Ok(output) => {
                let total_size: usize = output.files.values().map(|c| c.len()).sum();
                entries.push(VendorCompare {
                    vendor: vendor_str,
                    file_count: output.files.len(),
                    total_bytes: total_size,
                    files: output
                        .files
                        .iter()
                        .map(|(path, content)| FileCompare {
                            path: path.clone(),
                            size_bytes: content.len(),
                            line_count: content.lines().count(),
                        })
                        .collect(),
                    error: None,
                });
            }
            Err(e) => {
                entries.push(VendorCompare {
                    vendor: vendor_str,
                    file_count: 0,
                    total_bytes: 0,
                    files: Vec::new(),
                    error: Some(e.to_string()),
                });
            }
        }
    }

    Ok(CompareResult { entries })
}

#[derive(Debug)]
pub struct CompareResult {
    pub entries: Vec<VendorCompare>,
}

#[derive(Debug)]
pub struct VendorCompare {
    pub vendor: String,
    pub file_count: usize,
    pub total_bytes: usize,
    pub files: Vec<FileCompare>,
    pub error: Option<String>,
}

#[derive(Debug)]
pub struct FileCompare {
    pub path: String,
    pub size_bytes: usize,
    pub line_count: usize,
}

impl CompareResult {
    pub fn print_table(&self) {
        println!("┌──────────────────┬───────┬──────────┬───────────┐");
        println!("│ Vendor           │ Files │ Lines    │ Bytes     │");
        println!("├──────────────────┼───────┼──────────┼───────────┤");

        for entry in &self.entries {
            if let Some(ref err) = entry.error {
                println!("│ {:<16} │ ERROR │ {}       │", entry.vendor, err);
            } else {
                let total_lines: usize = entry.files.iter().map(|f| f.line_count).sum();
                println!(
                    "│ {:<16} │ {:>5} │ {:>8} │ {:>9} │",
                    entry.vendor, entry.file_count, total_lines, entry.total_bytes
                );
            }
        }

        println!("└──────────────────┴───────┴──────────┴───────────┘");
    }

    pub fn print_detail(&self) {
        for entry in &self.entries {
            println!("\n═══ {} ═══", entry.vendor);
            if let Some(ref err) = entry.error {
                println!("  ERROR: {}", err);
                continue;
            }
            for file in &entry.files {
                println!(
                    "  {} ({} lines, {} bytes)",
                    file.path, file.line_count, file.size_bytes
                );
            }
        }
    }
}
