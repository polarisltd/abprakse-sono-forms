import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_MISCONFIGURED_MESSAGE, getAuthConfig } from '@/lib/auth/config';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';

/**
 * The front door: nothing but the login screen is reachable without a valid
 * session cookie. Runs before every page and API route.
 *
 * Deliberately only a signature + expiry check on the cookie — no database
 * work here (this runs on every request, prefetches included). The API routes
 * repeat the check themselves via requireSession() (src/lib/auth/guard.ts), so
 * this file is not the only thing standing between the internet and the data.
 */

// Reachable without a session. The cron route authenticates with its own
// bearer secret (CRON_SECRET) because GitHub Actions has no browser cookie.
const PUBLIC_PATHS = new Set(['/login', '/api/auth/login', '/api/auth/logout', '/api/cron/purge-statements']);

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');
  const config = getAuthConfig();

  if (config.mode === 'off') return NextResponse.next();

  if (config.mode === 'misconfigured') {
    return isApi
      ? NextResponse.json({ error: AUTH_MISCONFIGURED_MESSAGE }, { status: 503 })
      : new NextResponse(AUTH_MISCONFIGURED_MESSAGE, {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
  }

  const loggedIn = verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
    config.sessionSecret,
    Date.now()
  );

  if (pathname === '/login' && loggedIn) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  if (loggedIn || PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const loginUrl = new URL('/login', request.url);
  if (pathname !== '/') loginUrl.searchParams.set('next', pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Everything except Next's own static assets and the favicon, which the
  // login screen itself needs before anyone is signed in.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
