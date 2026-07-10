import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateVIN } from '@/lib/vin';

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
                         payment_status, guest_name, guest_email, guest_phone, created_at, updated_at)
      VALUES ($1, NULL, $2, $3, $4, $5, 'PENDING', $6, $7, $8, NOW(), NOW())
    `, id, upperVin, priceKobo, reference, paystackData.data.access_code || null,
       name.trim(), email.trim().toLowerCase(), phone?.trim() || null);

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
