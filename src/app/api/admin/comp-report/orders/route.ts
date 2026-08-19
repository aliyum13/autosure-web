import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminSession, getSession } from '@/lib/dal';

// PII lookup (email -> that customer's order history) — admin-gated and
// read-only, but still logged and rate-limited per admin, since it's still
// a lookup of customer data.
const MAX_LOOKUPS_PER_WINDOW = 30;
const WINDOW_MINUTES = 5;

export async function GET(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const session = await getSession();
  const adminEmail = session!.email;

  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  const recentLookups = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS n FROM comp_lookup_log
     WHERE admin_email = $1 AND created_at > NOW() - INTERVAL '${WINDOW_MINUTES} minutes'`,
    adminEmail
  ) as Array<{ n: number }>;
  if ((recentLookups[0]?.n ?? 0) >= MAX_LOOKUPS_PER_WINDOW) {
    return NextResponse.json({ error: 'Too many lookups. Please wait a few minutes.' }, { status: 429 });
  }

  const logId = `lookup_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO comp_lookup_log (id, admin_email, queried_email, created_at) VALUES ($1, $2, $3, NOW())`,
    logId, adminEmail, email
  );

  const orders = await prisma.$queryRawUnsafe(
    `SELECT o.id, o.vin, o.guest_name, o.amount_ngn, o.paid_at, o.created_at, r.id AS report_id, r.status AS report_status
     FROM orders o
     LEFT JOIN reports r ON r.order_id = o.id
     WHERE LOWER(o.guest_email) = $1 AND o.payment_status = 'SUCCESS'
     ORDER BY o.created_at DESC
     LIMIT 20`,
    email
  ) as Array<Record<string, unknown>>;

  return NextResponse.json({ orders });
}
