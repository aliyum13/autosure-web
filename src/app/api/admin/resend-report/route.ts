import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAdminSession, getSession } from '@/lib/dal';
import { resendReportEmail } from '@/lib/email';

// Re-sends an existing report's ready-email to an arbitrary address.
//
// Costs NOTHING: resendReportEmail reads vin/pdf_data/vehicle straight off the
// stored report row and never calls ClearVin. Previewing an email template
// should not burn a report credit.
//
// Two real uses:
//   * Support — "the customer says it never arrived, send it again".
//   * Checking template changes in a real mail client, which is the only way to
//     see what Gmail and Outlook actually do to the markup.
//
// The existing resend path (/api/admin/undelivered PATCH) is unsuitable for
// either: it requires an unresolved email_delivery_block row and rewrites
// orders.guest_email as a side effect.

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await verifyAdminSession();
  const session = await getSession();

  const reportId = (req.nextUrl.searchParams.get('report_id') || '').trim();
  const to = (req.nextUrl.searchParams.get('to') || '').trim().toLowerCase();

  if (!reportId) {
    return NextResponse.json({ error: 'report_id is required.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'A valid `to` address is required.' }, { status: 400 });
  }

  // This sends real mail to a real person. A bare GET would fire on a browser
  // prefetch, a refresh, or a mistyped URL, so sending is opt-in — the same
  // guard used for other one-shot admin actions.
  if (req.nextUrl.searchParams.get('confirm') !== 'yes') {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT vin, status, (pdf_data IS NOT NULL) AS has_pdf
       FROM reports WHERE id = $1 LIMIT 1`,
      reportId
    ) as Array<{ vin: string; status: string; has_pdf: boolean }>;

    if (!rows[0]) return NextResponse.json({ error: 'No such report.' }, { status: 404 });

    return NextResponse.json({
      wouldSend: { report: reportId, vin: rows[0].vin, status: rows[0].status, to },
      pdfAttached: rows[0].has_pdf,
      note: rows[0].has_pdf
        ? 'No call made. Add &confirm=yes to send. Costs nothing — served from stored pdf_data.'
        : 'No call made. This report has NO stored PDF, so the email will arrive without an attachment and the PDF section will not render. Pick a report with pdf_data to preview the full template.',
    });
  }

  try {
    await resendReportEmail(reportId, to);
    console.log('[admin] report email re-sent:', reportId, '->', to, 'by', session!.email);
    return NextResponse.json({ ok: true, report: reportId, to });
  } catch (e) {
    // resendReportEmail throws on a missing or non-COMPLETED report; surface
    // that rather than a generic failure, since it is the likely mistake.
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
