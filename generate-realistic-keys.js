// generate-realistic-keys.js — Standalone Node.js CLI for generating GPG keys with realistic human emails
// Usage: node generate-realistic-keys.js --count <number> [--fresh]
// Output: Appends (or initializes with --fresh) keys.json in the current directory

import { generateKey } from 'openpgp';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { randomBytes } from 'crypto';

// ── CLI Argument Parsing ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
const countIdx = args.indexOf('--count');
if (countIdx === -1 || !args[countIdx + 1]) {
  console.error('\x1b[31m[ERROR]\x1b[0m Usage: node generate-realistic-keys.js --count <number> [--fresh]');
  process.exit(1);
}
const count = parseInt(args[countIdx + 1], 10);
if (isNaN(count) || count < 1 || count > 1000) {
  console.error('\x1b[31m[ERROR]\x1b[0m --count must be an integer between 1 and 1000.');
  process.exit(1);
}
const isFresh = args.includes('--fresh');

// ── EXTENSIVE NAME & DOMAIN DICTIONARIES ───────────────────────────────────────
const FIRST_NAMES = [
  'Alexander', 'Sophia', 'Marcus', 'Elena', 'Liam', 'Olivia', 'Ethan', 'Isabella',
  'Lucas', 'Mia', 'Noah', 'Emma', 'Oliver', 'Ava', 'Mateo', 'Camila', 'Sebastian',
  'Aria', 'Julian', 'Chloe', 'Nathan', 'Priya', 'Leo', 'Zoe', 'Gabriel', 'Hannah',
  'Daniel', 'Leila', 'Henry', 'Nora', 'Elijah', 'Mila', 'Samuel', 'Maya', 'Benjamin',
  'Layla', 'William', 'Harper', 'James', 'Evelyn', 'Benjamin', 'Amelia', 'Lucas',
  'Abigail', 'Mason', 'Emily', 'Theodore', 'Elizabeth', 'Jack', 'Sofia', 'Levi',
  'Avery', 'Alexander', 'Ella', 'Jackson', 'Scarlett', 'Owen', 'Grace', 'Kai',
  'Victoria', 'Connor', 'Stella', 'Adrian', 'Aurora', 'Caleb', 'Natalie', 'Ian',
  'Luna', 'Wyatt', 'Savannah', 'Eli', 'Brooklyn', 'Julian', 'Bella', 'Isaac',
  'Claire', 'Anthony', 'Skylar', 'Grayson', 'Lucy', 'Thomas', 'Paisley', 'Leo',
  'Everly', 'Charles', 'Anna', 'Jaxon', 'Caroline', 'Miles', 'Nova', 'Ezra',
  'Genesis', 'Isaiah', 'Emilia', 'Andrew', 'Kennedy', 'Joshua', 'Samantha', 'Hudson',
  'Maya', 'Dominic', 'Willow', 'Nathan', 'Kinsley', 'Gavin', 'Naomi', 'Christian'
];

const LAST_NAMES = [
  'Vance', 'Rostova', 'Chen', 'Morales', 'Dubois', 'Sterling', 'Novak', 'Tanaka',
  'Lindqvist', 'Mercer', 'Kowalski', 'Sinclair', 'Hartmann', 'Nakamura', 'Moreau',
  'Fischer', 'Gomez', 'Weber', 'Becker', 'Hoffmann', 'Schulz', 'Wagner', 'Ricci',
  'Marino', 'Costa', 'Santos', 'Silva', 'Ferreira', 'Alvarez', 'Romero', 'Torres',
  'Flores', 'Castillo', 'Rivera', 'Vasquez', 'Soto', 'Contreras', 'Larsson', 'Berg',
  'Nilsson', 'Holm', 'Dahl', 'Hansen', 'Jensen', 'Pedersen', 'Nielsen', 'Muller',
  'Schmidt', 'Schneider', 'Fischer', 'Meyer', 'Schatz', 'Baumann', 'Kruger', 'Keller',
  'Vogel', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schrader', 'Neumann', 'Schwarz',
  'Zimmermann', 'Braun', 'Hart', 'Flynn', 'Callahan', 'Donovan', 'Gallagher', 'Sullivan',
  'O’Connor', 'Brennan', 'MacKenzie', 'Fraser', 'Cameron', 'Sinclair', 'Monroe', 'Holt',
  'Barrett', 'Collier', 'Davenport', 'Ellington', 'Fairchild', 'Garrison', 'Holloway',
  'Ingram', 'Kensington', 'Lancaster', 'Montague', 'Northwood', 'Oakley', 'Prescott',
  'Radcliffe', 'Stratford', 'Thornwood', 'Underwood', 'Vanguard', 'Westbrook', 'York'
];

