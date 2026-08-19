import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminSession } from '@/lib/dal';

interface StatRow {
  service: string;
  operation: string;
  calls_24h: number;
  errors_24h: number;
  calls_7d: number;
  errors_7d: number;
}

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Per service+operation counts over both windows in one pass. Scoped to 7d so
  // the scan stays bounded by the created_at index as the table grows.
  const stats = await prisma.$queryRawUnsafe(
    `SELECT service, operation,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS calls_24h,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours' AND NOT success)::int AS errors_24h,
            COUNT(*)::int AS calls_7d,
            COUNT(*) FILTER (WHERE NOT success)::int AS errors_7d
     FROM api_call_log
     WHERE created_at > NOW() - INTERVAL '7 days'
     GROUP BY service, operation
     ORDER BY service, operation`
  ) as StatRow[];

  // Most recent failures — the actionable part. Error messages are already
  // sanitized of email addresses at write time (see lib/apiLog.ts).
  const recentErrors = await prisma.$queryRawUnsafe(
    `SELECT service, operation, error_message, created_at
     FROM api_call_log
     WHERE NOT success AND created_at > NOW() - INTERVAL '7 days'
     ORDER BY created_at DESC
     LIMIT 25`
  );

  // Recent scheduled-job runs, so it's visible the retention prune is actually
  // firing rather than just configured.
  const cronRuns = await prisma.$queryRawUnsafe(
    `SELECT job, rows_deleted, note, created_at
     FROM cron_run_log
     ORDER BY created_at DESC
     LIMIT 10`
  );

  return NextResponse.json({ stats, recentErrors, cronRuns });
}
