-- CarHaki: separate referral CONVERSIONS from referral checkout attempts.
-- Run this in the Neon SQL Editor before this deploy goes live.
--
-- The bug: /api/orders/create inserts the referrals row immediately after
-- Paystack `initialize` returns — while payment_status is still 'PENDING' —
-- and neither the webhook nor the verify route ever reconciles it. So a
-- referral row has always meant "someone started a checkout", while the admin
-- panel and /ref/[code] have been reading it as "someone bought".
--
-- Consequences that made this urgent:
--   * "Total Sales" counted abandoned checkouts.
--   * "Pending Payout" overstated real liability — money we might have paid out
--     against purchases that never happened.
--   * /api/orders/create is unauthenticated, so anyone could inflate a code's
--     earnings just by starting checkouts and never paying.
--
-- The referrals row is still written at checkout, deliberately: it is the
-- click -> checkout -> conversion funnel. It just stops meaning "earned".
-- converted_at IS NOT NULL is now the only thing that means earned.

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- markReferralConverted() looks up by order_id on every successful payment.
CREATE INDEX IF NOT EXISTS idx_referrals_order ON referrals (order_id);

-- Backfill from the orders table, which has always held the truth.
-- Everything still NULL afterwards is an abandoned checkout that was being
-- counted as a sale. Compare the two counts below before and after.
UPDATE referrals r
SET converted_at = o.paid_at
FROM orders o
WHERE o.id = r.order_id
  AND o.payment_status = 'SUCCESS'
  AND r.converted_at IS NULL;

-- Settling a payout has until now been a hand-edited `is_paid` UPDATE in the
-- SQL editor, with no record of who paid what or when. Same reasoning as
-- comp_report_log in migration 006: money-moving admin actions get an audit row.
CREATE TABLE IF NOT EXISTS referral_payout_log (
  id               TEXT PRIMARY KEY,
  admin_email      TEXT NOT NULL,
  referral_code_id TEXT NOT NULL,
  code             TEXT NOT NULL,
  amount_kobo      BIGINT NOT NULL,   -- total marked paid in this action
  referral_count   INTEGER NOT NULL,  -- how many referral rows it settled
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_payout_log_created ON referral_payout_log (created_at DESC);

-- ---------------------------------------------------------------------------
-- Run this BEFORE and AFTER the UPDATE above and keep both results. The
-- difference is the liability correction, and it is worth being able to show.
--
--   SELECT rc.code, rc.name,
--          COUNT(r.id) FILTER (WHERE o.payment_status =  'SUCCESS') AS real_conversions,
--          COUNT(r.id) FILTER (WHERE o.payment_status <> 'SUCCESS') AS abandoned_checkouts,
--          COALESCE(SUM(r.commission_ngn) FILTER (WHERE o.payment_status =  'SUCCESS'), 0)/100.0 AS truly_owed_naira,
--          COALESCE(SUM(r.commission_ngn) FILTER (WHERE o.payment_status <> 'SUCCESS'), 0)/100.0 AS phantom_naira,
--          COALESCE(SUM(r.commission_ngn) FILTER (WHERE r.is_paid = false), 0)/100.0             AS currently_displayed_unpaid
--   FROM referral_codes rc
--   LEFT JOIN referrals r ON r.referral_code_id = rc.id
--   LEFT JOIN orders    o ON o.id = r.order_id
--   GROUP BY rc.code, rc.name
--   ORDER BY currently_displayed_unpaid DESC;
