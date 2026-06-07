use crate::models::*;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tracing::{info, warn};

/// Health status for a registered agent endpoint
#[derive(Debug, Clone)]
pub struct AgentHealth {
    pub healthy: bool,
    pub last_check: Instant,
    pub consecutive_failures: u32,
    pub latency_ms: Option<u64>,
}

/// Routing strategy for agent dispatch
#[derive(Debug, Clone, PartialEq)]
pub enum RoutingStrategy {
    /// Route to the best matching vendor for the agent
    BestMatch,
    /// Route to a specific vendor
    Direct(String),
    /// Round-robin across healthy instances
    RoundRobin,
    /// Route to the lowest latency instance
    LeastLatency,
    /// Broadcast to all vendors and return first response
    RaceFirst,
    /// Broadcast to all vendors and aggregate responses
    Fanout,
}

impl From<&str> for RoutingStrategy {
    fn from(s: &str) -> Self {
        match s {
            "direct" => RoutingStrategy::Direct(String::new()),
            "round-robin" => RoutingStrategy::RoundRobin,
            "least-latency" => RoutingStrategy::LeastLatency,
            "race-first" => RoutingStrategy::RaceFirst,
            "fanout" => RoutingStrategy::Fanout,
            _ => RoutingStrategy::BestMatch,
        }
    }
}

/// Run record for tracking execution history
#[derive(Debug, Clone)]
pub struct RunRecord {
    pub id: String,
    pub agent_id: String,
    pub vendor: String,
    pub status: RunStatus,
    pub started_at: Instant,
    pub completed_at: Option<Instant>,
    pub trace_id: Option<String>,
}

/// ACP Gateway manages agent routing, dispatch, and health
pub struct AcpGateway {
    agents: Arc<Mutex<HashMap<String, AcpAgent>>>,
    health: Arc<Mutex<HashMap<String, AgentHealth>>>,
    runs: Arc<Mutex<Vec<RunRecord>>>,
    round_robin_counter: Arc<Mutex<usize>>,
}

impl AcpGateway {
    pub fn new() -> Self {
        Self {
            agents: Arc::new(Mutex::new(HashMap::new())),
            health: Arc::new(Mutex::new(HashMap::new())),
            runs: Arc::new(Mutex::new(Vec::new())),
            round_robin_counter: Arc::new(Mutex::new(0)),
        }
    }

    pub fn register_agent(&self, agent: AcpAgent) {
        let id = agent.id.clone();
        info!(agent_id = %id, "Registering agent");
        let mut agents = self.agents.lock().unwrap();
        agents.insert(id.clone(), agent);

        let mut health = self.health.lock().unwrap();
        health.insert(
            id,
            AgentHealth {
                healthy: true,
                last_check: Instant::now(),
                consecutive_failures: 0,
                latency_ms: None,
            },
        );
    }

    pub fn unregister_agent(&self, id: &str) {
        info!(agent_id = %id, "Unregistering agent");
        let mut agents = self.agents.lock().unwrap();
        agents.remove(id);
        let mut health = self.health.lock().unwrap();
        health.remove(id);
    }

    pub fn list_agents(&self) -> Vec<AcpAgent> {
        let agents = self.agents.lock().unwrap();
        agents.values().cloned().collect()
    }

    pub fn get_agent(&self, id: &str) -> Option<AcpAgent> {
        let agents = self.agents.lock().unwrap();
        agents.get(id).cloned()
    }

    pub fn get_health(&self, agent_id: &str) -> Option<AgentHealth> {
        let health = self.health.lock().unwrap();
        health.get(agent_id).cloned()
    }

    pub fn get_all_health(&self) -> HashMap<String, AgentHealth> {
        let health = self.health.lock().unwrap();
        health.clone()
    }

    pub fn mark_healthy(&self, agent_id: &str, latency_ms: u64) {
        let mut health = self.health.lock().unwrap();
        if let Some(h) = health.get_mut(agent_id) {
            h.healthy = true;
            h.last_check = Instant::now();
            h.consecutive_failures = 0;
            h.latency_ms = Some(latency_ms);
        }
    }

    pub fn mark_unhealthy(&self, agent_id: &str) {
        let mut health = self.health.lock().unwrap();
        if let Some(h) = health.get_mut(agent_id) {
            h.consecutive_failures += 1;
            h.last_check = Instant::now();
            if h.consecutive_failures >= 3 {
                h.healthy = false;
                warn!(agent_id = %agent_id, failures = h.consecutive_failures, "Agent marked unhealthy");
            }
        }
    }

