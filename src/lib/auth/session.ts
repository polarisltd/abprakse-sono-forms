import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The login session: a signed, stateless cookie. There are no user accounts
 * (the practice shares one authenticator secret), so the cookie only has to
 * prove "this browser entered a valid code, and not longer ago than
 * SESSION_HOURS". Value: `<expiresAtMs>.<HMAC-SHA256 of that, hex>`.
 *
 * Stateless on purpose — the proxy checks it on every request and must not
 * touch the database. The way to end every session at once is to change
 * SESSION_SECRET.
 */
export const SESSION_COOKIE = 'sono_session';
export const SESSION_HOURS = 12;
export const SESSION_MAX_AGE_SECONDS = SESSION_HOURS * 60 * 60;

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function createSessionToken(secret: string, nowMs: number): string {
  const expiresAt = String(nowMs + SESSION_MAX_AGE_SECONDS * 1000);
  return `${expiresAt}.${sign(expiresAt, secret)}`;
}

export function verifySessionToken(token: string | undefined, secret: string, nowMs: number): boolean {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const expiresAt = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!/^\d{1,16}$/.test(expiresAt)) return false;

  const expected = Buffer.from(sign(expiresAt, secret));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;

  return Number(expiresAt) > nowMs;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
