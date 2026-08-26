import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAdminSession } from '@/lib/dal';
import { extractReportId } from '@/lib/reportId';

// Runs extractReportId() over every stored ClearVin HTML report and reports the
// hit rate. The browser-triggerable equivalent of
// scripts/validate-report-id-extraction.mjs, for when DATABASE_URL is marked
// Sensitive in Vercel and therefore cannot be read out to run the script
// locally.
//
// Read-only. Makes no ClearVin calls and spends no credits. Returns counts,
// report ids and VINs — never HTML, never the connection string.
//
// Worth keeping rather than reverting: it re-answers "does extraction still
// work?" for free whenever ClearVin changes their markup, which is exactly the
// question that went unanswered while the reuse path silently never fired.

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Each stored report is ~80KB of HTML. Loading 227 at once is ~18MB in one
// serverless invocation, so they are streamed in chunks and the HTML is
// dropped as soon as it has been checked.
const CHUNK = 25;
const TIME_BUDGET_MS = 45_000; // of the 60s ceiling, leaving room to respond

const VALID = /^[0-9A-F]{8}$/;

interface Row { id: string; vin: string | null; html: string | null }

export async function GET(req: NextRequest) {
  await verifyAdminSession();

  const started = Date.now();
  let offset = Number(req.nextUrl.searchParams.get('offset') || 0);
  if (!Number.isInteger(offset) || offset < 0) offset = 0;

  let checked = 0;
  let extracted = 0;
  const failures: Array<{ id: string; vin: string | null; htmlLen: number }> = [];
  const idCounts = new Map<string, number>();
  let complete = true;

  try {
    for (;;) {
      if (Date.now() - started > TIME_BUDGET_MS) { complete = false; break; }

      const rows = await prisma.$queryRawUnsafe(
        `SELECT id, vin, processed_data->>'clearvin_html' AS html
         FROM reports
         WHERE processed_data->>'clearvin_html' IS NOT NULL
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        CHUNK, offset
      ) as Row[];

      if (rows.length === 0) break;

      for (const r of rows) {
        checked++;
        const html = r.html || '';
        const id = extractReportId(html);
        if (id && VALID.test(id)) {
          extracted++;
          idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
        } else {
          // Capped: a systemic failure would otherwise return 227 entries.
          if (failures.length < 25) {
            failures.push({ id: r.id, vin: r.vin, htmlLen: html.length });
          }
        }
      }

      offset += rows.length;
      if (rows.length < CHUNK) break;
    }

    // Every report is a separate purchase, so ids must be unique. A duplicate
    // means extraction is picking up a shared or templated value rather than
    // this report's own id — which would send the free PDF re-fetch to the
    // WRONG report and serve one customer another's document.
    const duplicates = [...idCounts.entries()]
      .filter(([, n]) => n > 1)
      .map(([id, count]) => ({ id, count }));

    const pass = complete && checked > 0 && failures.length === 0 && duplicates.length === 0;

    return NextResponse.json({
      pass,
      complete,
      checked,
      extracted,
      percent: checked ? Number(((extracted / checked) * 100).toFixed(1)) : 0,
      distinctIds: idCounts.size,
      duplicates,
      failureCount: checked - extracted,
      failures,
      nextOffset: complete ? null : offset,
      verdict: pass
        ? 'PASS — every stored report yielded a unique, valid reportId.'
        : !complete
          ? `Incomplete — checked ${checked} so far. Re-request with ?offset=${offset} to continue.`
          : 'FAIL — do not enable reuse until this is 100% with no duplicates.',
    });
  } catch (error) {
    console.error('[validate-report-id] failed:', error);
    return NextResponse.json(
      { error: 'Validation failed', message: (error as Error).message, checkedBeforeError: checked },
      { status: 500 }
    );
  }
}
