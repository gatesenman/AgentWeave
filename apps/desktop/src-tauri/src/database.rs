use rusqlite::{Connection, params};
use directories::ProjectDirs;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new() -> Result<Self, String> {
        let db_path = Self::db_path()?;
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        let db = Self { conn: Mutex::new(conn) };
        db.init_tables()?;
        Ok(db)
    }

    fn db_path() -> Result<PathBuf, String> {
        if let Some(dirs) = ProjectDirs::from("dev", "agentweave", "AgentWeave") {
            Ok(dirs.data_dir().join("agentweave.db"))
        } else {
            Ok(PathBuf::from("agentweave.db"))
        }
    }

    fn init_tables(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS recent_projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                last_opened TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                action TEXT NOT NULL,
                detail TEXT,
                user TEXT DEFAULT 'local'
            );
            CREATE TABLE IF NOT EXISTS experiments (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                config_a TEXT,
                config_b TEXT,
                vendor TEXT,
                runs INTEGER DEFAULT 0,
                winner TEXT,
                created_at TEXT NOT NULL,
                metrics_json TEXT
            );
            CREATE TABLE IF NOT EXISTS prompt_tests (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                prompt TEXT NOT NULL,
                expected_behavior TEXT,
                vendors_json TEXT,
                results_json TEXT,
                created_at TEXT
            );
            CREATE TABLE IF NOT EXISTS analytics_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_path TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                data_json TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS user_preferences (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS environments (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                label TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 0,
                project_path TEXT,
                last_deployed TEXT,
                overrides_json TEXT
            );
            CREATE TABLE IF NOT EXISTS templates (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'general',
                description TEXT,
                author TEXT,
                downloads INTEGER DEFAULT 0,
                tags_json TEXT,
                config_json TEXT,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS team_members (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT,
                role TEXT NOT NULL DEFAULT 'viewer',
                avatar_url TEXT,
                joined_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS webhooks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                platform TEXT NOT NULL DEFAULT 'slack',
                events_json TEXT,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS lint_rules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                severity TEXT NOT NULL DEFAULT 'warning',
                pattern TEXT,
                enabled INTEGER NOT NULL DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS snapshots (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                project_path TEXT,
                date TEXT NOT NULL,
                size_bytes INTEGER DEFAULT 0,
                vendors_count INTEGER DEFAULT 0,
                file_path TEXT
            );
            CREATE TABLE IF NOT EXISTS cost_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor TEXT NOT NULL,
                date TEXT NOT NULL,
                requests INTEGER DEFAULT 0,
                tokens INTEGER DEFAULT 0,
                cost_usd REAL DEFAULT 0.0
            );
            CREATE TABLE IF NOT EXISTS trace_spans (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                vendor TEXT,
                duration_ms INTEGER DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'ok',
                timestamp TEXT NOT NULL,
                project_path TEXT
            );
            CREATE TABLE IF NOT EXISTS governance_policies (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                severity TEXT NOT NULL DEFAULT 'warning',
                enabled INTEGER NOT NULL DEFAULT 1,
                rule_json TEXT
            );
            CREATE TABLE IF NOT EXISTS governance_roles (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                permissions_json TEXT
            );
            CREATE TABLE IF NOT EXISTS conflict_records (
                id TEXT PRIMARY KEY,
                file_path TEXT NOT NULL,
                local_content TEXT,
                remote_content TEXT,
                status TEXT NOT NULL DEFAULT 'unresolved',
                detected_at TEXT NOT NULL
            );"
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Recent Projects ---

    pub fn add_recent_project(&self, path: &str, name: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO recent_projects (path, name, last_opened) VALUES (?1, ?2, ?3)
             ON CONFLICT(path) DO UPDATE SET name=?2, last_opened=?3",
            params![path, name, now],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_recent_projects(&self) -> Result<Vec<(String, String, String)>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT path, name, last_opened FROM recent_projects ORDER BY last_opened DESC LIMIT 10"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?))
        }).map_err(|e| e.to_string())?;
        let mut result = Vec::new();
        for row in rows {
            result.push(row.map_err(|e| e.to_string())?);
        }
        Ok(result)
    }

    // --- Audit Log ---

    pub fn log_audit(&self, action: &str, detail: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO audit_log (timestamp, action, detail) VALUES (?1, ?2, ?3)",
            params![now, action, detail],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_audit_log(&self, limit: u32) -> Result<Vec<(String, String, String)>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT timestamp, action, detail FROM audit_log ORDER BY id DESC LIMIT ?1"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![limit], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2).unwrap_or_default()))
        }).map_err(|e| e.to_string())?;
        let mut result = Vec::new();
        for row in rows {
            result.push(row.map_err(|e| e.to_string())?);
        }
        Ok(result)
    }

    // --- User Preferences ---

    pub fn set_preference(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO user_preferences (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value=?2",
            params![key, value],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_preference(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT value FROM user_preferences WHERE key = ?1"
        ).map_err(|e| e.to_string())?;
        let result = stmt.query_row(params![key], |row| row.get::<_, String>(0));
        match result {
            Ok(val) => Ok(Some(val)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    // --- Experiments ---

    pub fn create_experiment(&self, id: &str, name: &str, config_a: &str, config_b: &str, vendor: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().to_rfc3339();
        let default_metrics = serde_json::json!({"response_time":[0.0,0.0],"accuracy":[0.0,0.0],"token_usage":[0,0],"success_rate":[0.0,0.0]});
        conn.execute(
            "INSERT INTO experiments (id, name, status, config_a, config_b, vendor, runs, created_at, metrics_json)
             VALUES (?1, ?2, 'pending', ?3, ?4, ?5, 0, ?6, ?7)",
            params![id, name, config_a, config_b, vendor, now, default_metrics.to_string()],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_experiments(&self) -> Result<Vec<(String, String, String, String, String, String, i64, Option<String>, String, String)>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, name, status, config_a, config_b, vendor, runs, winner, created_at, metrics_json FROM experiments ORDER BY created_at DESC"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3).unwrap_or_default(),
                row.get::<_, String>(4).unwrap_or_default(),
                row.get::<_, String>(5).unwrap_or_default(),
                row.get::<_, i64>(6).unwrap_or(0),
                row.get::<_, Option<String>>(7)?,
                row.get::<_, String>(8)?,
                row.get::<_, String>(9).unwrap_or_default(),
            ))
        }).map_err(|e| e.to_string())?;
        let mut result = Vec::new();
        for row in rows { result.push(row.map_err(|e| e.to_string())?); }
        Ok(result)
    }

    pub fn update_experiment_status(&self, id: &str, status: &str, winner: Option<&str>) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE experiments SET status=?2, winner=?3 WHERE id=?1",
            params![id, status, winner],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn complete_experiment(&self, id: &str, winner: &str, metrics_json: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE experiments SET status='completed', runs=10, winner=?2, metrics_json=?3 WHERE id=?1",
            params![id, winner, metrics_json],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_experiment(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM experiments WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Prompt Tests ---

    pub fn create_prompt_test(&self, id: &str, name: &str, prompt: &str, expected: &str, vendors_json: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO prompt_tests (id, name, prompt, expected_behavior, vendors_json, results_json, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, '[]', ?6)",
            params![id, name, prompt, expected, vendors_json, now],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_prompt_tests(&self) -> Result<Vec<(String, String, String, String, String, String)>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, name, prompt, expected_behavior, vendors_json, results_json FROM prompt_tests ORDER BY created_at DESC"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3).unwrap_or_default(),
                row.get::<_, String>(4).unwrap_or_default(),
                row.get::<_, String>(5).unwrap_or_default(),
            ))
        }).map_err(|e| e.to_string())?;
        let mut result = Vec::new();
        for row in rows { result.push(row.map_err(|e| e.to_string())?); }
        Ok(result)
    }

    pub fn delete_prompt_test(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM prompt_tests WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Environments ---

    pub fn create_environment(&self, id: &str, name: &str, label: &str, project_path: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO environments (id, name, label, is_active, project_path, last_deployed, overrides_json)
             VALUES (?1, ?2, ?3, 0, ?4, ?5, '[]')",
            params![id, name, label, project_path, now],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_environments(&self, project_path: Option<&str>) -> Result<Vec<(String, String, String, bool, String, String)>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let extract = |row: &rusqlite::Row| -> rusqlite::Result<(String, String, String, bool, String, String)> {
            Ok((
                row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?,
                row.get::<_, bool>(3)?, row.get::<_, String>(4).unwrap_or_default(),
                row.get::<_, String>(5).unwrap_or_else(|_| "[]".to_string()),
            ))
        };
        let mut result = Vec::new();
        if let Some(pp) = project_path {
            let mut stmt = conn.prepare("SELECT id, name, label, is_active, last_deployed, overrides_json FROM environments WHERE project_path=?1 ORDER BY name").map_err(|e| e.to_string())?;
            let rows = stmt.query_map(params![pp], extract).map_err(|e| e.to_string())?;
            for row in rows { result.push(row.map_err(|e| e.to_string())?); }
        } else {
            let mut stmt = conn.prepare("SELECT id, name, label, is_active, last_deployed, overrides_json FROM environments ORDER BY name").map_err(|e| e.to_string())?;
            let rows = stmt.query_map([], extract).map_err(|e| e.to_string())?;
            for row in rows { result.push(row.map_err(|e| e.to_string())?); }
        }
        Ok(result)
    }

    pub fn activate_environment(&self, id: &str, project_path: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("UPDATE environments SET is_active=0 WHERE project_path=?1", params![project_path]).map_err(|e| e.to_string())?;
        conn.execute("UPDATE environments SET is_active=1 WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_environment_overrides(&self, id: &str, overrides_json: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("UPDATE environments SET overrides_json=?2 WHERE id=?1", params![id, overrides_json]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_environment(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM environments WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Templates ---

    pub fn create_template(&self, id: &str, name: &str, category: &str, description: &str, author: &str, tags_json: &str, config_json: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO templates (id, name, category, description, author, downloads, tags_json, config_json, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, ?8)",
            params![id, name, category, description, author, tags_json, config_json, now],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_templates(&self, category: Option<&str>) -> Result<Vec<(String, String, String, String, String, i64, String, String, String)>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let extract = |row: &rusqlite::Row| -> rusqlite::Result<(String, String, String, String, String, i64, String, String, String)> {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?,
                row.get::<_, String>(3).unwrap_or_default(), row.get::<_, String>(4).unwrap_or_default(),
                row.get::<_, i64>(5).unwrap_or(0), row.get::<_, String>(6).unwrap_or_else(|_| "[]".to_string()),
                row.get::<_, String>(7).unwrap_or_default(), row.get::<_, String>(8)?))
        };
        let mut result = Vec::new();
        if let Some(cat) = category {
            let mut stmt = conn.prepare("SELECT id, name, category, description, author, downloads, tags_json, config_json, created_at FROM templates WHERE category=?1 ORDER BY downloads DESC").map_err(|e| e.to_string())?;
            let rows = stmt.query_map(params![cat], extract).map_err(|e| e.to_string())?;
            for row in rows { result.push(row.map_err(|e| e.to_string())?); }
        } else {
            let mut stmt = conn.prepare("SELECT id, name, category, description, author, downloads, tags_json, config_json, created_at FROM templates ORDER BY downloads DESC").map_err(|e| e.to_string())?;
            let rows = stmt.query_map([], extract).map_err(|e| e.to_string())?;
            for row in rows { result.push(row.map_err(|e| e.to_string())?); }
        }
        Ok(result)
    }

    pub fn delete_template(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM templates WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Team Members ---

    pub fn add_team_member(&self, id: &str, name: &str, email: &str, role: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO team_members (id, name, email, role, joined_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, name, email, role, now],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_team_members(&self) -> Result<Vec<(String, String, String, String, String)>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, name, email, role, joined_at FROM team_members ORDER BY joined_at"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2).unwrap_or_default(),
                row.get::<_, String>(3)?, row.get::<_, String>(4)?))
        }).map_err(|e| e.to_string())?;
        let mut result = Vec::new();
        for row in rows { result.push(row.map_err(|e| e.to_string())?); }
        Ok(result)
    }

    pub fn update_team_member_role(&self, id: &str, role: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("UPDATE team_members SET role=?2 WHERE id=?1", params![id, role]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_team_member(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM team_members WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Webhooks ---

    pub fn create_webhook(&self, id: &str, name: &str, url: &str, platform: &str, events_json: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO webhooks (id, name, url, platform, events_json, enabled, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)",
            params![id, name, url, platform, events_json, now],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_webhooks(&self) -> Result<Vec<(String, String, String, String, String, bool, String)>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, name, url, platform, events_json, enabled, created_at FROM webhooks ORDER BY created_at DESC"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?,
                row.get::<_, String>(3)?, row.get::<_, String>(4).unwrap_or_else(|_| "[]".to_string()),
                row.get::<_, bool>(5)?, row.get::<_, String>(6)?))
        }).map_err(|e| e.to_string())?;
        let mut result = Vec::new();
        for row in rows { result.push(row.map_err(|e| e.to_string())?); }
        Ok(result)
    }

    pub fn toggle_webhook(&self, id: &str, enabled: bool) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("UPDATE webhooks SET enabled=?2 WHERE id=?1", params![id, enabled]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_webhook(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM webhooks WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Lint Rules ---

    pub fn create_lint_rule(&self, id: &str, name: &str, description: &str, severity: &str, pattern: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO lint_rules (id, name, description, severity, pattern, enabled) VALUES (?1, ?2, ?3, ?4, ?5, 1)",
            params![id, name, description, severity, pattern],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_lint_rules(&self) -> Result<Vec<(String, String, String, String, String, bool)>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, name, description, severity, pattern, enabled FROM lint_rules ORDER BY name"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2).unwrap_or_default(),
                row.get::<_, String>(3)?, row.get::<_, String>(4).unwrap_or_default(),
                row.get::<_, bool>(5)?))
        }).map_err(|e| e.to_string())?;
        let mut result = Vec::new();
        for row in rows { result.push(row.map_err(|e| e.to_string())?); }
        Ok(result)
    }

    pub fn toggle_lint_rule(&self, id: &str, enabled: bool) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("UPDATE lint_rules SET enabled=?2 WHERE id=?1", params![id, enabled]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_lint_rule(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM lint_rules WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Snapshots (Backup) ---

    pub fn create_snapshot(&self, id: &str, name: &str, project_path: &str, size_bytes: i64, vendors_count: i32, file_path: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO snapshots (id, name, project_path, date, size_bytes, vendors_count, file_path)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, name, project_path, now, size_bytes, vendors_count, file_path],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_snapshots(&self, project_path: Option<&str>) -> Result<Vec<(String, String, String, i64, i32, String)>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let extract = |row: &rusqlite::Row| -> rusqlite::Result<(String, String, String, i64, i32, String)> {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?,
                row.get::<_, i64>(3).unwrap_or(0), row.get::<_, i32>(4).unwrap_or(0),
                row.get::<_, String>(5).unwrap_or_default()))
        };
        let mut result = Vec::new();
        if let Some(pp) = project_path {
            let mut stmt = conn.prepare("SELECT id, name, date, size_bytes, vendors_count, file_path FROM snapshots WHERE project_path=?1 ORDER BY date DESC").map_err(|e| e.to_string())?;
            let rows = stmt.query_map(params![pp], extract).map_err(|e| e.to_string())?;
            for row in rows { result.push(row.map_err(|e| e.to_string())?); }
        } else {
            let mut stmt = conn.prepare("SELECT id, name, date, size_bytes, vendors_count, file_path FROM snapshots ORDER BY date DESC").map_err(|e| e.to_string())?;
            let rows = stmt.query_map([], extract).map_err(|e| e.to_string())?;
            for row in rows { result.push(row.map_err(|e| e.to_string())?); }
        }
        Ok(result)
    }

    pub fn delete_snapshot(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM snapshots WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Cost Records ---

    pub fn add_cost_record(&self, vendor: &str, date: &str, requests: i32, tokens: i64, cost_usd: f64) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO cost_records (vendor, date, requests, tokens, cost_usd) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![vendor, date, requests, tokens, cost_usd],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_cost_records(&self, vendor: Option<&str>) -> Result<Vec<(i64, String, String, i32, i64, f64)>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let extract = |row: &rusqlite::Row| -> rusqlite::Result<(i64, String, String, i32, i64, f64)> {
            Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?, row.get::<_, i32>(3).unwrap_or(0),
                row.get::<_, i64>(4).unwrap_or(0), row.get::<_, f64>(5).unwrap_or(0.0)))
        };
        let mut result = Vec::new();
        if let Some(v) = vendor {
            let mut stmt = conn.prepare("SELECT id, vendor, date, requests, tokens, cost_usd FROM cost_records WHERE vendor=?1 ORDER BY date DESC").map_err(|e| e.to_string())?;
            let rows = stmt.query_map(params![v], extract).map_err(|e| e.to_string())?;
            for row in rows { result.push(row.map_err(|e| e.to_string())?); }
        } else {
            let mut stmt = conn.prepare("SELECT id, vendor, date, requests, tokens, cost_usd FROM cost_records ORDER BY date DESC").map_err(|e| e.to_string())?;
            let rows = stmt.query_map([], extract).map_err(|e| e.to_string())?;
            for row in rows { result.push(row.map_err(|e| e.to_string())?); }
        }
        Ok(result)
    }

    pub fn delete_cost_record(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM cost_records WHERE id=?1 OR CAST(id AS TEXT)=?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Trace Spans ---

    pub fn add_trace_span(&self, id: &str, name: &str, vendor: &str, duration_ms: i64, status: &str, project_path: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO trace_spans (id, name, vendor, duration_ms, status, timestamp, project_path)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, name, vendor, duration_ms, status, now, project_path],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_trace_spans(&self, limit: u32) -> Result<Vec<(String, String, String, i64, String, String)>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, name, vendor, duration_ms, status, timestamp FROM trace_spans ORDER BY timestamp DESC LIMIT ?1"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![limit], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2).unwrap_or_default(),
                row.get::<_, i64>(3).unwrap_or(0), row.get::<_, String>(4)?, row.get::<_, String>(5)?))
        }).map_err(|e| e.to_string())?;
        let mut result = Vec::new();
        for row in rows { result.push(row.map_err(|e| e.to_string())?); }
        Ok(result)
    }

    // --- Governance Policies ---

    pub fn create_governance_policy(&self, id: &str, name: &str, description: &str, severity: &str, rule_json: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO governance_policies (id, name, description, severity, enabled, rule_json)
             VALUES (?1, ?2, ?3, ?4, 1, ?5)",
            params![id, name, description, severity, rule_json],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_governance_policies(&self) -> Result<Vec<(String, String, String, String, bool, String)>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, name, description, severity, enabled, rule_json FROM governance_policies ORDER BY name"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2).unwrap_or_default(),
                row.get::<_, String>(3)?, row.get::<_, bool>(4)?, row.get::<_, String>(5).unwrap_or_default()))
        }).map_err(|e| e.to_string())?;
        let mut result = Vec::new();
        for row in rows { result.push(row.map_err(|e| e.to_string())?); }
        Ok(result)
    }

    pub fn toggle_governance_policy(&self, id: &str, enabled: bool) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("UPDATE governance_policies SET enabled=?2 WHERE id=?1", params![id, enabled]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_governance_policy(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM governance_policies WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Governance Roles ---

    pub fn create_governance_role(&self, id: &str, name: &str, permissions_json: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO governance_roles (id, name, permissions_json) VALUES (?1, ?2, ?3)",
            params![id, name, permissions_json],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_governance_roles(&self) -> Result<Vec<(String, String, String)>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, name, permissions_json FROM governance_roles ORDER BY name"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2).unwrap_or_else(|_| "[]".to_string())))
        }).map_err(|e| e.to_string())?;
        let mut result = Vec::new();
        for row in rows { result.push(row.map_err(|e| e.to_string())?); }
        Ok(result)
    }

    pub fn delete_governance_role(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM governance_roles WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Conflict Records ---

    pub fn create_conflict(&self, id: &str, file_path: &str, local_content: &str, remote_content: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO conflict_records (id, file_path, local_content, remote_content, status, detected_at)
             VALUES (?1, ?2, ?3, ?4, 'unresolved', ?5)
             ON CONFLICT(id) DO UPDATE SET local_content=?3, remote_content=?4, status='unresolved', detected_at=?5",
            params![id, file_path, local_content, remote_content, now],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_conflicts(&self) -> Result<Vec<(String, String, String, String, String, String)>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, file_path, local_content, remote_content, status, detected_at FROM conflict_records ORDER BY detected_at DESC"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2).unwrap_or_default(),
                row.get::<_, String>(3).unwrap_or_default(), row.get::<_, String>(4)?, row.get::<_, String>(5)?))
        }).map_err(|e| e.to_string())?;
        let mut result = Vec::new();
        for row in rows { result.push(row.map_err(|e| e.to_string())?); }
        Ok(result)
    }

    pub fn resolve_conflict(&self, id: &str, resolution: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("UPDATE conflict_records SET status=?2 WHERE id=?1", params![id, resolution]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Aggregation helpers ---

    pub fn get_total_cost(&self) -> Result<f64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let result: f64 = conn.query_row(
            "SELECT COALESCE(SUM(cost_usd), 0.0) FROM cost_records", [], |row| row.get(0),
        ).unwrap_or(0.0);
        Ok(result)
    }

    pub fn count_failed_spans(&self) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let result: i64 = conn.query_row(
            "SELECT COUNT(*) FROM trace_spans WHERE status != 'ok'", [], |row| row.get(0),
        ).unwrap_or(0);
        Ok(result)
    }

    pub fn count_unresolved_conflicts(&self) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let result: i64 = conn.query_row(
            "SELECT COUNT(*) FROM conflict_records WHERE status = 'unresolved' OR status = 'pending'",
            [], |row| row.get(0),
        ).unwrap_or(0);
        Ok(result)
    }

    pub fn get_span_metrics(&self) -> Result<(i64, f64, i64), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let total: i64 = conn.query_row(
            "SELECT COUNT(*) FROM trace_spans", [], |row| row.get(0),
        ).unwrap_or(0);
        let avg: f64 = conn.query_row(
            "SELECT COALESCE(AVG(duration_ms), 0.0) FROM trace_spans", [], |row| row.get(0),
        ).unwrap_or(0.0);
        let ok_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM trace_spans WHERE status = 'ok'", [], |row| row.get(0),
        ).unwrap_or(0);
        Ok((total, avg, ok_count))
    }

    pub fn update_prompt_test_results(&self, id: &str, results_json: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE prompt_tests SET results_json = ?1 WHERE id = ?2",
            params![results_json, id],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_prompt_test_vendors(&self, id: &str) -> Result<String, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let result: String = conn.query_row(
            "SELECT vendors_json FROM prompt_tests WHERE id = ?1",
            params![id],
            |row| row.get(0),
        ).map_err(|e| format!("Test not found: {}", e))?;
        Ok(result)
    }
}
