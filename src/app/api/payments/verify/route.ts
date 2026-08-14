import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateReportAndEmail } from '@/lib/generate';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const reference = req.nextUrl.searchParams.get('reference');
    if (!reference) return NextResponse.json({ error: 'Reference required' }, { status: 400 });

    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET) return NextResponse.json({ error: 'Payment service unavailable' }, { status: 503 });

    const orders = await prisma.$queryRawUnsafe(
      `SELECT id, vin, payment_status, guest_name, guest_email FROM orders WHERE paystack_reference = $1 LIMIT 1`,
      reference
    ) as Array<{ id: string; vin: string; payment_status: string; guest_name: string; guest_email: string }>;

    const existingOrder = orders[0];
    if (!existingOrder) return NextResponse.json({ status: 'failed', message: 'Order not found' });

    // Webhook already handled it — return existing report
    if (existingOrder.payment_status === 'SUCCESS') {
      const reports = await prisma.$queryRawUnsafe(
        `SELECT id FROM reports WHERE order_id = $1 LIMIT 1`, existingOrder.id
      ) as Array<{ id: string }>;
      console.log('[verify] Already SUCCESS, report:', reports[0]?.id);
      return NextResponse.json({ status: 'success', report_id: reports[0]?.id ?? null, vin: existingOrder.vin });
    }

    // Webhook missed — verify with Paystack directly
    const psRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    const psData = await psRes.json();

    if (!psData.status || psData.data?.status !== 'success') {
      return NextResponse.json({ status: 'failed', message: 'Payment not confirmed by Paystack' });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE orders SET payment_status = 'SUCCESS', paid_at = NOW(), updated_at = NOW() WHERE paystack_reference = $1`,
      reference
    );

    // Advisory lock on this order — serializes against the webhook route hitting the
    // same order at nearly the same time (Paystack webhook + this browser poll).
    await prisma.$executeRawUnsafe(`SELECT pg_advisory_lock(hashtext($1)::bigint)`, existingOrder.id);
    try {
      // Check if report already exists (webhook may have just fired, or won the lock race)
      const existingReports = await prisma.$queryRawUnsafe(
        `SELECT id FROM reports WHERE order_id = $1 LIMIT 1`, existingOrder.id
      ) as Array<{ id: string }>;

      if (existingReports[0]) {
        console.log('[verify] Report already exists:', existingReports[0].id);
        return NextResponse.json({ status: 'success', report_id: existingReports[0].id, vin: existingOrder.vin });
      }

      // Webhook missed — create report and generate directly (await, not fire-and-forget)
      const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const shareToken = `share_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO reports (id, order_id, user_id, vin, status, share_token, is_public, created_at, updated_at)
         VALUES ($1, $2, NULL, $3, 'PROCESSING', $4, true, NOW(), NOW())`,
        reportId, existingOrder.id, existingOrder.vin, shareToken
      );

      console.log('[verify] Webhook missed — running generate directly for:', reportId);
      await generateReportAndEmail(reportId, existingOrder.vin, existingOrder.guest_name, existingOrder.guest_email);

      return NextResponse.json({ status: 'success', report_id: reportId, vin: existingOrder.vin });
    } finally {
      await prisma.$executeRawUnsafe(`SELECT pg_advisory_unlock(hashtext($1)::bigint)`, existingOrder.id);
    }
  } catch (error) {
    console.error('[verify] Error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
