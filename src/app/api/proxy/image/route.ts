import { NextRequest, NextResponse } from 'next/server';
import { clearvinGetToken } from '@/lib/clearvin';

const allowedDomains = ['clearvin.com', 'iaai.com', 'copart.com', 'manheim.com', 'amazonaws.com'];

function matchesAllowedDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return new NextResponse('Missing url', { status: 400 });

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  if (parsedUrl.protocol !== 'https:') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const isAllowed = allowedDomains.some(d => matchesAllowedDomain(parsedUrl.hostname, d));
  if (!isAllowed) return new NextResponse('Forbidden', { status: 403 });

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (compatible; CarHaki/1.0)',
      'Accept': 'image/*,*/*',
      'Referer': 'https://www.clearvin.com/',
    };

    // Add auth for ClearVin API endpoints (not CDN images)
    if (matchesAllowedDomain(parsedUrl.hostname, 'clearvin.com') && !url.includes('/images/auctions/')) {
      try {
        const token = await clearvinGetToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch { /* proceed without auth */ }
    }

    console.log('Proxy fetching:', url.substring(0, 80));
    const res = await fetch(url, { headers });
    console.log('Proxy response status:', res.status, res.statusText);
    if (!res.ok) return new NextResponse('Image not found', { status: 404 });

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new NextResponse('Failed to fetch image', { status: 500 });
  }
}
