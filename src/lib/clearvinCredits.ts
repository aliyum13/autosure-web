import { prisma } from '@/lib/db';

/**
 * ClearVin operations that COST a report credit.
 *
 * This list — not a per-report multiplier — is what makes the estimate correct
 * regardless of whether report-id reuse is enabled.
 *
 *   reuse OFF: a report logs report_html + report_pdf        -> counts 2
 *   reuse ON:  a report logs report_html + report_pdf_by_id  -> counts 1
 *
 * Same code, no edit, because the flag changes which operation gets logged
 * rather than how many calls happen. Do NOT "fix" this by multiplying report
 * counts by 2; that is exactly the assumption that breaks the moment
 * CLEARVIN_REUSE_REPORT_ID changes.
 *
 * `report_pdf_by_id` (?reportId=) is deliberately absent because ClearVin's
 * docs say re-fetching an already-purchased report is free. That is PRESUMED,
 * not confirmed — only their activity export settles it. If the export shows
 * those calls being billed, add 'report_pdf_by_id' to this array and the
 * estimate corrects itself. `preview` and `login` are genuinely free.
 */
export const CHARGED_OPERATIONS = ['report_html', 'report_pdf'] as const;

// api_call_log is pruned at 90 days (see api/cron/prune-api-log). A baseline
// older than that sits behind the prune horizon, so charged calls between the
// baseline and the horizon no longer exist to be counted — the estimate would
// silently read HIGH. We refuse to show a number in that case.
const LOG_RETENTION_DAYS = 90;

export interface CreditEstimate {
  synced: boolean;
  knownBalance: number | null;
  syncedAt: string | null;
  recordedBy: string | null;
  note: string | null;
  chargedSince: number;
  failedSince: number;
  estimate: number | null;
  lowThreshold: number;
  isLow: boolean;
  baselineStale: boolean;
  previousEstimateAtSync: number | null;
}

const DEFAULT_THRESHOLD = 20;

interface SyncRow {
  id: string;
  known_balance: number;
  low_threshold: number;
  estimate_at_sync: number | null;
  recorded_by: string;
  note: string | null;
  created_at: Date;
}

export async function getLatestSync(): Promise<SyncRow | null> {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, known_balance, low_threshold, estimate_at_sync, recorded_by, note, created_at
     FROM clearvin_balance_sync ORDER BY created_at DESC LIMIT 1`
  ) as SyncRow[];
  return rows[0] ?? null;
}

/** Counts charged (and separately, failed) ClearVin calls since a timestamp. */
export async function countChargedSince(since: Date): Promise<{ charged: number; failed: number }> {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) FILTER (WHERE success)     ::int AS charged,
            COUNT(*) FILTER (WHERE NOT success) ::int AS failed
     FROM api_call_log
     WHERE service = 'clearvin'
       AND operation = ANY($1)
       AND created_at > $2`,
    [...CHARGED_OPERATIONS], since
  ) as Array<{ charged: number; failed: number }>;
  return { charged: Number(rows[0]?.charged ?? 0), failed: Number(rows[0]?.failed ?? 0) };
}

/**
 * Current estimated balance, with everything needed to show the derivation.
 *
 * Deliberately never returns a bare number: an estimate presented without its
 * baseline and its age invites being read as fact, which is the one thing this
 * must not become.
 */
export async function getCreditEstimate(): Promise<CreditEstimate> {
  const sync = await getLatestSync();

  if (!sync) {
    return {
      synced: false, knownBalance: null, syncedAt: null, recordedBy: null, note: null,
      chargedSince: 0, failedSince: 0, estimate: null,
      lowThreshold: DEFAULT_THRESHOLD, isLow: false, baselineStale: false,
      previousEstimateAtSync: null,
    };
  }

  const { charged, failed } = await countChargedSince(sync.created_at);

  const ageDays = (Date.now() - new Date(sync.created_at).getTime()) / 86_400_000;
  const baselineStale = ageDays > LOG_RETENTION_DAYS;

  // Clamped at 0: a negative estimate means we have already overshot, and
  // "-4 remaining" reads like a bug rather than an alarm.
  const raw = sync.known_balance - charged;
  const estimate = baselineStale ? null : Math.max(0, raw);

  return {
    synced: true,
    knownBalance: sync.known_balance,
    syncedAt: new Date(sync.created_at).toISOString(),
    recordedBy: sync.recorded_by,
    note: sync.note,
    chargedSince: charged,
    failedSince: failed,
    estimate,
    lowThreshold: sync.low_threshold,
    // A stale baseline is never "fine" — we cannot say it is low, but we also
    // must not imply it is healthy, so the UI shows the stale state instead.
    isLow: estimate !== null && estimate <= sync.low_threshold,
    baselineStale,
    previousEstimateAtSync: sync.estimate_at_sync,
  };
}
