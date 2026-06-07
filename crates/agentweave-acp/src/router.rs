use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use std::sync::Arc;

use crate::gateway::AcpGateway;
use crate::models::*;

pub fn create_router(gateway: Arc<AcpGateway>) -> Router {
    Router::new()
        .route("/ping", get(ping))
        .route("/agents", get(list_agents).post(register_agent))
        .route("/agents/{id}", get(get_agent).delete(delete_agent))
        .route("/agents/{id}/health", get(get_agent_health))
        .route("/health", get(get_all_health))
        .route("/runs", post(create_run))
        .route("/runs/history", get(get_run_history))
        .with_state(gateway)
}

async fn ping() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "service": "agentweave-acp",
        "version": env!("CARGO_PKG_VERSION"),
        "capabilities": ["dispatch", "health-check", "routing", "tracing"]
    }))
}

async fn list_agents(State(gateway): State<Arc<AcpGateway>>) -> Json<Vec<AcpAgent>> {
    Json(gateway.list_agents())
}

async fn register_agent(
    State(gateway): State<Arc<AcpGateway>>,
    Json(agent): Json<AcpAgent>,
) -> (StatusCode, Json<serde_json::Value>) {
    let id = agent.id.clone();
    gateway.register_agent(agent);
    (
        StatusCode::CREATED,
        Json(serde_json::json!({ "registered": id })),
    )
}

async fn get_agent(
    State(gateway): State<Arc<AcpGateway>>,
    Path(id): Path<String>,
) -> Result<Json<AcpAgent>, StatusCode> {
    gateway
        .get_agent(&id)
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

async fn delete_agent(
    State(gateway): State<Arc<AcpGateway>>,
    Path(id): Path<String>,
) -> StatusCode {
    gateway.unregister_agent(&id);
    StatusCode::NO_CONTENT
}

async fn get_agent_health(
    State(gateway): State<Arc<AcpGateway>>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    gateway
        .get_health(&id)
        .map(|h| {
            Json(serde_json::json!({
                "agent_id": id,
                "healthy": h.healthy,
                "consecutive_failures": h.consecutive_failures,
                "latency_ms": h.latency_ms,
            }))
        })
        .ok_or(StatusCode::NOT_FOUND)
}

async fn get_all_health(
    State(gateway): State<Arc<AcpGateway>>,
) -> Json<serde_json::Value> {
    let all = gateway.get_all_health();
    let entries: Vec<serde_json::Value> = all
        .iter()
        .map(|(id, h)| {
            serde_json::json!({
                "agent_id": id,
                "healthy": h.healthy,
                "consecutive_failures": h.consecutive_failures,
                "latency_ms": h.latency_ms,
            })
        })
        .collect();
    Json(serde_json::json!({ "agents": entries }))
}

async fn create_run(
    State(gateway): State<Arc<AcpGateway>>,
    Json(request): Json<RunRequest>,
) -> (StatusCode, Json<RunResponse>) {
    let response = gateway.dispatch(request).await;
    let status = if response.error.is_some() {
        StatusCode::SERVICE_UNAVAILABLE
    } else {
        StatusCode::CREATED
    };
    (status, Json(response))
}

async fn get_run_history(
    State(gateway): State<Arc<AcpGateway>>,
) -> Json<serde_json::Value> {
    let runs = gateway.get_runs(50);
    let entries: Vec<serde_json::Value> = runs
        .iter()
        .map(|r| {
            serde_json::json!({
                "id": r.id,
                "agent_id": r.agent_id,
                "vendor": r.vendor,
                "status": r.status,
                "trace_id": r.trace_id,
            })
        })
        .collect();
    Json(serde_json::json!({ "runs": entries }))
}
