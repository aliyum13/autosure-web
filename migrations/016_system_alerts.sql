-- CarHaki: open/closed production alerts raised by the healthcheck cron.
-- Run this in the Neon SQL Editor before this deploy goes live.
--
-- Why this exists: on 2026-08-26 every PDF download returned 500 for several
-- hours because migration 013 had never been applied to production, so
-- api/reports/[id]/pdf selected a column that did not exist and threw before
-- any branch ran. It was found by a CUSTOMER. Nothing in the system noticed.
--
-- Neither existing signal could have caught it:
--   * api_call_log records only third-party calls (clearvin/paystack/resend),
--     and the throw happened on a Postgres query before any of those.
--   * The one place the missing column WAS logged is a deliberately non-fatal
--     catch in generate.ts, which writes to ephemeral Vercel runtime logs.
--
-- Vercel has no startup hook to gate traffic on — functions cold-start per
-- invocation — so detection has to be active. See api/cron/healthcheck.

CREATE TABLE IF NOT EXISTS system_alerts (
  id          TEXT PRIMARY KEY,
  probe       TEXT NOT NULL,      -- which check failed, e.g. 'report_pdf'
  severity    TEXT NOT NULL,      -- 'critical' | 'warning'
  detail      TEXT NOT NULL,      -- status code or error text
  notified_at TIMESTAMPTZ,        -- when the email actually went out; NULL = send failed
  resolved_at TIMESTAMPTZ,        -- set when a later run sees the probe healthy again
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- THE de-duplication mechanism: at most one OPEN alert per probe.
--
-- Without it, a failure lasting three hours at a five-minute cadence would
-- produce 36 rows and 36 emails, and alerting that floods is alerting that gets
-- muted. The insert uses ON CONFLICT DO NOTHING against this index, so a
-- continuing failure is a no-op and only the first occurrence notifies.
-- Resolving sets resolved_at, which frees the slot for the next incident.
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_alerts_open
  ON system_alerts (probe) WHERE resolved_at IS NULL;

-- The panel reads open alerts first, then recent history.
CREATE INDEX IF NOT EXISTS idx_system_alerts_created ON system_alerts (created_at DESC);

-- ---------------------------------------------------------------------------
-- Currently firing:
--   SELECT probe, severity, detail, created_at, notified_at
--   FROM system_alerts WHERE resolved_at IS NULL ORDER BY created_at DESC;
--
-- Raised but never emailed — the case worth watching, since it means alerting
-- itself is degraded (this project has already had alerts silently swallowed
-- once by an address on Resend's suppression list):
--   SELECT * FROM system_alerts WHERE notified_at IS NULL ORDER BY created_at DESC;