const MIDDLE_INITIALS = ['A', 'B', 'C', 'D', 'E', 'F', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V', 'W'];

const TECH_PREFIXES = [
  'dev', 'code', 'build', 'node', 'sec', 'sys', 'lab', 'byte', 'core', 'net',
  'ops', 'stack', 'crypt', 'hash', 'flux', 'sync', 'block', 'bit', 'algo', 'matrix'
];

const DOMAINS_PUBLIC = [
  // Major webmail providers
  'gmail.com', 'outlook.com', 'proton.me', 'pm.me', 'icloud.com', 'yahoo.com', 'zoho.com',
  // Privacy & European mail
  'mailfence.com', 'tuta.io', 'fastmail.com', 'mailbox.org', 'posteo.de', 'gmx.com',
  // Developer & Infrastructure
  'devmail.io', 'coder.net', 'bytehub.org', 'techflow.io', 'sysops.dev', 'cloudnative.cc',
  'stackvibe.net', 'nodeworks.io', 'hashlabs.org', 'cryptomail.ch', 'vaultsec.io',
  'kernelbase.org', 'hyperlink.sh', 'binaryleaf.com', 'packetflow.net', 'nexustech.org'
];

// ── REALISTIC IDENTITY GENERATOR ──────────────────────────────────────────────
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomNum(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildRealisticIdentity() {
  const firstName = randomItem(FIRST_NAMES);
  const lastName  = randomItem(LAST_NAMES);
  const domain    = randomItem(DOMAINS_PUBLIC);
  const mid       = randomItem(MIDDLE_INITIALS);

  const fLower = firstName.toLowerCase();
  const lLower = lastName.toLowerCase();
  const fInitial = fLower.charAt(0);
  const lInitial = lLower.charAt(0);

  // Variety of real-world naming conventions (12 distinct patterns)
  const patternType = randomNum(1, 12);
  let userHandle = '';

  switch (patternType) {
    case 1: // john.doe
      userHandle = `${fLower}.${lLower}`;
      break;
    case 2: // jdoe
      userHandle = `${fInitial}${lLower}`;
      break;
    case 3: // johndoe
      userHandle = `${fLower}${lLower}`;
      break;
    case 4: // john_doe
      userHandle = `${fLower}_${lLower}`;
      break;
    case 5: // j.doe
      userHandle = `${fInitial}.${lLower}`;
      break;
    case 6: // john.d
      userHandle = `${fLower}.${lInitial}`;
      break;
    case 7: // john.doe92 (birth years 1978 - 2004)
      userHandle = `${fLower}.${lLower}${randomNum(78, 99)}`;
      break;
    case 8: // jdoe_03 (2-digit sequence or year)
      userHandle = `${fInitial}${lLower}_${randomNum(1, 99)}`;
      break;
    case 9: // john.m.doe (middle initial)
      userHandle = `${fLower}.${mid.toLowerCase()}.${lLower}`;
      break;
    case 10: // doe.john
      userHandle = `${lLower}.${fLower}`;
      break;
    case 11: // dev_johndoe or dev.john
      userHandle = `${randomItem(TECH_PREFIXES)}.${fLower}`;
      break;
    case 12: // johndoeNNN (3 digit random)
      userHandle = `${fLower}${lLower}${randomNum(10, 999)}`;
      break;
    default:
      userHandle = `${fLower}.${lLower}`;
  }

  const fullName = `${firstName} ${lastName}`;
  const email = `${userHandle}@${domain}`;

  return {
    name: fullName,
    email: email
  };
}

function getRandomShuffledDate() {
  const now = Date.now();
  const maxPastMs = 10 * 60 * 60 * 1000; // 10 hours in milliseconds
  const randomOffset = Math.floor(Math.random() * maxPastMs);
  return new Date(now - randomOffset);
}

// ── BANNER ────────────────────────────────────────────────────────────────────
console.log('\x1b[32m');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║       REALISTIC HIGH-VARIETY GPG KEY GENERATOR  v2.1        ║');
console.log('║       ECC Curve25519 · Timestamp Shuffling (-10h Window)    ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('\x1b[0m');
console.log(`\x1b[33m[INFO]\x1b[0m Generating \x1b[1m${count}\x1b[0m realistic GPG keypair(s) with randomized -10h timestamps. Please wait…\n`);

// ── Load or Initialize keys.json ──────────────────────────────────────────────
let existingKeys = [];
let startId = 1;

if (!isFresh && existsSync('keys.json')) {
  try {
    existingKeys = JSON.parse(readFileSync('keys.json', 'utf-8'));
    startId = existingKeys.length + 1;
    console.log(`\x1b[33m[INFO]\x1b[0m Existing keys.json detected (${existingKeys.length} keys) — appending from ID ${startId}.\n`);
  } catch {
    console.warn('\x1b[33m[WARN]\x1b[0m Could not parse existing keys.json; starting fresh.\n');
  }
} else if (isFresh) {
  console.log(`\x1b[33m[INFO]\x1b[0m --fresh flag supplied: Starting a brand new keys.json from ID 1.\n`);
}

// ── Key Generation Loop ───────────────────────────────────────────────────────
const generated = [];
const startTime = Date.now();

for (let i = 0; i < count; i++) {
  const identity = buildRealisticIdentity();
  const keyDate = getRandomShuffledDate();
  const progress = `[${String(i + 1).padStart(String(count).length, '0')}/${count}]`;
  process.stdout.write(`\r\x1b[36m${progress}\x1b[0m Creating key for \x1b[32m${identity.name.padEnd(20)}\x1b[0m <\x1b[33m${identity.email}\x1b[0m>…`);

  try {
    const { publicKey, privateKey, revocationCertificate } = await generateKey({
      type: 'ecc',
      curve: 'curve25519',
      userIDs: [{ name: identity.name, email: identity.email }],
      date: keyDate,
      passphrase: '',
      format: 'armored',
    });

    generated.push({
      id: startId + i,
      name: identity.name,
      email: identity.email,
      armoredKey: publicKey,
      privateKey: privateKey,
      revocationCertificate: revocationCertificate,
      createdAt: keyDate.toISOString(),
      used: false,
    });
  } catch (err) {
    console.error(`\n\x1b[31m[ERROR]\x1b[0m Failed on key ${i + 1}: ${err.message}`);
    process.exit(1);
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
process.stdout.write('\n');

// ── Merge & Write to keys.json & keys-vault.json ───────────────────────────────
const allKeys = isFresh ? generated : [...existingKeys, ...generated];
writeFileSync('keys.json', JSON.stringify(allKeys, null, 2), 'utf-8');
writeFileSync('keys-vault.json', JSON.stringify(allKeys, null, 2), 'utf-8');

// ── Output Summary ────────────────────────────────────────────────────────────
console.log('\n\x1b[32m+--------+----------------------+---------------------------------------+--------+\x1b[0m');
console.log('| ID     | NAME                 | EMAIL                                 | USED   |');
console.log('\x1b[32m+--------+----------------------+---------------------------------------+--------+\x1b[0m');

// Show sample of first 8 and last 2 if count is large
const previewList = generated.length > 10 ? [...generated.slice(0, 8), ...generated.slice(-2)] : generated;
for (const k of previewList) {
  const idStr   = String(k.id).padEnd(6);
  const nameStr = k.name.substring(0, 20).padEnd(20);
  const mailStr = k.email.substring(0, 37).padEnd(37);
  console.log(`| ${idStr} | ${nameStr} | ${mailStr} | ${String(k.used).padEnd(6)} |`);
}
if (generated.length > 10) {
  console.log(`| ...    | [${generated.length - 10} additional entries]...                              |        |`);
}
console.log('\x1b[32m+--------+----------------------+---------------------------------------+--------+\x1b[0m');
console.log(`\n\x1b[32m[✓] SUCCESS:\x1b[0m ${count} realistic key(s) generated in \x1b[1m${elapsed}s\x1b[0m (${(count / (elapsed || 0.001)).toFixed(1)} keys/sec).`);
console.log(`\x1b[32m[✓] TOTAL IN keys.json:\x1b[0m \x1b[1m${allKeys.length}\x1b[0m keys ready for batch minting.\n`);
