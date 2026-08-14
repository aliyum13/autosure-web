import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { generateReportAndEmail } from '@/lib/generate';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET) return NextResponse.json({ error: 'Config error' }, { status: 500 });

    const signature = req.headers.get('x-paystack-signature');
    const rawBody = await req.text();
    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(rawBody).digest('hex');

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'charge.success') {
      const { reference } = event.data;
      if (!reference) return NextResponse.json({ received: true });

      const orders = await prisma.$queryRawUnsafe(
        `SELECT id, vin, payment_status, user_id, guest_name, guest_email, bundle_id, bundle_count FROM orders WHERE paystack_reference = $1 LIMIT 1`,
        reference
      ) as Array<{ id: string; vin: string; payment_status: string; user_id: string; guest_name: string; guest_email: string; bundle_id: string | null; bundle_count: number | null }>;

      const order = orders[0];
      if (!order) return NextResponse.json({ received: true });
      if (order.payment_status === 'SUCCESS') return NextResponse.json({ received: true });

      await prisma.$executeRawUnsafe(
        `UPDATE orders SET payment_status = 'SUCCESS', paid_at = NOW(), updated_at = NOW() WHERE paystack_reference = $1`,
        reference
      );

      console.log('[webhook] Order:', order.id, '| VIN:', order.vin, '| email:', order.guest_email, '| bundle:', order.bundle_id, 'x', order.bundle_count);

      // Bundle purchase: create (count - 1) reusable credits for this email.
      // The first report is generated now; the rest become credits.
      const bundleCount = order.bundle_count || 1;
      if (bundleCount > 1 && order.guest_email) {
        const extraCredits = bundleCount - 1;
        const creditId = `cred_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO report_credits (id, email, order_id, bundle_id, credits_total, credits_used, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 0, NOW(), NOW())`,
          creditId, order.guest_email.toLowerCase(), order.id, order.bundle_id, extraCredits
        );
        console.log('[webhook] Created', extraCredits, 'credits for', order.guest_email);
      }

      // Advisory lock on this order — serializes against the verify route hitting the
      // same order at nearly the same time (Paystack webhook + browser success-page poll).
      await prisma.$executeRawUnsafe(`SELECT pg_advisory_lock(hashtext($1)::bigint)`, order.id);
      try {
        const reports = await prisma.$queryRawUnsafe(
          `SELECT id FROM reports WHERE order_id = $1 LIMIT 1`, order.id
        ) as Array<{ id: string }>;

        if (!reports[0]) {
          const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const shareToken = `share_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          await prisma.$executeRawUnsafe(
            `INSERT INTO reports (id, order_id, user_id, vin, status, share_token, is_public, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'PROCESSING', $5, false, NOW(), NOW())`,
            reportId, order.id, order.user_id, order.vin, shareToken
          );

          console.log('[webhook] Running generate directly for:', reportId);

          // Run generate directly — await so Vercel doesn't kill it
          await generateReportAndEmail(reportId, order.vin, order.guest_name, order.guest_email);

          console.log('[webhook] Generate complete for:', reportId);
        } else {
          console.log('[webhook] Report already exists for order (verify route won the race):', reports[0].id);
        }
      } finally {
        await prisma.$executeRawUnsafe(`SELECT pg_advisory_unlock(hashtext($1)::bigint)`, order.id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[webhook] Error:', error);
    return NextResponse.json({ received: true });
  }
}
