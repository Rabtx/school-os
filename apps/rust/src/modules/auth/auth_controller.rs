use super::auth_service::AuthService;
use super::auth_validator::{LoginInput, RegisterInput};
use crate::shared::middlewares::jwt_middleware::AuthContext;
use axum::{
    extract::{Extension, State},
    http::{header, HeaderMap},
    Json,
};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use serde_json::{json, Value};
use sqlx::PgPool;
use time::Duration;

pub async fn register(State(pool): State<PgPool>, Json(input): Json<RegisterInput>) -> Json<Value> {
    match AuthService::register(&pool, input).await {
        Ok(user) => Json(
            json!({ "success": true, "code": 201, "message": "User registered successfully", "data": { "user": user } }),
        ),
        Err(e) => Json(json!({ "success": false, "code": 400, "message": e })),
    }
}

pub async fn login(
    State(pool): State<PgPool>,
    jar: CookieJar,
    headers: HeaderMap,
    Json(input): Json<LoginInput>,
) -> (CookieJar, Json<Value>) {
    let user_agent = headers
        .get(header::USER_AGENT)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string();

    match AuthService::login(&pool, input, &user_agent).await {
        Ok((user, access, refresh)) => {
            let access_cookie = Cookie::build(("accessToken", access))
                .http_only(true)
                .secure(true)
                .same_site(SameSite::Lax)
                .path("/")
                .max_age(Duration::hours(1))
                .build();

            let refresh_cookie = Cookie::build(("refreshToken", refresh))
                .http_only(true)
                .secure(true)
                .same_site(SameSite::Lax)
                .path("/auth/refresh")
                .max_age(Duration::days(30))
                .build();

            let jar = jar.add(access_cookie).add(refresh_cookie);
            (
                jar,
                Json(
                    json!({ "success": true, "code": 200, "message": "Login successful", "data": { "user": user, "mfaRequired": false } }),
                ),
            )
        }
        Err(e) => (
            jar,
            Json(json!({ "success": false, "code": 401, "message": e })),
        ),
    }
}

pub async fn me(
    State(pool): State<PgPool>,
    Extension(auth): Extension<AuthContext>,
) -> Json<Value> {
    match AuthService::me(&pool, &auth.user_id).await {
        Ok(user) => Json(
            json!({ "success": true, "code": 200, "message": "User fetched successfully", "data": { "user": user } }),
        ),
        Err(_) => Json(json!({ "success": false, "code": 404, "message": "User not found" })),
    }
}

pub async fn logout(
    State(pool): State<PgPool>,
    jar: CookieJar,
    Extension(auth): Extension<AuthContext>,
) -> (CookieJar, Json<Value>) {
    if let Err(error) = AuthService::logout(&pool, &auth.session_id).await {
        // Cookies are cleared either way; a failed delete only leaves the session row
        // until expiry. Record it instead of failing the client's logout.
        eprintln!("logout failed for session {}: {error}", auth.session_id);
    }

    let access_cookie = Cookie::build(("accessToken", ""))
        .path("/")
        .max_age(Duration::ZERO)
        .build();
    let refresh_cookie = Cookie::build(("refreshToken", ""))
        .path("/auth/refresh")
        .max_age(Duration::ZERO)
        .build();

    let jar = jar.add(access_cookie).add(refresh_cookie);
    (
        jar,
        Json(json!({ "success": true, "code": 200, "message": "Logout successful" })),
    )
}

pub async fn get_sessions(
    State(pool): State<PgPool>,
    Extension(auth): Extension<AuthContext>,
) -> Json<Value> {
    match AuthService::get_sessions(&pool, &auth.user_id).await {
        Ok(sessions) => Json(
            json!({ "success": true, "code": 200, "message": "Sessions fetched successfully", "data": sessions }),
        ),
        Err(_) => {
            Json(json!({ "success": false, "code": 500, "message": "Failed to fetch sessions" }))
        }
    }
}
