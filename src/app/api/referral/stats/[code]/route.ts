import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const upperCode = code?.toUpperCase();

    const rows = await prisma.$queryRawUnsafe(`
      SELECT 
        rc.code, rc.name, rc.clicks,
        COUNT(r.id) FILTER (WHERE r.converted_at IS NOT NULL) as total_sales,
        COALESCE(SUM(r.commission_ngn) FILTER (WHERE r.converted_at IS NOT NULL), 0) as total_commission_ngn,
        COALESCE(SUM(r.commission_ngn) FILTER (WHERE r.converted_at IS NOT NULL AND r.is_paid = false), 0) as unpaid_commission_ngn
      FROM referral_codes rc
      LEFT JOIN referrals r ON r.referral_code_id = rc.id
      WHERE rc.code = $1 AND rc.is_active = true
      GROUP BY rc.code, rc.name, rc.clicks
    `, upperCode) as Array<Record<string, unknown>>;

    if (!rows[0]) {
      return NextResponse.json({ error: 'Code not found' }, { status: 404 });
    }

    return NextResponse.json({
      code: rows[0].code,
      name: rows[0].name,
      clicks: Number(rows[0].clicks),
      total_sales: Number(rows[0].total_sales),
      total_commission_ngn: Number(rows[0].total_commission_ngn),
      unpaid_commission_ngn: Number(rows[0].unpaid_commission_ngn),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
