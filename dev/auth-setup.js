/**
 * One-time setup for the login (see README "Access protection").
 *
 *   node dev/auth-setup.js          generate new secrets + show the QR code
 *   node dev/auth-setup.js --show   show the QR code again for the existing
 *                                   TOTP_SECRET (from the environment or
 *                                   .env.local) — to enrol another phone
 *
 * Run this yourself, in your own terminal: what it prints are the keys to the
 * application. Nothing is written to disk and nothing is sent anywhere.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');

const ISSUER = 'Sono Forms';
const ACCOUNT = 'prakse';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32(bytes) {
  let out = '';
  let bits = 0;
  let value = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += ALPHABET[(value >>> bits) & 31];
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function existingSecret() {
  if (process.env.TOTP_SECRET) return process.env.TOTP_SECRET.trim();
  const envFile = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envFile)) return null;
  const match = fs.readFileSync(envFile, 'utf8').match(/^TOTP_SECRET=(.+)$/m);
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
}

function showQr(secret) {
  const label = encodeURIComponent(`${ISSUER}:${ACCOUNT}`);
  const uri = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=6&period=30`;
  console.log('\nScan this with Microsoft Authenticator / Google Authenticator');
  console.log('(every phone that should be able to log in scans the same code):\n');
  qrcode.generate(uri, { small: true });
  console.log(`\nOr type the key in by hand:  ${secret.match(/.{1,4}/g).join(' ')}`);
  console.log('  (account name: anything, type: time-based, 6 digits)\n');
}

if (process.argv.includes('--show')) {
  const secret = existingSecret();
  if (!secret) {
    console.error('No TOTP_SECRET found in the environment or in .env.local.');
    process.exit(1);
  }
  showQr(secret);
} else {
  const totpSecret = base32(crypto.randomBytes(20)); // 160 bits, the RFC 4226 recommendation
  const sessionSecret = crypto.randomBytes(32).toString('hex');
  showQr(totpSecret);
  console.log('Add these two variables to the Vercel project');
  console.log('(Settings → Environment Variables → Production), then redeploy:\n');
  console.log(`TOTP_SECRET=${totpSecret}`);
  console.log(`SESSION_SECRET=${sessionSecret}\n`);
  console.log('Keep TOTP_SECRET somewhere safe (e.g. a password manager): it is needed');
  console.log('to enrol a new phone later. Anyone who has it can log in.\n');
}
