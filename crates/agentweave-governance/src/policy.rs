use serde::{Deserialize, Serialize};

/// Enforcement mode for policies.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum EnforcementMode {
    Enforce,
    Warn,
    AuditOnly,
}

impl Default for EnforcementMode {
    fn default() -> Self {
        Self::Enforce
    }
}

impl std::fmt::Display for EnforcementMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EnforcementMode::Enforce => write!(f, "enforce"),
            EnforcementMode::Warn => write!(f, "warn"),
            EnforcementMode::AuditOnly => write!(f, "audit-only"),
        }
    }
}

impl std::str::FromStr for EnforcementMode {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "enforce" => Ok(EnforcementMode::Enforce),
            "warn" => Ok(EnforcementMode::Warn),
            "audit-only" | "audit_only" => Ok(EnforcementMode::AuditOnly),
            _ => Err(format!("unknown enforcement mode: {s}")),
        }
    }
}

/// A policy definition.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyDef {
    pub name: String,
    pub description: Option<String>,
    pub rules: Vec<PolicyRule>,
    #[serde(default)]
    pub enforcement: EnforcementMode,
}

/// A single rule within a policy.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyRule {
    pub condition: String,
    #[serde(default)]
    pub message: Option<String>,
}

/// Result of evaluating a single policy.
#[derive(Debug, Clone)]
pub struct PolicyEvalResult {
    pub policy_name: String,
    pub passed: bool,
    pub violations: Vec<PolicyViolation>,
    pub enforcement: EnforcementMode,
}

/// A specific violation found during policy evaluation.
#[derive(Debug, Clone)]
pub struct PolicyViolation {
    pub rule_condition: String,
    pub message: String,
}

/// Manages policy definitions and evaluates them against configurations.
#[derive(Debug, Clone)]
pub struct PolicyEngine {
    policies: Vec<PolicyDef>,
}

impl PolicyEngine {
    pub fn new() -> Self {
        Self {
            policies: Vec::new(),
        }
    }

    pub fn add_policy(&mut self, policy: PolicyDef) {
        self.policies.push(policy);
    }

    pub fn load_policies(&mut self, policies: Vec<PolicyDef>) {
        self.policies = policies;
    }

    pub fn policies(&self) -> &[PolicyDef] {
        &self.policies
    }

    /// Evaluate all policies against a configuration context.
    /// `context` contains key-value pairs describing the current config state
    /// (e.g., "model" => "gpt-4", "environment" => "production").
    pub fn evaluate(
        &self,
        context: &std::collections::HashMap<String, String>,
    ) -> Vec<PolicyEvalResult> {
        self.policies
            .iter()
            .map(|policy| self.evaluate_policy(policy, context))
            .collect()
    }

    /// Check if any enforced policy is violated. Returns an error with
    /// violation details if so.
    pub fn enforce(
        &self,
        context: &std::collections::HashMap<String, String>,
    ) -> Result<Vec<PolicyEvalResult>, PolicyError> {
        let results = self.evaluate(context);
        let enforced_violations: Vec<&PolicyEvalResult> = results
            .iter()
            .filter(|r| !r.passed && r.enforcement == EnforcementMode::Enforce)
            .collect();

        if enforced_violations.is_empty() {
            Ok(results)
        } else {
            let messages: Vec<String> = enforced_violations
                .iter()
                .flat_map(|r| {
                    r.violations
                        .iter()
                        .map(|v| format!("[{}] {}", r.policy_name, v.message))
                })
                .collect();
            Err(PolicyError::Violation(messages.join("; ")))
        }
    }

    fn evaluate_policy(
        &self,
        policy: &PolicyDef,
        context: &std::collections::HashMap<String, String>,
    ) -> PolicyEvalResult {
        let mut violations = Vec::new();

        for rule in &policy.rules {
            if !self.evaluate_condition(&rule.condition, context) {
                let message = rule.message.clone().unwrap_or_else(|| {
                    format!("policy rule violated: {}", rule.condition)
                });
                violations.push(PolicyViolation {
                    rule_condition: rule.condition.clone(),
                    message,
                });
            }
        }

        PolicyEvalResult {
            policy_name: policy.name.clone(),
            passed: violations.is_empty(),
            violations,
            enforcement: policy.enforcement,
        }
    }

