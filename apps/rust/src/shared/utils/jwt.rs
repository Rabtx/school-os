use jsonwebtoken::{decode, encode, errors::Error, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::env;

/// Development may use a known default so `cargo run` works without setup.
/// Production must provide real secrets — the guards below refuse to start otherwise.
const DEV_ACCESS_SECRET: &str = "development-only-rust-jwt-secret-change-me";
const DEV_REFRESH_SECRET: &str = "development-only-rust-refresh-secret-change-me";
const PRODUCTION_ENV: &str = "production";

/// Values that must never serve as real secrets in production: the development
/// fallbacks, the old hardcoded fallbacks this service used to ship, and the
/// placeholder committed in `env.docker.example`.
const KNOWN_WEAK_SECRETS: [&str; 5] = [
    DEV_ACCESS_SECRET,
    DEV_REFRESH_SECRET,
    "secret",
    "refresh-secret",
    "development-only-jwt-secret-change-me-now",
];

fn access_secret() -> String {
    secret_from_env("JWT_SECRET", DEV_ACCESS_SECRET)
}

fn refresh_secret() -> String {
    secret_from_env("JWT_REFRESH_SECRET", DEV_REFRESH_SECRET)
}

fn secret_from_env(name: &str, development_fallback: &str) -> String {
    match env::var(name) {
        Ok(secret) if !secret.trim().is_empty() => secret,
        _ => {
            if is_production() {
                panic!("{name} must be set to a real secret in production");
            }
            development_fallback.to_string()
        }
    }
}

fn is_production() -> bool {
    env::var("NODE_ENV").as_deref() == Ok(PRODUCTION_ENV)
}

/// Fail fast at boot so a misconfigured production deployment never serves
/// traffic signed or verified with a development or example-file secret.
pub fn assert_jwt_secrets_configured() {
    if !is_production() {
        return;
    }
    for (name, value) in [
        ("JWT_SECRET", access_secret()),
        ("JWT_REFRESH_SECRET", refresh_secret()),
    ] {
        if KNOWN_WEAK_SECRETS.contains(&value.as_str()) {
            panic!(
                "{name} must be changed from its known development or example value in production"
            );
        }
    }
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
    let secret = access_secret();
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
    let secret = refresh_secret();
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
    let secret = access_secret();
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
    let secret = refresh_secret();
    let mut validation = Validation::default();
    validation.validate_exp = true;

    let token_data = decode::<RefreshPayload>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )?;

    Ok(token_data.claims)
}
