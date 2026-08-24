import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminSession, getSession } from '@/lib/dal';
import { checkSuppression } from '@/lib/suppression';
import { resendReportEmail } from '@/lib/email';

// Work queue for customers whose delivery was blocked by Resend's suppression
// list. Resend skips all sending to a suppressed address account-wide, so email
// cannot be the remedy — this route exists to get a human onto an alternate
// channel (the report link is publicly viewable, so handing it over on WhatsApp
// is a complete delivery) or to correct a mistyped address.

interface Row {
  id: string;
  email: string;
  context: string;
  origin: string | null;
  created_at: string;
  order_id: string | null;
  report_id: string | null;
  report_status: string | null;
  vin: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  amount_ngn: number | null;
}

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // report_ready blocks carry their own report_id. otp_login blocks don't —
  // they only know an email — so the lateral fills in that customer's most
  // recent paid order/report, which is almost always the one they're locked out
  // of. COALESCE lets both shapes render through the same row component.
  const rows = await prisma.$queryRawUnsafe(
    `SELECT b.id, b.email, b.context, b.origin, b.created_at,
            COALESCE(o.id, l.order_id)             AS order_id,
            COALESCE(r.id, l.report_id)            AS report_id,
            COALESCE(r.status, l.report_status)    AS report_status,
            COALESCE(o.vin, l.vin)                 AS vin,
            COALESCE(o.guest_name, l.guest_name)   AS guest_name,
            COALESCE(o.guest_phone, l.guest_phone) AS guest_phone,
            COALESCE(o.amount_ngn, l.amount_ngn)   AS amount_ngn
     FROM email_delivery_block b
     LEFT JOIN reports r ON r.id = b.report_id
     LEFT JOIN orders  o ON o.id = COALESCE(b.order_id, r.order_id)
     LEFT JOIN LATERAL (
       SELECT o2.id AS order_id, o2.vin, o2.guest_name, o2.guest_phone, o2.amount_ngn,
              r2.id AS report_id, r2.status AS report_status
       FROM orders o2
       LEFT JOIN reports r2 ON r2.order_id = o2.id
       WHERE LOWER(o2.guest_email) = b.email AND o2.payment_status = 'SUCCESS'
       ORDER BY o2.created_at DESC
       LIMIT 1
     ) l ON TRUE
     WHERE b.resolved_at IS NULL
     ORDER BY b.created_at DESC
     LIMIT 100`
  ) as Row[];

  return NextResponse.json({ rows });
}

// Mark one block resolved — the customer was reached some other way.
export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const session = await getSession();
  const adminEmail = session!.email;

  const { id, resolution, note } = await req.json();
  if (!id?.trim()) {
    return NextResponse.json({ error: 'Block id is required.' }, { status: 400 });
  }
  const res = ['whatsapp', 'other'].includes(resolution) ? resolution : 'other';

  const updated = await prisma.$executeRawUnsafe(
    `UPDATE email_delivery_block
     SET resolved_at = NOW(), resolved_by = $1, resolution = $2, note = $3
     WHERE id = $4 AND resolved_at IS NULL`,
    adminEmail, res, note?.trim() || null, id.trim()
  );
  if (updated !== 1) {
    return NextResponse.json({ error: 'Already resolved, or no such block.' }, { status: 409 });
  }

  console.log('[undelivered] resolved', id, 'as', res, 'by', adminEmail);
  return NextResponse.json({ ok: true });
}

// Correct a mistyped delivery address and re-send the report to it.
//
// This is the only remedy that actually restores email delivery, and it's the
// right one for origin='bounce', which is usually a typo (gmail.con). It is
// NOT appropriate for origin='complaint' — that mailbox works fine; the person
// marked us spam, and mailing them at a different address to get around that
// would be worse than useless. The UI hides this action for complaints.
export async function PATCH(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const session = await getSession();
  const adminEmail = session!.email;

  const { id, new_email } = await req.json();
  const email = new_email?.trim().toLowerCase();
  if (!id?.trim()) {
    return NextResponse.json({ error: 'Block id is required.' }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid replacement email is required.' }, { status: 400 });
  }

  // MUST resolve the order the same way GET does, lateral backfill included.
  // Without it, an otp_login block (which has no report_id) resolved to a null
  // order here while GET happily showed one — so the panel rendered "Fix email
  // address" for a locked-out customer and the click always failed with "no
  // paid order linked". That is precisely the case this feature exists for.
  const blocks = await prisma.$queryRawUnsafe(
    `SELECT b.id, b.email, b.origin,
            COALESCE(b.order_id, r.order_id, l.order_id) AS order_id,
            COALESCE(b.report_id, l.report_id)           AS report_id
     FROM email_delivery_block b
     LEFT JOIN reports r ON r.id = b.report_id
     LEFT JOIN LATERAL (
       SELECT o2.id AS order_id, r2.id AS report_id
       FROM orders o2
       LEFT JOIN reports r2 ON r2.order_id = o2.id
       WHERE LOWER(o2.guest_email) = b.email AND o2.payment_status = 'SUCCESS'
       ORDER BY o2.created_at DESC
       LIMIT 1
     ) l ON TRUE
     WHERE b.id = $1 AND b.resolved_at IS NULL LIMIT 1`,
    id.trim()
  ) as Array<{ id: string; email: string; origin: string | null; order_id: string | null; report_id: string | null }>;

  const block = blocks[0];
  if (!block) {
    return NextResponse.json({ error: 'Already resolved, or no such block.' }, { status: 409 });
  }
  if (!block.order_id) {
    return NextResponse.json({ error: 'No paid order is linked to this block — nothing to re-point.' }, { status: 400 });
  }
  if (email === block.email) {
    return NextResponse.json({ error: 'That is the same address that is already suppressed.' }, { status: 400 });
  }

  // Check the replacement BEFORE writing it. Without this, correcting one
  // suppressed address to another suppressed address would silently land the
  // customer in exactly the same hole, with the block marked resolved.
  const suppression = await checkSuppression(email);
  if (suppression.suppressed) {
    return NextResponse.json(
      { error: `That address is also on the suppression list (${suppression.origin || 'unknown reason'}). Reach the customer on WhatsApp instead.` },
      { status: 400 }
    );
  }

  // Re-points the dashboard and any bundle credits too — both key off
  // LOWER(orders.guest_email) — so the corrected address can log in and see
  // this purchase. That is intended, not a side effect.
  await prisma.$executeRawUnsafe(
    `UPDATE orders SET guest_email = $1, updated_at = NOW() WHERE id = $2`,
    email, block.order_id
  );
  console.log('[undelivered] order', block.order_id, 'email corrected by', adminEmail);

  // The address is corrected regardless of whether the send succeeds — a
  // transient Resend failure shouldn't roll back a correction the admin
  // verified with the customer. Report the send outcome honestly instead.
  let sent = false;
  let sendError: string | null = null;
  if (block.report_id) {
    try {
      await resendReportEmail(block.report_id, email);
      sent = true;
    } catch (e) {
      sendError = (e as Error).message;
      console.error('[undelivered] re-send failed after correction:', sendError);
    }
  } else {
    sendError = 'No completed report is linked to this block — address updated, nothing to send.';
  }

  await prisma.$executeRawUnsafe(
    `UPDATE email_delivery_block
     SET resolved_at = NOW(), resolved_by = $1, resolution = 'email_corrected', note = $2
     WHERE id = $3`,
    adminEmail,
    `was ${block.email} → ${email}${sent ? '' : ` (re-send failed: ${sendError})`}`,
    block.id
  );

  return NextResponse.json({ ok: true, sent, error: sendError });
}
