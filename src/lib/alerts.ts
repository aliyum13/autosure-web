import { prisma } from '@/lib/db';
import { sendTrackedEmail } from '@/lib/email';

export type Severity = 'critical' | 'warning';

/**
 * Raises an alert for a probe, if one is not already open.
 *
 * De-duplication happens in Postgres, not here: idx_system_alerts_open is a
 * partial unique index on (probe) WHERE resolved_at IS NULL, so a second insert
 * for a still-failing probe hits ON CONFLICT DO NOTHING. A three-hour outage
 * therefore produces one row and one email rather than one of each per run —
 * alerting that floods is alerting that gets muted.
 *
 * Returns true only when this call actually opened a new alert.
 */
export async function raiseAlert(
  probe: string, severity: Severity, detail: string
): Promise<boolean> {
  const id = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const inserted = await prisma.$executeRawUnsafe(
    `INSERT INTO system_alerts (id, probe, severity, detail, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT DO NOTHING`,
    id, probe, severity, detail.slice(0, 1000)
  );
  if (inserted !== 1) return false; // already open — stay quiet

  console.error(`[alert] ${severity.toUpperCase()} ${probe}: ${detail}`);

  // Best-effort, deliberately AFTER the row is written.
  //
  // This project has already had alerting vanish silently once, when an address
  // on Resend's suppression list swallowed delivery. So the durable record
  // comes first and the email is an optimisation. A failure here leaves
  // notified_at NULL, which the admin panel renders distinctly — "raised but
  // not emailed" is exactly the state worth surfacing, because it means the
  // alerting path itself is degraded.
  try {
    await sendTrackedEmail('send_admin_alert', {
      from: process.env.RESEND_FROM_EMAIL || 'AutoSure <reports@autosurevin.com>',
      to: process.env.ADMIN_EMAIL || 'checkamafrica@gmail.com',
      subject: `${severity === 'critical' ? '🔴' : '⚠️'} AutoSure ${severity}: ${probe}`,
      html: `<p><strong>${probe}</strong> is failing.</p>
             <p>${detail}</p>
             <p>Raised ${new Date().toISOString()}. You will not be emailed again for this
             probe until it recovers. See <a href="https://autosurevin.com/admin">the admin panel</a>.</p>`,
    });
    await prisma.$executeRawUnsafe(
      `UPDATE system_alerts SET notified_at = NOW() WHERE id = $1`, id
    );
  } catch (e) {
    console.error('[alert] raised but EMAIL FAILED for', probe, '-', (e as Error).message);
  }
  return true;
}

/**
 * Closes any open alert for a probe and sends an all-clear.
 *
 * Returns true only when something was actually open, so a healthy probe on a
 * healthy system stays silent.
 */
export async function resolveAlert(probe: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE system_alerts SET resolved_at = NOW()
     WHERE probe = $1 AND resolved_at IS NULL
     RETURNING id, created_at, detail`,
    probe
  ) as Array<{ id: string; created_at: Date; detail: string }>;

  if (rows.length === 0) return false;

  const openedAt = new Date(rows[0].created_at);
  const minutes = Math.max(1, Math.round((Date.now() - openedAt.getTime()) / 60000));
  console.log(`[alert] RESOLVED ${probe} after ~${minutes} min`);

  // An all-clear matters as much as the alert: without one, a silent alert and
  // a fixed problem look identical from the inbox.
  try {
    await sendTrackedEmail('send_admin_alert', {
      from: process.env.RESEND_FROM_EMAIL || 'AutoSure <reports@autosurevin.com>',
      to: process.env.ADMIN_EMAIL || 'checkamafrica@gmail.com',
      subject: `✅ AutoSure recovered: ${probe}`,
      html: `<p><strong>${probe}</strong> is healthy again after about ${minutes} minute(s).</p>
             <p>It had been failing with: ${rows[0].detail}</p>`,
    });
  } catch (e) {
    console.warn('[alert] recovery email failed for', probe, '-', (e as Error).message);
  }
  return true;
}
