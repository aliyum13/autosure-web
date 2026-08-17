import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'session';
// Non-httpOnly companion cookie — a pure UI hint so client components can
// show "Dashboard" vs "Login" without a network round trip. Carries no
// data beyond a flag; the httpOnly `session` cookie above is what every
// server-side check actually authorizes against. Spoofing this cookie only
// lets someone see a link that will correctly bounce them at the server.
const AUTHED_HINT_COOKIE = 'carhaki_authed';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // ~30 days, per product call

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  email: string;
  [key: string]: unknown;
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${Math.floor(SESSION_TTL_MS / 1000)}s`)
    .sign(getSecretKey());
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] });
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string, email: string) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const token = await encrypt({ userId, email });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
  cookieStore.set(AUTHED_HINT_COOKIE, '1', {
    httpOnly: false,
    secure: true,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(AUTHED_HINT_COOKIE);
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return decrypt(token);
}
