import { logApiCall } from '@/lib/apiLog';

// Checks Resend's suppression list before sending — an address lands there
// automatically after a hard bounce or a spam complaint. Resend's send API
// doesn't document what happens if you send to a suppressed address anyway
// (silently dropped, most likely), so we check first and fail fast/loud
// instead of finding out days later that mail is going nowhere.
export async function isEmailSuppressed(email: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false; // fail open — don't block sends on a misconfigured key

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
      return false;
    }
    if (res.ok) {
      await logApiCall('resend', 'suppression_check', true);
      return true; // suppression record found (bounce or complaint)
    }
    console.warn('[suppression] unexpected status checking', email, res.status);
    await logApiCall('resend', 'suppression_check', false, `unexpected status ${res.status}`);
    return false; // fail open on unexpected API errors — don't block legitimate sends
  } catch (e) {
    console.warn('[suppression] check failed, proceeding:', (e as Error).message);
    await logApiCall('resend', 'suppression_check', false, (e as Error).message);
    return false;
  }
}
