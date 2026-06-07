use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Supported roles in the RBAC system.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    Admin,
    Developer,
    Viewer,
}

impl std::fmt::Display for Role {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Role::Admin => write!(f, "admin"),
            Role::Developer => write!(f, "developer"),
            Role::Viewer => write!(f, "viewer"),
        }
    }
}

impl std::str::FromStr for Role {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "admin" => Ok(Role::Admin),
            "developer" => Ok(Role::Developer),
            "viewer" => Ok(Role::Viewer),
            _ => Err(format!("unknown role: {s}")),
        }
    }
}

/// Permissions that can be checked.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Permission {
    ConfigRead,
    ConfigWrite,
    ConfigGenerate,
    ConfigDelete,
    PolicyManage,
    RoleAssign,
    AuditRead,
    QuotaManage,
}

impl std::fmt::Display for Permission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Permission::ConfigRead => "config_read",
            Permission::ConfigWrite => "config_write",
            Permission::ConfigGenerate => "config_generate",
            Permission::ConfigDelete => "config_delete",
            Permission::PolicyManage => "policy_manage",
            Permission::RoleAssign => "role_assign",
            Permission::AuditRead => "audit_read",
            Permission::QuotaManage => "quota_manage",
        };
        write!(f, "{s}")
    }
}

fn default_permissions(role: Role) -> Vec<Permission> {
    match role {
        Role::Admin => vec![
            Permission::ConfigRead,
            Permission::ConfigWrite,
            Permission::ConfigGenerate,
            Permission::ConfigDelete,
            Permission::PolicyManage,
            Permission::RoleAssign,
            Permission::AuditRead,
            Permission::QuotaManage,
        ],
        Role::Developer => vec![
            Permission::ConfigRead,
            Permission::ConfigWrite,
            Permission::ConfigGenerate,
            Permission::AuditRead,
        ],
        Role::Viewer => vec![Permission::ConfigRead, Permission::AuditRead],
    }
}

/// Manages role-based access control.
#[derive(Debug, Clone)]
pub struct RbacManager {
    user_roles: HashMap<String, Role>,
}

impl RbacManager {
    pub fn new() -> Self {
        Self {
            user_roles: HashMap::new(),
        }
    }

    /// Load role assignments from governance config role definitions.
    pub fn load_from_config(roles: &[crate::RoleAssignment]) -> Self {
        let mut mgr = Self::new();
        for assignment in roles {
            if let Ok(role) = assignment.role.parse::<Role>() {
                mgr.assign_role(&assignment.user, role);
            }
        }
        mgr
    }

    pub fn assign_role(&mut self, user: &str, role: Role) {
        self.user_roles.insert(user.to_string(), role);
    }

    pub fn get_role(&self, user: &str) -> Option<Role> {
        self.user_roles.get(user).copied()
    }

    pub fn check_permission(&self, user: &str, permission: Permission) -> bool {
        match self.get_role(user) {
            Some(role) => default_permissions(role).contains(&permission),
            None => false,
        }
    }

    pub fn require_permission(
        &self,
        user: &str,
        permission: Permission,
    ) -> Result<(), RbacError> {
        if self.check_permission(user, permission) {
            Ok(())
        } else {
            Err(RbacError::PermissionDenied {
                user: user.to_string(),
                permission,
            })
        }
    }

    pub fn list_users(&self) -> Vec<(&str, Role)> {
        self.user_roles
            .iter()
            .map(|(u, r)| (u.as_str(), *r))
            .collect()
    }
}

impl Default for RbacManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Role assignment entry for config loading.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoleAssignment {
    pub user: String,
    pub role: String,
}

#[derive(Debug, thiserror::Error)]
pub enum RbacError {
    #[error("permission denied: user '{user}' lacks '{permission}'")]
    PermissionDenied {
        user: String,
        permission: Permission,
    },
    #[error("unknown user: {0}")]
    UnknownUser(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_admin_has_all_permissions() {
        let mut mgr = RbacManager::new();
        mgr.assign_role("alice", Role::Admin);
        assert!(mgr.check_permission("alice", Permission::ConfigRead));
        assert!(mgr.check_permission("alice", Permission::ConfigWrite));
        assert!(mgr.check_permission("alice", Permission::ConfigDelete));
        assert!(mgr.check_permission("alice", Permission::PolicyManage));
        assert!(mgr.check_permission("alice", Permission::RoleAssign));
        assert!(mgr.check_permission("alice", Permission::QuotaManage));
    }

    #[test]
    fn test_developer_permissions() {
        let mut mgr = RbacManager::new();
        mgr.assign_role("bob", Role::Developer);
        assert!(mgr.check_permission("bob", Permission::ConfigRead));
        assert!(mgr.check_permission("bob", Permission::ConfigWrite));
        assert!(mgr.check_permission("bob", Permission::ConfigGenerate));
        assert!(!mgr.check_permission("bob", Permission::ConfigDelete));
        assert!(!mgr.check_permission("bob", Permission::PolicyManage));
        assert!(!mgr.check_permission("bob", Permission::RoleAssign));
    }

    #[test]
    fn test_viewer_permissions() {
        let mut mgr = RbacManager::new();
        mgr.assign_role("carol", Role::Viewer);
        assert!(mgr.check_permission("carol", Permission::ConfigRead));
        assert!(mgr.check_permission("carol", Permission::AuditRead));
        assert!(!mgr.check_permission("carol", Permission::ConfigWrite));
        assert!(!mgr.check_permission("carol", Permission::ConfigGenerate));
    }

    #[test]
    fn test_unknown_user_denied() {
        let mgr = RbacManager::new();
        assert!(!mgr.check_permission("unknown", Permission::ConfigRead));
    }

    #[test]
    fn test_require_permission_ok() {
        let mut mgr = RbacManager::new();
        mgr.assign_role("alice", Role::Admin);
        assert!(mgr
            .require_permission("alice", Permission::ConfigWrite)
            .is_ok());
    }

    #[test]
    fn test_require_permission_denied() {
        let mut mgr = RbacManager::new();
        mgr.assign_role("carol", Role::Viewer);
        assert!(mgr
            .require_permission("carol", Permission::ConfigWrite)
            .is_err());
    }

    #[test]
    fn test_load_from_config() {
        let assignments = vec![
            RoleAssignment {
                user: "alice".to_string(),
                role: "admin".to_string(),
            },
            RoleAssignment {
                user: "bob".to_string(),
                role: "developer".to_string(),
            },
        ];
        let mgr = RbacManager::load_from_config(&assignments);
        assert_eq!(mgr.get_role("alice"), Some(Role::Admin));
        assert_eq!(mgr.get_role("bob"), Some(Role::Developer));
    }

    #[test]
    fn test_role_display_parse() {
        assert_eq!(Role::Admin.to_string(), "admin");
        assert_eq!("developer".parse::<Role>().unwrap(), Role::Developer);
        assert!("invalid".parse::<Role>().is_err());
    }
}