    /// Simple condition evaluator. Supports:
    /// - `no <key> <value>` — context[key] must NOT equal value
    /// - `require <key>` — context must contain key
    /// - `require <key> <value>` — context[key] must equal value
    fn evaluate_condition(
        &self,
        condition: &str,
        context: &std::collections::HashMap<String, String>,
    ) -> bool {
        let parts: Vec<&str> = condition.split_whitespace().collect();
        match parts.as_slice() {
            ["no", key, value] => context.get(*key).map_or(true, |v| v != value),
            ["require", key] => context.contains_key(*key),
            ["require", key, value] => context.get(*key).map_or(false, |v| v == value),
            _ => true,
        }
    }
}

impl Default for PolicyEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, thiserror::Error)]
pub enum PolicyError {
    #[error("policy violation: {0}")]
    Violation(String),
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn test_policy() -> PolicyDef {
        PolicyDef {
            name: "no-gpt4-prod".to_string(),
            description: Some("No GPT-4 in production".to_string()),
            rules: vec![PolicyRule {
                condition: "no model gpt-4".to_string(),
                message: Some("GPT-4 is not allowed in production".to_string()),
            }],
            enforcement: EnforcementMode::Enforce,
        }
    }

    #[test]
    fn test_policy_passes_when_no_violation() {
        let mut engine = PolicyEngine::new();
        engine.add_policy(test_policy());
        let mut ctx = HashMap::new();
        ctx.insert("model".to_string(), "claude-3".to_string());
        let results = engine.evaluate(&ctx);
        assert!(results[0].passed);
    }

    #[test]
    fn test_policy_fails_when_violated() {
        let mut engine = PolicyEngine::new();
        engine.add_policy(test_policy());
        let mut ctx = HashMap::new();
        ctx.insert("model".to_string(), "gpt-4".to_string());
        let results = engine.evaluate(&ctx);
        assert!(!results[0].passed);
        assert_eq!(results[0].violations.len(), 1);
    }

    #[test]
    fn test_enforce_blocks_on_violation() {
        let mut engine = PolicyEngine::new();
        engine.add_policy(test_policy());
        let mut ctx = HashMap::new();
        ctx.insert("model".to_string(), "gpt-4".to_string());
        assert!(engine.enforce(&ctx).is_err());
    }

    #[test]
    fn test_warn_mode_does_not_block() {
        let mut engine = PolicyEngine::new();
        let mut policy = test_policy();
        policy.enforcement = EnforcementMode::Warn;
        engine.add_policy(policy);
        let mut ctx = HashMap::new();
        ctx.insert("model".to_string(), "gpt-4".to_string());
        let results = engine.enforce(&ctx).unwrap();
        assert!(!results[0].passed);
    }

    #[test]
    fn test_audit_only_mode() {
        let mut engine = PolicyEngine::new();
        let mut policy = test_policy();
        policy.enforcement = EnforcementMode::AuditOnly;
        engine.add_policy(policy);
        let mut ctx = HashMap::new();
        ctx.insert("model".to_string(), "gpt-4".to_string());
        let results = engine.enforce(&ctx).unwrap();
        assert!(!results[0].passed);
    }

    #[test]
    fn test_require_condition() {
        let engine = PolicyEngine::new();
        let mut ctx = HashMap::new();
        ctx.insert("review".to_string(), "approved".to_string());
        assert!(engine.evaluate_condition("require review", &ctx));
        assert!(engine.evaluate_condition("require review approved", &ctx));
        assert!(!engine.evaluate_condition("require review rejected", &ctx));
        assert!(!engine.evaluate_condition("require missing_key", &ctx));
    }

    #[test]
    fn test_multiple_policies() {
        let mut engine = PolicyEngine::new();
        engine.add_policy(test_policy());
        engine.add_policy(PolicyDef {
            name: "require-review".to_string(),
            description: None,
            rules: vec![PolicyRule {
                condition: "require review".to_string(),
                message: Some("Review is required".to_string()),
            }],
            enforcement: EnforcementMode::Enforce,
        });
        let mut ctx = HashMap::new();
        ctx.insert("model".to_string(), "claude-3".to_string());
        // Missing "review" key
        let err = engine.enforce(&ctx).unwrap_err();
        assert!(err.to_string().contains("Review is required"));
    }

    #[test]
    fn test_enforcement_mode_display_parse() {
        assert_eq!(EnforcementMode::Enforce.to_string(), "enforce");
        assert_eq!(
            "audit-only".parse::<EnforcementMode>().unwrap(),
            EnforcementMode::AuditOnly
        );
    }
}
