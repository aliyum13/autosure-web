import { logApiCall } from '@/lib/apiLog';

// Why an address landed on the list. Resend calls this `origin` and returns one
// of these three; the distinction drives how support recovers the customer:
//   bounce    — mailbox is dead or (far more often) mistyped. The fix is a
//               corrected address, so the report can actually be emailed.
//   complaint — mailbox works fine, the customer hit "spam" once. NEVER re-mail
//               them; deliver the report link over WhatsApp instead.
//   manual    — we (or a teammate) added it by hand.
export type SuppressionOrigin = 'bounce' | 'complaint' | 'manual';

export interface SuppressionResult {
  suppressed: boolean;
  origin: SuppressionOrigin | null;
}

const NOT_SUPPRESSED: SuppressionResult = { suppressed: false, origin: null };

function parseOrigin(value: unknown): SuppressionOrigin | null {
  return value === 'bounce' || value === 'complaint' || value === 'manual' ? value : null;
}

// Checks Resend's suppression list before sending — an address lands there
// automatically after a hard bounce or a spam complaint. Resend skips ALL
// sending to a suppressed recipient across every domain on the account, so a
// send attempt would be silently dropped; we check first and fail fast/loud
// instead of finding out days later that mail is going nowhere.
export async function checkSuppression(email: string): Promise<SuppressionResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NOT_SUPPRESSED; // fail open — don't block sends on a misconfigured key

  try {
    const res = await fetch(`https://api.resend.com/suppressions/${encodeURIComponent(email.trim().toLowerCase())}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    // 404 (not suppressed) and 200 (suppressed) are both successful checks —
    // only an unexpected status means the check itself didn't work. This is the
    // exact distinction that made the "API key lacks suppressions permission"
    // 401 invisible before: sends kept succeeding while every check silently
    // failed open.
    if (res.status === 404) {
      await logApiCall('resend', 'suppression_check', true);
      return NOT_SUPPRESSED;
    }
    if (res.ok) {
      await logApiCall('resend', 'suppression_check', true);
      // A suppression record exists. The origin is advisory only — a body we
      // can't parse must not downgrade this to "not suppressed", so the flag is
      // set regardless and only `origin` degrades to null.
      let origin: SuppressionOrigin | null = null;
      try {
        const body = await res.json() as { origin?: unknown; data?: { origin?: unknown } };
        origin = parseOrigin(body?.origin) ?? parseOrigin(body?.data?.origin);
      } catch { /* origin is a nice-to-have; suppression itself is confirmed */ }
      return { suppressed: true, origin };
    }
    console.warn('[suppression] unexpected status checking', email, res.status);
    await logApiCall('resend', 'suppression_check', false, `unexpected status ${res.status}`);
    return NOT_SUPPRESSED; // fail open on unexpected API errors — don't block legitimate sends
  } catch (e) {
    console.warn('[suppression] check failed, proceeding:', (e as Error).message);
    await logApiCall('resend', 'suppression_check', false, (e as Error).message);
    return NOT_SUPPRESSED;
  }
}

// Boolean shim for call sites that only gate a send and don't need the reason.
export async function isEmailSuppressed(email: string): Promise<boolean> {
  return (await checkSuppression(email)).suppressed;
}
