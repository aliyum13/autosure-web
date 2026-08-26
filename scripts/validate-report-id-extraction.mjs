// Validates extractReportId() against EVERY stored ClearVin HTML report.
//
// This exists because the extractor shipped broken twice, both times having
// been "validated" against a single hand-picked sample. A depth cap of 8 passed
// every shallow fixture and failed every real report, where ClearVin nests the
// id inside a page-state blob of ~107 objects.
//
// Reads only. Makes no ClearVin calls, spends no credits, writes nothing.
//
//   DATABASE_URL='postgres://…' node scripts/validate-report-id-extraction.mjs
//
// Node 22.6+ strips TypeScript types natively, which is why reportId.ts has no
// imports — it can be pulled in directly here without Prisma or path aliases.

import { PrismaClient } from '@prisma/client';
import { extractReportId } from '../src/lib/reportId.ts';

const prisma = new PrismaClient();

const ok = (s) => typeof s === 'string' && /^[0-9A-F]{8}$/.test(s);

async function main() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, vin, processed_data->>'clearvin_html' AS html
     FROM reports
     WHERE processed_data->>'clearvin_html' IS NOT NULL
     ORDER BY created_at DESC`
  );

  console.log(`Checking ${rows.length} stored reports…\n`);

  const failures = [];
  const ids = new Map();
  let hits = 0;

  for (const r of rows) {
    const id = extractReportId(r.html);
    if (ok(id)) {
      hits++;
      ids.set(id, (ids.get(id) ?? 0) + 1);
    } else {
      failures.push({ id: r.id, vin: r.vin, len: r.html.length, got: id });
    }
  }

  const pct = rows.length ? ((hits / rows.length) * 100).toFixed(1) : '0.0';
  console.log(`Extracted: ${hits}/${rows.length}  (${pct}%)`);
  console.log(`Distinct ids: ${ids.size}`);

  // Every report is a separate purchase, so ids must be unique. A duplicate
  // means we are extracting some shared or templated value rather than this
  // report's own id — which would send the PDF re-fetch to the WRONG report.
  const dupes = [...ids.entries()].filter(([, n]) => n > 1);
  if (dupes.length) {
    console.log(`\n!! ${dupes.length} id(s) appear on more than one report — extraction is picking up a non-unique value:`);
    for (const [id, n] of dupes.slice(0, 10)) console.log(`   ${id} x${n}`);
  }

  if (failures.length) {
    console.log(`\nFailed on ${failures.length}:`);
    for (const f of failures.slice(0, 15)) {
      console.log(`   ${f.id}  vin=${f.vin}  htmlLen=${f.len}  got=${f.got}`);
    }
    if (failures.length > 15) console.log(`   …and ${failures.length - 15} more`);
  }

  const clean = failures.length === 0 && dupes.length === 0;
  console.log(clean
    ? '\nPASS — every stored report yielded a unique, valid reportId.'
    : '\nFAIL — do not ship until this is 100% with no duplicates.');

  await prisma.$disconnect();
  process.exit(clean ? 0 : 1);
}

main().catch(async (e) => {
  console.error('Validation errored:', e);
  await prisma.$disconnect();
  process.exit(1);
});
