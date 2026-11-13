import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AUTH_MISCONFIGURED_MESSAGE, getAuthConfig } from './config';
import { SESSION_COOKIE, verifySessionToken } from './session';

/**
 * Second line of defence behind src/proxy.ts: every data route calls this
 * first, so the API stays closed even if the proxy is bypassed or its matcher
 * is ever changed by mistake. Usage:
 *
 *   const denied = await requireSession();
 *   if (denied) return denied;
 */
export async function requireSession(): Promise<NextResponse | null> {
  const config = getAuthConfig();
  if (config.mode === 'off') return null;
  if (config.mode === 'misconfigured') {
    return NextResponse.json({ error: AUTH_MISCONFIGURED_MESSAGE }, { status: 503 });
  }
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token, config.sessionSecret, Date.now())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
