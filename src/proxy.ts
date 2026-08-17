import { NextRequest, NextResponse } from 'next/server';

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

  // Block legacy auth routes — redirect to home
  if (['/login', '/register', '/forgot-password', '/reset-password', '/dashboard'].some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
