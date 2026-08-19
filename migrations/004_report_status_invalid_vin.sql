-- CarHaki: distinguish a permanently-invalid VIN from a transient ClearVin failure
-- Run this in the Neon SQL Editor before this deploy goes live.
--
-- Discovered via real testing: the "Recover Stuck Reports" admin tool selects
-- WHERE status IN ('PROCESSING','FAILED'). A VIN ClearVin permanently rejects
-- (e.g. "Vin ... is not valid") was being marked 'FAILED' — the same status as
-- a transient hiccup — so the recovery tool retried it forever, never able to
-- change its status. One test run hit the 100-attempt client-side safety cap:
-- ~100 real ClearVin calls (triggering ClearVin's own rate limit) and ~100
-- duplicate admin-alert emails, all for one permanently-invalid VIN.
--
-- This adds a new terminal status the recovery tool's IN (...) list naturally
-- excludes, so a permanently-invalid VIN is classified once and never retried.

ALTER TYPE report_status ADD VALUE IF NOT EXISTS 'INVALID_VIN';
