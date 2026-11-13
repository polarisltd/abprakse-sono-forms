import { getDb } from '@/lib/db';

/**
 * Login attempt limiting and one-time-code replay protection.
 *
 * The login is a 6-digit code and nothing else, so the attempt limit is what
 * actually makes guessing impractical. Counters live in the database because
 * serverless instances share no memory.
 *
 *  - per address: MAX_FAILS_PER_IP wrong codes per IP_WINDOW_MINUTES
 *  - overall:     MAX_FAILS_GLOBAL wrong codes per GLOBAL_WINDOW_MINUTES, from
 *    anywhere — the one that stops a guesser who keeps switching addresses.
 *    At two accepted codes per attempt that caps a sustained attack at roughly
 *    a 0.05 % chance per day. The cost: such an attack blocks *new* logins
 *    while it lasts (browsers already signed in are unaffected).
 */
export const MAX_FAILS_PER_IP = 5;
export const IP_WINDOW_MINUTES = 15;
export const MAX_FAILS_GLOBAL = 10;
export const GLOBAL_WINDOW_MINUTES = 60;

type Sql = ReturnType<typeof getDb>;

/** Also called from /api/db-init. Idempotent. */
export async function ensureAuthTables(sql: Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS auth_attempts (
      id SERIAL PRIMARY KEY,
      ip TEXT NOT NULL,
      success BOOLEAN NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_auth_attempts_created_at ON auth_attempts(created_at)`;
  // One row per accepted code (its 30-second time step), so a code that was
  // seen over someone's shoulder can't be used a second time.
  await sql`
    CREATE TABLE IF NOT EXISTS auth_used_steps (
      step BIGINT PRIMARY KEY,
      used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

/** Postgres "undefined_table" — the auth tables haven't been created yet. */
function isMissingTable(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '42P01';
}

/**
 * The login must work before anyone can reach "Inicializēt DB" (which itself
 * needs a session), so the tables are created on first use rather than
 * depending on that button.
 */
async function withAuthTables<T>(sql: Sql, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (!isMissingTable(err)) throw err;
    await ensureAuthTables(sql);
    return run();
  }
}

/** Minutes until another attempt is allowed, or 0 if one is allowed now. */
export async function lockoutMinutes(ip: string): Promise<number> {
  const sql = getDb();
  return withAuthTables(sql, async () => {
    await sql`DELETE FROM auth_attempts WHERE created_at < NOW() - INTERVAL '1 day'`;
    await sql`DELETE FROM auth_used_steps WHERE used_at < NOW() - INTERVAL '1 day'`;

    // For each limit: how many recent failures, and how long until the oldest
    // of them leaves its window (which is when a slot frees up).
    const rows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE ip = ${ip} AND created_at > NOW() - INTERVAL '15 minutes') AS ip_fails,
        EXTRACT(EPOCH FROM MIN(created_at) FILTER (
          WHERE ip = ${ip} AND created_at > NOW() - INTERVAL '15 minutes'
        ) + INTERVAL '15 minutes' - NOW()) AS ip_wait,
        COUNT(*) AS all_fails,
        EXTRACT(EPOCH FROM MIN(created_at) + INTERVAL '60 minutes' - NOW()) AS all_wait
      FROM auth_attempts
      WHERE NOT success AND created_at > NOW() - INTERVAL '60 minutes'
    `;
    const r = rows[0];
    let waitSeconds = 0;
    if (Number(r.ip_fails) >= MAX_FAILS_PER_IP) waitSeconds = Math.max(waitSeconds, Number(r.ip_wait));
    if (Number(r.all_fails) >= MAX_FAILS_GLOBAL) waitSeconds = Math.max(waitSeconds, Number(r.all_wait));
    return waitSeconds > 0 ? Math.max(1, Math.ceil(waitSeconds / 60)) : 0;
  });
}

export async function recordAttempt(ip: string, success: boolean): Promise<void> {
  const sql = getDb();
  await withAuthTables(sql, async () => {
    await sql`INSERT INTO auth_attempts (ip, success) VALUES (${ip}, ${success})`;
  });
}

/** False if this code's time step was already used to log in. */
export async function claimStep(step: number): Promise<boolean> {
  const sql = getDb();
  return withAuthTables(sql, async () => {
    const rows = await sql`
      INSERT INTO auth_used_steps (step) VALUES (${step})
      ON CONFLICT (step) DO NOTHING
      RETURNING step
    `;
    return rows.length > 0;
  });
}
