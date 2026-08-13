-- CarHaki: report_credits table
-- Run this in the Neon SQL Editor to enable bundle credit tracking.

CREATE TABLE IF NOT EXISTS report_credits (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  order_id      TEXT,
  bundle_id     TEXT,
  credits_total INTEGER NOT NULL DEFAULT 0,
  credits_used  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup of a customer's available credits by email
CREATE INDEX IF NOT EXISTS idx_report_credits_email ON report_credits (email);

-- A row has remaining credits when credits_used < credits_total

-- Add bundle tracking columns to orders (needed so the webhook knows the bundle size)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bundle_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bundle_count INTEGER DEFAULT 1;
