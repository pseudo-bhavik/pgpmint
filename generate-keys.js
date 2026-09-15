// generate-keys.js — Standalone Node.js CLI for batch GPG key generation
// Usage: node generate-keys.js --count <number>
// Output: keys.json in the current directory
// Dependency: openpgp (npm install openpgp)

import { generateKey } from 'openpgp';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { randomBytes } from 'crypto';

// ── CLI Argument Parsing ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
const countIdx = args.indexOf('--count');
if (countIdx === -1 || !args[countIdx + 1]) {
  console.error('\x1b[31m[ERROR]\x1b[0m Usage: node generate-keys.js --count <number>');
  process.exit(1);
}
const count = parseInt(args[countIdx + 1], 10);
if (isNaN(count) || count < 1 || count > 500) {
  console.error('\x1b[31m[ERROR]\x1b[0m --count must be a positive integer between 1 and 500.');
  process.exit(1);
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function randomHex(bytes = 4) {
  return randomBytes(bytes).toString('hex').toUpperCase();
}

function buildIdentity() {
  const tag = randomHex(4);
  const domain = ['vault.local', 'anon.local', 'secure.local', 'mint.local'][
    Math.floor(Math.random() * 4)
  ];
  return {
    name: `Anon-${tag}`,
    email: `anon_${tag.toLowerCase()}@${domain}`,
    comment: '',
  };
}

// ── Banner ────────────────────────────────────────────────────────────────────
console.log('\x1b[32m');
console.log('╔══════════════════════════════════════════════════════╗');
console.log('║         BATCH GPG KEY GENERATOR  v1.0               ║');
console.log('║         ECC Curve25519 · No Passphrase              ║');
console.log('╚══════════════════════════════════════════════════════╝');
console.log('\x1b[0m');
console.log(`\x1b[33m[INFO]\x1b[0m Generating \x1b[1m${count}\x1b[0m ECC keypair(s). Please wait…\n`);

// ── Load existing keys.json if it exists (append mode) ───────────────────────
let existingKeys = [];
let startId = 1;
if (existsSync('keys.json')) {
  try {
    existingKeys = JSON.parse(readFileSync('keys.json', 'utf-8'));
    startId = existingKeys.length + 1;
    console.log(`\x1b[33m[INFO]\x1b[0m Existing keys.json detected — appending from ID ${startId}.\n`);
  } catch {
    console.warn('\x1b[33m[WARN]\x1b[0m Could not parse existing keys.json; starting fresh.\n');
  }
}

// ── Key Generation Loop ───────────────────────────────────────────────────────
const generated = [];
const startTime = Date.now();

for (let i = 0; i < count; i++) {
  const identity = buildIdentity();
  const progress = `[${String(i + 1).padStart(String(count).length, '0')}/${count}]`;
  process.stdout.write(`\r\x1b[36m${progress}\x1b[0m Generating key for \x1b[33m${identity.email}\x1b[0m…`);

  try {
    const { publicKey, privateKey, revocationCertificate } = await generateKey({
      type: 'ecc',
      curve: 'curve25519',
      userIDs: [{ name: identity.name, email: identity.email }],
      passphrase: '',          // no passphrase — key stored in memory only during script run
      format: 'armored',
    });

    generated.push({
      id: startId + i,
      name: identity.name,
      email: identity.email,
      armoredKey: publicKey,
      privateKey: privateKey,
      revocationCertificate: revocationCertificate,
      used: false,
    });
  } catch (err) {
    console.error(`\n\x1b[31m[ERROR]\x1b[0m Failed on key ${i + 1}: ${err.message}`);
    process.exit(1);
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
process.stdout.write('\n');

// ── Merge and Write keys.json & keys-vault.json ────────────────────────────────
const allKeys = [...existingKeys, ...generated];
writeFileSync('keys.json', JSON.stringify(allKeys, null, 2), 'utf-8');
writeFileSync('keys-vault.json', JSON.stringify(allKeys, null, 2), 'utf-8');

// ── Terminal Summary Table ────────────────────────────────────────────────────
const COL = {
  id:    6,
  name:  14,
  email: 32,
  used:  6,
};

const line = `+${'-'.repeat(COL.id + 2)}+${'-'.repeat(COL.name + 2)}+${'-'.repeat(COL.email + 2)}+${'-'.repeat(COL.used + 2)}+`;
const header = `| ${'ID'.padEnd(COL.id)} | ${'NAME'.padEnd(COL.name)} | ${'EMAIL'.padEnd(COL.email)} | ${'USED'.padEnd(COL.used)} |`;

console.log('\n\x1b[32m' + line);
console.log(header);
console.log(line + '\x1b[0m');

for (const k of generated) {
  const row = `| ${String(k.id).padEnd(COL.id)} | ${k.name.padEnd(COL.name)} | ${k.email.padEnd(COL.email)} | ${String(k.used).padEnd(COL.used)} |`;
  console.log(row);
}

console.log('\x1b[32m' + line + '\x1b[0m');
console.log(`\n\x1b[32m[✓]\x1b[0m ${count} key(s) generated in \x1b[1m${elapsed}s\x1b[0m and saved to \x1b[1mkeys.json\x1b[0m (total: ${allKeys.length} keys).`);
