/**
 * Access protection is driven by two environment variables:
 *   TOTP_SECRET     base32 secret shared with the practice's authenticator apps
 *   SESSION_SECRET  random key that signs the session cookie
 * Generate both with `node dev/auth-setup.js`. See README "Access protection".
 */
export type AuthConfig =
  | { mode: 'on'; totpSecret: string; sessionSecret: string }
  /** Local development with neither variable set: no login, as before. */
  | { mode: 'off' }
  /** Anything else — notably production without the variables. Deny everything. */
  | { mode: 'misconfigured' };

export function getAuthConfig(): AuthConfig {
  const totpSecret = process.env.TOTP_SECRET?.trim() ?? '';
  const sessionSecret = process.env.SESSION_SECRET?.trim() ?? '';

  if (totpSecret && sessionSecret.length >= 32) {
    return { mode: 'on', totpSecret, sessionSecret };
  }
  // Fail closed: only a dev server with *nothing* configured runs open. A
  // production deploy that lost its variables, or a half-filled config, must
  // not silently serve patient data to the internet.
  if (!totpSecret && !sessionSecret && process.env.NODE_ENV !== 'production') {
    return { mode: 'off' };
  }
  return { mode: 'misconfigured' };
}

export const AUTH_MISCONFIGURED_MESSAGE =
  'Piekļuves aizsardzība nav nokonfigurēta (TOTP_SECRET / SESSION_SECRET).';