    /// Select the target agent based on routing strategy
    fn select_target(&self, request: &RunRequest) -> Option<AcpAgent> {
        let strategy = RoutingStrategy::from(request.strategy.as_str());
        let agents = self.agents.lock().unwrap();
        let health = self.health.lock().unwrap();

        // Filter to healthy agents matching the request
        let candidates: Vec<&AcpAgent> = agents
            .values()
            .filter(|a| {
                // Match by agent name
                if a.name != request.agent && a.id != request.agent {
                    return false;
                }
                // Filter by vendor if specified
                if let Some(ref v) = request.vendor {
                    if a.vendor.as_deref() != Some(v.as_str()) {
                        return false;
                    }
                }
                // Filter by health
                health
                    .get(&a.id)
                    .map(|h| h.healthy)
                    .unwrap_or(false)
            })
            .collect();

        if candidates.is_empty() {
            return None;
        }

        match strategy {
            RoutingStrategy::BestMatch => {
                // Prefer lowest latency among healthy candidates
                candidates
                    .into_iter()
                    .min_by_key(|a| {
                        health
                            .get(&a.id)
                            .and_then(|h| h.latency_ms)
                            .unwrap_or(u64::MAX)
                    })
                    .cloned()
            }
            RoutingStrategy::Direct(ref vendor) => {
                let fallback = candidates[0].clone();
                candidates
                    .into_iter()
                    .find(|a| a.vendor.as_deref() == Some(vendor.as_str()))
                    .cloned()
                    .or(Some(fallback))
            }
            RoutingStrategy::RoundRobin => {
                let mut counter = self.round_robin_counter.lock().unwrap();
                let idx = *counter % candidates.len();
                *counter = counter.wrapping_add(1);
                Some(candidates[idx].clone())
            }
            RoutingStrategy::LeastLatency => candidates
                .into_iter()
                .min_by_key(|a| {
                    health
                        .get(&a.id)
                        .and_then(|h| h.latency_ms)
                        .unwrap_or(u64::MAX)
                })
                .cloned(),
            RoutingStrategy::RaceFirst | RoutingStrategy::Fanout => {
                // For race/fanout, return the first candidate; actual parallel
                // dispatch would be handled at a higher level
                candidates.first().cloned().cloned()
            }
        }
    }

    /// Dispatch a run request to the appropriate agent
    pub async fn dispatch(&self, request: RunRequest) -> RunResponse {
        let start = Instant::now();
        let trace_id = request.options.trace_id.clone();

        let target = match self.select_target(&request) {
            Some(t) => t,
            None => {
                warn!(agent = %request.agent, "No healthy agent found for dispatch");
                return RunResponse {
                    id: uuid::Uuid::new_v4().to_string(),
                    status: RunStatus::Failed,
                    output: None,
                    created_at: chrono::Utc::now(),
                    completed_at: Some(chrono::Utc::now()),
                    error: Some(format!(
                        "No healthy agent found matching '{}'",
                        request.agent
                    )),
                };
            }
        };

        info!(
            agent = %target.id,
            vendor = ?target.vendor,
            strategy = %request.strategy,
            "Dispatching run request"
        );

        let run_id = uuid::Uuid::new_v4().to_string();

        // Record the run
        {
            let mut runs = self.runs.lock().unwrap();
            runs.push(RunRecord {
                id: run_id.clone(),
                agent_id: target.id.clone(),
                vendor: target.vendor.clone().unwrap_or_default(),
                status: RunStatus::Running,
                started_at: start,
                completed_at: None,
                trace_id: trace_id.clone(),
            });
        }

        // Simulate processing (in production, this would call the vendor API)
        let elapsed = start.elapsed();
        self.mark_healthy(&target.id, elapsed.as_millis() as u64);

        // Mark run completed
        {
            let mut runs = self.runs.lock().unwrap();
            if let Some(run) = runs.iter_mut().find(|r| r.id == run_id) {
                run.status = RunStatus::Completed;
                run.completed_at = Some(Instant::now());
            }
        }

        let vendor_name = target.vendor.clone().unwrap_or_else(|| "unknown".to_string());
        RunResponse {
            id: run_id,
            status: RunStatus::Completed,
            output: Some(RunOutput {
                messages: vec![Message {
                    role: "assistant".to_string(),
                    content: format!(
                        "Dispatched to agent '{}' (vendor: {})",
                        target.name, vendor_name
                    ),
                }],
                metadata: Some(serde_json::json!({
                    "vendor": vendor_name,
                    "latency_ms": elapsed.as_millis() as u64,
                    "trace_id": trace_id,
                })),
            }),
            created_at: chrono::Utc::now(),
            completed_at: Some(chrono::Utc::now()),
            error: None,
        }
    }

