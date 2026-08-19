-- CarHaki: OTP-based account auth
-- Run this in the Neon SQL Editor before Stage 1 auth routes go live.
-- Fresh tables by design — does NOT reuse the old password-based `users`
-- columns or the dead `password_resets` table from the pre-guest-checkout era.
-- Named `accounts` rather than `users`: a legacy `users` table (with a
-- NOT NULL password_hash column) still exists and is untouched by any live
-- code path. `CREATE TABLE IF NOT EXISTS users` would silently no-op against
-- it rather than create the new schema, and inserts would then fail on the
-- old NOT NULL password_hash column. Left the legacy table in place rather
-- than dropping it — that's a destructive call for you to make separately.

CREATE TABLE IF NOT EXISTS accounts (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts (email);

CREATE TABLE IF NOT EXISTS login_otps (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  code_hash     TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  consumed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup of the latest active code for an email, and rate-limit counting
CREATE INDEX IF NOT EXISTS idx_login_otps_email_created ON login_otps (email, created_at DESC);
