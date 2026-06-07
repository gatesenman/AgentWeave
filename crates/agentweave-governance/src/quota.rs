use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A quota definition.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuotaDef {
    pub name: String,
    pub subject: String,
    pub resource: String,
    pub limit: u64,
    pub period: QuotaPeriod,
}

/// Quota period.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum QuotaPeriod {
    Daily,
    Weekly,
    Monthly,
}

impl std::fmt::Display for QuotaPeriod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            QuotaPeriod::Daily => write!(f, "daily"),
            QuotaPeriod::Weekly => write!(f, "weekly"),
            QuotaPeriod::Monthly => write!(f, "monthly"),
        }
    }
}

impl std::str::FromStr for QuotaPeriod {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "daily" => Ok(QuotaPeriod::Daily),
            "weekly" => Ok(QuotaPeriod::Weekly),
            "monthly" => Ok(QuotaPeriod::Monthly),
            _ => Err(format!("unknown quota period: {s}")),
        }
    }
}

/// Key for tracking usage: (subject, resource).
type UsageKey = (String, String);

/// Manages quotas and tracks usage.
#[derive(Debug, Clone)]
pub struct QuotaManager {
    quotas: Vec<QuotaDef>,
    usage: HashMap<UsageKey, u64>,
}

impl QuotaManager {
    pub fn new() -> Self {
        Self {
            quotas: Vec::new(),
            usage: HashMap::new(),
        }
    }

    pub fn add_quota(&mut self, quota: QuotaDef) {
        self.quotas.push(quota);
    }

    pub fn load_quotas(&mut self, quotas: Vec<QuotaDef>) {
        self.quotas = quotas;
    }

    /// Record usage for a subject and resource. Returns the new total.
    pub fn record_usage(&mut self, subject: &str, resource: &str, amount: u64) -> u64 {
        let key = (subject.to_string(), resource.to_string());
        let entry = self.usage.entry(key).or_insert(0);
        *entry += amount;
        *entry
    }

    /// Get current usage for a subject and resource.
    pub fn get_usage(&self, subject: &str, resource: &str) -> u64 {
        let key = (subject.to_string(), resource.to_string());
        self.usage.get(&key).copied().unwrap_or(0)
    }

    /// Check if usage is within quota. Returns Ok(remaining) or Err.
    pub fn check_quota(
        &self,
        subject: &str,
        resource: &str,
    ) -> Result<u64, QuotaError> {
        let current = self.get_usage(subject, resource);
        let applicable: Vec<&QuotaDef> = self
            .quotas
            .iter()
            .filter(|q| q.subject == subject && q.resource == resource)
            .collect();

        if applicable.is_empty() {
            return Ok(u64::MAX);
        }

        for quota in &applicable {
            if current >= quota.limit {
                return Err(QuotaError::Exceeded {
                    subject: subject.to_string(),
                    resource: resource.to_string(),
                    limit: quota.limit,
                    current,
                });
            }
        }

        let min_limit = applicable.iter().map(|q| q.limit).min().unwrap_or(u64::MAX);
        Ok(min_limit - current)
    }

    /// Try to consume quota. Records usage only if within limits.
    pub fn consume(
        &mut self,
        subject: &str,
        resource: &str,
        amount: u64,
    ) -> Result<u64, QuotaError> {
        let current = self.get_usage(subject, resource);
        let applicable: Vec<&QuotaDef> = self
            .quotas
            .iter()
            .filter(|q| q.subject == subject && q.resource == resource)
            .collect();

        for quota in &applicable {
            if current + amount > quota.limit {
                return Err(QuotaError::Exceeded {
                    subject: subject.to_string(),
                    resource: resource.to_string(),
                    limit: quota.limit,
                    current: current + amount,
                });
            }
        }

        Ok(self.record_usage(subject, resource, amount))
    }

