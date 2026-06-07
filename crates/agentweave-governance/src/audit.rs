use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A single audit log entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEntry {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub user: String,
    pub action: String,
    pub resource: String,
    pub diff: Option<String>,
    pub metadata: Option<String>,
}

/// Query filters for retrieving audit logs.
#[derive(Debug, Default)]
pub struct AuditQuery {
    pub user: Option<String>,
    pub action: Option<String>,
    pub from: Option<DateTime<Utc>>,
    pub to: Option<DateTime<Utc>>,
    pub limit: Option<usize>,
}

/// Audit logger backed by SQLite.
pub struct AuditLogger {
    conn: Connection,
}

impl AuditLogger {
    /// Open (or create) an audit log database at the given path.
    pub fn open(db_path: &str) -> Result<Self, AuditError> {
        let conn = Connection::open(db_path)?;
        let logger = Self { conn };
        logger.init_schema()?;
        Ok(logger)
    }

    /// Create an in-memory audit logger (useful for testing).
    pub fn in_memory() -> Result<Self, AuditError> {
        let conn = Connection::open_in_memory()?;
        let logger = Self { conn };
        logger.init_schema()?;
        Ok(logger)
    }

    fn init_schema(&self) -> Result<(), AuditError> {
        self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS audit_log (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                user TEXT NOT NULL,
                action TEXT NOT NULL,
                resource TEXT NOT NULL,
                diff TEXT,
                metadata TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user);
            CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
            CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);",
        )?;
        Ok(())
    }

    /// Record a new audit entry.
    pub fn log(
        &self,
        user: &str,
        action: &str,
        resource: &str,
        diff: Option<&str>,
        metadata: Option<&str>,
    ) -> Result<AuditEntry, AuditError> {
        let entry = AuditEntry {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            user: user.to_string(),
            action: action.to_string(),
            resource: resource.to_string(),
            diff: diff.map(String::from),
            metadata: metadata.map(String::from),
        };

        self.conn.execute(
            "INSERT INTO audit_log (id, timestamp, user, action, resource, diff, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                entry.id,
                entry.timestamp.to_rfc3339(),
                entry.user,
                entry.action,
                entry.resource,
                entry.diff,
                entry.metadata,
            ],
        )?;

        Ok(entry)
    }

    /// Query audit logs with optional filters.
    pub fn query(&self, filter: &AuditQuery) -> Result<Vec<AuditEntry>, AuditError> {
        let mut sql = String::from("SELECT id, timestamp, user, action, resource, diff, metadata FROM audit_log WHERE 1=1");
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(ref user) = filter.user {
            sql.push_str(&format!(" AND user = ?{}", param_values.len() + 1));
            param_values.push(Box::new(user.clone()));
        }
        if let Some(ref action) = filter.action {
            sql.push_str(&format!(" AND action = ?{}", param_values.len() + 1));
            param_values.push(Box::new(action.clone()));
        }
        if let Some(ref from) = filter.from {
            sql.push_str(&format!(" AND timestamp >= ?{}", param_values.len() + 1));
            param_values.push(Box::new(from.to_rfc3339()));
        }
        if let Some(ref to) = filter.to {
            sql.push_str(&format!(" AND timestamp <= ?{}", param_values.len() + 1));
            param_values.push(Box::new(to.to_rfc3339()));
        }

        sql.push_str(" ORDER BY timestamp DESC");

        if let Some(limit) = filter.limit {
            sql.push_str(&format!(" LIMIT {limit}"));
        }

        let params_refs: Vec<&dyn rusqlite::types::ToSql> =
            param_values.iter().map(|p| p.as_ref()).collect();

        let mut stmt = self.conn.prepare(&sql)?;
        let entries = stmt
            .query_map(params_refs.as_slice(), |row| {
                let ts_str: String = row.get(1)?;
                let timestamp = DateTime::parse_from_rfc3339(&ts_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now());
                Ok(AuditEntry {
                    id: row.get(0)?,
                    timestamp,
                    user: row.get(2)?,
                    action: row.get(3)?,
                    resource: row.get(4)?,
                    diff: row.get(5)?,
                    metadata: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(entries)
    }

    /// Count total audit entries.
    pub fn count(&self) -> Result<usize, AuditError> {
        let count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM audit_log", [], |row| row.get(0))?;
        Ok(count as usize)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum AuditError {
    #[error("database error: {0}")]
    Database(#[from] rusqlite::Error),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_log_and_query() {
        let logger = AuditLogger::in_memory().unwrap();

        logger
            .log(
                "alice",
                "config.update",
                "agents/main.yaml",
                Some("- old\n+ new"),
                None,
            )
            .unwrap();
        logger
            .log("bob", "config.generate", "all", None, None)
            .unwrap();

        let all = logger.query(&AuditQuery::default()).unwrap();
        assert_eq!(all.len(), 2);

        let by_user = logger
            .query(&AuditQuery {
                user: Some("alice".to_string()),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(by_user.len(), 1);
        assert_eq!(by_user[0].user, "alice");
        assert_eq!(by_user[0].action, "config.update");
    }

    #[test]
    fn test_query_by_action() {
        let logger = AuditLogger::in_memory().unwrap();
        logger
            .log("alice", "config.update", "agents/main.yaml", None, None)
            .unwrap();
        logger
            .log("alice", "config.delete", "rules/old.yaml", None, None)
            .unwrap();

        let results = logger
            .query(&AuditQuery {
                action: Some("config.delete".to_string()),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].resource, "rules/old.yaml");
    }

    #[test]
    fn test_query_with_limit() {
        let logger = AuditLogger::in_memory().unwrap();
        for i in 0..10 {
            logger
                .log(&format!("user{i}"), "action", "res", None, None)
                .unwrap();
        }
        let results = logger
            .query(&AuditQuery {
                limit: Some(3),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(results.len(), 3);
    }

    #[test]
    fn test_count() {
        let logger = AuditLogger::in_memory().unwrap();
        assert_eq!(logger.count().unwrap(), 0);
        logger.log("u", "a", "r", None, None).unwrap();
        logger.log("u", "a", "r", None, None).unwrap();
        assert_eq!(logger.count().unwrap(), 2);
    }

    #[test]
    fn test_entry_has_diff() {
        let logger = AuditLogger::in_memory().unwrap();
        let entry = logger
            .log("alice", "update", "config", Some("diff-content"), None)
            .unwrap();
        assert_eq!(entry.diff.as_deref(), Some("diff-content"));

        let queried = logger.query(&AuditQuery::default()).unwrap();
        assert_eq!(queried[0].diff.as_deref(), Some("diff-content"));
    }

    #[test]
    fn test_query_by_date_range() {
        let logger = AuditLogger::in_memory().unwrap();
        logger.log("alice", "update", "config", None, None).unwrap();

        let future = Utc::now() + chrono::Duration::hours(1);
        let results = logger
            .query(&AuditQuery {
                from: Some(future),
                ..Default::default()
            })
            .unwrap();
        assert!(results.is_empty());
    }
}
