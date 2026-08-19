import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.json({ valid: false });

  try {
    const codes = await prisma.$queryRawUnsafe(
      `SELECT id, name FROM referral_codes WHERE code = $1 AND is_active = true LIMIT 1`,
      code.toUpperCase()
    ) as Array<{ id: string; name: string }>;
    return NextResponse.json({ valid: codes.length > 0, name: codes[0]?.name });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
