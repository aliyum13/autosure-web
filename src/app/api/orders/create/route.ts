import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateVIN } from '@/lib/vin';
import { generateReportAndEmail } from '@/lib/generate';

// Comp and bundle-credit paths run report generation inline — needs the full 60s.
export const maxDuration = 60;

// Internal 100%-off code for customer-service / comp reports. Not shown publicly.
const COMP_CODE = 'CH-COMP-9X4K';

export async function POST(req: NextRequest) {
  try {
    const { vin, bundle_id, name, email, phone, ref_code } = await req.json();
    const upperVin = vin?.toUpperCase();

    const vinCheck = validateVIN(upperVin || '');
    if (!vinCheck.valid) {
      return NextResponse.json({ error: vinCheck.reason || 'Invalid VIN.' }, { status: 400 });
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    }
    if (!email?.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
    }

    // ---- Internal comp code: skip payment, generate report for free ----
    if (ref_code && ref_code.toUpperCase().trim() === COMP_CODE) {
      const reference = `CH-COMP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const id = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      await prisma.$executeRawUnsafe(`
        INSERT INTO orders (id, user_id, vin, amount_ngn, paystack_reference, payment_status,
                           guest_name, guest_email, guest_phone, paid_at, created_at, updated_at)
        VALUES ($1, NULL, $2, 0, $3, 'SUCCESS', $4, $5, $6, NOW(), NOW(), NOW())
      `, id, upperVin, reference, name.trim(), email.trim().toLowerCase(), phone?.trim() || null);

      const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const shareToken = `share_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO reports (id, order_id, user_id, vin, status, share_token, is_public, created_at, updated_at)
         VALUES ($1, $2, NULL, $3, 'PROCESSING', $4, false, NOW(), NOW())`,
        reportId, id, upperVin, shareToken
      );

      console.log('[comp] Free report via CH-COMP for VIN:', upperVin, '| email:', email.trim());
      await generateReportAndEmail(reportId, upperVin, name.trim(), email.trim().toLowerCase());
      console.log('[comp] Free report complete:', reportId);

      return NextResponse.json({
        order_id: id,
        comp: true,
        report_id: reportId,
        message: 'Free report generated and sent.',
        amount_ngn: 0,
      });
    }
    // ---- End comp code ----

    // ---- Bundle credit: if this email has an unused credit, use it instead of charging ----
    if (email?.trim()) {
      const emailLower = email.trim().toLowerCase();
      const creditRows = await prisma.$queryRawUnsafe(
        `SELECT id, credits_total, credits_used FROM report_credits
         WHERE email = $1 AND credits_used < credits_total
         ORDER BY created_at ASC LIMIT 1`,
        emailLower
      ) as Array<{ id: string; credits_total: number; credits_used: number }>;

      if (creditRows[0]) {
        const credit = creditRows[0];
        // Consume one credit atomically (guard against double-use)
        const updated = await prisma.$executeRawUnsafe(
          `UPDATE report_credits SET credits_used = credits_used + 1, updated_at = NOW()
           WHERE id = $1 AND credits_used < credits_total`,
          credit.id
        );

        if (updated === 1) {
          const reference = `CH-CREDIT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

          await prisma.$executeRawUnsafe(`
            INSERT INTO orders (id, user_id, vin, amount_ngn, paystack_reference, payment_status,
                               guest_name, guest_email, guest_phone, bundle_id, bundle_count, paid_at, created_at, updated_at)
            VALUES ($1, NULL, $2, 0, $3, 'SUCCESS', $4, $5, $6, 'credit', 1, NOW(), NOW(), NOW())
          `, orderId, upperVin, reference, name.trim(), emailLower, phone?.trim() || null);

          const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const shareToken = `share_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          await prisma.$executeRawUnsafe(
            `INSERT INTO reports (id, order_id, user_id, vin, status, share_token, is_public, created_at, updated_at)
             VALUES ($1, $2, NULL, $3, 'PROCESSING', $4, false, NOW(), NOW())`,
            reportId, orderId, upperVin, shareToken
          );

          const remaining = (credit.credits_total - credit.credits_used - 1);
          console.log('[credit] Used 1 credit for', emailLower, '| VIN:', upperVin, '| remaining:', remaining);
          await generateReportAndEmail(reportId, upperVin, name.trim(), emailLower);
          console.log('[credit] Report complete:', reportId);

          return NextResponse.json({
            order_id: orderId,
            credit_used: true,
            report_id: reportId,
            credits_remaining: remaining,
            message: 'Report generated using your bundle credit.',
            amount_ngn: 0,
          });
        }
      }
    }
    // ---- End bundle credit ----

    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET) {
      return NextResponse.json({ error: 'Payment service unavailable.' }, { status: 503 });
    }

    const BUNDLES: Record<string, { price: number; count: number }> = {
      single: { price: 15000, count: 1 },
      triple: { price: 35000, count: 3 },
      five:   { price: 50000, count: 5 },
    };
    const bundleKey = bundle_id && BUNDLES[bundle_id] ? bundle_id : 'single';
    const bundle = BUNDLES[bundleKey];
    const priceKobo = bundle.price * 100;

    const reference = `CH-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        amount: priceKobo,
        reference,
        currency: 'NGN',
        metadata: {
          vin: upperVin,
          guest_name: name.trim(),
          guest_email: email.trim().toLowerCase(),
          guest_phone: phone?.trim() || null,
          bundle_id: bundleKey,
          bundle_count: bundle.count,
          ref_code: ref_code?.toUpperCase() || null,
          report_type: 'US_VEHICLE_REPORT',
        },
        callback_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://carhaki.com'}/payments/success`,
      }),
    });

    const paystackData = await paystackRes.json();
    if (!paystackData.status || !paystackData.data?.authorization_url) {
      return NextResponse.json({ error: 'Could not initiate payment.' }, { status: 502 });
    }

    const id = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await prisma.$executeRawUnsafe(`
      INSERT INTO orders (id, user_id, vin, amount_ngn, paystack_reference, paystack_access_code, 
                         payment_status, guest_name, guest_email, guest_phone, bundle_id, bundle_count, created_at, updated_at)
      VALUES ($1, NULL, $2, $3, $4, $5, 'PENDING', $6, $7, $8, $9, $10, NOW(), NOW())
    `, id, upperVin, priceKobo, reference, paystackData.data.access_code || null,
       name.trim(), email.trim().toLowerCase(), phone?.trim() || null, bundleKey, bundle.count);

    // Record referral if code provided
    if (ref_code) {
      try {
        const upperRef = ref_code.toUpperCase().trim();
        const refCodes = await prisma.$queryRawUnsafe(
          `SELECT id FROM referral_codes WHERE code = $1 AND is_active = true LIMIT 1`, upperRef
        ) as Array<{ id: string }>;
        if (refCodes[0]) {
          const commissionMap: Record<string, number> = { single: 250000, triple: 500000, five: 750000 };
          const commission = commissionMap[bundleKey] || 250000;
          const refId = `rfrl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          await prisma.$executeRawUnsafe(
            `INSERT INTO referrals (id, referral_code_id, order_id, user_id, amount_ngn, commission_ngn, created_at)
             VALUES ($1, $2, $3, NULL, $4, $5, NOW())`,
            refId, refCodes[0].id, id, priceKobo, commission
          );
        }
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({
      order_id: id,
      authorization_url: paystackData.data.authorization_url,
      reference,
      amount_ngn: bundle.price,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: 'Order creation failed.' }, { status: 500 });
  }
}
