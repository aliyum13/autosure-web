-- CarHaki: comp-report audit log + rate-limited customer-order lookup log
-- Run this in the Neon SQL Editor before this deploy goes live.
--
-- Item 2: retires the public CH-COMP-9X4K magic-string path (checked in the
-- unauthenticated /api/orders/create and /api/referral/validate) in favor of
-- an admin-only, session-gated route that requires linking to a real prior
-- paid order (or an explicit logged reason when there isn't one).

CREATE TABLE IF NOT EXISTS comp_report_log (
  id              TEXT PRIMARY KEY,
  admin_email     TEXT NOT NULL,
  order_id        TEXT NOT NULL,
  linked_order_id TEXT,
  vin             TEXT NOT NULL,
  guest_email     TEXT NOT NULL,
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comp_report_log_created ON comp_report_log (created_at DESC);

-- Doubles as the rate-limit source for the email-lookup endpoint (PII lookup,
-- admin-gated and read-only, but still logged/bounded per admin per window).
CREATE TABLE IF NOT EXISTS comp_lookup_log (
  id             TEXT PRIMARY KEY,
  admin_email    TEXT NOT NULL,
  queried_email  TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comp_lookup_log_admin_created ON comp_lookup_log (admin_email, created_at DESC);
