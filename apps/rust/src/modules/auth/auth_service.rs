use super::auth_validator::{LoginInput, RegisterInput, SafeUser, SessionDto};
use crate::shared::utils::jwt::{sign_access_token, sign_refresh_token};
use crate::shared::utils::password::{hash_password, verify_password};
use chrono::{DateTime, Utc};
use sha2::{Digest, Sha256};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

pub struct AuthService;

#[derive(Debug, FromRow)]
struct UserRow {
    id: Uuid,
    username: String,
    email: String,
    password_hash: Option<String>,
    email_verified_at: Option<DateTime<Utc>>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
struct SessionRow {
    id: Uuid,
    user_id: Uuid,
    user_agent: Option<String>,
    expires_at: DateTime<Utc>,
    created_at: DateTime<Utc>,
}

impl AuthService {
    pub async fn register(pool: &PgPool, input: RegisterInput) -> Result<SafeUser, String> {
        let hashed = hash_password(&input.password).map_err(|e| e.to_string())?;
        let user_id = Uuid::new_v4();

        let row: UserRow = sqlx::query_as(
            r#"
			INSERT INTO users (id, username, email, password_hash, is_active, created_at, updated_at)
			VALUES ($1, $2, $3, $4, true, NOW(), NOW())
			RETURNING id, username, email, password_hash, email_verified_at, created_at, updated_at
			"#,
        )
        .bind(user_id)
        .bind(&input.name)
        .bind(input.email.trim())
        .bind(&hashed)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(SafeUser {
            id: row.id.to_string(),
            name: row.username,
            email: row.email,
            is_email_verified: row.email_verified_at.is_some(),
            enable_2fa: false,
            email_notification: true,
            created_at: row.created_at,
            updated_at: row.updated_at,
        })
    }

    pub async fn login(
        pool: &PgPool,
        input: LoginInput,
        user_agent: &str,
    ) -> Result<(SafeUser, String, String), String> {
        let row: Option<UserRow> = sqlx::query_as(
            r#"
			SELECT id, username, email, password_hash, email_verified_at, created_at, updated_at
			FROM users WHERE email = $1
			"#,
        )
        .bind(input.email.trim())
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

        let user = row.ok_or_else(|| "Invalid email or password".to_string())?;

        let password_hash = user
            .password_hash
            .as_deref()
            .ok_or_else(|| "Password not set".to_string())?;

        let is_valid = verify_password(&input.password, password_hash).unwrap_or(false);
        if !is_valid {
            return Err("Invalid email or password".to_string());
        }

        let session_id = Uuid::new_v4();
        let user_id_str = user.id.to_string();
        let session_id_str = session_id.to_string();

        let access_token = sign_access_token(&user_id_str, &session_id_str)
            .map_err(|_| "Token error".to_string())?;
        let refresh_token =
            sign_refresh_token(&session_id_str).map_err(|_| "Token error".to_string())?;

        let mut hasher = Sha256::new();
        hasher.update(refresh_token.as_bytes());
        let refresh_token_hash = format!("{:x}", hasher.finalize());

        sqlx::query(
            r#"
			INSERT INTO sessions (id, user_id, refresh_token_hash, user_agent, expires_at, created_at)
			VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 days', NOW())
			"#,
        )
        .bind(session_id)
        .bind(user.id)
        .bind(refresh_token_hash)
        .bind(user_agent)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

        let safe_user = SafeUser {
            id: user.id.to_string(),
            name: user.username,
            email: user.email,
            is_email_verified: user.email_verified_at.is_some(),
            enable_2fa: false,
            email_notification: true,
            created_at: user.created_at,
            updated_at: user.updated_at,
        };

        Ok((safe_user, access_token, refresh_token))
    }

    pub async fn me(pool: &PgPool, user_id: &str) -> Result<SafeUser, String> {
        let user_uuid = Uuid::parse_str(user_id).map_err(|e| e.to_string())?;

        let row: Option<UserRow> = sqlx::query_as(
            r#"
			SELECT id, username, email, password_hash, email_verified_at, created_at, updated_at
			FROM users WHERE id = $1
			"#,
        )
        .bind(user_uuid)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

        let user = row.ok_or_else(|| "User not found".to_string())?;

        Ok(SafeUser {
            id: user.id.to_string(),
            name: user.username,
            email: user.email,
            is_email_verified: user.email_verified_at.is_some(),
            enable_2fa: false,
            email_notification: true,
            created_at: user.created_at,
            updated_at: user.updated_at,
        })
    }

    pub async fn logout(pool: &PgPool, session_id: &str) -> Result<(), String> {
        let session_uuid = Uuid::parse_str(session_id).map_err(|e| e.to_string())?;

        sqlx::query(
            r#"
			DELETE FROM sessions WHERE id = $1
			"#,
        )
        .bind(session_uuid)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn get_sessions(pool: &PgPool, user_id: &str) -> Result<Vec<SessionDto>, String> {
        let user_uuid = Uuid::parse_str(user_id).map_err(|e| e.to_string())?;

        let rows: Vec<SessionRow> = sqlx::query_as(
            r#"
			SELECT id, user_id, user_agent, expires_at, created_at
			FROM sessions WHERE user_id = $1 ORDER BY created_at DESC
			"#,
        )
        .bind(user_uuid)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(rows
            .into_iter()
            .map(|r| SessionDto {
                id: r.id.to_string(),
                user_id: r.user_id.to_string(),
                user_agent: r.user_agent.unwrap_or_default(),
                expired_at: r.expires_at,
                created_at: r.created_at,
            })
            .collect())
    }
}
