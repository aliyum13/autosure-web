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
