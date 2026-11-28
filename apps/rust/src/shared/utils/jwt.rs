use jsonwebtoken::{decode, encode, errors::Error, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::env;

// Clearly-marked development fallbacks, mirroring the Nest API's env schema. They are refused
// at startup in production so no deployment can silently sign tokens with a known secret.
const DEV_JWT_SECRET: &str = "development-only-jwt-secret-change-me";
const DEV_JWT_REFRESH_SECRET: &str = "development-only-jwt-refresh-secret-change-me";

/// Values that must never sign production tokens: the in-code dev fallbacks, the
/// env.docker.example placeholder and the historical hardcoded defaults.
const KNOWN_PLACEHOLDER_SECRETS: &[&str] = &[
    DEV_JWT_SECRET,
    DEV_JWT_REFRESH_SECRET,
    "development-only-jwt-secret-change-me-now",
    "secret",
    "refresh-secret",
];

fn is_production() -> bool {
    env::var("NODE_ENV").is_ok_and(|value| value.eq_ignore_ascii_case("production"))
}

/// Fail fast at startup instead of silently signing tokens with a known default secret.
/// Applies the project's documented production rule: secrets are 32+ characters and never
/// a publicly known placeholder.
pub fn ensure_jwt_secrets_configured() {
    for var_name in ["JWT_SECRET", "JWT_REFRESH_SECRET"] {
        match env::var(var_name) {
            Ok(secret) if !secret.trim().is_empty() => {
                if is_production() && secret.len() < 32 {
                    panic!("{var_name} must be at least 32 characters in production");
                }
                if is_production() && KNOWN_PLACEHOLDER_SECRETS.contains(&secret.as_str()) {
                    panic!("{var_name} is still a known development placeholder; generate a real secret in production");
                }
            }
            _ if is_production() => panic!("{var_name} must be set in production"),
            _ => {}
        }
    }
}

fn jwt_secret(var_name: &str, dev_default: &str) -> String {
    env::var(var_name)
        .ok()
        .filter(|secret| !secret.trim().is_empty())
        .unwrap_or_else(|| dev_default.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AccessPayload {
    pub user_id: String,
    pub session_id: String,
    pub exp: usize,
    pub iat: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshPayload {
    pub session_id: String,
    pub exp: usize,
    pub iat: usize,
}

pub fn sign_access_token(user_id: &str, session_id: &str) -> Result<String, Error> {
    let secret = jwt_secret("JWT_SECRET", DEV_JWT_SECRET);
    let exp = chrono::Utc::now().timestamp() as usize + 3600; // 1 hour
    let iat = chrono::Utc::now().timestamp() as usize;

    let payload = AccessPayload {
        user_id: user_id.to_string(),
        session_id: session_id.to_string(),
        exp,
        iat,
    };

    encode(
        &Header::default(),
        &payload,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

pub fn sign_refresh_token(session_id: &str) -> Result<String, Error> {
    let secret = jwt_secret("JWT_REFRESH_SECRET", DEV_JWT_REFRESH_SECRET);
    let exp = chrono::Utc::now().timestamp() as usize + 2592000; // 30 days
    let iat = chrono::Utc::now().timestamp() as usize;

    let payload = RefreshPayload {
        session_id: session_id.to_string(),
        exp,
        iat,
    };

    encode(
        &Header::default(),
        &payload,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

pub fn verify_access_token(token: &str) -> Result<AccessPayload, Error> {
    let secret = jwt_secret("JWT_SECRET", DEV_JWT_SECRET);
    let mut validation = Validation::default();
    validation.validate_exp = true;

    let token_data = decode::<AccessPayload>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )?;

    Ok(token_data.claims)
}

pub fn verify_refresh_token(token: &str) -> Result<RefreshPayload, Error> {
    let secret = jwt_secret("JWT_REFRESH_SECRET", DEV_JWT_REFRESH_SECRET);
    let mut validation = Validation::default();
    validation.validate_exp = true;

    let token_data = decode::<RefreshPayload>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )?;

    Ok(token_data.claims)
}
