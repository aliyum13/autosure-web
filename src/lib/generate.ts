import { prisma } from '@/lib/db';
import { clearvinReportHTML, clearvinReportPDF } from '@/lib/clearvin';
import { sendReportReadyEmail } from '@/lib/email';

const withTimeout = <T>(p: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms)),
  ]);

export async function generateReportAndEmail(
  reportId: string,
  vin: string,
  guestName?: string,
  guestEmail?: string
) {
  console.log('[generate] START', { reportId, vin, guestEmail });

  await prisma.$executeRawUnsafe(
    `UPDATE reports SET status = 'PROCESSING', updated_at = NOW() WHERE id = $1`, reportId
  );

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

  // Guard: if this report (or another report for the same VIN+email) already has a
  // successful ClearVin result, do NOT regenerate/overwrite it with a possible fallback.
  try {
    const existing = await prisma.$queryRawUnsafe(
      `SELECT processed_data->>'data_source' AS source
       FROM reports WHERE id = $1 LIMIT 1`, reportId
    ) as Array<{ source: string | null }>;
    if (existing[0]?.source === 'CLEARVIN') {
      console.log('[generate] Report already has ClearVin data — skipping regeneration');
      return;
    }
  } catch { /* proceed */ }

  // ClearVin HTML — fetch with retries (transient timeouts are common).
  // Try up to 3 times with a generous timeout before falling back to NHTSA.
  let clearvinHtml: string | null = null;
  for (let attempt = 1; attempt <= 3 && !clearvinHtml; attempt++) {
    try {
      clearvinHtml = await withTimeout(clearvinReportHTML(vin), 25000, `ClearVin HTML attempt ${attempt}`);
      console.log('[generate] ClearVin HTML OK on attempt', attempt);
    } catch (e) {
      console.warn(`[generate] ClearVin HTML attempt ${attempt} failed:`, (e as Error).message);
      if (attempt < 3) await new Promise(r => setTimeout(r, 1500)); // brief backoff
    }
  }

  // Compute grade
  const score = Math.max(0, 100 - recallsList.length * 5);
  const grade = score>=90?'A':score>=75?'B':score>=55?'C':score>=35?'D':'F';
  const label = score>=90?'Excellent':score>=75?'Good':score>=55?'Fair':score>=35?'Poor':'High Risk';
  const colour = score>=90?'#16a34a':score>=75?'#2563eb':score>=55?'#d97706':score>=35?'#ea580c':'#dc2626';

  // Fetch the PDF (the real deliverable) — this endpoint works reliably.
  let pdfBuffer: ArrayBuffer | null = null;
  try {
    pdfBuffer = await withTimeout(clearvinReportPDF(vin), 30000, 'ClearVin PDF');
    console.log('[generate] PDF fetched:', !!pdfBuffer, pdfBuffer?.byteLength);
  } catch (e) {
    console.warn('[generate] PDF failed:', (e as Error).message);
  }

  // Decide report content:
  // 1. Best: real ClearVin HTML (for rich on-site view)
  // 2. Good: PDF succeeded — deliver via PDF + preview data, mark COMPLETED
  // 3. Fail: neither HTML nor PDF — flag NEEDS_RETRY, don't deliver empty
  if (!clearvinHtml && !pdfBuffer) {
    console.error('[generate] ClearVin returned nothing (no HTML, no PDF) for', vin, '— NEEDS_RETRY');
    await prisma.$executeRawUnsafe(
      `UPDATE reports SET status='NEEDS_RETRY',
         processed_data=$1::jsonb, updated_at=NOW()
       WHERE id=$2 AND (processed_data->>'data_source') IS DISTINCT FROM 'CLEARVIN'`,
      JSON.stringify({ data_source: 'NEEDS_RETRY', vehicle: { vin, make, model, year }, needs_retry: true }),
      reportId
    );
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'CarHaki <reports@carhaki.com>',
        to: process.env.ADMIN_EMAIL || 'carhakidev@gmail.com',
        subject: `⚠️ ClearVin returned nothing for ${vin} — needs retry`,
        html: `<p>No HTML and no PDF from ClearVin for VIN <strong>${vin}</strong> (report ${reportId}, customer ${guestEmail}).</p>`,
      });
    } catch (e) { console.error('[generate] admin notify failed:', e); }
    return;
  }

  // Build processed data. Prefer HTML if we got it; otherwise mark as PDF-delivered
  // (report page will show preview-style summary, PDF has the full detail).
  const processedData = clearvinHtml
    ? { data_source: 'CLEARVIN', clearvin_html: clearvinHtml }
    : { data_source: 'CLEARVIN_PDF', vehicle: { vin, make, model, year }, recalls: recallsList, pdf_delivered: true };

  await prisma.$executeRawUnsafe(`
    UPDATE reports SET status='COMPLETED', overall_grade=$1, risk_score=$2,
      grade_label=$3, grade_colour=$4, processed_data=$5::jsonb, completed_at=NOW(), updated_at=NOW()
    WHERE id=$6
  `, grade, score, label, colour, JSON.stringify(processedData), reportId);
  console.log('[generate] DB saved, source:', clearvinHtml ? 'CLEARVIN(html)' : 'CLEARVIN_PDF');

  // Send email
  if (guestEmail) {
    console.log('[generate] Sending email to:', guestEmail, '| PDF:', !!pdfBuffer);
    try {
      await sendReportReadyEmail({
        to: guestEmail,
        name: guestName || guestEmail,
        vin, make, model, year,
        pdfBuffer: pdfBuffer ?? undefined,
        reportId,
      });
      console.log('[generate] EMAIL SENT to:', guestEmail);
    } catch (e) {
      console.error('[generate] Email failed:', e);
    }
  } else {
    console.warn('[generate] No guestEmail — skipping email');
  }
}
