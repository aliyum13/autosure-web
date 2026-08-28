-- CarHaki: link orders to accounts properly, instead of by email string match.
-- Run this in the Neon SQL Editor before this deploy goes live.
--
-- orders.user_id has been NULL in every insert path, so a customer's orders
-- were tied to their account solely by LOWER(guest_email) = LOWER(session
-- email) in the dashboard query. That means a logged-in customer who typed a
-- different address at checkout — a typo, or a work address instead of a
-- personal one — silently created an order that never appeared in their
-- dashboard and could not draw on their bundle credits. The account existed but
-- was not actually connected to the purchase.
--
-- Migration 009 dropped the legacy `users` table and both foreign keys
-- (orders_user_id_fkey, reports_user_id_fkey), so orders.user_id is an
-- unconstrained orphan column. Repurposing it for accounts.id costs nothing and
-- risks nothing.
--
-- No FK is added back deliberately: accounts are created implicitly on first
-- OTP verify, and a hard constraint here would make order creation fail if an
-- account row were ever removed. The dashboard query keeps the email match as a
-- second path, so a missing link degrades rather than hides an order.

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id) WHERE user_id IS NOT NULL;

-- Attach historic orders. Case-insensitive because accounts.email is stored
-- normalised (lowercased on insert in lib/otp.ts) while guest_email is whatever
-- the customer typed at checkout.
UPDATE orders o
SET user_id = a.id
FROM accounts a
WHERE o.user_id IS NULL
  AND LOWER(o.guest_email) = LOWER(a.email);

-- ---------------------------------------------------------------------------
-- The UPDATE's row count is how many historic orders were relying on the string
-- match. Worth recording. Then confirm what is left unattached and why:
--
--   SELECT count(*) FILTER (WHERE user_id IS NOT NULL) AS attached,
--          count(*) FILTER (WHERE user_id IS NULL)     AS unattached
--   FROM orders;
--
-- Unattached rows are expected and correct for: guest purchases by people who
-- never created an account, and admin-issued comp reports. They are NOT a
-- failure of this migration.
