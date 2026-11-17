use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SafeUser {
    pub id: String,
    pub name: String,
    pub email: String,
    pub is_email_verified: bool,
    pub enable_2fa: bool,
    pub email_notification: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionDto {
    pub id: String,
    pub user_id: String,
    pub user_agent: String,
    pub expired_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterInput {
    pub name: String,
    pub email: String,
    pub password: String,
}

impl RegisterInput {
    /// Boundary validation so this API cannot create accounts the rest of the system
    /// would reject (the Nest API enforces the same password rule on its DTOs).
    pub fn validate(&self) -> Result<(), String> {
        if self.name.trim().is_empty() {
            return Err("Name is required".to_string());
        }

        let email = self.email.trim();
        let looks_like_email = match email.split_once('@') {
            Some((local, domain)) => {
                !local.is_empty() && !domain.is_empty() && !domain.contains([' ', '@'])
            }
            None => false,
        };
        if !looks_like_email {
            return Err("A valid email is required".to_string());
        }

        if self.password.chars().count() < 12 {
            return Err("Password must be at least 12 characters".to_string());
        }

        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub struct LoginInput {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct VerifyEmailInput {
    pub code: String,
}

#[derive(Debug, Deserialize)]
pub struct ForgotPasswordInput {
    pub email: String,
}

#[derive(Debug, Deserialize)]
pub struct ResetPasswordInput {
    pub code: String,
    pub new_password: String,
}

#[derive(Debug, Deserialize)]
pub struct Enable2FAInput {
    pub code: String,
    pub secret: String,
}

#[derive(Debug, Deserialize)]
pub struct Disable2FAInput {
    pub password: String,
}
