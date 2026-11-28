use super::auth_controller::{get_sessions, login, logout, me, register};
use crate::shared::middlewares::jwt_middleware::require_jwt;
use axum::middleware;
use axum::{
    routing::{get, post},
    Router,
};
use sqlx::PgPool;

pub fn routes(pool: PgPool) -> Router {
    let public_routes = Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .with_state(pool.clone());

    let protected_routes = Router::new()
        .route("/me", get(me))
        .route("/logout", post(logout))
        .route("/sessions", get(get_sessions))
        .route_layer(middleware::from_fn_with_state(pool.clone(), require_jwt))
        .with_state(pool);

    Router::new().merge(public_routes).merge(protected_routes)
}
