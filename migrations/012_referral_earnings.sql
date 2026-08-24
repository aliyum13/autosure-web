-- CarHaki: customer-to-customer referral earnings.
-- Run this in the Neon SQL Editor AFTER migration 011, which this depends on:
-- earnings are credited only where referrals.converted_at is set, i.e. only on
-- a referred purchase that was actually paid. A signup earns nothing.
--
-- Influencer codes (owner_account_id IS NULL) are untouched and keep their
-- existing referrals.commission_ngn / is_paid payout path. Customer codes earn
-- into a wallet balance that can pay for a report.
--
-- NOTE: no withdrawal path exists and none is added here. A balance can only be
-- spent on reports. That is a deliberate scope boundary — paying money out to a
-- bank account needs Paystack Transfers, bank PII, a chargeback holding period
-- and tax treatment, and is being scoped separately.

-- Which account owns a code. NULL = admin-created influencer code.
ALTER TABLE referral_codes ADD COLUMN IF NOT EXISTS owner_account_id TEXT;

-- One code per account.
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_codes_owner
  ON referral_codes (owner_account_id) WHERE owner_account_id IS NOT NULL;

-- Append-only ledger. Signed amounts: earned positive, spent negative.
-- Every movement is a row, so a balance can always be explained.
CREATE TABLE IF NOT EXISTS referral_earnings (
  id              TEXT PRIMARY KEY,
  referrer_email  TEXT NOT NULL,
  kind            TEXT NOT NULL,       -- 'earned' | 'spent' | 'reversed' | 'adjustment'
  amount_kobo     BIGINT NOT NULL,
  source_order_id TEXT,                -- the referred purchase that earned it
  spent_order_id  TEXT,                -- the order it paid for
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_earnings_referrer
  ON referral_earnings (LOWER(referrer_email), created_at DESC);

-- THE idempotency guard. The webhook and the verify route race to mark an order
-- SUCCESS and both call creditReferralEarning(); read-then-write would let a
-- double credit through under that race. This makes it impossible at the
-- storage layer instead.
CREATE UNIQUE INDEX IF NOT EXISTS idx_earnings_once_per_order
  ON referral_earnings (source_order_id) WHERE kind = 'earned';

-- Spend authorisation, separate from the ledger so a decrement is one guarded
-- UPDATE — the same concurrency-safe pattern already proven by
-- report_credits.credits_used in /api/orders/create. The CHECK is the last line
-- of defence: a balance must never go negative.
CREATE TABLE IF NOT EXISTS referral_balances (
  email        TEXT PRIMARY KEY,
  balance_kobo BIGINT NOT NULL DEFAULT 0 CHECK (balance_kobo >= 0),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Reconciliation. Ledger and balance are written in one transaction, so these
-- must always agree. A non-empty result means a bug, not a data-entry problem.
--
--   SELECT b.email, b.balance_kobo,
--          COALESCE(SUM(e.amount_kobo), 0) AS ledger_sum
--   FROM referral_balances b
--   LEFT JOIN referral_earnings e ON LOWER(e.referrer_email) = LOWER(b.email)
--   GROUP BY b.email, b.balance_kobo
--   HAVING b.balance_kobo <> COALESCE(SUM(e.amount_kobo), 0);
