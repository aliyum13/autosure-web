import { prisma } from '@/lib/db';

/**
 * Marks a referral as CONVERTED — i.e. the referred purchase was actually paid.
 *
 * The referrals row itself is written back at checkout initiation, when the
 * customer is redirected to Paystack and has paid nothing. That row is the
 * funnel record; it does not mean anyone earned anything. Until this function
 * ran anywhere, nothing ever distinguished the two, so an abandoned checkout
 * was indistinguishable from a sale in every figure the admin panel showed.
 *
 * Called from both payment-success paths. Deliberately NOT inside the advisory
 * lock those routes take around report creation: `converted_at IS NULL` makes
 * this idempotent on its own, and the verify route returns early from inside
 * that lock when a report already exists — a conversion marked there would be
 * skipped on exactly the path where the webhook lost the race.
 *
 * Never throws, for the same reason as lib/apiLog.ts: a bookkeeping failure
 * must not take down payment handling. A missed conversion is recoverable by
 * re-running the migration 011 backfill; a 500 on the webhook is not.
 */
export async function markReferralConverted(orderId: string): Promise<void> {
  try {
    const updated = await prisma.$executeRawUnsafe(
      `UPDATE referrals SET converted_at = NOW()
       WHERE order_id = $1 AND converted_at IS NULL`,
      orderId
    );
    if (updated > 0) {
      console.log('[referral] conversion recorded for order', orderId);
    }
  } catch (e) {
    console.warn('[referral] failed to mark conversion (non-fatal):', (e as Error).message);
  }
}

// Flat, per converted referred purchase, regardless of bundle size. Influencer
// codes keep their own bundle-scaled rates in /api/orders/create — this is a
// thank-you to a customer, not an income, so it is deliberately simpler.
export const CUSTOMER_REFERRAL_REWARD_KOBO = 100_000; // NGN 1,000

// Ambiguous glyphs removed (no O/0, no I/1/L). These codes get read aloud,
// typed from a screenshot and passed around on WhatsApp.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomCode(len = 8): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/**
 * Returns the referral code owned by this account, creating one on first call.
 *
 * Never derived from the email — the code is shared publicly in links, and a
 * code like "AMINA" would leak who the referrer is.
 */
export async function getOrCreateReferralCode(accountId: string, name?: string): Promise<string> {
  const existing = await prisma.$queryRawUnsafe(
    `SELECT code FROM referral_codes WHERE owner_account_id = $1 LIMIT 1`,
    accountId
  ) as Array<{ code: string }>;
  if (existing[0]) return existing[0].code;

  // Retry on collision against the UNIQUE constraint rather than pre-checking,
  // which would race with a concurrent first visit from the same account.
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode();
    try {
      const id = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO referral_codes (id, code, name, owner_account_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        id, code, name || 'CarHaki customer', accountId
      );
      return code;
    } catch (e) {
      // Either the code collided, or another request created this account's
      // code first. If the account now has one, take it.
      const raced = await prisma.$queryRawUnsafe(
        `SELECT code FROM referral_codes WHERE owner_account_id = $1 LIMIT 1`, accountId
      ) as Array<{ code: string }>;
      if (raced[0]) return raced[0].code;
      if (attempt === 5) throw e;
    }
  }
  throw new Error('Could not allocate a referral code');
}

/**
 * Credits a customer referrer's wallet for a referred purchase that was PAID.
 *
 * Called from both payment-success paths beside markReferralConverted(). The
 * brief's core requirement is that a signup alone never pays out; that is
 * enforced here by requiring a SUCCESS order with money actually on it.
 *
 * Never throws: an earnings failure must not break payment handling.
 */
