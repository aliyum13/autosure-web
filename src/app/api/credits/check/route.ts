import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Check how many report credits an email has available.
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ credits: 0 });

  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(SUM(credits_total - credits_used), 0) AS available
       FROM report_credits
       WHERE email = $1 AND credits_used < credits_total`,
      email.toLowerCase().trim()
    ) as Array<{ available: number | bigint }>;

    const available = Number(rows[0]?.available ?? 0);
    return NextResponse.json({ credits: available });
  } catch (error) {
    console.error('Credits check error:', error);
    return NextResponse.json({ credits: 0 });
  }
}
