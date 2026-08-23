import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Lightweight report-status probe, for polling while generation is in flight.
 *
 * Deliberately separate from GET /api/reports/[id]: that route returns the full
 * processed_data, which for a ClearVin report includes ~95KB of stored HTML —
 * far too heavy to poll every few seconds. It also only returns rows already
 * marked COMPLETED, so it can't distinguish "still generating" from "no such
 * report" (both 404).
 *
 * Public for the same reason the report itself is public-by-link, and returns
 * strictly less information than the report route already exposes.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = await prisma.$queryRawUnsafe(
      `SELECT status, (pdf_data IS NOT NULL) AS has_pdf FROM reports WHERE id = $1 LIMIT 1`,
      id
    ) as Array<{ status: string; has_pdf: boolean }>;

    const row = rows[0];
    if (!row) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    return NextResponse.json({
      status: row.status,
      has_pdf: row.has_pdf === true,
      // Terminal states tell the client to stop polling. INVALID_VIN and FAILED
      // are terminal too — the report will never complete, so a client that
      // polls until COMPLETED would otherwise spin forever.
      done: row.status !== 'PROCESSING' && row.status !== 'PENDING',
    });
  } catch (error) {
    console.error('[report-status] fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
