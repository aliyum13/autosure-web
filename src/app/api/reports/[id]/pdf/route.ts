import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { clearvinReportPDF, clearvinReportPDFById, reportIdReuseEnabled } from '@/lib/clearvin';

export const maxDuration = 60;

// Public PDF download by report ID — works for guest customers (no login).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Content-Disposition decides whether a browser renders the PDF or saves
    // it, and it overrides the page's <object> embed entirely — an `attachment`
    // response cannot display inline no matter how it is embedded.
    //
    // This route hardcoded `attachment` from its very first commit, so the
    // report page's embed has never actually rendered. Browsers either
    // downloaded the file or painted a blank box, and that blank box was
    // misdiagnosed as an iOS Safari quirk and worked around with an
    // always-visible "Open Report PDF" button.
    //
    // Inline is now the default, for the embed. Download buttons opt in with
    // ?download=1.
    const asAttachment = req.nextUrl.searchParams.get('download') === '1';
    const disposition = asAttachment ? 'attachment' : 'inline';

    const reports = await prisma.$queryRawUnsafe(
      `SELECT vin, processed_data, pdf_data, clearvin_report_id
       FROM reports WHERE id = $1 AND status = 'COMPLETED' LIMIT 1`,
      id
    ) as Array<{
      vin: string;
      processed_data: { data_source?: string };
      pdf_data: Buffer | null;
      clearvin_report_id: string | null;
    }>;

    const report = reports[0];
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    // Stored at generation time (Stage 2+) — serves our own copy, no ClearVin dependency.
    if (report.pdf_data) {
      return new NextResponse(new Uint8Array(report.pdf_data), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `${disposition}; filename="AutoSure-Report-${report.vin}.pdf"`,
        },
      });
    }

    // Fallback for reports generated before PDF storage existed. Only ClearVin
    // reports have a PDF to re-fetch.
    if (report.processed_data?.data_source !== 'CLEARVIN') {
      return NextResponse.json({ error: 'PDF not available for this report' }, { status: 404 });
    }

    // Re-fetch from ClearVin.
    //
    // The comment that used to sit here called this a "free re-download for
    // already-run VINs". It is not: ?vin= generates and CHARGES a new report on
    // every call, so this route was billing us once per PDF *view* on the ~170
    // old reports that predate PDF storage. ?reportId= is the free path, but
    // those old rows have no id stored — nothing captured it at the time.
    //
    // So: use the id when we have it, and otherwise pay once and WRITE THROUGH,
    // which turns an unbounded per-view charge into a single per-report one.
    const canReuse = report.clearvin_report_id && reportIdReuseEnabled();
    const pdfBuffer = canReuse
      ? await clearvinReportPDFById(report.clearvin_report_id!)
      : await clearvinReportPDF(report.vin);

    if (!pdfBuffer) {
      return NextResponse.json({ error: 'PDF could not be retrieved' }, { status: 502 });
    }

    // Cache it so this report is never fetched again. Non-fatal: a failed write
    // costs a future re-fetch, but the customer still gets their PDF now.
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE reports SET pdf_data = $1, updated_at = NOW() WHERE id = $2`,
        Buffer.from(pdfBuffer), id
      );
      console.log('[pdf] cached pdf_data for report', id, '-', pdfBuffer.byteLength, 'bytes');
    } catch (e) {
      console.warn('[pdf] failed to cache pdf_data (non-fatal):', (e as Error).message);
    }

    return new NextResponse(pdfBuffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="AutoSure-Report-${report.vin}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF download error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