    /// Reset usage for a subject and resource.
    pub fn reset_usage(&mut self, subject: &str, resource: &str) {
        let key = (subject.to_string(), resource.to_string());
        self.usage.remove(&key);
    }

    /// Reset all usage counters.
    pub fn reset_all(&mut self) {
        self.usage.clear();
    }

    pub fn quotas(&self) -> &[QuotaDef] {
        &self.quotas
    }
}

impl Default for QuotaManager {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, thiserror::Error)]
pub enum QuotaError {
    #[error("quota exceeded for {subject}/{resource}: {current}/{limit}")]
    Exceeded {
        subject: String,
        resource: String,
        limit: u64,
        current: u64,
    },
}

#[cfg(test)]
mod tests {
    use super::*;

    fn token_quota() -> QuotaDef {
        QuotaDef {
            name: "team-a-tokens".to_string(),
            subject: "team-a".to_string(),
            resource: "tokens".to_string(),
            limit: 1000,
            period: QuotaPeriod::Daily,
        }
    }

    #[test]
    fn test_record_and_get_usage() {
        let mut mgr = QuotaManager::new();
        assert_eq!(mgr.get_usage("team-a", "tokens"), 0);
        mgr.record_usage("team-a", "tokens", 100);
        assert_eq!(mgr.get_usage("team-a", "tokens"), 100);
        mgr.record_usage("team-a", "tokens", 50);
        assert_eq!(mgr.get_usage("team-a", "tokens"), 150);
    }

    #[test]
    fn test_check_quota_within_limits() {
        let mut mgr = QuotaManager::new();
        mgr.add_quota(token_quota());
        mgr.record_usage("team-a", "tokens", 500);
        let remaining = mgr.check_quota("team-a", "tokens").unwrap();
        assert_eq!(remaining, 500);
    }

    #[test]
    fn test_check_quota_exceeded() {
        let mut mgr = QuotaManager::new();
        mgr.add_quota(token_quota());
        mgr.record_usage("team-a", "tokens", 1000);
        assert!(mgr.check_quota("team-a", "tokens").is_err());
    }

    #[test]
    fn test_consume_success() {
        let mut mgr = QuotaManager::new();
        mgr.add_quota(token_quota());
        let total = mgr.consume("team-a", "tokens", 500).unwrap();
        assert_eq!(total, 500);
        let total = mgr.consume("team-a", "tokens", 400).unwrap();
        assert_eq!(total, 900);
    }

    #[test]
    fn test_consume_exceeds() {
        let mut mgr = QuotaManager::new();
        mgr.add_quota(token_quota());
        mgr.consume("team-a", "tokens", 800).unwrap();
        assert!(mgr.consume("team-a", "tokens", 300).is_err());
    }

    #[test]
    fn test_no_quota_unlimited() {
        let mgr = QuotaManager::new();
        let remaining = mgr.check_quota("team-b", "tokens").unwrap();
        assert_eq!(remaining, u64::MAX);
    }

    #[test]
    fn test_reset_usage() {
        let mut mgr = QuotaManager::new();
        mgr.record_usage("team-a", "tokens", 500);
        mgr.reset_usage("team-a", "tokens");
        assert_eq!(mgr.get_usage("team-a", "tokens"), 0);
    }

    #[test]
    fn test_reset_all() {
        let mut mgr = QuotaManager::new();
        mgr.record_usage("team-a", "tokens", 500);
        mgr.record_usage("team-b", "cost", 200);
        mgr.reset_all();
        assert_eq!(mgr.get_usage("team-a", "tokens"), 0);
        assert_eq!(mgr.get_usage("team-b", "cost"), 0);
    }

    #[test]
    fn test_quota_period_display_parse() {
        assert_eq!(QuotaPeriod::Daily.to_string(), "daily");
        assert_eq!(
            "monthly".parse::<QuotaPeriod>().unwrap(),
            QuotaPeriod::Monthly
        );
        assert!("yearly".parse::<QuotaPeriod>().is_err());
    }
}
