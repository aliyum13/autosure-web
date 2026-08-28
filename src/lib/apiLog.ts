import { prisma } from '@/lib/db';

// Runtime list, not just a type: the healthcheck must ENUMERATE services to
// decide which are healthy. Deriving the type from the array keeps the two from
// drifting when a service is added.
export const API_SERVICES = ['clearvin', 'paystack', 'resend'] as const;
export type ApiService = typeof API_SERVICES[number];

const MAX_ERROR_LENGTH = 500;

// Error strings from Resend and the suppression endpoint routinely contain the
// customer's email address, and this table is surfaced in the admin UI — strip
// addresses before storing so the monitoring log never becomes a PII store.
function sanitize(message: string): string {
  return message
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .slice(0, MAX_ERROR_LENGTH);
}

/**
 * Records one outbound third-party API call.
 *
 * Deliberately never throws: if logging fails, the operation being observed
 * must still succeed. A monitoring outage should never take down report
 * generation or payment handling, so every failure here is swallowed to a
 * console.warn.
 */
export async function logApiCall(
  service: ApiService,
  operation: string,
  success: boolean,
  errorMessage?: string | null
): Promise<void> {
  try {
    const id = `apilog_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO api_call_log (id, service, operation, success, error_message, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      id, service, operation, success, errorMessage ? sanitize(String(errorMessage)) : null
    );
  } catch (e) {
    console.warn('[apiLog] failed to record call (non-fatal):', (e as Error).message);
  }
}
