import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createOtp, isRateLimited } from '@/lib/otp';
import { checkSuppression } from '@/lib/suppression';
import { logDeliveryBlock } from '@/lib/deliveryBlock';
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
    // Resend skips ALL sending to a suppressed recipient, account-wide — so
    // there is no "send it anyway" option here: the code would be dropped and
    // the customer would sit waiting for a mail that never comes. Telling them
    // plainly, and pointing at a channel that actually works, is the only
    // honest response. This is the one place the generic-response rule below is
    // deliberately broken; the alternative is a silent dead end.
    const suppression = await checkSuppression(email);
    if (suppression.suppressed) {
      console.warn('[otp] request blocked — suppressed email:', email);
      // Surfaces them in the admin Undelivered Reports panel, so a locked-out
      // paying customer gets noticed even if they never contact support.
      await logDeliveryBlock({ email, context: 'otp_login', origin: suppression.origin });
      return NextResponse.json(
        {
          // TODO(checkam-contact): CheckAm has no WhatsApp line or social accounts yet.
          // This branch fires exactly when email to the customer is already
          // failing, so directing them to another inbox is a weak fallback.
          // It is the only channel CheckAm has today — give this one a real
          // WhatsApp number first when one exists.
          error: 'We can no longer deliver email to this address, so we cannot send you a code. '
            + 'Contact us at support@checkamvin.com from another address and we will send your report directly.',
        },
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
