/**
 * Dependency-free checks for the login building blocks (src/lib/auth).
 *
 * The TOTP implementation is hand-written on node:crypto rather than pulled
 * from a library, so it is pinned here to the RFC 6238 Appendix B vectors —
 * if these pass, the codes match what any authenticator app shows.
 *
 * Run with:  npm run test:auth
 */
const assert = require('assert');
const path = require('path');

const totp = require(path.join(__dirname, '..', '.test-build', 'totp.js'));
const session = require(path.join(__dirname, '..', '.test-build', 'session.js'));

let pass = 0;
const failures = [];
const check = (name, fn) => {
  try {
    fn();
    pass++;
  } catch (e) {
    failures.push(`${name} :: ${e.message}`);
  }
};

// RFC 6238 Appendix B, SHA-1 rows. Seed is ASCII "12345678901234567890";
// the RFC lists 8-digit codes.
const RFC_KEY = Buffer.from('12345678901234567890');
const RFC_VECTORS = [
  [59, '94287082'],
  [1111111109, '07081804'],
  [1111111111, '14050471'],
  [1234567890, '89005924'],
  [2000000000, '69279037'],
  [20000000000, '65353130'],
];
for (const [seconds, expected] of RFC_VECTORS) {
  check(`RFC 6238 vector t=${seconds}`, () => {
    assert.strictEqual(totp.totpForStep(RFC_KEY, totp.timeStep(seconds * 1000), 8), expected);
  });
}

const SECRET = totp.base32Encode(RFC_KEY);
check('base32 round trip', () => {
  assert.strictEqual(SECRET, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  assert.ok(totp.base32Decode(SECRET).equals(RFC_KEY));
  assert.ok(totp.base32Decode('gezd gnbv-gy3t qojq gezd gnbv gy3t qojq').equals(RFC_KEY));
});
check('base32 rejects junk', () => assert.throws(() => totp.base32Decode('abc!')));

const NOW = 1700000000000;
const step = totp.timeStep(NOW);
const codeAt = (s) => totp.totpForStep(RFC_KEY, s);
check('current code accepted, returns its step', () =>
  assert.strictEqual(totp.verifyTotp(SECRET, codeAt(step), NOW), step));
check('previous code accepted', () =>
  assert.strictEqual(totp.verifyTotp(SECRET, codeAt(step - 1), NOW), step - 1));
check('code with a space accepted', () => {
  const c = codeAt(step);
  assert.strictEqual(totp.verifyTotp(SECRET, `${c.slice(0, 3)} ${c.slice(3)}`, NOW), step);
});
check('next (future) code rejected', () =>
  assert.strictEqual(totp.verifyTotp(SECRET, codeAt(step + 1), NOW), null));
check('code two steps old rejected', () =>
  assert.strictEqual(totp.verifyTotp(SECRET, codeAt(step - 2), NOW), null));
for (const bad of ['', '12345', '1234567', 'abcdef', '12345a']) {
  check(`malformed code ${JSON.stringify(bad)} rejected`, () =>
    assert.strictEqual(totp.verifyTotp(SECRET, bad, NOW), null));
}

const KEY = 'a'.repeat(64);
const token = session.createSessionToken(KEY, NOW);
check('fresh session valid', () => assert.strictEqual(session.verifySessionToken(token, KEY, NOW), true));
check('session valid just before 12h', () =>
  assert.strictEqual(session.verifySessionToken(token, KEY, NOW + 12 * 3600 * 1000 - 1), true));
check('session expired at 12h', () =>
  assert.strictEqual(session.verifySessionToken(token, KEY, NOW + 12 * 3600 * 1000), false));
check('session signed with another key rejected', () =>
  assert.strictEqual(session.verifySessionToken(token, 'b'.repeat(64), NOW), false));
check('extended expiry (tampered) rejected', () => {
  const [exp, sig] = token.split('.');
  assert.strictEqual(session.verifySessionToken(`${Number(exp) + 1e9}.${sig}`, KEY, NOW), false);
});
for (const bad of [undefined, '', 'x', '.', '123.', '.abc', `${NOW + 1000}.deadbeef`]) {
  check(`garbage session ${JSON.stringify(bad)} rejected`, () =>
    assert.strictEqual(session.verifySessionToken(bad, KEY, NOW), false));
}

if (failures.length) {
  console.error(`FAILED ${failures.length} (passed ${pass}):\n  ` + failures.join('\n  '));
  process.exit(1);
}
console.log(`auth checks: ${pass} passed`);
