// ============================================================================
// TEMPORARY DIAGNOSTIC — DELETE BEFORE MERGING PR #18.
//
// Exists for exactly one purpose: answer whether
// GET /report?reportId={id}&format=pdf returns the already-purchased report,
// by making ONE call from an environment that holds CLEARVIN_EMAIL /
// CLEARVIN_PASSWORD (they are Sensitive in Vercel, so write-only — no dashboard
// reveal and no way to run this from a laptop).
//
// Credentials never leave the server: clearvinGetToken() reads them from the
// runtime env and the token is used only for the outbound fetch. The response
// carries three numbers and a boolean — no token, no credentials, no PDF bytes.
//
// This route must not survive into main. It is deliberately in its own commit
// so it can be reverted as one unit.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAdminSession } from '@/lib/dal';
import { clearvinGetToken } from '@/lib/clearvin';

// No caching anywhere: a cached response would silently answer with a previous
// call's result, which is exactly the thing this route must not do.
export const dynamic = 'force-dynamic';

const REPORT_ID_RE = /^[0-9A-F]{8}$/i;

export async function GET(req: NextRequest) {
  await verifyAdminSession(); // redirects to /login, or / if not an admin

  const reportId = (req.nextUrl.searchParams.get('reportId') || '813A65F0').trim();
  const localReportId = req.nextUrl.searchParams.get('report') || 'rep_1787648516724_shl6kvk';

  // Strict allowlist before this ever reaches a URL.
  if (!REPORT_ID_RE.test(reportId)) {
    return NextResponse.json({ error: 'reportId must be 8 hex characters.' }, { status: 400 });
  }

  // Every call here may cost a ClearVin report. A bare GET would fire on a
  // browser prefetch, a refresh, or a mistyped URL, so the call is opt-in.
  if (req.nextUrl.searchParams.get('confirm') !== 'yes') {
    return NextResponse.json({
      willCall: `GET /report?reportId=${reportId}&format=pdf`,
      comparedAgainst: localReportId,
      note: 'No call made. Re-request with &confirm=yes to fire exactly one request.',
      warning: 'If reportId re-fetch is NOT free, this costs 1 report. Check the ClearVin balance before and after.',
    });
  }

  // Stored size for the comparison, so the answer is self-contained.
  let storedByteLength: number | null = null;
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT octet_length(pdf_data) AS n FROM reports WHERE id = $1 LIMIT 1`,
      localReportId
    ) as Array<{ n: number | null }>;
    storedByteLength = rows[0]?.n ?? null;
  } catch {
    // Non-fatal: the live numbers are still worth having without it.
  }

  try {
    const token = await clearvinGetToken();

    const res = await fetch(
      `https://www.clearvin.com/rest/vendor/report?reportId=${encodeURIComponent(reportId)}&format=pdf`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    );

    const buf = await res.arrayBuffer();
    const byteLength = buf.byteLength;

    // First bytes only — enough to tell a real PDF from a JSON error body,
    // without returning report content.
    const head = Buffer.from(buf.slice(0, 5)).toString('latin1');

    return NextResponse.json({
      httpStatus: res.status,
      contentType: res.headers.get('content-type'),
      byteLength,
      storedByteLength,
      matchesStored: storedByteLength !== null && storedByteLength === byteLength,
      looksLikePdf: head.startsWith('%PDF-'),
      reportId,
      // Deliberately NOT included: the token, the credentials, the PDF bytes.
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'Call failed', message: (e as Error).message, storedByteLength },
      { status: 502 }
    );
  }
}
