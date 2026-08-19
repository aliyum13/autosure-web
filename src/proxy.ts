import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Store referral code in cookie
  const ref = req.nextUrl.searchParams.get('ref');
  const response = NextResponse.next();
  if (ref) {
    response.cookies.set('carhaki_ref', ref.toUpperCase(), {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: false,
      path: '/',
    });
  }

  // Optimistic-only check (cookie decrypt, no DB call) — real authorization
  // happens server-side via verifySession() in the dashboard page itself.
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/login')) {
    const session = await decrypt(req.cookies.get('session')?.value);

    if (pathname.startsWith('/dashboard') && !session?.userId) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (pathname.startsWith('/login') && session?.userId) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
