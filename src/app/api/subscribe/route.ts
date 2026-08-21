import { NextRequest, NextResponse } from 'next/server';
import { sendTrackedEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    // Add to Resend audience (creates contact for email marketing)
    // Also send a welcome email
    await sendTrackedEmail('send_subscribe_welcome', {
      from: process.env.RESEND_FROM_EMAIL || 'CarHaki <reports@carhaki.com>',
      to: email,
      subject: 'You\'re on the CarHaki Insights list 🚗',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;">
          <div style="margin-bottom:24px;">
            <span style="font-size:20px;font-weight:700;color:#0f172a;">Car</span><span style="font-size:20px;font-weight:700;color:#2563eb;">Haki</span>
          </div>
          <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 12px;">You're in! 🎉</h1>
          <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 20px;">
            You'll now receive CarHaki Insights — tips on spotting Tokunbo car scams, what to check before buying, and updates from the platform.
          </p>
          <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 28px;">
            In the meantime, check a VIN before your next purchase — it could save you millions.
          </p>
          <a href="https://carhaki.com" style="display:inline-block;background:#2563eb;color:#fff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">
            Check a Car Now
          </a>
          <p style="font-size:12px;color:#94a3b8;margin-top:32px;">CarHaki Nigeria · carhaki.com</p>
        </div>
      `,
    });

    // Notify admin
    await sendTrackedEmail('send_admin_alert', {
      from: process.env.RESEND_FROM_EMAIL || 'CarHaki <reports@carhaki.com>',
      to: process.env.ADMIN_EMAIL || 'support@carhaki.com',
      subject: `New Insights subscriber: ${email}`,
      html: `<p>New subscriber: <strong>${email}</strong></p>`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}
