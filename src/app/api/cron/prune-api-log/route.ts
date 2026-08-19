import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Retention window for api_call_log. Matches the note left in migration 007.
const RETENTION_DAYS = 90;

// Upper bound on rows removed per run. The table is small today, but this is an
// unattended recurring job — a bounded delete means a pathological backlog can
// never hold a long lock on a table that sits in the payment/report write path.
// Anything left over is picked up by the next run.
const MAX_ROWS_PER_RUN = 50000;

export async function GET(req: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Requiring the secret
  // to be set (rather than defaulting to open) keeps this route from being
  // publicly triggerable if the env var is ever missing.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const deleted = await prisma.$executeRawUnsafe(
      `DELETE FROM api_call_log
       WHERE id IN (
         SELECT id FROM api_call_log
         WHERE created_at < NOW() - INTERVAL '${RETENTION_DAYS} days'
         LIMIT ${MAX_ROWS_PER_RUN}
       )`
    ) as number;

    const hitCap = deleted >= MAX_ROWS_PER_RUN;
    const id = `cron_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO cron_run_log (id, job, rows_deleted, note, created_at)
       VALUES ($1, 'prune_api_call_log', $2, $3, NOW())`,
      id, deleted, hitCap ? `hit ${MAX_ROWS_PER_RUN}-row cap, more to prune next run` : null
    );

    console.log('[cron] prune_api_call_log deleted', deleted, 'rows');
    return NextResponse.json({ ok: true, rows_deleted: deleted, retention_days: RETENTION_DAYS, hit_cap: hitCap });
  } catch (e) {
    // Logged to cron_run_log too, so a silently failing job is visible in the
    // admin panel rather than only in ephemeral runtime logs.
    console.error('[cron] prune_api_call_log failed:', e);
    try {
      const id = `cron_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO cron_run_log (id, job, rows_deleted, note, created_at)
         VALUES ($1, 'prune_api_call_log', 0, $2, NOW())`,
        id, `FAILED: ${(e as Error).message}`.slice(0, 500)
      );
    } catch { /* nothing more we can do */ }
    return NextResponse.json({ error: 'Prune failed' }, { status: 500 });
  }
}
