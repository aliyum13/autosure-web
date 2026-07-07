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

  // ClearVin HTML — fetch first (fast), 15s timeout
  let clearvinHtml: string | null = null;
  try {
    clearvinHtml = await withTimeout(clearvinReportHTML(vin), 15000, 'ClearVin HTML');
    console.log('[generate] ClearVin HTML OK');
  } catch (e) {
    console.warn('[generate] ClearVin HTML failed:', (e as Error).message);
  }

  // Compute grade
  const score = Math.max(0, 100 - recallsList.length * 5);
  const grade = score>=90?'A':score>=75?'B':score>=55?'C':score>=35?'D':'F';
  const label = score>=90?'Excellent':score>=75?'Good':score>=55?'Fair':score>=35?'Poor':'High Risk';
  const colour = score>=90?'#16a34a':score>=75?'#2563eb':score>=55?'#d97706':score>=35?'#ea580c':'#dc2626';

  const processedData = clearvinHtml
    ? { data_source: 'CLEARVIN', clearvin_html: clearvinHtml }
    : { data_source: 'NHTSA_FALLBACK', vehicle: { vin, make, model, year }, recalls: recallsList };

  await prisma.$executeRawUnsafe(`
    UPDATE reports SET status='COMPLETED', overall_grade=$1, risk_score=$2,
      grade_label=$3, grade_colour=$4, processed_data=$5::jsonb, completed_at=NOW(), updated_at=NOW()
    WHERE id=$6
  `, grade, score, label, colour, JSON.stringify(processedData), reportId);
  console.log('[generate] DB saved, data_source:', clearvinHtml ? 'CLEARVIN' : 'NHTSA_FALLBACK');

  // ClearVin PDF — separate call with generous 30s timeout (Pro allows 60s total)
  let pdfBuffer: ArrayBuffer | null = null;
  if (clearvinHtml) {
    try {
      pdfBuffer = await withTimeout(clearvinReportPDF(vin), 30000, 'ClearVin PDF');
      console.log('[generate] PDF fetched:', !!pdfBuffer, pdfBuffer?.byteLength);
    } catch (e) {
      console.warn('[generate] PDF failed (email sends without it):', (e as Error).message);
    }
  }

  // Send email
  if (guestEmail) {
    console.log('[generate] Sending email to:', guestEmail, '| PDF:', !!pdfBuffer);
    try {
      await sendReportReadyEmail({
        to: guestEmail,
        name: guestName || guestEmail,
        vin, make, model, year,
        pdfBuffer: pdfBuffer ?? undefined,
      });
      console.log('[generate] EMAIL SENT to:', guestEmail);
    } catch (e) {
      console.error('[generate] Email failed:', e);
    }
  } else {
    console.warn('[generate] No guestEmail — skipping email');
  }
}
