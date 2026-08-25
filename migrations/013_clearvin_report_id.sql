-- CarHaki: store ClearVin's report id so a report can be re-fetched for free.
-- Run this in the Neon SQL Editor before this deploy goes live.
--
-- ClearVin's activity export for Jul 7 - Aug 25 showed 525 report charges, 204
-- of them (39%) redundant: same VIN, same minute, two sequential Report_IDs.
-- Cause: lib/generate.ts fetched HTML and PDF separately and BOTH by ?vin=,
-- and per ClearVin's API a ?vin= call generates and charges a NEW report every
-- time. Only ?reportId= re-fetches an already-purchased report for free, and
-- no ?reportId= call existed anywhere in the codebase.
--
-- The id stored here is the 8-char hex value ClearVin embeds in the HTML
-- response. It corresponds to the String_ID column in their activity export,
-- NOT the numeric Report_ID column.
--
-- NOTE: this starts EMPTY for the ~170 pre-existing reports that have no
-- pdf_data. Those are handled separately by write-through caching in
-- /api/reports/[id]/pdf — a column alone would not have helped them, since it
-- is exactly the rows that never had an id captured that are being re-charged
-- on every view.

ALTER TABLE reports ADD COLUMN IF NOT EXISTS clearvin_report_id TEXT;

-- Looked up per PDF download to decide free-refetch vs charged-refetch.
CREATE INDEX IF NOT EXISTS idx_reports_clearvin_report_id
  ON reports (clearvin_report_id) WHERE clearvin_report_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- After deploy, the saving is measurable from our own data — report_pdf_by_id
-- is the free path, report_pdf the charged one:
--
--   SELECT operation, COUNT(*) AS n, MIN(created_at), MAX(created_at)
--   FROM api_call_log
--   WHERE service = 'clearvin' AND operation LIKE 'report_pdf%'
--   GROUP BY operation ORDER BY operation;
--
-- Expect report_pdf_by_id to dominate and report_pdf to appear only for the
-- fallback cases (extraction failure, or an old report's first view).
