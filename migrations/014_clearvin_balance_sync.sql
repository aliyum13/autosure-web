-- CarHaki: recorded ClearVin balance, for the low-credit estimator.
-- Run this in the Neon SQL Editor before this deploy goes live.
--
-- ClearVin has no balance API. The only source of truth is Daria reporting the
-- number by WhatsApp/email, so between those reports we are blind — and after
-- finding 204 redundant charges out of 525, running out unnoticed is a real
-- risk. This table stores each reported number as a fact recorded at a time;
-- consumption since then is counted from our own api_call_log.
--
-- Append-only on purpose. A single mutable settings row would give the current
-- baseline but throw away the history, and the history is what makes the
-- estimator self-auditing: see estimate_at_sync below.

CREATE TABLE IF NOT EXISTS clearvin_balance_sync (
  id               TEXT PRIMARY KEY,
  known_balance    INTEGER NOT NULL CHECK (known_balance >= 0),
  low_threshold    INTEGER NOT NULL DEFAULT 20 CHECK (low_threshold >= 0),

  -- What the estimator PREDICTED immediately before this sync was recorded,
  -- sitting next to what Daria actually reported. The gap is measured drift.
  --
  -- This is also an empirical answer to an open question: report_pdf_by_id
  -- (?reportId=) is *presumed* free but unconfirmed until ClearVin's next
  -- activity export. If the estimate consistently runs high by roughly the
  -- number of report_pdf_by_id calls in the window, those calls are being
  -- billed — visible from our own data without waiting for the export.
  --
  -- NULL on the very first sync, when there was nothing to predict from.
  estimate_at_sync INTEGER,

  recorded_by      TEXT NOT NULL,   -- admin email that entered it
  note             TEXT,            -- e.g. 'Daria, WhatsApp, 25 Aug'
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Every read wants the newest row.
CREATE INDEX IF NOT EXISTS idx_clearvin_balance_sync_created
  ON clearvin_balance_sync (created_at DESC);

-- ---------------------------------------------------------------------------
-- Seed with the number Daria confirmed on 2026-08-25. Adjust before running if
-- it has moved since; the estimator counts charged calls from created_at
-- onwards, so recording a stale number as "now" would understate consumption.
--
--   INSERT INTO clearvin_balance_sync (id, known_balance, recorded_by, note)
--   VALUES ('cvbal_seed_20260825', 127, 'aliyumauwal13@gmail.com',
--           'Daria confirmed directly, 25 Aug 2026');
