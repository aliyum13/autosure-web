import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminSession, getSession } from '@/lib/dal';

export async function GET() {
  if (!(await isAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const codes = await prisma.$queryRawUnsafe(`
      -- converted_at IS NOT NULL is the ONLY thing that means "earned". A
      -- referrals row is written at checkout initiation, before payment, so
      -- an unqualified COUNT/SUM here counted abandoned checkouts as sales and
      -- overstated what we owe. pending_checkouts keeps the funnel visible
      -- rather than silently dropping those rows from view.
      SELECT 
        rc.id, rc.code, rc.name, rc.email, rc.phone, rc.is_active, rc.clicks, rc.created_at,
        COUNT(r.id) FILTER (WHERE r.converted_at IS NOT NULL) as total_sales,
        COUNT(r.id) FILTER (WHERE r.converted_at IS NULL)     as pending_checkouts,
        COALESCE(SUM(r.commission_ngn) FILTER (WHERE r.converted_at IS NOT NULL), 0) as total_commission,
        COALESCE(SUM(r.commission_ngn) FILTER (WHERE r.converted_at IS NOT NULL AND r.is_paid = false), 0) as unpaid_commission
      FROM referral_codes rc
      LEFT JOIN referrals r ON r.referral_code_id = rc.id
      GROUP BY rc.id, rc.code, rc.name, rc.email, rc.phone, rc.is_active, rc.clicks, rc.created_at
      ORDER BY rc.created_at DESC
    `) as Array<Record<string, unknown>>;

    const serialized = codes.map((rc) => ({
      ...rc,
      clicks: Number(rc.clicks),
      total_sales: Number(rc.total_sales),
      pending_checkouts: Number(rc.pending_checkouts),
      total_commission: Number(rc.total_commission),
      unpaid_commission: Number(rc.unpaid_commission),
    }));
    return NextResponse.json({ codes: serialized });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { code, name, email, phone } = await req.json();
    if (!code || !name) return NextResponse.json({ error: 'Code and name required' }, { status: 400 });

    const upperCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const id = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO referral_codes (id, code, name, email, phone, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      id, upperCode, name, email || null, phone || null
    );

    return NextResponse.json({ id, code: upperCode, name });
  } catch (error) {
    const msg = String(error);
    if (msg.includes('23505') || msg.includes('unique') || msg.includes('already exists')) {
      return NextResponse.json({ error: 'Code already exists. Try a different one.' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await req.json();
    await prisma.$executeRawUnsafe(
      `UPDATE referral_codes SET is_active = false, updated_at = NOW() WHERE id = $1`, id
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// Settle a payout: mark every CONVERTED, unpaid referral for this code as paid.
//
// Until now `is_paid` was flipped by hand in the Neon SQL editor — no record of
// who paid, how much, or when. Same reasoning as comp_report_log: an admin
// action that moves money gets an audit row.
//
// Scoped to converted_at IS NOT NULL so an abandoned checkout can never be
// marked paid, which would quietly bury it as settled.
export async function PATCH(req: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const session = await getSession();
  const adminEmail = session!.email;

  try {
    const { id, note } = await req.json();
    if (!id?.trim()) return NextResponse.json({ error: 'Referral code id is required.' }, { status: 400 });

    const codes = await prisma.$queryRawUnsafe(
      `SELECT id, code FROM referral_codes WHERE id = $1 LIMIT 1`, id.trim()
    ) as Array<{ id: string; code: string }>;
    if (!codes[0]) return NextResponse.json({ error: 'No such referral code.' }, { status: 404 });

    // Read the total BEFORE settling — afterwards these rows no longer match.
    const owed = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(SUM(commission_ngn), 0)::bigint AS amount, COUNT(*)::int AS n
       FROM referrals
       WHERE referral_code_id = $1 AND converted_at IS NOT NULL AND is_paid = false`,
      id.trim()
    ) as Array<{ amount: bigint | number; n: number }>;

    const amountKobo = Number(owed[0]?.amount ?? 0);
    const count = Number(owed[0]?.n ?? 0);
    if (count === 0) {
      return NextResponse.json({ error: 'Nothing outstanding to settle for this code.' }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE referrals SET is_paid = true
       WHERE referral_code_id = $1 AND converted_at IS NOT NULL AND is_paid = false`,
      id.trim()
    );

    const logId = `payout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO referral_payout_log (id, admin_email, referral_code_id, code, amount_kobo, referral_count, note, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      logId, adminEmail, codes[0].id, codes[0].code, amountKobo, count, note?.trim() || null
    );

    console.log('[referral] payout settled:', codes[0].code, amountKobo, 'kobo across', count, 'referrals by', adminEmail);
    return NextResponse.json({ ok: true, amount_kobo: amountKobo, referral_count: count });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
