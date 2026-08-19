import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getSessionPayload, SessionPayload } from '@/lib/session';

// Optional-auth check — never redirects. Use where a logged-out visitor is
// a normal, expected case (e.g. public pages that adapt slightly for
// logged-in users).
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  return getSessionPayload();
});

// Hard-gate check — redirects to /login if there's no valid session. Use in
// route handlers and pages that require an authenticated account (dashboard,
// account-scoped API routes).
export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await getSessionPayload();
  if (!session?.userId) {
    redirect('/login');
  }
  return session;
});

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

// Admin gate — same OTP/session system as customer accounts, no separate
// password. Redirects to /login if unauthenticated; redirects home if
// authenticated but not on the ADMIN_EMAILS allowlist.
export const verifyAdminSession = cache(async (): Promise<SessionPayload> => {
  const session = await verifySession();
  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(session.email.toLowerCase())) {
    redirect('/');
  }
  return session;
});

// Non-redirecting variant for API routes, which should return 401/403
// JSON instead of a redirect.
export const isAdminSession = cache(async (): Promise<boolean> => {
  const session = await getSessionPayload();
  if (!session?.userId) return false;
  return getAdminEmails().includes(session.email.toLowerCase());
});
