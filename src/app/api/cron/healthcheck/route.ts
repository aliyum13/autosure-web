import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { raiseAlert, resolveAlert } from '@/lib/alerts';
import { API_SERVICES } from '@/lib/apiLog';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Synthetic canary. Probes the site's own endpoints over real HTTP on a
// schedule and alerts when one stops behaving.
//
// Built after a schema drift took every PDF download to a 500 for hours and a
// CUSTOMER found it. Probing over HTTP rather than calling functions directly
// is the point: it exercises routing, rendering and the database the same way a
// customer does, so it catches whatever caused the break rather than only the
// causes we thought to anticipate.

// Probes must cost NOTHING to run. Nothing here touches ClearVin: a canary that
// bills per run is a canary someone eventually switches off.
const TIMEOUT_MS = 15_000;

function baseUrl(): string {
  // Mirrors paymentCallbackBaseUrl() in lib/paystack.ts. Vercel crons only run
  // against production, so in practice this is the production domain; the
  // fallbacks matter for manual triggering on a preview.
  if (process.env.VERCEL_ENV === 'production') {
    return process.env.NEXT_PUBLIC_BASE_URL || 'https://carhaki.com';
  }
  if (process.env.VERCEL_BRANCH_URL) return `https://${process.env.VERCEL_BRANCH_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

interface ProbeResult { probe: string; ok: boolean; detail: string }

async function probe(
  name: string, url: string, expectType?: string
): Promise<ProbeResult> {
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Marks canary traffic in the runtime logs so it is not mistaken for a
      // real customer when reading them back.
      headers: { 'User-Agent': 'CarHaki-Healthcheck/1.0' },
    });

    if (!res.ok) {
      // The response body usually carries the actual error, which is the
      // difference between "PDF route is down" and knowing why.
      let body = '';
      try { body = (await res.text()).slice(0, 200); } catch { /* ignore */ }
      return { probe: name, ok: false, detail: `HTTP ${res.status}${body ? ` — ${body}` : ''}` };
    }

    if (expectType) {
      const got = res.headers.get('content-type') || '';
      if (!got.includes(expectType)) {
        return { probe: name, ok: false, detail: `expected ${expectType}, got ${got || 'nothing'}` };
      }
    }
    return { probe: name, ok: true, detail: `HTTP ${res.status}` };
  } catch (e) {
    return { probe: name, ok: false, detail: (e as Error).message };
  }
}

export async function GET(req: NextRequest) {
  // Same pattern as prune-api-log: require the secret rather than defaulting
  // open, so a missing env var cannot make this publicly triggerable.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const base = baseUrl();
  const results: ProbeResult[] = [];

  try {
    // Chosen at runtime rather than configured. It must be a report that
    // ALREADY has stored bytes: the PDF route falls back to a CHARGED ClearVin
    // ?vin= fetch when pdf_data is null, so probing the wrong report would bill
    // us every five minutes. Auto-selection also means no env var pointing at a
    // report someone later deletes.
    const canary = await prisma.$queryRawUnsafe(
      `SELECT id FROM reports
       WHERE pdf_data IS NOT NULL AND status = 'COMPLETED'
       ORDER BY created_at DESC LIMIT 1`
    ) as Array<{ id: string }>;

    results.push(await probe('homepage', `${base}/`));

    if (canary[0]) {
      // The exact path that broke and went unnoticed.
      results.push(await probe('report_pdf', `${base}/api/reports/${canary[0].id}/pdf`, 'application/pdf'));
    } else {
      // Skipped, not failed: no stored PDFs is a legitimate state for a fresh
      // database, and a canary that cries wolf on an empty table trains people
      // to ignore it.
      results.push({ probe: 'report_pdf', ok: true, detail: 'skipped — no stored PDF to probe' });
    }

    results.push(await probe('referral_validate', `${base}/api/referral/validate?code=__canary__`));
    results.push(await probe('credits_check', `${base}/api/credits/check?email=__canary__%40carhaki.test`));

    // Dependency health, read from our own log rather than by calling anyone.
    // Catches a ClearVin/Paystack/Resend outage without spending a credit.
    const deps = await prisma.$queryRawUnsafe(
      `SELECT service,
              COUNT(*)::int                          AS attempts,
              COUNT(*) FILTER (WHERE NOT success)::int AS failures
       FROM api_call_log
       WHERE created_at > NOW() - INTERVAL '15 minutes'
         -- Excluded from BOTH sides of the ratio, not just the numerator.
         -- A rejected VIN says nothing about ClearVin's health, so counting it
         -- as an attempt would inflate the denominator and mask a real outage
         -- during busy periods.
         AND operation NOT IN ('preview_vin_rejected', 'initialize_rejected')
       GROUP BY service
       HAVING COUNT(*) >= 3 AND COUNT(*) FILTER (WHERE NOT success) * 2 > COUNT(*)`
    ) as Array<{ service: string; attempts: number; failures: number }>;

    // Push a result for EVERY service, not only the failing ones.
    //
    // This was the bug that left dependency_clearvin open for eight hours while
    // every run logged "all 4 probes healthy": the query above returns only
    // services currently over the threshold, so a recovered service had no
    // entry in `results` at all — and the resolve loop below iterates
    // `results`. With nothing to iterate, resolveAlert() was never called and
    // the alert could never close. An alert that cannot clear is worse than no
    // alert, because the panel stops meaning anything.
    const failing = new Map(deps.map((d) => [d.service, d]));
    for (const service of API_SERVICES) {
      const d = failing.get(service);
      results.push({
        probe: `dependency_${service}`,
        ok: !d,
        detail: d
          ? `${d.failures}/${d.attempts} calls failed in the last 15 minutes`
          : 'no elevated failure rate in the last 15 minutes',
      });
    }

    // Raise on transition to failing, resolve on recovery. Both are no-ops when
    // nothing changed, so a healthy system stays silent.
    let raised = 0;
    let resolved = 0;
    for (const r of results) {
      if (r.ok) {
        if (await resolveAlert(r.probe)) resolved++;
      } else {
        const severity = r.probe.startsWith('dependency_') ? 'warning' : 'critical';
        if (await raiseAlert(r.probe, severity, r.detail)) raised++;
      }
    }

    // Every run is recorded, not just failures. A cron that silently stops is
    // indistinguishable from everything being fine — which is the failure mode
    // most likely to recur unnoticed — so the admin panel checks this heartbeat.
    const failingCount = results.filter((r) => !r.ok).length;
    await prisma.$executeRawUnsafe(
      `INSERT INTO cron_run_log (id, job, rows_deleted, note, created_at)
       VALUES ($1, 'healthcheck', 0, $2, NOW())`,
      `cron_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      failingCount === 0 ? `all ${results.length} probes healthy` : `${failingCount} of ${results.length} FAILING`
    );

    return NextResponse.json({ ok: failingCount === 0, raised, resolved, results });
  } catch (e) {
    console.error('[cron] healthcheck failed:', e);
    // The monitor failing is itself worth an alert — otherwise the thing
    // watching for silence goes silent.
    try { await raiseAlert('healthcheck_itself', 'critical', (e as Error).message); } catch { /* nothing left to try */ }
    return NextResponse.json({ error: 'Healthcheck failed', message: (e as Error).message }, { status: 500 });
  }
}
