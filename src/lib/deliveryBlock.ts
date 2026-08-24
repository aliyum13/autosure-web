import { prisma } from '@/lib/db';
import type { SuppressionOrigin } from '@/lib/suppression';

export type BlockContext = 'report_ready' | 'otp_login';

/**
 * Records one delivery blocked by Resend's suppression list.
 *
 * Deliberately never throws, for the same reason lib/apiLog.ts doesn't: this is
 * observability wrapped around report generation and login. If the insert
 * fails, the caller must still complete — a bookkeeping outage should never
 * take down the thing it's bookkeeping.
 *
 * Repeat blocks for the same customer are intentionally NOT deduplicated: a
 * second row is evidence they tried again, which is exactly what support wants
 * to see. The panel groups them on display instead.
 */
export async function logDeliveryBlock(params: {
  email: string;
  context: BlockContext;
  origin?: SuppressionOrigin | null;
  reportId?: string | null;
  orderId?: string | null;
}): Promise<void> {
  try {
    const id = `edb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO email_delivery_block (id, email, context, origin, report_id, order_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      id,
      params.email.trim().toLowerCase(),
      params.context,
      params.origin ?? null,
      params.reportId ?? null,
      params.orderId ?? null
    );
  } catch (e) {
    console.warn('[deliveryBlock] failed to record block (non-fatal):', (e as Error).message);
  }
}
