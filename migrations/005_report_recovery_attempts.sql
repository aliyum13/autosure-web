-- CarHaki: general safeguard against the recovery-tool infinite-loop class of bug
-- Run this in the Neon SQL Editor alongside migration 004.
--
-- migration 004 fixes the ONE specific failure mode observed ("Vin ... is not
-- valid"). This migration is the general safeguard requested on top of that:
-- bound how many times the recovery tool will retry any single report,
-- regardless of WHY it keeps failing — so an unclassified future rejection
-- reason from ClearVin can't repeat the same incident (~100 calls + ~100
-- duplicate admin emails for one stuck report).

ALTER TABLE reports ADD COLUMN IF NOT EXISTS recovery_attempts INTEGER NOT NULL DEFAULT 0;
