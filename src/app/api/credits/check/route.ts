import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/dal';

// Check how many report credits an email has available.
export async function GET(req: NextRequest) {
  // A signed-in customer's own email wins over whatever is in the query string.
  //
  // Two reasons. Their credits should show without having to type the right
  // address first — the balance is theirs, not a property of the text in the
  // form. And unauthenticated, this endpoint lets anyone probe whether an
  // arbitrary address holds credits; deferring to the session removes that for
  // every logged-in caller. Guests keep the query-param behaviour so guest
  // checkout is unchanged.
  const session = await getSession();
  const email = session?.email ?? req.nextUrl.searchParams.get('email');
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
