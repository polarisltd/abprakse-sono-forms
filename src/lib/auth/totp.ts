import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Time-based one-time codes (RFC 6238) with the parameters every
 * authenticator app defaults to: HMAC-SHA1, 6 digits, 30-second steps.
 * Kept dependency-free and pure (the secret and clock are arguments) so
 * dev/auth.check.js can run it against the RFC's published test vectors.
 */
export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** RFC 4648 base32 → bytes. Tolerates lowercase, spaces, dashes and '=' padding. */
export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=-]/g, '');
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error('Invalid base32 character in TOTP secret');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

export function base32Encode(bytes: Uint8Array): string {
  let out = '';
  let bits = 0;
  let value = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += BASE32_ALPHABET[(value >>> bits) & 31];
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function timeStep(nowMs: number): number {
  return Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS);
}

/** The code for one time step (RFC 4226 dynamic truncation). */
export function totpForStep(key: Buffer, step: number, digits = TOTP_DIGITS): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac('sha1', key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** digits).padStart(digits, '0');
}

/**
 * Returns the time step the code belongs to, or null if it is wrong.
 *
 * Only the current and the previous step are accepted: enough for someone
 * who typed a code just as it rolled over, without widening what a guesser
 * can hit. Every candidate is compared (no early exit) in constant time.
 * The caller records the returned step so the same code can't be replayed.
 */
export function verifyTotp(secretBase32: string, code: string, nowMs: number): number | null {
  const normalized = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return null;
  const key = base32Decode(secretBase32);
  const current = timeStep(nowMs);
  const given = Buffer.from(normalized);
  let matched: number | null = null;
  for (const step of [current, current - 1]) {
    const expected = Buffer.from(totpForStep(key, step));
    if (timingSafeEqual(given, expected) && matched === null) matched = step;
  }
  return matched;
}
