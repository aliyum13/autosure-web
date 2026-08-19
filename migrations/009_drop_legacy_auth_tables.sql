-- CarHaki: drop the legacy NextAuth-era `users` and `password_resets` tables
-- Run this in the Neon SQL Editor.
--
-- IRREVERSIBLE. Both tables were confirmed empty (0 rows) and have zero
-- references in application code — the OTP auth system deliberately uses a
-- separate `accounts` table, named differently precisely to avoid colliding
-- with legacy `users` and its NOT NULL password_hash column.
-- See migrations/002 and [[project_auth_dashboard_shipped]].
--
-- NOT dropping orders.user_id / reports.user_id here. Those columns are still
-- written by live INSERT statements on the payment path (orders/create,
-- payments/webhook, payments/verify, admin/comp-report) and read in
-- api/reports/[id]. Dropping them is a coordinated code+schema change, and if
-- the migration landed before the deploy every order and report creation would
-- break in production. Left as unused nullable columns; see the note at the
-- bottom for how to retire them properly if wanted later.

BEGIN;

-- Guard: abort rather than destroy data if this is ever run against a database
-- where these tables turned out not to be empty.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM users) > 0 THEN
    RAISE EXCEPTION 'ABORTED: users is not empty (% rows)', (SELECT COUNT(*) FROM users);
  END IF;
  IF (SELECT COUNT(*) FROM password_resets) > 0 THEN
    RAISE EXCEPTION 'ABORTED: password_resets is not empty (% rows)', (SELECT COUNT(*) FROM password_resets);
  END IF;
END $$;

-- Drop the two known foreign keys explicitly rather than using DROP TABLE
-- CASCADE. This is deliberate: with the FKs gone, the plain DROP TABLE below
-- acts as an assertion that these were the ONLY dependencies. If something
-- else references `users` that we didn't enumerate (a view, another FK), the
-- DROP fails loudly and the transaction rolls back — whereas CASCADE would
-- silently drop that unknown dependency too.
ALTER TABLE orders  DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_user_id_fkey;

-- password_resets first: if it holds its own FK to users, this clears it.
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS users;

COMMIT;

-- Verify after running:
--   SELECT to_regclass('users'), to_regclass('password_resets');
--   -- both should return NULL
--
-- To retire orders.user_id / reports.user_id later, in this order:
--   1. Remove the column from every INSERT/SELECT in the 6 files listed above
--   2. Deploy that change
--   3. Only then: ALTER TABLE orders DROP COLUMN user_id;
--                 ALTER TABLE reports DROP COLUMN user_id;
