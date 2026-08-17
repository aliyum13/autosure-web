import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createOtp, isRateLimited } from '@/lib/otp';
import { isEmailSuppressed } from '@/lib/suppression';
import { sendOtpEmail } from '@/lib/email';

const bodySchema = z.object({ email: z.string().trim().toLowerCase().email() });

export async function POST(req: NextRequest) {
  let email: string;
  try {
    const body = bodySchema.parse(await req.json());
    email = body.email;
  } catch {
    return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
  }

  try {
    if (await isEmailSuppressed(email)) {
      console.warn('[otp] request blocked — suppressed email:', email);
      return NextResponse.json(
        { error: 'We were unable to deliver mail to this address previously. Contact carhakisupport@gmail.com for help.' },
        { status: 403 }
      );
    }

    if (await isRateLimited(email)) {
      return NextResponse.json(
        { error: 'Too many codes requested. Please wait a few minutes and try again.' },
        { status: 429 }
      );
    }

    const code = await createOtp(email);

    // Preview-only debug aid so this can be verified end-to-end without
    // inbox access. Never logs the code in production.
    if (process.env.VERCEL_ENV !== 'production') {
      console.log('[otp] DEBUG code for', email, '=', code);
    }

    await sendOtpEmail({ to: email, code });
    console.log('[otp] code sent to:', email);
  } catch (e) {
    console.error('[otp] request failed:', e);
    // Still return success below — don't leak internal state, and don't let
    // a transient send failure block the generic response.
  }

  // Always generic — no account-existence enumeration; accounts are created
  // implicitly on first successful verify.
  return NextResponse.json({ message: 'If that email is valid, a code has been sent.' });
}