    /// Get run history
    pub fn get_runs(&self, limit: usize) -> Vec<RunRecord> {
        let runs = self.runs.lock().unwrap();
        runs.iter().rev().take(limit).cloned().collect()
    }

    /// Perform health check on all agents (marks stale agents unhealthy)
    pub fn health_check(&self, stale_threshold: Duration) {
        let mut health = self.health.lock().unwrap();
        let now = Instant::now();
        for (id, h) in health.iter_mut() {
            if now.duration_since(h.last_check) > stale_threshold {
                h.healthy = false;
                warn!(agent_id = %id, "Agent marked unhealthy (stale)");
            }
        }
    }
}

impl Default for AcpGateway {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_agent(id: &str, name: &str, vendor: &str) -> AcpAgent {
        AcpAgent {
            id: id.to_string(),
            name: name.to_string(),
            description: None,
            vendor: Some(vendor.to_string()),
            capabilities: vec!["chat".to_string()],
        }
    }

    #[test]
    fn test_register_and_list() {
        let gw = AcpGateway::new();
        gw.register_agent(make_agent("a1", "coder", "codex"));
        gw.register_agent(make_agent("a2", "coder", "claude"));
        assert_eq!(gw.list_agents().len(), 2);
    }

    #[test]
    fn test_health_tracking() {
        let gw = AcpGateway::new();
        gw.register_agent(make_agent("a1", "coder", "codex"));
        gw.mark_healthy("a1", 50);
        let h = gw.get_health("a1").unwrap();
        assert!(h.healthy);
        assert_eq!(h.latency_ms, Some(50));
    }

    #[test]
    fn test_unhealthy_after_failures() {
        let gw = AcpGateway::new();
        gw.register_agent(make_agent("a1", "coder", "codex"));
        gw.mark_unhealthy("a1");
        gw.mark_unhealthy("a1");
        assert!(gw.get_health("a1").unwrap().healthy); // still healthy at 2
        gw.mark_unhealthy("a1");
        assert!(!gw.get_health("a1").unwrap().healthy); // unhealthy at 3
    }

    #[tokio::test]
    async fn test_dispatch_best_match() {
        let gw = AcpGateway::new();
        gw.register_agent(make_agent("a1", "coder", "codex"));
        gw.mark_healthy("a1", 20);

        let req = RunRequest {
            agent: "coder".to_string(),
            vendor: None,
            strategy: "best-match".to_string(),
            input: RunInput {
                messages: vec![Message {
                    role: "user".to_string(),
                    content: "hello".to_string(),
                }],
                context: None,
            },
            options: RunOptions::default(),
        };
        let resp = gw.dispatch(req).await;
        assert_eq!(resp.status, RunStatus::Completed);
        assert!(resp.output.is_some());
    }

    #[tokio::test]
    async fn test_dispatch_no_healthy_agent() {
        let gw = AcpGateway::new();
        let req = RunRequest {
            agent: "nonexistent".to_string(),
            vendor: None,
            strategy: "best-match".to_string(),
            input: RunInput {
                messages: vec![],
                context: None,
            },
            options: RunOptions::default(),
        };
        let resp = gw.dispatch(req).await;
        assert_eq!(resp.status, RunStatus::Failed);
        assert!(resp.error.is_some());
    }

    #[test]
    fn test_round_robin() {
        let gw = AcpGateway::new();
        gw.register_agent(make_agent("a1", "coder", "codex"));
        gw.register_agent(make_agent("a2", "coder", "claude"));

        let req = RunRequest {
            agent: "coder".to_string(),
            vendor: None,
            strategy: "round-robin".to_string(),
            input: RunInput {
                messages: vec![],
                context: None,
            },
            options: RunOptions::default(),
        };

        let t1 = gw.select_target(&req);
        let t2 = gw.select_target(&req);
        // Two consecutive calls should give different targets
        assert!(t1.is_some());
        assert!(t2.is_some());
    }
}
