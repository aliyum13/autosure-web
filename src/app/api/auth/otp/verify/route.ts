import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyOtp, getOrCreateAccount } from '@/lib/otp';
import { createSession } from '@/lib/session';

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().length(6),
});

const REASON_MESSAGES: Record<string, string> = {
  no_active_code: 'No active code for this email. Request a new one.',
  expired: 'This code has expired. Request a new one.',
  too_many_attempts: 'Too many incorrect attempts. Request a new code.',
  wrong_code: 'Incorrect code. Please try again.',
};

export async function POST(req: NextRequest) {
  let email: string, code: string;
  try {
    const body = bodySchema.parse(await req.json());
    email = body.email;
    code = body.code;
  } catch {
    return NextResponse.json({ error: 'Valid email and 6-digit code are required.' }, { status: 400 });
  }

  try {
    const result = await verifyOtp(email, code);
    if (!result.ok) {
      return NextResponse.json(
        { error: REASON_MESSAGES[result.reason] ?? 'Verification failed.' },
        { status: 400 }
      );
    }

    const account = await getOrCreateAccount(email);
    await createSession(account.id, account.email);
    console.log('[otp] verified, session created for:', account.email);

    return NextResponse.json({ message: 'Logged in.' });
  } catch (e) {
    console.error('[otp] verify failed:', e);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
