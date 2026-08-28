import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminSession, getSession } from '@/lib/dal';

// Customers who paid for a report that could never be produced.
//
// When ClearVin rejects a VIN the report is marked INVALID_VIN and an admin
// alert email goes out. The credit and earnings paths refund themselves; a card
// charge cannot, because that is a Paystack action a human takes. Until now the
// only record of the debt was that email.

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Derived, never stored: the queue is computed from orders JOIN reports, so
    // it cannot drift or need backfilling. order_refunds holds only what a
    // human has already dealt with.
    const owed = await prisma.$queryRawUnsafe(
      `SELECT o.id AS order_id, o.vin, o.guest_name, o.guest_email, o.guest_phone,
              o.amount_ngn, o.paystack_reference, o.created_at,
              r.id AS report_id
       FROM orders o
       JOIN reports r ON r.order_id = o.id
       LEFT JOIN order_refunds f ON f.order_id = o.id
       WHERE o.payment_status = 'SUCCESS'
         -- Comp reports and credit/earnings redemptions record amount 0. No
         -- money changed hands, so there is nothing to refund — listing them
         -- would pad the queue with rows nobody can action.
         AND o.amount_ngn > 0
         AND r.status = 'INVALID_VIN'
         AND f.order_id IS NULL
       ORDER BY o.created_at ASC`
    ) as Array<Record<string, unknown>>;

    const settled = await prisma.$queryRawUnsafe(
      `SELECT order_id, status, amount_kobo, note, resolved_by, resolved_at
       FROM order_refunds ORDER BY resolved_at DESC LIMIT 10`
    ) as Array<Record<string, unknown>>;

    const totalKobo = owed.reduce((sum, o) => sum + Number(o.amount_ngn ?? 0), 0);

    return NextResponse.json({
      owed: owed.map((o) => ({ ...o, amount_ngn: Number(o.amount_ngn) })),
      totalKobo,
      recentlySettled: settled.map((s) => ({ ...s, amount_kobo: Number(s.amount_kobo) })),
    });
  } catch (error) {
    console.error('[admin/refunds] failed:', error);
    return NextResponse.json({ error: 'Could not load refunds.' }, { status: 500 });
  }
}

// Records that a refund has been dealt with. Does NOT move money — Paystack
// refunds are issued by a human in their dashboard; this is the audit trail
// saying who did it and when.
export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const session = await getSession();
  const adminEmail = session!.email;

  try {
    const { order_id, status, note } = await req.json();
    if (!order_id?.trim()) {
      return NextResponse.json({ error: 'order_id is required.' }, { status: 400 });
    }
    if (status !== 'refunded' && status !== 'waived') {
      return NextResponse.json({ error: "status must be 'refunded' or 'waived'." }, { status: 400 });
    }

    // Amount is read from the order rather than trusted from the client, so the
    // audit trail records what was actually charged.
    const rows = await prisma.$queryRawUnsafe(
      `SELECT amount_ngn FROM orders WHERE id = $1 AND payment_status = 'SUCCESS' LIMIT 1`,
      order_id.trim()
    ) as Array<{ amount_ngn: bigint | number }>;
    if (!rows[0]) {
      return NextResponse.json({ error: 'No such paid order.' }, { status: 404 });
    }

    // ON CONFLICT DO NOTHING, not an upsert: a second click must not silently
    // rewrite who resolved it or when.
    const inserted = await prisma.$executeRawUnsafe(
      `INSERT INTO order_refunds (order_id, status, amount_kobo, note, resolved_by, resolved_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (order_id) DO NOTHING`,
      order_id.trim(), status, Number(rows[0].amount_ngn), note?.trim() || null, adminEmail
    );
    if (inserted !== 1) {
      return NextResponse.json({ error: 'Already recorded as resolved.' }, { status: 409 });
    }

    console.log('[refunds]', order_id, 'marked', status, 'by', adminEmail);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/refunds] resolve failed:', error);
    return NextResponse.json({ error: 'Could not record the refund.' }, { status: 500 });
  }
}
