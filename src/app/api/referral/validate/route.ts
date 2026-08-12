import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const COMP_CODE = 'CH-COMP-9X4K';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.json({ valid: false });

  // Internal comp code — valid but not stored in referral_codes
  if (code.toUpperCase().trim() === COMP_CODE) {
    return NextResponse.json({ valid: true, name: 'Free report' });
  }

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
