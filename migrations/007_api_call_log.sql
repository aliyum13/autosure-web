-- CarHaki: outbound third-party API call log (ClearVin, Paystack, Resend)
-- Run this in the Neon SQL Editor before this deploy goes live.
--
-- Item 3: until now, every third-party call was console.log only, landing in
-- ephemeral Vercel runtime logs with no in-app visibility. Two incidents this
-- session would have been caught far sooner with this table:
--   1. Aug 14: duplicate ClearVin credit burn (report_html + report_pdf called
--      up to 3x per report) — visible here as a call-count spike per operation.
--   2. The Resend API key scoped to "Sending access" only, silently 401ing
--      every suppression check while sends kept succeeding — visible here as a
--      100% error rate on one operation while its sibling stayed green.

CREATE TABLE IF NOT EXISTS api_call_log (
  id            TEXT PRIMARY KEY,
  service       TEXT NOT NULL,        -- 'clearvin' | 'paystack' | 'resend'
  operation     TEXT NOT NULL,        -- e.g. 'report_html', 'initialize', 'suppression_check'
  success       BOOLEAN NOT NULL,
  error_message TEXT,                 -- truncated, email addresses stripped (no PII)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drives the admin aggregates (per service/operation over a time window) and
-- the recent-errors list.
CREATE INDEX IF NOT EXISTS idx_api_call_log_created ON api_call_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_call_log_service_created ON api_call_log (service, created_at DESC);

-- NOTE ON RETENTION: this table grows with traffic (roughly: 1 row per VIN
-- search, ~4-5 per report generated, 2 per OTP login). At current volume that's
-- low hundreds of rows/day, which Postgres handles indefinitely — but it grows
-- unbounded. When it gets large, prune with:
--   DELETE FROM api_call_log WHERE created_at < NOW() - INTERVAL '90 days';
