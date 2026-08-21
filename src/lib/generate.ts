import { prisma } from '@/lib/db';
import { clearvinReportHTML, clearvinReportPDF } from '@/lib/clearvin';
import { sendReportReadyEmail, sendTrackedEmail } from '@/lib/email';
import { isEmailSuppressed } from '@/lib/suppression';

const withTimeout = <T>(p: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms)),
  ]);

/**
 * Outcome of a generation attempt.
 *
 * This function deliberately does NOT throw when ClearVin returns nothing — it
 * records the failure on the report row and alerts admin. That means callers
 * cannot infer success from the absence of an exception, which is exactly the
 * bug this return type fixes: `/api/admin/comp-report` and the credit branch of
 * `/api/orders/create` were both reporting "generated and sent" for reports
 * that were marked INVALID_VIN and never delivered.
 *
 * `skipped_duplicate` means the idempotency guard fired — a completed report
 * already exists, so callers should treat it as delivered.
 */
export type GenerateOutcome = 'delivered' | 'invalid_vin' | 'failed' | 'skipped_duplicate';

export async function generateReportAndEmail(
  reportId: string,
  vin: string,
  guestName?: string,
  guestEmail?: string
): Promise<GenerateOutcome> {
  console.log('[generate] START', { reportId, vin, guestEmail });

  // Guard: if this report already completed with real ClearVin data, don't regenerate.
  // Prevents duplicate ClearVin credit usage if this function is triggered twice for the
  // same report (e.g. an admin retry, or webhook/verify both firing close together).
  try {
    const existing = await prisma.$queryRawUnsafe(
      `SELECT status, processed_data->>'data_source' AS source FROM reports WHERE id = $1 LIMIT 1`,
      reportId
    ) as Array<{ status: string; source: string | null }>;
    const row = existing[0];
    if (row && row.status === 'COMPLETED' && (row.source === 'CLEARVIN' || row.source === 'CLEARVIN_PDF')) {
      console.log('[generate] Report already COMPLETED with real ClearVin data — skipping regeneration');
      return 'skipped_duplicate';
    }
  } catch (e) { console.warn('[generate] idempotency check failed, proceeding:', e); }

  await prisma.$executeRawUnsafe(
    `UPDATE reports SET status = 'PROCESSING', updated_at = NOW() WHERE id = $1`, reportId
  );
  console.log('[generate] status set to PROCESSING');

  // NHTSA vehicle info (fast, parallel)
  let make: string | undefined, model: string | undefined, year: number | undefined;
  let recallsList: unknown[] = [];
  try {
    const [vinRes, recallRes] = await Promise.all([
      fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`),
      fetch(`https://api.nhtsa.gov/recalls/recallsByVin?vin=${vin}`),
    ]);
    const vinData = await vinRes.json();
    const v = vinData.Results?.[0];
    make = v?.Make || undefined;
    model = v?.Model || undefined;
    year = v?.ModelYear ? parseInt(v.ModelYear) : undefined;
    if (recallRes.ok) recallsList = (await recallRes.json()).results || [];
    console.log('[generate] Vehicle:', { make, model, year, recalls: recallsList.length });
  } catch (e) { console.error('[generate] NHTSA failed:', e); }

  // ClearVin HTML — single attempt, tight timeout to stay well under Vercel's 60s limit.
  // No retry: a client-side timeout doesn't mean the request failed on ClearVin's end —
  // retrying risks generating (and paying for) a second report for the same VIN.
  let clearvinHtml: string | null = null;
  let clearvinHtmlError: string | null = null;
  try {
    clearvinHtml = await withTimeout(clearvinReportHTML(vin), 12000, 'ClearVin HTML');
    console.log('[generate] ClearVin HTML OK');
  } catch (e) {
    clearvinHtmlError = (e as Error).message;
    console.warn('[generate] ClearVin HTML failed:', clearvinHtmlError);
  }

  // ClearVin PDF (the real deliverable) — tight 15s timeout.
  let pdfBuffer: ArrayBuffer | null = null;
  try {
    pdfBuffer = await withTimeout(clearvinReportPDF(vin), 15000, 'ClearVin PDF');
    console.log('[generate] PDF fetched:', !!pdfBuffer, pdfBuffer?.byteLength);
  } catch (e) {
    console.warn('[generate] PDF failed:', (e as Error).message);
  }

  // Grade
  const score = Math.max(0, 100 - recallsList.length * 5);
  const grade = score>=90?'A':score>=75?'B':score>=55?'C':score>=35?'D':'F';
  const label = score>=90?'Excellent':score>=75?'Good':score>=55?'Fair':score>=35?'Poor':'High Risk';
  const colour = score>=90?'#16a34a':score>=75?'#2563eb':score>=55?'#d97706':score>=35?'#ea580c':'#dc2626';

  // If ClearVin returned nothing at all, don't deliver an empty report — flag for retry.
  if (!clearvinHtml && !pdfBuffer) {
    // ClearVin permanently rejects some VINs ("Vin ... is not valid") — distinct
    // from a transient failure (timeout, rate limit, momentary empty response).
    // A permanent rejection must NOT stay 'FAILED': the admin recovery tool
    // retries everything WHERE status IN ('PROCESSING','FAILED') forever, and a
    // VIN that can never succeed would loop indefinitely. Confirmed by real
    // testing: one such VIN caused ~100 repeat ClearVin calls (triggering
    // ClearVin's own rate limit) and ~100 duplicate admin alerts before hitting
    // the recovery tool's client-side safety cap. See migrations/004.
    // ClearVin words this rejection differently per endpoint — the report
    // endpoint returns "Vin ... is not valid" while the preview endpoint
    // returns "Vin ... is invalid" (both observed in api_call_log for the same
    // VIN). Matching only one phrasing meant the recovery-loop protection
    // depended on the two endpoints happening to disagree: if the report
    // endpoint ever used the preview's wording, the report would be marked
    // FAILED instead of INVALID_VIN and the admin recovery tool would retry it
    // forever — the exact loop migration 004 exists to prevent.
    const isPermanentlyInvalid = /\bis\s+(?:not\s+valid|invalid)\b/i.test(clearvinHtmlError || '');
    const status = isPermanentlyInvalid ? 'INVALID_VIN' : 'FAILED';
    console.error(`[generate] ClearVin returned nothing for`, vin, `— marking ${status}`);
    await prisma.$executeRawUnsafe(
      `UPDATE reports SET status=$1::report_status, processed_data=$2::jsonb, updated_at=NOW() WHERE id=$3`,
      status,
      JSON.stringify({ data_source: status, vehicle: { vin, make, model, year }, needs_retry: !isPermanentlyInvalid, clearvin_error: clearvinHtmlError }),
      reportId
    );
    try {
      await sendTrackedEmail('send_admin_alert', {
        from: process.env.RESEND_FROM_EMAIL || 'CarHaki <reports@carhaki.com>',
        to: process.env.ADMIN_EMAIL || 'support@carhaki.com',
        subject: isPermanentlyInvalid
          ? `ClearVin rejects VIN ${vin} as invalid — not retryable`
          : `ClearVin returned nothing for ${vin} — needs retry`,
        html: `<p>No HTML and no PDF from ClearVin for VIN <strong>${vin}</strong> (report ${reportId}, customer ${guestEmail}).${isPermanentlyInvalid ? ' ClearVin says this VIN is invalid — no further automatic retries will happen.' : ''}</p>`,
      });
    } catch (e) { console.error('[generate] admin notify failed:', e); }
    return isPermanentlyInvalid ? 'invalid_vin' : 'failed';
  }

  const processedData = clearvinHtml
    ? { data_source: 'CLEARVIN', clearvin_html: clearvinHtml }
    : { data_source: 'CLEARVIN_PDF', vehicle: { vin, make, model, year }, recalls: recallsList, pdf_delivered: true };

  await prisma.$executeRawUnsafe(
    `UPDATE reports SET status='COMPLETED', overall_grade=$1, risk_score=$2,
       grade_colour=$3, processed_data=$4::jsonb, pdf_data=$5, completed_at=NOW(), updated_at=NOW()
     WHERE id=$6`,
    grade, score, colour, JSON.stringify(processedData), pdfBuffer ? Buffer.from(pdfBuffer) : null, reportId
  );
  // Set grade_label separately (proven to fail when combined in the write above)
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE reports SET grade_label=$1 WHERE id=$2`, label, reportId
    );
  } catch (e) { console.warn('[generate] grade_label set failed (non-fatal):', (e as Error).message); }
  console.log('[generate] COMPLETED, source:', clearvinHtml ? 'CLEARVIN(html)' : 'CLEARVIN_PDF');

  // Email (non-fatal if it fails)
  if (guestEmail) {
    try {
      if (await isEmailSuppressed(guestEmail)) {
        console.error('[generate] EMAIL SUPPRESSED — skipping send, report complete but undelivered:', guestEmail);
        try {
          await sendTrackedEmail('send_admin_alert', {
            from: process.env.RESEND_FROM_EMAIL || 'CarHaki <reports@carhaki.com>',
            to: process.env.ADMIN_EMAIL || 'support@carhaki.com',
            subject: `⚠️ Suppressed email — report ${reportId} generated but NOT delivered`,
            html: `<p>Customer <strong>${guestEmail}</strong> is on Resend's suppression list (prior hard bounce or complaint).
              Report ${reportId} for VIN <strong>${vin}</strong> completed successfully but was NOT emailed.</p>
              <p>Follow the "paid but didn't receive report" SOP to deliver manually.</p>`,
          });
        } catch (e) { console.error('[generate] admin suppression alert failed:', e); }
      } else {
        await sendReportReadyEmail({
          to: guestEmail,
          name: guestName || guestEmail,
          vin, make, model, year,
          pdfBuffer: pdfBuffer ?? undefined,
          reportId,
        });
        console.log('[generate] EMAIL SENT to:', guestEmail);
      }
    } catch (e) {
      console.error('[generate] Email failed (report still completed):', e);
    }
  }

  // 'delivered' means the report exists and is viewable at /reports/[id]. A
  // suppressed or failed email doesn't change that — those paths alert admin
  // separately and the report is still retrievable, so callers shouldn't
  // refund a credit or report outright failure for them.
  return 'delivered';
}
