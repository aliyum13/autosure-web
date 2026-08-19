-- CarHaki: record of scheduled-job runs, so it's visible the prune is actually
-- running rather than just installed.
-- Run this in the Neon SQL Editor before this deploy goes live.
--
-- Deliberately a separate table from api_call_log: that one means "outbound
-- third-party API call", and mixing internal cron runs into it would corrupt
-- the per-service error-rate figures the admin panel reports.

CREATE TABLE IF NOT EXISTS cron_run_log (
  id           TEXT PRIMARY KEY,
  job          TEXT NOT NULL,        -- e.g. 'prune_api_call_log'
  rows_deleted INTEGER NOT NULL DEFAULT 0,
  note         TEXT,                 -- e.g. 'hit per-run cap, more to prune next run'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cron_run_log_created ON cron_run_log (created_at DESC);
