import { Resend } from 'resend';
import { logApiCall } from '@/lib/apiLog';
import { prisma } from '@/lib/db';

const resend = new Resend(process.env.RESEND_API_KEY);

type SendPayload = Parameters<typeof resend.emails.send>[0];

/**
 * Wraps resend.emails.send() with call logging.
 *
 * Note: the Resend SDK resolves with { data, error } instead of throwing on an
 * API-level failure, so a caller that only checks for exceptions treats a
 * failed send as a success. This checks `error` explicitly so the log reflects
 * what actually happened.
 */
export async function sendTrackedEmail(operation: string, payload: SendPayload) {
  try {
    const result = await resend.emails.send(payload);
    if (result.error) {
      await logApiCall('resend', operation, false, JSON.stringify(result.error));
    } else {
      await logApiCall('resend', operation, true);
    }
    return result;
  } catch (e) {
    await logApiCall('resend', operation, false, (e as Error).message);
    throw e;
  }
}

// The report-ready email carries a sign-in prompt, and it is the only channel
// that reaches every guest customer: at the time of writing 450 of 523 orders
// (86%) came from people with no account. The dashboard already matches orders
// on guest_email, so a guest who signs in with the address they bought under
// immediately sees every report they have purchased — they simply have no way
// of knowing that.
//
// The prompt emphasises "this email address" deliberately: the mechanism
// depends on using the PURCHASE address, and signing in with a different one
// shows an empty dashboard and reads as broken.
//
// The "no login needed" line further up is left alone on purpose. It answers
// "how do I open this report"; the prompt answers "where are all my reports".
//
// NOTE: keep rationale like this OUT of the HTML template. Anything inside the
// template literal — HTML comments included — is shipped in the email body and
// visible to any recipient who views source. These are internal figures.
export async function sendReportReadyEmail({
  to,
  name,
  vin,
  make,
  model,
  year,
  pdfBuffer,
  reportId,
}: {
  to: string;
  name: string;
  vin: string;
  make?: string;
  model?: string;
  year?: number;
  pdfBuffer?: ArrayBuffer;
  reportId?: string;
}) {
  const carName = [year, make, model].filter(Boolean).join(' ') || vin;
  const firstName = name?.split(' ')[0] || 'there';
  const reportUrl = reportId ? `https://checkamvin.com/reports/${reportId}` : 'https://checkamvin.com';

  const attachments = pdfBuffer
    ? [{ filename: `CheckAm-Report-${vin}.pdf`, content: Buffer.from(pdfBuffer) }]
    : [];

  const fromAddr = process.env.RESEND_FROM_EMAIL || 'CheckAm <reports@checkamvin.com>';
  console.log('Sending email to:', to, '| PDF:', !!pdfBuffer);



  const pdfSection = pdfBuffer ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:0 0 24px;text-align:center;">
      <p style="margin:0;font-size:15px;"><strong>📎 Full Report Attached as PDF</strong></p>
      <p style="margin:8px 0 0;font-size:13px;color:#16a34a;">Open the attachment to see the complete ClearVin vehicle history</p>
    </div>` : '';

  const result = await sendTrackedEmail('send_report_ready', {
    from: fromAddr,
    to,
    subject: `Your CheckAm Report is Ready — ${carName} (${vin})`,
    attachments,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F5EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5EF;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:#1A1A1A;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
          <img src="https://www.checkamvin.com/logo-icon.png" width="48" height="48" style="width:48px;height:48px;border-radius:50%;margin-bottom:8px;" alt="CheckAm">
          <br>
          <span style="color:#ffffff;font-size:22px;font-weight:800;">Check<span style="color:#4ADE80;">Am</span></span>
          <p style="color:#BBF7D0;margin:6px 0 0;font-size:13px;">Check am before you buy</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px;">
          <h1 style="color:#1A1A1A;font-size:22px;margin:0 0 8px;">Your Report is Ready! 🎉</h1>
          <p style="color:#64748b;margin:0 0 20px;">Hello ${firstName},</p>
          <p style="color:#475569;margin:0 0 24px;line-height:1.6;">
            Your CheckAm vehicle history report for the <strong>${carName}</strong> has been generated.
            ${pdfBuffer ? 'The full official ClearVin report is <strong>attached as a PDF</strong>.' : 'Your report has been generated successfully.'}
          </p>

          <!-- VIN box -->
          <div style="background:#F2EFE7;border-radius:12px;padding:16px;margin:0 0 24px;">
            <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Vehicle Checked</p>
            <p style="margin:0;font-size:17px;font-weight:700;color:#1A1A1A;font-family:monospace;">${vin}</p>
            <p style="margin:4px 0 0;font-size:14px;color:#475569;">${carName}</p>
          </div>

          <!-- View Report Online button — always works even if PDF attachment fails -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td align="center">
            <a href="${reportUrl}" style="display:inline-block;background:#16A34A;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;">
              View Your Full Report →
            </a>
          </td></tr></table>
          <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0 0 24px;line-height:1.6;">
            ${pdfBuffer ? 'Your report is also attached as a PDF. ' : ''}Tap the button above to view your complete report online anytime — no login needed.
          </p>

          ${pdfSection}

          <div style="background:#F7F5EF;border:1px solid #E4DFD2;border-radius:12px;padding:16px;margin:0 0 24px;">
            <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#1A1A1A;">
              Want all your reports in one place?
            </p>
            <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
              Sign in at <a href="https://checkamvin.com/login" style="color:#16A34A;">checkamvin.com/login</a>
              using <strong>this email address</strong> — no password needed, we&rsquo;ll send you a code.
              Every report you&rsquo;ve bought, including this one, will be there.
            </p>
          </div>

          <p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.6;">
            <!-- TODO(checkam-contact): add CheckAm's WhatsApp number back here once it exists. -->
            Need help? Email us at <a href="mailto:support@checkamvin.com" style="color:#16A34A;">support@checkamvin.com</a>.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#1A1A1A;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">© 2026 CheckAm Nigeria. All rights reserved.</p>
          <p style="color:#64748b;font-size:11px;margin:0;">Powered by USA government records (NMVTIS) via ClearVin</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
  });

  console.log('Resend result:', JSON.stringify(result));
  return result;
}

export async function sendOtpEmail({ to, code }: { to: string; code: string }) {
  const fromAddr = process.env.RESEND_FROM_EMAIL || 'CheckAm <reports@checkamvin.com>';

  return sendTrackedEmail('send_otp', {
    from: fromAddr,
    to,
    subject: `${code} is your CheckAm login code`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F5EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5EF;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:#1A1A1A;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
          <img src="https://www.checkamvin.com/logo-icon.png" width="48" height="48" style="width:48px;height:48px;border-radius:50%;margin-bottom:8px;" alt="CheckAm">
          <br>
          <span style="color:#ffffff;font-size:22px;font-weight:800;">Check<span style="color:#4ADE80;">Am</span></span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px;text-align:center;">
          <h1 style="color:#1A1A1A;font-size:20px;margin:0 0 8px;">Your login code</h1>
          <p style="color:#64748b;margin:0 0 24px;">Enter this code to sign in to CheckAm:</p>

          <div style="background:#F2EFE7;border-radius:12px;padding:20px;margin:0 0 24px;">
            <p style="margin:0;font-size:32px;font-weight:800;letter-spacing:0.15em;color:#1A1A1A;font-family:monospace;">${code}</p>
          </div>

          <p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.6;">
            This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#1A1A1A;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">© 2026 CheckAm Nigeria. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
  });
}

/**
 * Re-sends an already-generated report to an address, without regenerating it.
 *
 * Used by the admin "correct delivery email" action: the usual cause of a hard
 * bounce is a mistyped address, and the report itself is perfectly fine sitting
 * in the database. Reading vin/pdf_data/vehicle back off the report row means
 * NO ClearVin call and no credit burned — regenerating for a typo would cost a
 * report credit for a purely clerical fix.
 *
 * make/model/year are optional in sendReportReadyEmail (it falls back to the
 * VIN), so a report stored via the CLEARVIN html path — which has no vehicle
 * object — still produces a correct email.
 */
export async function resendReportEmail(reportId: string, to: string, name?: string) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT r.vin, r.status, r.pdf_data, r.processed_data->'vehicle' AS vehicle, o.guest_name
     FROM reports r JOIN orders o ON o.id = r.order_id
     WHERE r.id = $1 LIMIT 1`,
    reportId
  ) as Array<{
    vin: string;
    status: string;
    pdf_data: Buffer | null;
    vehicle: { make?: string; model?: string; year?: number } | null;
    guest_name: string | null;
  }>;

  const row = rows[0];
  if (!row) throw new Error('Report not found');
  if (row.status !== 'COMPLETED') throw new Error(`Report is ${row.status}, not COMPLETED — nothing to send`);

  const pdf = row.pdf_data;
  return sendReportReadyEmail({
    to,
    name: name || row.guest_name || to,
    vin: row.vin,
    make: row.vehicle?.make,
    model: row.vehicle?.model,
    year: row.vehicle?.year,
    // Buffer is a Uint8Array view, which may sit inside a larger pooled
    // ArrayBuffer — slicing by byteOffset/byteLength keeps the attachment from
    // picking up neighbouring bytes.
    pdfBuffer: pdf ? pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer : undefined,
    reportId,
  });
}
