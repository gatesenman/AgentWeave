use crate::SecretAction;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Default)]
struct SecretStore {
    secrets: Vec<SecretEntry>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct SecretEntry {
    key: String,
    /// Encrypted value (base64 encoded, XOR with machine-specific key for basic protection)
    value_enc: String,
    #[serde(default)]
    created_at: String,
    #[serde(default)]
    used_by: Vec<String>,
}

pub fn cmd_secret(project_dir: &PathBuf, action: SecretAction) -> Result<()> {
    let secret_file = project_dir.join(".agentweave").join(".secrets");

    match action {
        SecretAction::List => {
            let store = load_store(&secret_file)?;
            if store.secrets.is_empty() {
                println!("No secrets stored.");
                println!("  Use 'agentweave secret set <key> <value>' to add one.");
                return Ok(());
            }
            println!("Stored Secrets:\n");
            println!("┌──────────────────────────┬──────────────────────┬────────────────────┐");
            println!("│ Key                      │ Created              │ Used By            │");
            println!("├──────────────────────────┼──────────────────────┼────────────────────┤");
            for entry in &store.secrets {
                let used = if entry.used_by.is_empty() {
                    "(all)".to_string()
                } else {
                    entry.used_by.join(", ")
                };
                println!(
                    "│ {:<24} │ {:<20} │ {:<18} │",
                    entry.key,
                    truncate(&entry.created_at, 20),
                    truncate(&used, 18),
                );
            }
            println!("└──────────────────────────┴──────────────────────┴────────────────────┘");
            println!("\n  Total: {} secret(s)", store.secrets.len());
            println!("  Note: Values are encrypted at rest. Use ${{KEY}} in configs to reference.");
        }
        SecretAction::Set { key, value } => {
            let mut store = load_store(&secret_file)?;

            let value = match value {
                Some(v) => v,
                None => {
                    // In real implementation, would prompt securely
                    println!("Enter value for '{}': ", key);
                    let mut input = String::new();
                    std::io::stdin().read_line(&mut input)?;
                    input.trim().to_string()
                }
            };

            // Encrypt value (basic XOR with machine-id for demo)
            let encrypted = encrypt_value(&value);

            // Remove existing if present
            store.secrets.retain(|s| s.key != key);

            let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
            store.secrets.push(SecretEntry {
                key: key.clone(),
                value_enc: encrypted,
                created_at: now,
                used_by: Vec::new(),
            });

            save_store(&secret_file, &store)?;
            println!("Secret '{}' stored (encrypted at rest)", key);
            println!("  Reference in configs as: ${{{}}}", key);
        }
        SecretAction::Remove { key } => {
            let mut store = load_store(&secret_file)?;
            let before = store.secrets.len();
            store.secrets.retain(|s| s.key != key);
            if store.secrets.len() == before {
                anyhow::bail!("Secret '{}' not found", key);
            }
            save_store(&secret_file, &store)?;
            println!("Secret '{}' removed", key);
        }
        SecretAction::Export { vendor } => {
            let store = load_store(&secret_file)?;
            if store.secrets.is_empty() {
                println!("No secrets to export.");
                return Ok(());
            }

            println!("Secrets for vendor '{}':\n", vendor);
            println!("# Export format (values masked)");
            for entry in &store.secrets {
                let should_show = entry.used_by.is_empty() || entry.used_by.contains(&vendor);
                if should_show {
                    let masked = mask_value(&decrypt_value(&entry.value_enc));
                    println!("{}={}", entry.key, masked);
                }
            }
            println!("\n# Use 'agentweave secret set' to update values");
        }
    }
    Ok(())
}

fn load_store(path: &PathBuf) -> Result<SecretStore> {
    if path.exists() {
        let content = std::fs::read_to_string(path)?;
        Ok(serde_json::from_str(&content).unwrap_or_default())
    } else {
        Ok(SecretStore::default())
    }
}

fn save_store(path: &PathBuf, store: &SecretStore) -> Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let content = serde_json::to_string_pretty(store)?;
    std::fs::write(path, content)?;

    // Set restrictive permissions on Unix
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600))?;
    }

    Ok(())
}

fn encrypt_value(value: &str) -> String {
    use sha2::{Digest, Sha256};
    // Generate a machine-specific key from hostname
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "agentweave-default".to_string());
    let mut hasher = Sha256::new();
    hasher.update(hostname.as_bytes());
    let key = hasher.finalize();

    // XOR encrypt
    let encrypted: Vec<u8> = value
        .as_bytes()
        .iter()
        .enumerate()
        .map(|(i, b)| b ^ key[i % key.len()])
        .collect();

    base64_encode(&encrypted)
}

fn decrypt_value(encoded: &str) -> String {
    use sha2::{Digest, Sha256};
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "agentweave-default".to_string());
    let mut hasher = Sha256::new();
    hasher.update(hostname.as_bytes());
    let key = hasher.finalize();

    let encrypted = base64_decode(encoded);
    let decrypted: Vec<u8> = encrypted
        .iter()
        .enumerate()
        .map(|(i, b)| b ^ key[i % key.len()])
        .collect();

    String::from_utf8_lossy(&decrypted).to_string()
}

fn base64_encode(data: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;
        result.push(CHARS[((triple >> 18) & 0x3F) as usize] as char);
        result.push(CHARS[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            result.push(CHARS[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(CHARS[(triple & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }
    result
}

fn base64_decode(s: &str) -> Vec<u8> {
    let mut result = Vec::new();
    let chars: Vec<u8> = s.bytes().collect();
    for chunk in chars.chunks(4) {
        if chunk.len() < 4 { break; }
        let vals: Vec<u32> = chunk.iter().map(|&c| decode_b64_char(c) as u32).collect();
        let triple = (vals[0] << 18) | (vals[1] << 12) | (vals[2] << 6) | vals[3];
        result.push(((triple >> 16) & 0xFF) as u8);
        if chunk[2] != b'=' {
            result.push(((triple >> 8) & 0xFF) as u8);
        }
        if chunk[3] != b'=' {
            result.push((triple & 0xFF) as u8);
        }
    }
    result
}

fn decode_b64_char(c: u8) -> u8 {
    match c {
        b'A'..=b'Z' => c - b'A',
        b'a'..=b'z' => c - b'a' + 26,
        b'0'..=b'9' => c - b'0' + 52,
        b'+' => 62,
        b'/' => 63,
        _ => 0,
    }
}

fn mask_value(value: &str) -> String {
    if value.len() <= 4 {
        "****".to_string()
    } else {
        format!("{}****{}", &value[..2], &value[value.len() - 2..])
    }
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}...", &s[..max - 3])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let original = "my-secret-api-key-12345";
        let encrypted = encrypt_value(original);
        let decrypted = decrypt_value(&encrypted);
        assert_eq!(original, decrypted);
    }

    #[test]
    fn test_mask_value() {
        assert_eq!(mask_value("abcdefgh"), "ab****gh");
        assert_eq!(mask_value("ab"), "****");
    }
}
