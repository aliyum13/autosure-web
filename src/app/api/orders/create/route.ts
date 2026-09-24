import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateVIN } from '@/lib/vin';
import { validatePhone } from '@/lib/phone';
import { isValidEmail } from '@/lib/emailValidation';
import { getSession } from '@/lib/dal';
import { getReferralBalance, spendReferralBalance, refundReferralBalance } from '@/lib/referral';
import { generateReportAndEmail } from '@/lib/generate';
import { logApiCall } from '@/lib/apiLog';

// Bundle-credit path runs report generation inline — needs the full 60s.
export const maxDuration = 60;

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
    // includes('@') accepted "a@", "@" and "x@y". Those reached Paystack, which
    // rejected them with "Invalid Email Address Passed" — logged as a Paystack
    // FAILURE, so a bot hammering checkout with a malformed address tripped the
    // dependency alert without ever touching a real customer. Rejecting here
    // means no outbound call, no log entry, and no alert.
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    // Guards both branches below (bundle credit and Paystack), which each
    // persist guest_phone. It's the fallback delivery channel for a customer
    // whose email later lands on Resend's suppression list.
    const phoneCheck = validatePhone(phone || '');
    if (!phoneCheck.valid) {
      return NextResponse.json({ error: phoneCheck.reason || 'A valid WhatsApp number is required.' }, { status: 400 });
    }

    // Resolved once, up front: all three purchase paths below attribute the
    // order to the account. orders.user_id was NULL everywhere, so a customer's
    // orders were tied to their account only by matching guest_email — and a
    // mistyped address silently orphaned the order from their dashboard and
    // their credits.
    const session = await getSession();
    const accountId = session?.userId ?? null;

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
            VALUES ($1, $7, $2, 0, $3, 'SUCCESS', $4, $5, $6, 'credit', 1, NOW(), NOW(), NOW())
          `, orderId, upperVin, reference, name.trim(), emailLower, phone?.trim() || null, accountId);

          const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const shareToken = `share_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          await prisma.$executeRawUnsafe(
            `INSERT INTO reports (id, order_id, user_id, vin, status, share_token, is_public, created_at, updated_at)
             VALUES ($1, $2, NULL, $3, 'PROCESSING', $4, false, NOW(), NOW())`,
            reportId, orderId, upperVin, shareToken
          );

          const remaining = (credit.credits_total - credit.credits_used - 1);
          console.log('[credit] Used 1 credit for', emailLower, '| VIN:', upperVin, '| remaining:', remaining);
          const outcome = await generateReportAndEmail(reportId, upperVin, name.trim(), emailLower);

          // Only claim success if a report actually exists. generateReportAndEmail
          // records failures on the report row instead of throwing, so before this
          // check the customer was told "report generated" and charged a credit
          // even when ClearVin rejected the VIN and nothing was ever delivered.
          if (outcome !== 'delivered' && outcome !== 'skipped_duplicate') {
            // Refund the credit we consumed a few lines above. Scoped to the same
            // credit.id, guarded against going negative, and safe under concurrency:
            // another request's increment is independent, so decrementing by one
            // reverses only our own consumption.
            await prisma.$executeRawUnsafe(
              `UPDATE report_credits SET credits_used = credits_used - 1, updated_at = NOW()
               WHERE id = $1 AND credits_used > 0`,
              credit.id
            );
            console.error('[credit] Generation failed (', outcome, ') — refunded credit', credit.id, 'for', emailLower, '| report:', reportId);

            // The order and report rows are intentionally left in place: reports.status
            // already records the failure and is the audit trail.
            return NextResponse.json({
              error: outcome === 'invalid_vin'
                ? 'We could not generate a report for this VIN — our data provider does not recognise it. Your credit has not been used, so please double-check the VIN and try again.'
                : 'We could not generate your report just now. Your credit has not been used — please try again in a few minutes, or contact support.',
              report_id: reportId,
              status: outcome,
            }, { status: 502 });
          }

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

    // ---- Referral earnings: pay for this report from the wallet balance ----
    //
    // Deliberately AFTER the bundle-credit branch. Credits are use-it-or-lose-it
    // and tied to a past purchase; an earnings balance is cash-equivalent and
    // should be the last thing spent.
    //
    // Unlike the credit path above, this requires a real session. That path
    // keys off the email TYPED into the form, which is fine for credits the
    // same person bought — but here it would let anyone drain a stranger's
    // balance just by typing their address at checkout.
    if (session?.email) {
      // The entire branch is fault-isolated. A problem with the referral wallet
      // — an unavailable table, a bad query, anything — must never stop a
      // customer paying for a report. On failure this falls through to normal
      // Paystack checkout: worst case someone pays for a report their balance
      // could have covered, which support can refund. Checkout being down is
      // not recoverable.
      //
      // This also makes the deploy order safe: if migration 012 has not run
      // yet, this degrades instead of 500-ing every logged-in checkout.
      let debitedOrderId: string | null = null;
      let debitedAmount = 0;
      const buyerEmail = session.email.toLowerCase();

      try {
      const BUNDLE_PRICES: Record<string, number> = { single: 15000, triple: 35000, five: 50000 };
      const wantedBundle = bundle_id && BUNDLE_PRICES[bundle_id] ? bundle_id : 'single';
      const priceKoboWanted = BUNDLE_PRICES[wantedBundle] * 100;
      const balance = await getReferralBalance(session.email);

      // All-or-nothing: partial payment would mean charging a reduced amount
      // through Paystack and reconciling a partial spend when generation fails.
      if (balance >= priceKoboWanted) {
        const reference = `CH-EARN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        const spent = await spendReferralBalance(buyerEmail, priceKoboWanted, orderId);
        if (spent) {
          debitedOrderId = orderId;
          debitedAmount = priceKoboWanted;
          // amount_ngn stays 0, matching the comp and bundle-credit paths. It
          // also means creditReferralEarning() skips this order, so earnings
          // cannot mint further earnings.
          await prisma.$executeRawUnsafe(`
            INSERT INTO orders (id, user_id, vin, amount_ngn, paystack_reference, payment_status,
                               guest_name, guest_email, guest_phone, bundle_id, bundle_count, paid_at, created_at, updated_at)
            VALUES ($1, $7, $2, 0, $3, 'SUCCESS', $4, $5, $6, 'referral_earnings', 1, NOW(), NOW(), NOW())
          `, orderId, upperVin, reference, name.trim(), buyerEmail, phone?.trim() || null, accountId);

          const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const shareToken = `share_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          await prisma.$executeRawUnsafe(
            `INSERT INTO reports (id, order_id, user_id, vin, status, share_token, is_public, created_at, updated_at)
             VALUES ($1, $2, NULL, $3, 'PROCESSING', $4, false, NOW(), NOW())`,
            reportId, orderId, upperVin, shareToken
          );

          console.log('[earnings] Spent', priceKoboWanted, 'kobo for', buyerEmail, '| VIN:', upperVin);
          const outcome = await generateReportAndEmail(reportId, upperVin, name.trim(), buyerEmail);

          if (outcome !== 'delivered' && outcome !== 'skipped_duplicate') {
            // Same precedent as the credit branch: never keep the money for a
            // report that was never produced.
            await refundReferralBalance(buyerEmail, priceKoboWanted, orderId, `generation ${outcome}`);
            console.error('[earnings] Generation failed (', outcome, ') — refunded balance for', buyerEmail);
            return NextResponse.json({
              error: outcome === 'invalid_vin'
                ? 'We could not generate a report for this VIN — our data provider does not recognise it. Your balance has not been used, so please double-check the VIN and try again.'
                : 'We could not generate your report just now. Your balance has not been used — please try again in a few minutes, or contact support.',
              report_id: reportId,
              status: outcome,
            }, { status: 502 });
          }

          return NextResponse.json({
            order_id: orderId,
            earnings_used: true,
            report_id: reportId,
            balance_remaining: await getReferralBalance(buyerEmail),
            message: 'Report generated using your referral earnings.',
            amount_ngn: 0,
          });
        }
      }
      } catch (e) {
        // If the balance was already debited before the failure, put it back —
        // otherwise falling through to Paystack would charge the customer AND
        // keep their earnings.
        if (debitedOrderId) {
          try {
            await refundReferralBalance(buyerEmail, debitedAmount, debitedOrderId, 'redemption aborted mid-flight');
          } catch (refundErr) {
            // Now genuinely bad: money debited and not returned. Loud, because
            // this needs a human to reconcile from the ledger.
            console.error('[earnings] CRITICAL: debited', debitedAmount, 'kobo from', buyerEmail,
              'and the refund also failed:', (refundErr as Error).message);
          }
        }
        console.error('[earnings] redemption unavailable, falling back to paid checkout:', (e as Error).message);
      }
    }
    // ---- End referral earnings ----

    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET) {
      return NextResponse.json({ error: 'Payment service unavailable.' }, { status: 503 });
    }

    // Revenue-split code for Paystack's split-payment API. Missing this must
    // NOT fail checkout — but silently sends 100% of the payment to the main
    // account with no split and no record that splitting was skipped. Warn
    // loudly so that specific failure is never silent.
    const PAYSTACK_SPLIT_CODE = process.env.PAYSTACK_SPLIT_CODE;
    if (!PAYSTACK_SPLIT_CODE) {
      console.warn('[orders/create] PAYSTACK_SPLIT_CODE is not set — this payment will go 100% to the main account, unsplit.');
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
        ...(PAYSTACK_SPLIT_CODE ? { split_code: PAYSTACK_SPLIT_CODE } : {}),
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
        callback_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://autosurevin.com'}/payments/success`,
      }),
    });

    const paystackData = await paystackRes.json();
    if (!paystackData.status || !paystackData.data?.authorization_url) {
      // Same distinction as preview_vin_rejected: Paystack phrases client-input
      // errors as "Invalid <thing> Passed". That is Paystack working correctly
      // and rejecting something we sent, not Paystack being unhealthy, so it
      // must not count toward the dependency failure rate.
      const psMessage = paystackData.message || 'no authorization_url returned';
      if (/^invalid .+ passed$/i.test(psMessage)) {
        await logApiCall('paystack', 'initialize_rejected', true, psMessage);
      } else {
        await logApiCall('paystack', 'initialize', false, psMessage);
      }
      return NextResponse.json({ error: 'Could not initiate payment.' }, { status: 502 });
    }
    await logApiCall('paystack', 'initialize', true);

    const id = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await prisma.$executeRawUnsafe(`
      INSERT INTO orders (id, user_id, vin, amount_ngn, paystack_reference, paystack_access_code, 
                         payment_status, guest_name, guest_email, guest_phone, bundle_id, bundle_count, created_at, updated_at)
      VALUES ($1, $11, $2, $3, $4, $5, 'PENDING', $6, $7, $8, $9, $10, NOW(), NOW())
    `, id, upperVin, priceKobo, reference, paystackData.data.access_code || null,
       name.trim(), email.trim().toLowerCase(), phone?.trim() || null, bundleKey, bundle.count, accountId);

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
