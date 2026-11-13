import { NextRequest, NextResponse } from 'next/server';
import { AUTH_MISCONFIGURED_MESSAGE, getAuthConfig } from '@/lib/auth/config';
import { claimStep, lockoutMinutes, recordAttempt } from '@/lib/auth/attempts';
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from '@/lib/auth/session';
import { verifyTotp } from '@/lib/auth/totp';

export const dynamic = 'force-dynamic';

/**
 * Exchanges a 6-digit authenticator code for a 12-hour session cookie.
 * Order matters: the attempt limit is checked before the code is looked at,
 * so a locked-out caller learns nothing about whether a guess was right.
 */
export async function POST(request: NextRequest) {
  const config = getAuthConfig();
  if (config.mode === 'off') return NextResponse.json({ ok: true });
  if (config.mode === 'misconfigured') {
    return NextResponse.json({ error: 'misconfigured', message: AUTH_MISCONFIGURED_MESSAGE }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const code = typeof body?.code === 'string' ? body.code : '';
    // On Vercel the first x-forwarded-for entry is the client address, set by
    // the platform (a client-sent value is overwritten).
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    const wait = await lockoutMinutes(ip);
    if (wait > 0) {
      return NextResponse.json({ error: 'locked', retryAfterMinutes: wait }, { status: 429 });
    }

    const step = verifyTotp(config.totpSecret, code, Date.now());
    if (step === null) {
      await recordAttempt(ip, false);
      return NextResponse.json({ error: 'invalid' }, { status: 401 });
    }

    // A correct code that was already used: not counted as a wrong guess (two
    // colleagues signing in within the same 30 seconds would otherwise eat
    // into the attempt limit), but not accepted either.
    if (!(await claimStep(step))) {
      return NextResponse.json({ error: 'used' }, { status: 401 });
    }

    await recordAttempt(ip, true);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, createSessionToken(config.sessionSecret, Date.now()), sessionCookieOptions());
    return response;
  } catch (err) {
    // Any failure (database down, bad secret format, …) refuses the login.
    console.error('POST /api/auth/login error:', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
