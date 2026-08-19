import { createHash, randomInt } from 'crypto';
import { prisma } from '@/lib/db';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_WINDOW = 3;
const SEND_WINDOW_MINUTES = 15;

function hashCode(email: string, code: string): string {
  const pepper = process.env.OTP_PEPPER;
  if (!pepper) throw new Error('OTP_PEPPER is not set');
  return createHash('sha256').update(`${email.toLowerCase().trim()}:${code}:${pepper}`).digest('hex');
}

export function generateCode(): string {
  // 6-digit, zero-padded
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export async function isRateLimited(email: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS count FROM login_otps
     WHERE email = $1 AND created_at > NOW() - INTERVAL '${SEND_WINDOW_MINUTES} minutes'`,
    email.toLowerCase().trim()
  ) as Array<{ count: number }>;
  return (rows[0]?.count ?? 0) >= MAX_SENDS_PER_WINDOW;
}

export async function createOtp(email: string): Promise<string> {
  const code = generateCode();
  const normalizedEmail = email.toLowerCase().trim();
  const id = `otp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.$executeRawUnsafe(
    `INSERT INTO login_otps (id, email, code_hash, expires_at, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    id, normalizedEmail, hashCode(normalizedEmail, code), expiresAt
  );

  return code;
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'no_active_code' | 'expired' | 'too_many_attempts' | 'wrong_code' };

export async function verifyOtp(email: string, code: string): Promise<VerifyResult> {
  const normalizedEmail = email.toLowerCase().trim();

  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, code_hash, expires_at, attempt_count FROM login_otps
     WHERE email = $1 AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    normalizedEmail
  ) as Array<{ id: string; code_hash: string; expires_at: Date; attempt_count: number }>;

  const row = rows[0];
  if (!row) return { ok: false, reason: 'no_active_code' };

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }
  if (row.attempt_count >= MAX_ATTEMPTS) {
    return { ok: false, reason: 'too_many_attempts' };
  }

  const matches = row.code_hash === hashCode(normalizedEmail, code.trim());

  if (!matches) {
    await prisma.$executeRawUnsafe(
      `UPDATE login_otps SET attempt_count = attempt_count + 1 WHERE id = $1`,
      row.id
    );
    return { ok: false, reason: 'wrong_code' };
  }

  await prisma.$executeRawUnsafe(
    `UPDATE login_otps SET consumed_at = NOW() WHERE id = $1`,
    row.id
  );
  return { ok: true };
}

// Creates the account on first-ever successful OTP for this email if it
// doesn't exist yet — this *is* the auto-link: any orders/report_credits
// already on this email become visible to whoever proves ownership of it.
export async function getOrCreateAccount(email: string): Promise<{ id: string; email: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.$queryRawUnsafe(
    `SELECT id, email FROM accounts WHERE email = $1 LIMIT 1`,
    normalizedEmail
  ) as Array<{ id: string; email: string }>;
  if (existing[0]) return existing[0];

  const id = `acct_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO accounts (id, email, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (email) DO NOTHING`,
    id, normalizedEmail
  );

  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, email FROM accounts WHERE email = $1 LIMIT 1`,
    normalizedEmail
  ) as Array<{ id: string; email: string }>;
  return rows[0];
}
