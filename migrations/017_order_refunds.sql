-- CarHaki: record of refunds owed and settled on paid orders that failed.
-- Run this in the Neon SQL Editor before this deploy goes live.
--
-- When ClearVin rejects a VIN on a PAID order the report is marked INVALID_VIN
-- and an admin alert email goes out — and that is the entire trail. The
-- bundle-credit and referral-earnings paths refund themselves; the money path
-- cannot, because refunding a card charge is a Paystack action a human takes.
--
-- So a customer who paid 15,000 naira for a report that could never be produced
-- is owed money, and the only record is an email in a mailbox. This makes the
-- debt durable and visible in /admin.
--
-- Deliberately stores ONLY resolutions, not the queue itself. The queue is
-- derived at read time from orders JOIN reports, so it cannot drift out of date
-- or need backfilling — a row here means a human has dealt with it.

CREATE TABLE IF NOT EXISTS order_refunds (
  order_id    TEXT PRIMARY KEY,   -- one resolution per order, enforced
  status      TEXT NOT NULL,      -- 'refunded' | 'waived'
  amount_kobo BIGINT NOT NULL,    -- what was owed, captured at resolution time
  note        TEXT,               -- e.g. Paystack refund reference
  resolved_by TEXT NOT NULL,      -- admin email
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_refunds_resolved ON order_refunds (resolved_at DESC);

-- ---------------------------------------------------------------------------
-- What is currently owed (the same query the admin panel runs):
--
--   SELECT o.id, o.guest_email, o.amount_ngn/100.0 AS naira, o.vin, o.created_at
--   FROM orders o
--   JOIN reports r ON r.order_id = o.id
--   LEFT JOIN order_refunds f ON f.order_id = o.id
--   WHERE o.payment_status = 'SUCCESS'
--     AND o.amount_ngn > 0            -- comp and credit orders cost nothing
--     AND r.status = 'INVALID_VIN'
--     AND f.order_id IS NULL
--   ORDER BY o.created_at;
--
-- Run it BEFORE deploying to see the existing backlog. Anything it returns is a
-- customer who has been owed a refund since before this table existed.
