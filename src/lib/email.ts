import { Resend } from 'resend';
import { logApiCall } from '@/lib/apiLog';

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
  const reportUrl = reportId ? `https://carhaki.com/reports/${reportId}` : 'https://carhaki.com';

  const attachments = pdfBuffer
    ? [{ filename: `CarHaki-Report-${vin}.pdf`, content: Buffer.from(pdfBuffer) }]
    : [];

  const fromAddr = process.env.RESEND_FROM_EMAIL || 'CarHaki <onboarding@resend.dev>';
  console.log('Sending email to:', to, '| PDF:', !!pdfBuffer);



  const pdfSection = pdfBuffer ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:0 0 24px;text-align:center;">
      <p style="margin:0;font-size:15px;"><strong>📎 Full Report Attached as PDF</strong></p>
      <p style="margin:8px 0 0;font-size:13px;color:#16a34a;">Open the attachment to see the complete ClearVin vehicle history</p>
    </div>` : '';

  const result = await sendTrackedEmail('send_report_ready', {
    from: fromAddr,
    to,
    subject: `Your CarHaki Report is Ready — ${carName} (${vin})`,
    attachments,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:#1a56db;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
          <img src="https://carhaki.com/logo-icon.png" width="48" height="48" style="width:48px;height:48px;border-radius:12px;margin-bottom:8px;" alt="CarHaki">
          <br>
          <span style="color:#ffffff;font-size:22px;font-weight:800;">Car<span style="color:#93c5fd;">Haki</span></span>
          <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px;">Know the truth about every Tokunbo car</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px;">
          <h1 style="color:#1e293b;font-size:22px;margin:0 0 8px;">Your Report is Ready! 🎉</h1>
          <p style="color:#64748b;margin:0 0 20px;">Hello ${firstName},</p>
          <p style="color:#475569;margin:0 0 24px;line-height:1.6;">
            Your CarHaki vehicle history report for the <strong>${carName}</strong> has been generated.
            ${pdfBuffer ? 'The full official ClearVin report is <strong>attached as a PDF</strong>.' : 'Your report has been generated successfully.'}
          </p>

          <!-- VIN box -->
          <div style="background:#f1f5f9;border-radius:12px;padding:16px;margin:0 0 24px;">
            <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Vehicle Checked</p>
            <p style="margin:0;font-size:17px;font-weight:700;color:#1e293b;font-family:monospace;">${vin}</p>
            <p style="margin:4px 0 0;font-size:14px;color:#475569;">${carName}</p>
          </div>

          <!-- View Report Online button — always works even if PDF attachment fails -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td align="center">
            <a href="${reportUrl}" style="display:inline-block;background:#1a56db;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;">
              View Your Full Report →
            </a>
          </td></tr></table>
          <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0 0 24px;line-height:1.6;">
            ${pdfBuffer ? 'Your report is also attached as a PDF. ' : ''}Tap the button above to view your complete report online anytime — no login needed.
          </p>

          ${pdfSection}

          <p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.6;">
            Need help? Email us at <a href="mailto:support@carhaki.com" style="color:#1a56db;">support@carhaki.com</a>
            or WhatsApp us directly at <a href="https://wa.me/2348168696869" style="color:#1a56db;">0816 869 6869</a>.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0f172a;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">© 2026 CarHaki Nigeria. All rights reserved.</p>
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
  const fromAddr = process.env.RESEND_FROM_EMAIL || 'CarHaki <onboarding@resend.dev>';

  return sendTrackedEmail('send_otp', {
    from: fromAddr,
    to,
    subject: `${code} is your CarHaki login code`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:#1a56db;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
          <img src="https://carhaki.com/logo-icon.png" width="48" height="48" style="width:48px;height:48px;border-radius:12px;margin-bottom:8px;" alt="CarHaki">
          <br>
          <span style="color:#ffffff;font-size:22px;font-weight:800;">Car<span style="color:#93c5fd;">Haki</span></span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px;text-align:center;">
          <h1 style="color:#1e293b;font-size:20px;margin:0 0 8px;">Your login code</h1>
          <p style="color:#64748b;margin:0 0 24px;">Enter this code to sign in to CarHaki:</p>

          <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin:0 0 24px;">
            <p style="margin:0;font-size:32px;font-weight:800;letter-spacing:0.15em;color:#1e293b;font-family:monospace;">${code}</p>
          </div>

          <p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.6;">
            This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0f172a;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">© 2026 CarHaki Nigeria. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
  });
}
