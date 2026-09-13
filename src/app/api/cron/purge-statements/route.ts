import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Retention window for form data (the `statements` table). Everything else
// (doctors, form definitions, etc.) is permanent and untouched by this job.
const RETENTION_HOURS = 12;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // If no secret is configured, don't block local/dev testing — but this
  // should always be set in production (see README).
  if (!secret) return true;

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${secret}`;
}

async function purge() {
  const sql = getDb();
  // NOTE: RETENTION_HOURS is interpolated OUTSIDE the interval string literal
  // (as a numeric multiplier) rather than inside it — the neon tagged-template
  // driver binds `${...}` as a query parameter, and a bound parameter placed
  // inside a quoted string literal (e.g. INTERVAL '${x} hours') is sent to
  // Postgres as literal text, not substituted, which breaks the interval.
  const deleted = await sql`
    DELETE FROM statements
    WHERE created_at < NOW() - (${RETENTION_HOURS} * INTERVAL '1 hour')
    RETURNING id
  `;
  return deleted.length;
}

// Vercel Cron invokes this route with GET on the configured schedule
// (see vercel.json). Runs hourly and deletes any `statements` row older
// than RETENTION_HOURS.
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const deletedCount = await purge();
    console.log(`[cron/purge-statements] deleted ${deletedCount} statement(s) older than ${RETENTION_HOURS}h`);
    return NextResponse.json({ ok: true, deletedCount, retentionHours: RETENTION_HOURS });
  } catch (err) {
    console.error('[cron/purge-statements] error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// Allow manually triggering a purge (e.g. from /admin) with the same auth rule.
export async function POST(request: NextRequest) {
  return GET(request);
}
