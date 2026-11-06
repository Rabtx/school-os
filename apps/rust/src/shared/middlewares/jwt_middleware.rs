use crate::shared::utils::jwt::verify_access_token;
use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::Response,
};
use axum_extra::extract::CookieJar;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct AuthContext {
    pub user_id: String,
    pub session_id: String,
}

pub async fn require_jwt(
    State(pool): State<PgPool>,
    jar: CookieJar,
    mut req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let token = jar
        .get("accessToken")
        .map(|c| c.value().to_string())
        .or_else(|| {
            req.headers()
                .get(header::AUTHORIZATION)
                .and_then(|h| h.to_str().ok())
                .and_then(|s| s.strip_prefix("Bearer ").map(|s| s.to_string()))
        });

    let Some(token) = token else {
        return Err(StatusCode::UNAUTHORIZED);
    };
    let Ok(claims) = verify_access_token(&token) else {
        return Err(StatusCode::UNAUTHORIZED);
    };
    if !is_session_active(&pool, &claims.user_id, &claims.session_id).await {
        return Err(StatusCode::UNAUTHORIZED);
    }
    req.extensions_mut().insert(AuthContext {
        user_id: claims.user_id,
        session_id: claims.session_id,
    });
    Ok(next.run(req).await)
}

/// A token is only valid while its session row exists, is unexpired, and the
/// account is still active. Without this, logout (which deletes the row) and
/// deactivation would leave already-issued access tokens working until expiry.
async fn is_session_active(pool: &PgPool, user_id: &str, session_id: &str) -> bool {
    let (Ok(user_uuid), Ok(session_uuid)) = (Uuid::parse_str(user_id), Uuid::parse_str(session_id))
    else {
        return false;
    };
    let active: Option<bool> = sqlx::query_scalar(
        r#"
        SELECT u.is_active
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.id = $1 AND s.user_id = $2 AND s.expires_at > NOW()
        "#,
    )
    .bind(session_uuid)
    .bind(user_uuid)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();
    active.unwrap_or(false)
}
