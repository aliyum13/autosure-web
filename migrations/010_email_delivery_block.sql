-- CarHaki: record of every time Resend's suppression list blocked a delivery.
-- Run this in the Neon SQL Editor before this deploy goes live.
--
-- Until now a suppressed customer was invisible: lib/generate.ts console.error'd
-- and fired one admin alert email, and the OTP route console.warn'd. Both land
-- in ephemeral Vercel runtime logs, so there was no way to answer "who paid and
-- never got their report?" — and because the same check also blocks OTP login,
-- those customers can't self-serve from the dashboard either. This table is the
-- work queue behind the admin "Undelivered Reports" panel.
--
-- NOTE ON PII: unlike api_call_log (which strips email addresses), this table
-- deliberately STORES the address — it is the lookup key support needs to reach
-- the customer. Reads are admin-session gated, same as comp_report_log.

CREATE TABLE IF NOT EXISTS email_delivery_block (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  context     TEXT NOT NULL,   -- 'report_ready' | 'otp_login'
  origin      TEXT,            -- 'bounce' | 'complaint' | 'manual' (null if Resend didn't say)
  report_id   TEXT,
  order_id    TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,            -- admin email that cleared it
  resolution  TEXT,            -- 'whatsapp' | 'email_corrected' | 'other'
  note        TEXT,            -- free text; records the old address on a correction
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The panel only ever reads the unresolved queue, so the partial index keeps
-- that scan tiny no matter how much resolved history accumulates.
CREATE INDEX IF NOT EXISTS idx_edb_unresolved ON email_delivery_block (created_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_edb_email ON email_delivery_block (LOWER(email));