export async function creditReferralEarning(orderId: string): Promise<void> {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT o.id, o.amount_ngn, o.payment_status, o.guest_email, o.guest_phone,
              rc.id AS code_id, rc.code, rc.owner_account_id,
              a.email AS owner_email
       FROM orders o
       JOIN referrals r       ON r.order_id = o.id
       JOIN referral_codes rc ON rc.id = r.referral_code_id
       LEFT JOIN accounts a   ON a.id = rc.owner_account_id
       WHERE o.id = $1 LIMIT 1`,
      orderId
    ) as Array<{
      id: string; amount_ngn: bigint | number; payment_status: string;
      guest_email: string | null; guest_phone: string | null;
      code_id: string; code: string; owner_account_id: string | null; owner_email: string | null;
    }>;

    const row = rows[0];
    if (!row) return;                                       // no referral on this order
    if (!row.owner_account_id || !row.owner_email) return;  // influencer code — existing payout path
    if (row.payment_status !== 'SUCCESS') return;           // not paid; a signup earns nothing

    // Zero-value orders are comp reports (CH-COMP-), bundle-credit redemptions
    // (CH-CREDIT-) and earnings-funded reports (CH-EARN-). None of them moved
    // money, and the last would otherwise let earnings mint more earnings.
    if (Number(row.amount_ngn) <= 0) return;

    const buyerEmail = (row.guest_email || '').toLowerCase().trim();
    const ownerEmail = row.owner_email.toLowerCase().trim();
    if (buyerEmail && buyerEmail === ownerEmail) {
      console.warn('[referral] self-referral refused for', row.code, '- buyer is the code owner');
      return;
    }

    // Second signal against a throwaway address. Not airtight — a determined
    // person uses a second phone — but the WhatsApp number is required at
    // checkout now, so it costs nothing to check.
    if (row.guest_phone) {
      const ownPhone = await prisma.$queryRawUnsafe(
        `SELECT 1 FROM orders
         WHERE LOWER(guest_email) = $1 AND guest_phone IS NOT NULL
           AND regexp_replace(guest_phone, '[^0-9]', '', 'g') = regexp_replace($2, '[^0-9]', '', 'g')
         LIMIT 1`,
        ownerEmail, row.guest_phone
      ) as Array<unknown>;
      if (ownPhone.length > 0) {
        console.warn('[referral] self-referral refused for', row.code, '- buyer phone matches the code owner');
        return;
      }
    }

    const earnId = `earn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const amount = CUSTOMER_REFERRAL_REWARD_KOBO;

    // Ledger row and balance move together or not at all.
    //
    // The balance insert is keyed off the ledger row by EXISTS rather than
    // running unconditionally: under the webhook/verify race, ON CONFLICT
    // swallows the duplicate ledger insert, and a plain balance UPDATE would
    // then still credit a second time. Gating on the row's existence means a
    // swallowed insert credits nothing.
    await prisma.$transaction([
      prisma.$executeRawUnsafe(
        `INSERT INTO referral_earnings (id, referrer_email, kind, amount_kobo, source_order_id, note, created_at)
         VALUES ($1, $2, 'earned', $3, $4, $5, NOW())
         ON CONFLICT DO NOTHING`,
        earnId, ownerEmail, amount, orderId, `referral ${row.code}`
      ),
      prisma.$executeRawUnsafe(
        `INSERT INTO referral_balances (email, balance_kobo, updated_at)
         SELECT $1, $2, NOW()
         WHERE EXISTS (SELECT 1 FROM referral_earnings WHERE id = $3)
         ON CONFLICT (email) DO UPDATE
           SET balance_kobo = referral_balances.balance_kobo + EXCLUDED.balance_kobo,
               updated_at = NOW()`,
        ownerEmail, amount, earnId
      ),
    ]);

    console.log('[referral] earning credited:', ownerEmail, '+', amount, 'kobo from order', orderId);
  } catch (e) {
    console.warn('[referral] failed to credit earning (non-fatal):', (e as Error).message);
  }
}

/**
 * Spends `amountKobo` from a referrer's balance. Returns true only if the
 * balance covered it.
 *
 * The guarded UPDATE is the whole safety mechanism: `balance_kobo >= $1` in the
 * WHERE means two concurrent redemptions cannot both succeed, and neither can
 * drive the balance negative. Same pattern as the credits_used guard in
 * /api/orders/create.
 */
export async function spendReferralBalance(
  email: string, amountKobo: number, spentOrderId: string
): Promise<boolean> {
  const lower = email.toLowerCase().trim();
  const updated = await prisma.$executeRawUnsafe(
    `UPDATE referral_balances SET balance_kobo = balance_kobo - $1, updated_at = NOW()
     WHERE LOWER(email) = $2 AND balance_kobo >= $1`,
    amountKobo, lower
  );
  if (updated !== 1) return false;

  const id = `earn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO referral_earnings (id, referrer_email, kind, amount_kobo, spent_order_id, note, created_at)
     VALUES ($1, $2, 'spent', $3, $4, 'report purchase', NOW())`,
    id, lower, -amountKobo, spentOrderId
  );
  return true;
}

/**
 * Returns a spent balance to the wallet after a failed redemption.
 *
 * The bundle-credit branch of /api/orders/create already sets this precedent —
 * it exists because customers were previously charged for reports that never
 * arrived.
 */
export async function refundReferralBalance(
  email: string, amountKobo: number, spentOrderId: string, reason: string
): Promise<void> {
  const lower = email.toLowerCase().trim();
  const id = `earn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  await prisma.$transaction([
    prisma.$executeRawUnsafe(
      `UPDATE referral_balances SET balance_kobo = balance_kobo + $1, updated_at = NOW()
       WHERE LOWER(email) = $2`,
      amountKobo, lower
    ),
    prisma.$executeRawUnsafe(
      `INSERT INTO referral_earnings (id, referrer_email, kind, amount_kobo, spent_order_id, note, created_at)
       VALUES ($1, $2, 'reversed', $3, $4, $5, NOW())`,
      id, lower, amountKobo, spentOrderId, reason
    ),
  ]);
  console.log('[referral] balance refunded:', lower, '+', amountKobo, 'kobo -', reason);
}

/** Current spendable balance in kobo. */
export async function getReferralBalance(email: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT balance_kobo FROM referral_balances WHERE LOWER(email) = $1 LIMIT 1`,
    email.toLowerCase().trim()
  ) as Array<{ balance_kobo: bigint | number }>;
  return Number(rows[0]?.balance_kobo ?? 0);
}
