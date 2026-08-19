import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { clearvinReportPDF } from '@/lib/clearvin';

export const maxDuration = 60;

// Public PDF download by report ID — works for guest customers (no login).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const reports = await prisma.$queryRawUnsafe(
      `SELECT vin, processed_data, pdf_data FROM reports WHERE id = $1 AND status = 'COMPLETED' LIMIT 1`,
      id
    ) as Array<{ vin: string; processed_data: { data_source?: string }; pdf_data: Buffer | null }>;

    const report = reports[0];
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    // Stored at generation time (Stage 2+) — serves our own copy, no ClearVin dependency.
    if (report.pdf_data) {
      return new NextResponse(new Uint8Array(report.pdf_data), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="CarHaki-Report-${report.vin}.pdf"`,
        },
      });
    }

    // Fallback for reports generated before PDF storage existed. Only ClearVin
    // reports have a PDF to re-fetch.
    if (report.processed_data?.data_source !== 'CLEARVIN') {
      return NextResponse.json({ error: 'PDF not available for this report' }, { status: 404 });
    }

    // Fetch fresh PDF from ClearVin by VIN (free re-download for already-run VINs)
    const pdfBuffer = await clearvinReportPDF(report.vin);
    if (!pdfBuffer) {
      return NextResponse.json({ error: 'PDF could not be retrieved' }, { status: 502 });
    }

    return new NextResponse(pdfBuffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="CarHaki-Report-${report.vin}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF download error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
