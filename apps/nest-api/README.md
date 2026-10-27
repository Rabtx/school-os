# Starter API

Production-oriented NestJS authentication and user foundation backed by PostgreSQL, Drizzle ORM,
Zod validation, secure cookies, and explicit SQL migrations.

## Included

- Account registration with email verification OTP
- Login protection with failed-attempt lockout
- Short-lived JWT access tokens
- Rotating, hashed refresh tokens in HttpOnly cookies
- Session listing, single-session revocation, logout, and logout-all
- Forgot/reset password OTP flow
- Authenticated password changes that revoke other sessions
- TOTP two-factor authentication with one-time recovery codes
- Passwordless magic-link sign in
- Passkeys through WebAuthn (Touch ID, Face ID, Windows Hello, device PIN, or security key)
- Google Identity Services sign in and explicit account linking
- Separate user-profile, email-delivery, and authentication-provider modules
- Generic account responses that avoid user enumeration
- CSRF origin/header checks, CORS allowlist, Helmet, and rate limiting
- OpenAPI docs at `http://localhost:4000/api/docs`

Roles, permissions, additional social providers, and product-specific domain models are
intentionally not part of this foundation.

## Setup

```bash
cp apps/nest-api/.env.example apps/nest-api/.env
bun --cwd=apps/nest-api run db:migrate
bun --cwd=apps/nest-api run dev
```

For Neon, replace `DATABASE_URL` with the Neon PostgreSQL connection string. TLS is enabled
automatically for Neon and URLs containing `sslmode=require`.

## Database commands

```bash
bun --cwd=apps/nest-api run db:generate
bun --cwd=apps/nest-api run db:migrate
bun --cwd=apps/nest-api run db:studio
```

Schema changes must be made in `src/database/schema` and committed with the generated migration.
Do not use schema push in shared or production environments.

## Authentication endpoints

All routes are under `/api/v1/auth`.

| Method   | Route                  | Purpose                                               |
| -------- | ---------------------- | ----------------------------------------------------- |
| `POST`   | `/register`            | Create an unverified account and send an OTP          |
| `POST`   | `/verify-email`        | Verify an email OTP                                   |
| `POST`   | `/resend-verification` | Replace the current verification OTP                  |
| `POST`   | `/login`               | Create a secure session                               |
| `POST`   | `/refresh`             | Rotate the refresh token and issue a new access token |
| `POST`   | `/logout`              | Revoke the current refresh session                    |
| `POST`   | `/logout-all`          | Revoke all sessions                                   |
| `GET`    | `/me`                  | Return the authenticated user                         |
| `POST`   | `/forgot-password`     | Request a reset OTP                                   |
| `POST`   | `/reset-password`      | Reset a password and revoke all sessions              |
| `POST`   | `/change-password`     | Change a password and revoke other sessions           |
| `GET`    | `/sessions`            | List active sessions                                  |
| `DELETE` | `/sessions/:sessionId` | Revoke an active session                              |

Additional authentication methods live under `/api/v1/auth/methods` and authenticated factor
management lives under `/api/v1/auth/security`. User profile reads and writes use
`/api/v1/users/me` and `/api/v1/users/me/profile`.

## Billing endpoints

Subscriptions use Stripe Checkout and/or Razorpay Subscriptions with a shared Nest billing module.
Configure keys in `.env` (see `.env.example`), create Price/Plan IDs in each dashboard, then expose
webhooks to:

- Stripe: `POST /api/v1/billing/webhooks/stripe`
- Razorpay: `POST /api/v1/billing/webhooks/razorpay`

| Method | Route                         | Purpose                           |
| ------ | ----------------------------- | --------------------------------- |
| `GET`  | `/billing/providers`          | Providers with keys configured    |
| `GET`  | `/billing/subscription`       | Current user subscription (auth)  |
| `POST` | `/billing/checkout`           | Create hosted checkout URL (auth) |
| `POST` | `/billing/portal`             | Stripe customer portal (auth)     |
| `POST` | `/billing/webhooks/:provider` | Provider webhook                  |

Refresh tokens never appear in JSON responses. Browser clients must use `credentials: "include"`.
Unsafe browser requests must send `X-Requested-With: XMLHttpRequest`.

## Production requirements

- Set unique `JWT_SECRET` and `AUTH_TOKEN_SECRET` values of at least 32 characters.
- Configure `RESEND_API_KEY` and a verified `AUTH_EMAIL_FROM` sender.
- Set `CORS_ORIGIN` to an explicit comma-separated allowlist.
- Enable `TRUST_PROXY=true` behind a trusted reverse proxy.
- Run migrations during deployment before starting new application instances.
- Set `WEB_APP_URL`, `WEBAUTHN_RP_ID`, and `WEBAUTHN_ORIGIN` to the production web origin.
- When the web app and API are on different sites (Vercel ↔ Render), set
  `COOKIE_SAME_SITE=none` so refresh cookies are sent cross-origin (HTTPS required).
- For Google sign-in, set the same web client ID in backend `GOOGLE_CLIENT_ID` and frontend
  `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

Hosted deploy walkthrough: `/docs/deploy` (Vercel + Render + Neon).
