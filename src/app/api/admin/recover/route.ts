import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateReportAndEmail } from '@/lib/generate';
import { isAdminSession } from '@/lib/dal';

export const maxDuration = 60;

// General safeguard against the recovery-tool-infinite-loop class of bug —
// bounds retries per report regardless of WHY it keeps failing, not just the
// one specific ClearVin rejection message migration 004 classifies. See
// migrations/005.
const MAX_RECOVERY_ATTEMPTS = 3;

// One-at-a-time recovery of stuck paid reports.
// Auth: admin session cookie (ADMIN_EMAILS allowlist). Processes a small
// batch per call to stay under the function time limit — call repeatedly
// until "remaining" is 0.
export async function POST() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Grab ONE stuck paid report (oldest first), excluding the owner's test
  // email and anything that's already exhausted its retry budget.
  const stuck = await prisma.$queryRawUnsafe(
    `SELECT r.id AS report_id, r.vin, o.guest_name, o.guest_email
     FROM reports r
     JOIN orders o ON o.id = r.order_id
     WHERE r.status IN ('PROCESSING','FAILED')
       AND o.payment_status = 'SUCCESS'
       AND o.guest_email <> 'aliyumauwal13@gmail.com'
       AND r.recovery_attempts < $1
     ORDER BY r.created_at ASC
     LIMIT 1`,
    MAX_RECOVERY_ATTEMPTS
  ) as Array<{ report_id: string; vin: string; guest_name: string; guest_email: string }>;

  if (!stuck.length) {
    return NextResponse.json({ done: true, message: 'No stuck reports remaining.', remaining: 0 });
  }

  const job = stuck[0];
  let result: { report_id: string; vin: string; email: string; ok: boolean; error?: string };

  // Increment before attempting, so a crash mid-generation still counts —
  // the whole point is bounding retries even when the failure mode is one
  // we haven't seen before.
  await prisma.$executeRawUnsafe(
    `UPDATE reports SET recovery_attempts = recovery_attempts + 1 WHERE id = $1`,
    job.report_id
  );

  try {
    // generateReportAndEmail records failures on the report row instead of
    // throwing, so `ok` must come from the returned outcome — not merely from
    // the absence of an exception, which previously reported a silently-failed
    // recovery as a success in the run log.
    const outcome = await generateReportAndEmail(job.report_id, job.vin, job.guest_name, job.guest_email);
    const delivered = outcome === 'delivered' || outcome === 'skipped_duplicate';
    result = {
      report_id: job.report_id, vin: job.vin, email: job.guest_email,
      ok: delivered,
      ...(delivered ? {} : {
        error: outcome === 'invalid_vin'
          ? 'ClearVin rejects this VIN as invalid — marked INVALID_VIN, will not be retried'
          : 'generation failed — nothing delivered',
      }),
    };
  } catch (e) {
    result = { report_id: job.report_id, vin: job.vin, email: job.guest_email, ok: false, error: (e as Error).message };
  }

  // Count how many still remain after this one
  const remainingRows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS n
     FROM reports r JOIN orders o ON o.id = r.order_id
     WHERE r.status IN ('PROCESSING','FAILED')
       AND o.payment_status = 'SUCCESS'
       AND o.guest_email <> 'aliyumauwal13@gmail.com'
       AND r.recovery_attempts < $1`,
    MAX_RECOVERY_ATTEMPTS
  ) as Array<{ n: number }>;

  return NextResponse.json({
    processed: result,
    remaining: remainingRows[0]?.n ?? 0,
  });
}
