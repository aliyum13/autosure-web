import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminSession, getSession } from '@/lib/dal';
import { getCreditEstimate, getLatestSync, countChargedSince } from '@/lib/clearvinCredits';

// ClearVin balance tracking. There is no balance API, so the number comes from
// Daria by WhatsApp/email; this records it and estimates consumption from
// api_call_log since. Everything returned is explicitly an estimate.

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json(await getCreditEstimate());
  } catch (error) {
    console.error('[clearvin-credits] estimate failed:', error);
    return NextResponse.json({ error: 'Could not load credit estimate.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const session = await getSession();
  const adminEmail = session!.email;

  try {
    const { known_balance, low_threshold, note } = await req.json();

    const balance = Number(known_balance);
    if (!Number.isInteger(balance) || balance < 0) {
      return NextResponse.json({ error: 'Balance must be a whole number of reports, 0 or more.' }, { status: 400 });
    }

    const previous = await getLatestSync();

    // Threshold carries forward when omitted, so a routine balance update
    // doesn't silently reset an intentionally-tuned warning level.
    let threshold = previous?.low_threshold ?? 20;
    if (low_threshold !== undefined && low_threshold !== null && low_threshold !== '') {
      const t = Number(low_threshold);
      if (!Number.isInteger(t) || t < 0) {
        return NextResponse.json({ error: 'Threshold must be a whole number, 0 or more.' }, { status: 400 });
      }
      threshold = t;
    }

    // What we predicted right before this sync, captured so drift is measurable
    // over time. Computed from the PREVIOUS baseline — after the insert below
    // the new row becomes the baseline and the old prediction is unrecoverable.
    let estimateAtSync: number | null = null;
    if (previous) {
      const { charged } = await countChargedSince(previous.created_at);
      estimateAtSync = Math.max(0, previous.known_balance - charged);
    }

    const id = `cvbal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO clearvin_balance_sync
         (id, known_balance, low_threshold, estimate_at_sync, recorded_by, note, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      id, balance, threshold, estimateAtSync, adminEmail, note?.trim() || null
    );

    const drift = estimateAtSync === null ? null : estimateAtSync - balance;
    console.log('[clearvin-credits] synced', balance, 'by', adminEmail,
      drift === null ? '(first sync)' : `| predicted ${estimateAtSync}, drift ${drift}`);

    return NextResponse.json({
      ok: true,
      known_balance: balance,
      low_threshold: threshold,
      estimate_at_sync: estimateAtSync,
      // Positive drift = we were optimistic, i.e. real usage outran what we
      // counted as charged. Sustained positive drift is the signal that some
      // operation we treat as free is actually being billed.
      drift,
    });
  } catch (error) {
    console.error('[clearvin-credits] sync failed:', error);
    return NextResponse.json({ error: 'Could not record the balance.' }, { status: 500 });
  }
}
