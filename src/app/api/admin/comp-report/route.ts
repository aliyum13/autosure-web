import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateVIN } from '@/lib/vin';
import { generateReportAndEmail } from '@/lib/generate';
import { isAdminSession, getSession } from '@/lib/dal';

// Admin-only replacement for the old public CH-COMP-9X4K checkout path.
// Requires linking to a real prior paid order for this email, or an
// explicit logged reason for the rare case where there isn't one — every
// use is attributed to the admin session and recorded in comp_report_log.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const session = await getSession();
  const adminEmail = session!.email;

  const { vin, guest_name, guest_email, linked_order_id, reason } = await req.json();
  const upperVin = vin?.trim().toUpperCase();
  const email = guest_email?.trim().toLowerCase();

  // Every rejection below is logged. Previously a 400 returned to the client with
  // no server-side trace, so an admin reporting "it failed" left nothing to
  // diagnose after the fact — the reason had to be inferred from surrounding
  // request timing.
  const reject = (why: string, message: string) => {
    console.warn('[comp-report] REJECTED', why, '| admin:', adminEmail, '| vin:', upperVin || '(none)', '| email:', email || '(none)');
    return NextResponse.json({ error: message }, { status: 400 });
  };

  const vinCheck = validateVIN(upperVin || '');
  if (!vinCheck.valid) {
    return reject('invalid_vin_format', vinCheck.reason || 'Invalid VIN.');
  }
  if (!guest_name?.trim()) {
    return reject('missing_name', 'Customer name is required.');
  }
  if (!email || !email.includes('@')) {
    return reject('missing_or_invalid_email', 'Valid customer email is required.');
  }
  if (!linked_order_id?.trim() && !reason?.trim()) {
    return reject('no_linked_order_and_no_reason', 'Either a linked prior order or an explicit reason is required.');
  }

  // If a prior order is claimed, verify it's real: belongs to this email and was actually paid.
  if (linked_order_id?.trim()) {
    const priorOrder = await prisma.$queryRawUnsafe(
      `SELECT id FROM orders WHERE id = $1 AND LOWER(guest_email) = $2 AND payment_status = 'SUCCESS' LIMIT 1`,
      linked_order_id.trim(), email
    ) as Array<{ id: string }>;
    if (!priorOrder.length) {
      return reject(
        `linked_order_not_found (${linked_order_id.trim()})`,
        'Linked order not found for this email, or was not a successful paid order.'
      );
    }
  }

  const reference = `CH-COMP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  await prisma.$executeRawUnsafe(`
    INSERT INTO orders (id, user_id, vin, amount_ngn, paystack_reference, payment_status,
                       guest_name, guest_email, guest_phone, paid_at, created_at, updated_at)
    VALUES ($1, NULL, $2, 0, $3, 'SUCCESS', $4, $5, NULL, NOW(), NOW(), NOW())
  `, orderId, upperVin, reference, guest_name.trim(), email);

  const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const shareToken = `share_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO reports (id, order_id, user_id, vin, status, share_token, is_public, created_at, updated_at)
     VALUES ($1, $2, NULL, $3, 'PROCESSING', $4, false, NOW(), NOW())`,
    reportId, orderId, upperVin, shareToken
  );

  const logId = `complog_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO comp_report_log (id, admin_email, order_id, linked_order_id, vin, guest_email, reason, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    logId, adminEmail, orderId, linked_order_id?.trim() || null, upperVin, email, reason?.trim() || null
  );

  console.log('[comp-report]', adminEmail, 'issued free report for VIN:', upperVin, '| email:', email, '| linked_order:', linked_order_id || '(none — reason logged)');
  const outcome = await generateReportAndEmail(reportId, upperVin, guest_name.trim(), email);

  // Report the real outcome. generateReportAndEmail records failures on the
  // report row rather than throwing, so this route previously returned
  // "Free report generated and sent." even when ClearVin rejected the VIN and
  // the customer received nothing — telling support a case was resolved when
  // it wasn't. The comp_report_log entry above is intentionally kept either
  // way: it records that the comp was authorised, which is the audit point.
  if (outcome !== 'delivered' && outcome !== 'skipped_duplicate') {
    console.error('[comp-report] generation failed (', outcome, ') — nothing sent for report:', reportId);
    return NextResponse.json({
      error: outcome === 'invalid_vin'
        ? `Our data provider rejected this VIN as invalid — no report was generated and nothing was sent to the customer. Report ${reportId} is marked INVALID_VIN. Double-check the VIN before retrying.`
        : `Report generation failed — nothing was sent to the customer. Report ${reportId} is marked FAILED and can be retried.`,
      report_id: reportId,
      status: outcome,
    }, { status: 502 });
  }

  console.log('[comp-report] complete:', reportId);

  return NextResponse.json({
    order_id: orderId,
    comp: true,
    report_id: reportId,
    status: outcome,
    message: 'Free report generated and sent.',
    amount_ngn: 0,
  });
}

// Recent comp-report history for the admin panel list.
export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, admin_email, order_id, linked_order_id, vin, guest_email, reason, created_at
     FROM comp_report_log ORDER BY created_at DESC LIMIT 50`
  );
  return NextResponse.json({ log: rows });
}
