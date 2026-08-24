import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifySession } from '@/lib/dal';
import { getOrCreateReferralCode, getReferralBalance, CUSTOMER_REFERRAL_REWARD_KOBO } from '@/lib/referral';

// The signed-in customer's own referral code, balance and ledger.
//
// Session-gated and scoped entirely to the session's own account — nothing here
// takes an email or a code from the caller. The public /ref/[code] page exists
// for influencer codes and deliberately does not serve customer codes, which
// would otherwise expose one customer's earnings to anyone holding their link.
export async function GET() {
  const session = await verifySession();

  try {
    const code = await getOrCreateReferralCode(session.userId, 'CarHaki customer');
    const balanceKobo = await getReferralBalance(session.email);

    // Only converted referrals count — migration 011's whole point. A referred
    // checkout that was never paid must not show up as a successful referral.
    const counts = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) FILTER (WHERE r.converted_at IS NOT NULL)::int AS confirmed,
              COUNT(*) FILTER (WHERE r.converted_at IS NULL)::int     AS pending
       FROM referrals r
       JOIN referral_codes rc ON rc.id = r.referral_code_id
       WHERE rc.owner_account_id = $1`,
      session.userId
    ) as Array<{ confirmed: number; pending: number }>;

    const ledger = await prisma.$queryRawUnsafe(
      `SELECT kind, amount_kobo, note, created_at
       FROM referral_earnings
       WHERE LOWER(referrer_email) = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      session.email.toLowerCase()
    ) as Array<Record<string, unknown>>;

    return NextResponse.json({
      code,
      share_url: `https://carhaki.com/?ref=${code}`,
      balance_kobo: balanceKobo,
      reward_per_referral_kobo: CUSTOMER_REFERRAL_REWARD_KOBO,
      confirmed_referrals: Number(counts[0]?.confirmed ?? 0),
      pending_referrals: Number(counts[0]?.pending ?? 0),
      ledger: ledger.map((l) => ({
        kind: l.kind,
        amount_kobo: Number(l.amount_kobo),
        note: l.note,
        created_at: l.created_at,
      })),
    });
  } catch (error) {
    console.error('[referral/me] failed:', error);
    return NextResponse.json({ error: 'Could not load your referral details.' }, { status: 500 });
  }
}
