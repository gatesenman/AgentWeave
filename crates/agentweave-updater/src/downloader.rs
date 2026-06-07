use crate::checker::ReleaseAsset;
use crate::error::{Result, UpdateError};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};

/// Handles downloading, verifying, and atomically replacing update binaries.
pub struct UpdateDownloader {
    /// Placeholder Ed25519 public key for signature verification.
    /// In production, replace with the real release signing key.
    public_key: VerifyingKey,
}

impl UpdateDownloader {
    /// Create a new downloader with a placeholder Ed25519 verifying key.
    pub fn new() -> Self {
        // Placeholder: generate a throwaway keypair for structural completeness.
        // Real deployments must embed the actual public key bytes.
        let placeholder_bytes = [0u8; 32];
        let public_key = VerifyingKey::from_bytes(&placeholder_bytes)
            .unwrap_or_else(|_| {
                // Fallback: use a valid identity point key
                let secret = ed25519_dalek::SigningKey::from_bytes(&[1u8; 32]);
                secret.verifying_key()
            });
        Self { public_key }
    }

    /// Create a downloader with a specific Ed25519 public key.
    pub fn with_public_key(key_bytes: &[u8; 32]) -> Result<Self> {
        let public_key = VerifyingKey::from_bytes(key_bytes)
            .map_err(|_| UpdateError::Other("Invalid Ed25519 public key".into()))?;
        Ok(Self { public_key })
    }

    /// Download a release asset to a temporary file, returning the path.
    pub async fn download_asset(
        &self,
        asset: &ReleaseAsset,
        dest_dir: &Path,
    ) -> Result<PathBuf> {
        let client = reqwest::Client::builder()
            .user_agent("agentweave-updater")
            .build()
            .map_err(|e| UpdateError::Other(e.to_string()))?;

        let resp = client
            .get(&asset.browser_download_url)
            .send()
            .await?
            .error_for_status()?;

        let bytes = resp.bytes().await?;

        let dest_path = dest_dir.join(&asset.name);
        tokio::fs::write(&dest_path, &bytes).await?;

        tracing::info!(
            "Downloaded {} ({} bytes) to {}",
            asset.name,
            bytes.len(),
            dest_path.display()
        );

        Ok(dest_path)
    }

    /// Verify SHA256 checksum of a downloaded file.
    pub fn verify_sha256(file_path: &Path, expected_hex: &str) -> Result<()> {
        let data = std::fs::read(file_path)?;
        let mut hasher = Sha256::new();
        hasher.update(&data);
        let result = format!("{:x}", hasher.finalize());

        if result != expected_hex {
            return Err(UpdateError::ChecksumMismatch {
                expected: expected_hex.to_string(),
                actual: result,
            });
        }

        tracing::info!("SHA256 verified for {}", file_path.display());
        Ok(())
    }

    /// Verify Ed25519 signature of a file.
    pub fn verify_signature(&self, file_path: &Path, signature_bytes: &[u8; 64]) -> Result<()> {
        let data = std::fs::read(file_path)?;
        let signature = Signature::from_bytes(signature_bytes);

        self.public_key
            .verify(&data, &signature)
            .map_err(|_| UpdateError::SignatureInvalid)?;

        tracing::info!("Ed25519 signature verified for {}", file_path.display());
        Ok(())
    }

    /// Atomically replace the current binary with the new one.
    ///
    /// Strategy: write to a temp file next to the target, then rename (which
    /// is atomic on most filesystems).
    pub fn atomic_replace(new_file: &Path, target: &Path) -> Result<()> {
        let parent = target.parent().unwrap_or(Path::new("."));
        let tmp_target = parent.join(format!(
            ".{}.tmp",
            target
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "update".into())
        ));

        // Copy new file to temporary location next to the target
        std::fs::copy(new_file, &tmp_target)?;

        // Preserve executable permissions on Unix
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let perms = std::fs::Permissions::from_mode(0o755);
            std::fs::set_permissions(&tmp_target, perms)?;
        }

        // Atomic rename
        std::fs::rename(&tmp_target, target)?;

        tracing::info!(
            "Atomically replaced {} with {}",
            target.display(),
            new_file.display()
        );
        Ok(())
    }
}

impl Default for UpdateDownloader {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::Signer;
    use std::io::Write;

    #[test]
    fn test_sha256_verification_pass() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.bin");
        let content = b"hello world";
        std::fs::write(&file_path, content).unwrap();

        // Known SHA256 of "hello world"
        let expected = "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";
        assert!(UpdateDownloader::verify_sha256(&file_path, expected).is_ok());
    }

    #[test]
    fn test_sha256_verification_fail() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.bin");
        std::fs::write(&file_path, b"hello world").unwrap();

        let wrong_hash = "0000000000000000000000000000000000000000000000000000000000000000";
        let result = UpdateDownloader::verify_sha256(&file_path, wrong_hash);
        assert!(result.is_err());
        match result.unwrap_err() {
            UpdateError::ChecksumMismatch { expected, actual } => {
                assert_eq!(expected, wrong_hash);
                assert_ne!(actual, wrong_hash);
            }
            _ => panic!("Expected ChecksumMismatch error"),
        }
    }

    #[test]
    fn test_atomic_replace() {
        let dir = tempfile::tempdir().unwrap();
        let new_file = dir.path().join("new.bin");
        let target = dir.path().join("target.bin");

        std::fs::write(&new_file, b"new content").unwrap();
        std::fs::write(&target, b"old content").unwrap();

        UpdateDownloader::atomic_replace(&new_file, &target).unwrap();

        let content = std::fs::read_to_string(&target).unwrap();
        assert_eq!(content, "new content");
    }

    #[test]
    fn test_downloader_default() {
        let _dl = UpdateDownloader::new();
    }

    #[test]
    fn test_signature_verification_fails_with_wrong_sig() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.bin");
        std::fs::write(&file_path, b"test data").unwrap();

        // Create a real keypair and sign different data, so the signature
        // is structurally valid but does not match the file content.
        let signing_key = ed25519_dalek::SigningKey::from_bytes(&[42u8; 32]);
        let wrong_sig = signing_key.sign(b"completely different data");
        let dl = UpdateDownloader::with_public_key(&signing_key.verifying_key().to_bytes()).unwrap();
        let result = dl.verify_signature(&file_path, &wrong_sig.to_bytes());
        assert!(result.is_err());
    }

    #[test]
    fn test_signature_verification_passes_with_correct_sig() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.bin");
        let data = b"test data";
        std::fs::write(&file_path, data).unwrap();

        let signing_key = ed25519_dalek::SigningKey::from_bytes(&[42u8; 32]);
        let sig = signing_key.sign(data);
        let dl = UpdateDownloader::with_public_key(&signing_key.verifying_key().to_bytes()).unwrap();
        let result = dl.verify_signature(&file_path, &sig.to_bytes());
        assert!(result.is_ok());
    }
}
