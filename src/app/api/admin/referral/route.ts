import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminSession } from '@/lib/dal';

export async function GET() {
  if (!(await isAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const codes = await prisma.$queryRawUnsafe(`
      SELECT 
        rc.id, rc.code, rc.name, rc.email, rc.phone, rc.is_active, rc.clicks, rc.created_at,
        COUNT(r.id) as total_sales,
        COALESCE(SUM(r.commission_ngn), 0) as total_commission,
        COALESCE(SUM(CASE WHEN r.is_paid = false THEN r.commission_ngn ELSE 0 END), 0) as unpaid_commission
      FROM referral_codes rc
      LEFT JOIN referrals r ON r.referral_code_id = rc.id
      GROUP BY rc.id, rc.code, rc.name, rc.email, rc.phone, rc.is_active, rc.clicks, rc.created_at
      ORDER BY rc.created_at DESC
    `) as Array<Record<string, unknown>>;

    const serialized = codes.map((rc) => ({
      ...rc,
      clicks: Number(rc.clicks),
      total_sales: Number(rc.total_sales),
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
