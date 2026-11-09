use jsonwebtoken::{decode, encode, errors::Error, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::env;

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

fn required_secret(env_name: &str) -> String {
    match env::var(env_name) {
        Ok(secret) if !secret.trim().is_empty() => secret,
        _ => panic!("{env_name} must be set"),
    }
}

pub fn sign_access_token(user_id: &str, session_id: &str) -> Result<String, Error> {
    let secret = required_secret("JWT_SECRET");
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
    let secret = required_secret("JWT_REFRESH_SECRET");
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
    let secret = required_secret("JWT_SECRET");
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
    let secret = required_secret("JWT_REFRESH_SECRET");
    let mut validation = Validation::default();
    validation.validate_exp = true;

    let token_data = decode::<RefreshPayload>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )?;

    Ok(token_data.claims)
}
