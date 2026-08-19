-- CarHaki: store generated PDFs instead of re-fetching from ClearVin on every download
-- Run this in the Neon SQL Editor before Stage 2 ships.

ALTER TABLE reports ADD COLUMN IF NOT EXISTS pdf_data BYTEA;

-- Old reports (generated before this migration) will have pdf_data IS NULL —
-- the PDF download route falls back to a live ClearVin fetch for those only.
