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
