use jsonwebtoken::{
    decode, encode,
    errors::{new_error, Error, ErrorKind},
    DecodingKey, EncodingKey, Header, Validation,
};
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

const MIN_SECRET_BYTES: usize = 32;

/// Fail fast at startup when the JWT secrets are missing or too weak, instead of
/// signing and verifying tokens with a predictable fallback. The previous
/// `"secret"` / `"refresh-secret"` defaults let anyone forge a token for any
/// user id (see `docker/compose/rust-api.yml`, which set neither variable).
pub fn validate_jwt_secrets() {
    if let Err(error) = jwt_secret() {
        panic!("JWT_SECRET must be set to at least 32 characters: {error}");
    }
    if let Err(error) = refresh_secret() {
        panic!("JWT_REFRESH_SECRET must be set to at least 32 characters: {error}");
    }
}

fn jwt_secret() -> Result<String, Error> {
    checked_secret("JWT_SECRET", env::var("JWT_SECRET").ok())
}

fn refresh_secret() -> Result<String, Error> {
    checked_secret("JWT_REFRESH_SECRET", env::var("JWT_REFRESH_SECRET").ok())
}

fn checked_secret(name: &str, value: Option<String>) -> Result<String, Error> {
    let secret = value.ok_or_else(|| new_error(ErrorKind::InvalidKeyFormat))?;
    if secret.trim().len() < MIN_SECRET_BYTES {
        // `name` is only for the startup validator's panic message context; the
        // runtime error deliberately does not echo configuration details.
        let _ = name;
        return Err(new_error(ErrorKind::InvalidKeyFormat));
    }
    Ok(secret)
}

fn is_strong_secret(value: &str) -> bool {
    value.trim().len() >= MIN_SECRET_BYTES
}

pub fn sign_access_token(user_id: &str, session_id: &str) -> Result<String, Error> {
    let secret = jwt_secret()?;
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
    let secret = refresh_secret()?;
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
    let secret = jwt_secret()?;
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
    let secret = refresh_secret()?;
    let mut validation = Validation::default();
    validation.validate_exp = true;

    let token_data = decode::<RefreshPayload>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )?;

    Ok(token_data.claims)
}

#[cfg(test)]
mod tests {
    use super::{checked_secret, is_strong_secret};
    use jsonwebtoken::errors::ErrorKind;

    #[test]
    fn rejects_missing_secret() {
        let error = checked_secret("JWT_SECRET", None).expect_err("missing secret must fail");
        assert_eq!(*error.kind(), ErrorKind::InvalidKeyFormat);
    }

    #[test]
    fn rejects_short_and_known_default_secrets() {
        for weak in ["secret", "refresh-secret", "a".repeat(31).as_str(), " "] {
            assert!(
                checked_secret("JWT_SECRET", Some(weak.to_string())).is_err(),
                "weak secret {weak:?} must be rejected"
            );
            assert!(!is_strong_secret(weak));
        }
    }

    #[test]
    fn accepts_long_secret() {
        let strong = "a".repeat(32);
        assert!(is_strong_secret(&strong));
        assert!(checked_secret("JWT_SECRET", Some(strong.clone())).is_ok());
        assert!(checked_secret("JWT_REFRESH_SECRET", Some("x".repeat(64))).is_ok());
    }
}
