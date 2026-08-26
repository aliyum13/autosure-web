import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminSession } from '@/lib/dal';

// Open alerts plus the healthcheck heartbeat.
//
// The pull-based half of alerting. Email is the push channel, but this project
// has already had alerts silently swallowed by a suppressed address once, so
// the durable record is always here on a page that gets opened anyway.

// A cron that silently stops looks exactly like a healthy system. At a
// five-minute cadence, three missed runs is unambiguous without being twitchy.
const HEARTBEAT_STALE_MINUTES = 16;

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const open = await prisma.$queryRawUnsafe(
      `SELECT id, probe, severity, detail, notified_at, created_at
       FROM system_alerts WHERE resolved_at IS NULL
       ORDER BY created_at DESC`
    ) as Array<Record<string, unknown>>;

    const recent = await prisma.$queryRawUnsafe(
      `SELECT probe, severity, detail, created_at, resolved_at
       FROM system_alerts WHERE resolved_at IS NOT NULL
       ORDER BY resolved_at DESC LIMIT 10`
    ) as Array<Record<string, unknown>>;

    const beat = await prisma.$queryRawUnsafe(
      `SELECT created_at, note FROM cron_run_log
       WHERE job = 'healthcheck' ORDER BY created_at DESC LIMIT 1`
    ) as Array<{ created_at: Date; note: string | null }>;

    const lastRun = beat[0]?.created_at ? new Date(beat[0].created_at) : null;
    const minutesSince = lastRun ? Math.round((Date.now() - lastRun.getTime()) / 60000) : null;

    return NextResponse.json({
      openAlerts: open.map((a) => ({
        ...a,
        // Surfaced explicitly: an alert that was raised but never emailed means
        // the alerting path itself is degraded, which is worse than the alert.
        emailFailed: a.notified_at === null,
      })),
      recentlyResolved: recent,
      heartbeat: {
        lastRun: lastRun?.toISOString() ?? null,
        minutesSince,
        note: beat[0]?.note ?? null,
        // No heartbeat at all is stale too — it means the cron has never run.
        stale: minutesSince === null || minutesSince > HEARTBEAT_STALE_MINUTES,
      },
    });
  } catch (error) {
    console.error('[admin/alerts] failed:', error);
    return NextResponse.json({ error: 'Could not load alerts.' }, { status: 500 });
  }
}
