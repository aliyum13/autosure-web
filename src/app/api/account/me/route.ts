import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/dal';

// The signed-in customer's own checkout details, so /preview/[vin] can prefill
// instead of making them retype name, email and phone on every purchase.
//
// Uses getSession() rather than verifySession(): a 401 here is a normal state,
// not an error. Checkout calls this unconditionally and ignores the miss, so
// guest checkout has to keep working untouched.
export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ signedIn: false }, { status: 401 });
  }

  try {
    // Name and phone come from this account's most recent order — the closest
    // thing to a profile we have, since accounts only store id and email.
    // Matched on user_id OR email so it works both for orders attributed by
    // migration 015 and for any placed before under the same address.
    const rows = await prisma.$queryRawUnsafe(
      `SELECT guest_name, guest_phone
       FROM orders
       WHERE (user_id = $1 OR LOWER(guest_email) = LOWER($2))
         AND guest_name IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      session.userId, session.email
    ) as Array<{ guest_name: string | null; guest_phone: string | null }>;

    return NextResponse.json({
      signedIn: true,
      email: session.email,
      // Empty strings rather than null: these feed controlled inputs directly.
      name: rows[0]?.guest_name ?? '',
      phone: rows[0]?.guest_phone ?? '',
    });
  } catch (error) {
    console.error('[account/me] failed:', error);
    // Still report the session so checkout can at least prefill the email and
    // attribute the order — a lookup failure must not silently downgrade a
    // logged-in customer to an anonymous guest.
    return NextResponse.json({ signedIn: true, email: session.email, name: '', phone: '' });
  }
}
