import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Public access — reports are viewable by anyone with the link.
    // NOTE: selects `pdf_data IS NOT NULL` as a boolean, never pdf_data itself —
    // the column holds 0.6-2MB of binary per report, and returning it here would
    // ship that as base64 JSON on every report view.
    const reports = await prisma.$queryRawUnsafe(
      `SELECT id, vin, status,
              processed_data, ai_summary, share_token, is_public, completed_at, created_at, user_id,
              (pdf_data IS NOT NULL) AS has_pdf
       FROM reports WHERE id = $1 AND status = 'COMPLETED' LIMIT 1`,
      id
    ) as Array<Record<string, unknown>>;

    const report = reports[0];
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    return NextResponse.json({
      id: report.id,
      vin: report.vin,
      search_identifier: report.vin,
      status: report.status,
      processed_data: report.processed_data,
      ai_summary: report.ai_summary,
      share_token: report.share_token,
      is_public: report.is_public,
      completed_at: report.completed_at,
      created_at: report.created_at,
      has_pdf: report.has_pdf === true,
    });
  } catch (error) {
    console.error('Report fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}
