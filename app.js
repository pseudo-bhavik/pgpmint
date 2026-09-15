/**
 * app.js — they · seen Autonomous Engine & Cryptographic Vault v4.1
 * 100% Client-Side · Ethereum Mainnet (Chain ID: 1)
 * Target Contract: 0x3286e6525A38cD1d277ECaF435b156c0cc892C29
 * Target Method: Function #9 seen(string pgp) [Selector: 0x363355d2]
 */

const ethers = window.ethers;
const openpgp = window.openpgp;

// ── CONSTANTS & SECURITY BOUNDARIES ───────────────────────────────────────────
const CONTRACT_ADDRESS      = '0x3286e6525A38cD1d277ECaF435b156c0cc892C29';
const CONTRACT_ABI          = [
  'function seen(string pgp) public',
  'function clavisUsed(bytes32) view returns (bool)',
  'function auris(uint256) view returns (bool)',
  'function sera(uint256) view returns (bool)',
  'function fur(uint256) view returns (bool)',
  'function signumOf(address) view returns (uint256)',
  'event Visus(address indexed qui, uint256 indexed signum)',
  'event Auditus(uint256 indexed signum)',
  'event Damnatio(address indexed qui)'
];
const TARGET_FUNCTION_NAME  = 'seen';
const TARGET_SELECTOR       = '0x363355d2';
const CHAIN_ID              = 1n;
const DEFAULT_RPC           = 'https://ethereum-rpc.publicnode.com';

const STORAGE_KEY_USED      = 'they_seen_used_ids_v4';
const STORAGE_KEY_VAULT     = 'they_seen_vault_v4';
const STORAGE_KEY_ADMIN     = 'they_seen_admin_v4';

// Minimum Safe Gas Settings for Autonomous Burner Wallets (Ethereum Mainnet)
const MIN_SAFE_PRIORITY_GWEI = '0.05';
const DEFAULT_GAS_LIMIT      = 80000n;

// ── STATE VARIABLES ───────────────────────────────────────────────────────────
let gpgKeyPool       = [];       // Active pool of keys for minting
let keyVault         = [];       // Master Cryptographic Vault (Public, Private, Revocation)
let adminRegistry    = [];       // Master Address <-> Key <-> Tx mapping registry
let usedKeyIdsSet    = new Set();// Set of used key IDs (persisted in localStorage)
let runLog           = [];
let abortFlag        = false;
let isBatchRunning   = false;
let isGeneratingKeys = false;
let activeMode       = 'wallet'; // 'wallet' | 'bulk' | 'vault' | 'admin'
let walletKeySource  = 'pool';   // 'pool' | 'generate' | 'custom'

let browserProvider  = null;
let connectedSigner  = null;
let connectedAddress = null;

let selectedModalKey = null;
let quickGeneratedKey= null;

// ── DOM SELECTORS ─────────────────────────────────────────────────────────────
const $ = function(id) { return document.getElementById(id); };

// Navigation Buttons
const elModeBtnWallet     = $('mode-btn-wallet');
const elModeBtnBulk       = $('mode-btn-bulk');
const elModeBtnVault      = $('mode-btn-vault');
const elModeBtnAdmin      = $('mode-btn-admin');
const elModeDescText      = $('mode-desc-text');

// Panels
const elWalletWrap        = $('wallet-mode-wrap');
const elBulkWrap          = $('bulk-mode-wrap');
const elVaultWrap         = $('vault-mode-wrap');
const elAdminWrap         = $('admin-mode-wrap');

// Wallet Mode Elements
const elBtnConnect        = $('btn-connect-wallet');
const elBtnDisconnect     = $('btn-disconnect-wallet');
const elBtnSwitchNetwork  = $('btn-switch-network');
const elWcInfo            = $('wc-info');
const elWcAddress         = $('wc-address');
const elWcBalance         = $('wc-balance');
const elWcNetwork         = $('wc-network');

const elWmBtnFetchGas     = $('wm-btn-fetch-gas');
const elWmGrBase          = $('wm-gr-base');
const elWmGasStatus       = $('wm-gas-status');

const elWmTabPool         = $('wm-tab-pool');
const elWmTabGenerate     = $('wm-tab-generate');
const elWmTabCustom       = $('wm-tab-custom');
const elWmPoolStatsRow    = $('wm-pool-stats-row');
const elWmGenerateCard    = $('wm-generate-card');
const elWmCustomCard      = $('wm-custom-card');
const elWmCustomTextarea  = $('wm-custom-textarea');
const elWmBtnQuickGen     = $('wm-btn-quick-gen');

const elWmGpgAvail        = $('wm-gpg-avail');
const elWmGpgTotal        = $('wm-gpg-total');
const elWmGpgNext         = $('wm-gpg-next');
const elWmGpgSource       = $('wm-gpg-source');
const elPreviewKeyTag     = $('preview-key-tag');
const elPreviewVaultTag   = $('preview-vault-tag');
const elPreviewKeyText    = $('preview-key-text');

const elBtnSingleMint     = $('btn-single-mint');
const elWmMintResult      = $('wm-mint-result');
const elWmBtnExportKeys   = $('wm-btn-export-keys');
const elWmBtnDownloadVault= $('wm-btn-download-vault');

// Bulk Mode Elements
const elRpcUrl            = $('rpc-url');
const elTxDelay          = $('tx-delay');
const elBtnFetchGas      = $('btn-fetch-gas');
const elGrBase           = $('gr-base');
const elGrPriority       = $('gr-priority');
const elGrEstCost        = $('gr-est-cost');
const elGasStatus        = $('gas-status');

const elPkInput          = $('pk-input');
const elBtnClearPks      = $('btn-clear-pks');
const elWalletCount      = $('wallet-count');
const elGpgCount         = $('gpg-count');
const elGpgTotal         = $('wpg-total');
const elGpgSource        = $('gpg-source');
const elGpgDropZone      = $('gpg-drop-zone');
const elGpgFileInput     = $('gpg-file-input');
const elDropFilename     = $('drop-filename');
const elGpgPasteInput    = $('gpg-paste-input');

const elStatWallets      = $('stat-wallets');
const elStatGpg          = $('stat-gpg');
const elStatGas          = $('stat-gas');
const elStatProgress     = $('stat-progress');
const elStatSuccess      = $('stat-success');
const elStatFailed       = $('stat-failed');
const elProgressBar      = $('progress-bar');
const elBtnInitiate      = $('btn-initiate');
const elBtnAbort         = $('btn-abort');
const elAbortNotice      = $('abort-notice');
const elExecTbody        = $('exec-tbody');
const elBtnExportKeys    = $('btn-export-keys');
const elBtnExportCsv     = $('btn-export-csv');
const elBtnExportBulkVault = $('btn-export-bulk-vault');
const elBtnClearTable    = $('btn-clear-table');

// Option 3: Generator & Vault Elements
const elGenCount         = $('gen-count');
const elGenStyle         = $('gen-style');
const elGenTimeShuffle   = $('gen-time-shuffle');
const elBtnRunGenerator  = $('btn-run-generator');
const elGenProgressBox   = $('gen-progress-box');
const elGenProgressLabel = $('gen-progress-label');
const elGenProgressNum   = $('gen-progress-num');
const elGenProgressBar   = $('gen-progress-bar');

const elVaultStatTotal   = $('vault-stat-total');
const elVaultStatTriads  = $('vault-stat-triads');
const elVaultStatUnused  = $('vault-stat-unused');
const elVaultStatMapped  = $('vault-stat-mapped');
const elVaultBadgeTotal  = $('vault-badge-total');
const elBtnDownloadVaultJson = $('btn-download-vault-json');
const elBtnDownloadVaultTxt  = $('btn-download-vault-txt');
const elBtnDownloadUnusedJson= $('btn-download-unused-json');
const elBtnImportVault   = $('btn-import-vault');
const elFileImportVault  = $('file-import-vault');
const elBtnClearVault    = $('btn-clear-vault');
const elVaultSearchInput = $('vault-search-input');
const elVaultFilteredCount = $('vault-filtered-count');
const elVaultKeysContainer = $('vault-keys-container');

// Option 4: Admin Registry Elements
const elAdmStatTotal     = $('adm-stat-total');
const elAdmStatWallet    = $('adm-stat-wallet');
const elAdmStatBulk      = $('adm-stat-bulk');
const elAdmStatPrivSaved = $('adm-stat-priv-saved');
const elAdmSearchInput   = $('adm-search-input');
const elAdmTbody         = $('adm-tbody');
const elAdmBtnExportJson = $('adm-btn-export-json');
const elAdmBtnExportCsv  = $('adm-btn-export-csv');
const elAdmBtnExportKeypack = $('adm-btn-export-keypack');
const elAdmBtnClear      = $('adm-btn-clear');

// Shared Console
const elConsoleLog       = $('console-log');
const elBtnClearConsole  = $('btn-clear-console');

// Modal Elements
const elModalOverlay     = $('key-modal-overlay');
const elModalTitle       = $('modal-title');
const elModalClose       = $('modal-btn-close');
const elModalMetaGrid    = $('modal-meta-grid');
const elModalTabPub      = $('modal-tab-pub');
const elModalTabPriv     = $('modal-tab-priv');
const elModalTabRev      = $('modal-tab-rev');
const elModalContentText = $('modal-content-text');
const elModalBtnCopy     = $('modal-btn-copy');
const elModalBtnDownload = $('modal-btn-download');
const elModalBtnDownloadAll = $('modal-btn-download-all');
const elModalCopiedNotice= $('modal-copied-notice');
let activeModalTab       = 'pub';

// ── NAME & DOMAIN DICTIONARIES ────────────────────────────────────────────────
const FIRST_NAMES = [
  'Alexander', 'Sophia', 'Marcus', 'Elena', 'Liam', 'Olivia', 'Ethan', 'Isabella',
  'Lucas', 'Mia', 'Noah', 'Emma', 'Oliver', 'Ava', 'Mateo', 'Camila', 'Sebastian',
  'Aria', 'Julian', 'Chloe', 'Nathan', 'Priya', 'Leo', 'Zoe', 'Gabriel', 'Hannah',
  'Daniel', 'Leila', 'Henry', 'Nora', 'Elijah', 'Mila', 'Samuel', 'Maya', 'Benjamin',
  'Layla', 'William', 'Harper', 'James', 'Evelyn', 'Benjamin', 'Amelia', 'Lucas'
];

const LAST_NAMES = [
  'Vance', 'Rostova', 'Chen', 'Morales', 'Dubois', 'Sterling', 'Novak', 'Tanaka',
  'Lindqvist', 'Mercer', 'Kowalski', 'Sinclair', 'Hartmann', 'Nakamura', 'Moreau',
  'Fischer', 'Gomez', 'Weber', 'Becker', 'Hoffmann', 'Schulz', 'Wagner', 'Ricci',
  'Marino', 'Costa', 'Santos', 'Silva', 'Ferreira', 'Alvarez', 'Romero', 'Torres'
];

const DOMAINS_PUBLIC = [
  'gmail.com', 'outlook.com', 'proton.me', 'pm.me', 'icloud.com', 'yahoo.com', 'zoho.com',
  'mailfence.com', 'tuta.io', 'fastmail.com', 'mailbox.org', 'posteo.de', 'gmx.com',
  'devmail.io', 'coder.net', 'bytehub.org', 'techflow.io', 'sysops.dev', 'cloudnative.cc'
];

// ── UTILITIES ─────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeError(err) {
  if (!err) return 'Unknown error occurred.';
  let msg = err.reason || err.shortMessage || err.message || String(err);
  msg = msg.replace(/0x[a-fA-F0-9]{64}/g, '[REDACTED_HEX]');
  return escapeHtml(msg);
}

function ts() {
  return new Date().toISOString().substring(11, 23);
}

function log(message, type) {
  if (!elConsoleLog) return;
  const line = document.createElement('span');
  line.className = 'log-line log-' + (type || 'info');
  line.textContent = '[' + ts() + '] ' + message;
  elConsoleLog.appendChild(line);
  elConsoleLog.appendChild(document.createElement('br'));
  elConsoleLog.scrollTop = elConsoleLog.scrollHeight;
}

function logClear() {
  if (elConsoleLog) elConsoleLog.innerHTML = '';
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomNum(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildIdentity(style) {
  if (style === 'anon') {
    const hex = Math.random().toString(16).substring(2, 10).toUpperCase();
    return {
      name: 'Anon-' + hex,
      email: 'anon_' + hex.toLowerCase() + '@vault.local'
    };
  }
  const fn = randomItem(FIRST_NAMES);
  const ln = randomItem(LAST_NAMES);
  const dom = randomItem(DOMAINS_PUBLIC);
  const fLower = fn.toLowerCase();
  const lLower = ln.toLowerCase();
  const p = randomNum(1, 6);
  let userHandle = fLower + '.' + lLower;
  if (p === 2) userHandle = fLower.charAt(0) + lLower;
  else if (p === 3) userHandle = fLower + '_' + lLower;
  else if (p === 4) userHandle = fLower + '.' + lLower + randomNum(78, 99);
  return {
    name: fn + ' ' + ln,
    email: userHandle + '@' + dom
  };
}

function getRandomDate(shuffle) {
  if (!shuffle) return new Date();
  const maxPastMs = 10 * 60 * 60 * 1000;
  const offset = Math.floor(Math.random() * maxPastMs);
  return new Date(Date.now() - offset);
}

function triggerDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── LOCAL STORAGE PERSISTENCE ─────────────────────────────────────────────────
function loadPersistedState() {
  try {
    const rawUsed = localStorage.getItem(STORAGE_KEY_USED);
    if (rawUsed) {
      const arr = JSON.parse(rawUsed);
      if (Array.isArray(arr)) {
        arr.forEach(function(id) { usedKeyIdsSet.add(Number(id)); });
      }
    }
  } catch (_) {}

  try {
    const rawAdmin = localStorage.getItem(STORAGE_KEY_ADMIN);
    if (rawAdmin) {
      const arr = JSON.parse(rawAdmin);
      if (Array.isArray(arr)) {
        adminRegistry = arr;
      }
    }
  } catch (_) {}
}

function persistUsedKeyId(keyId) {
  if (keyId === undefined || keyId === null) return;
  usedKeyIdsSet.add(Number(keyId));
  try {
    localStorage.setItem(STORAGE_KEY_USED, JSON.stringify(Array.from(usedKeyIdsSet)));
  } catch (_) {}
}

function persistAdminRegistry() {
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN, JSON.stringify(adminRegistry));
  } catch (_) {}
}

// ── ON-CHAIN CLAVIS USED VERIFICATION ─────────────────────────────────────────
async function checkKeyUsedOnChain(armoredKey) {
  if (!armoredKey) return false;
  try {
    const provider = browserProvider || new ethers.JsonRpcProvider(DEFAULT_RPC, 1);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const keyHash = ethers.keccak256(ethers.toUtf8Bytes(armoredKey));
    return await contract.clavisUsed(keyHash);
  } catch (_) {
    return false;
  }
}

// ── MODE SWITCHING ────────────────────────────────────────────────────────────
function switchMode(mode) {
  activeMode = mode;
  elModeBtnWallet.classList.toggle('active', mode === 'wallet');
  elModeBtnBulk.classList.toggle('active', mode === 'bulk');
  elModeBtnVault.classList.toggle('active', mode === 'vault');
  elModeBtnAdmin.classList.toggle('active', mode === 'admin');

  elWalletWrap.style.display = mode === 'wallet' ? 'block' : 'none';
  elBulkWrap.style.display   = mode === 'bulk'   ? 'block' : 'none';
  elVaultWrap.style.display  = mode === 'vault'  ? 'block' : 'none';
  elAdminWrap.style.display  = mode === 'admin'  ? 'block' : 'none';

  if (mode === 'wallet') {
    elModeDescText.textContent = 'Option 1: Interactive single mint via MetaMask / Browser Wallet (native gas selector)';
    fetchWalletGas();
  } else if (mode === 'bulk') {
    elModeDescText.textContent = 'Option 2: Automated sequential batch loop over burner private keys (autonomous min gas)';
    fetchBulkGas();
  } else if (mode === 'vault') {
    elModeDescText.textContent = 'Option 3: Cryptographic Key Generator & Closed-System Vault (Public, Private, Revocation Triads)';
    renderVaultUi();
  } else if (mode === 'admin') {
    elModeDescText.textContent = 'Option 4: Master Address-to-PGP Key Registry, Verification & Audit Ledger';
    renderAdminUi();
  }

  log('Switched navigation to ' + mode.toUpperCase() + ' panel.', 'info');
}

// ── CRYPTOGRAPHIC VAULT & KEYPAIR ENGINE ──────────────────────────────────────
async function generateSingleKeypair(identity, keyDate) {
  if (!openpgp || !openpgp.generateKey) {
    throw new Error('OpenPGP.js library not loaded in browser.');
  }

  const { publicKey, privateKey, revocationCertificate } = await openpgp.generateKey({
    type: 'ecc',
    curve: 'curve25519',
    userIDs: [{ name: identity.name, email: identity.email }],
    date: keyDate,
    passphrase: '',
    format: 'armored'
  });

  return {
    armoredKey: publicKey,
    privateKey: privateKey || '',
    revocationCertificate: revocationCertificate || ''
  };
}

function addToVault(keyEntry) {
  const existingIdx = keyVault.findIndex(function(k) { return k.id === keyEntry.id || (k.armoredKey && k.armoredKey === keyEntry.armoredKey); });
  if (existingIdx !== -1) {
    keyVault[existingIdx] = Object.assign({}, keyVault[existingIdx], keyEntry);
  } else {
    keyVault.push(keyEntry);
  }

  const poolIdx = gpgKeyPool.findIndex(function(k) { return k.id === keyEntry.id || (k.armoredKey && k.armoredKey === keyEntry.armoredKey); });
  if (poolIdx !== -1) {
    gpgKeyPool[poolIdx] = Object.assign({}, gpgKeyPool[poolIdx], keyEntry);
  } else {
    gpgKeyPool.push(keyEntry);
  }

  if (keyEntry.used) {
    persistUsedKeyId(keyEntry.id);
  }

  updateVaultCounters();
}

function updateVaultCounters() {
  const total = keyVault.length;
  const triads = keyVault.filter(function(k) { return !!k.privateKey && !!k.revocationCertificate; }).length;
  const unused = keyVault.filter(function(k) { return !k.used && !usedKeyIdsSet.has(k.id); }).length;
  const mapped = keyVault.filter(function(k) { return !!k.usedByAddress || k.used || usedKeyIdsSet.has(k.id); }).length;

  if (elVaultStatTotal)  elVaultStatTotal.textContent  = total;
  if (elVaultStatTriads) elVaultStatTriads.textContent = triads;
  if (elVaultStatUnused) elVaultStatUnused.textContent = unused;
  if (elVaultStatMapped) elVaultStatMapped.textContent = mapped;
  if (elVaultBadgeTotal) elVaultBadgeTotal.textContent = total + ' Keypairs Stored';
}

function parseGpgJson(raw) {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(data)) throw new Error('Root element must be a JSON array.');
    data.forEach(function(entry, idx) {
      if (entry.id === undefined) entry.id = idx + 1;
      if (typeof entry.armoredKey !== 'string') throw new Error('Entry ' + idx + ' is missing armoredKey.');
    });
    return data;
  } catch (err) {
    log('GPG JSON parse error: ' + err.message, 'error');
    return null;
  }
}

function loadGpgKeys(keys, sourceName) {
  sourceName = sourceName || 'keys.json';
  keys.forEach(function(curr, idx) {
    const id = curr.id !== undefined ? curr.id : (idx + 1);
    const isUsed = !!curr.used || usedKeyIdsSet.has(Number(id));
    const item = {
      id: id,
      armoredKey: curr.armoredKey,
      privateKey: curr.privateKey || '',
      revocationCertificate: curr.revocationCertificate || '',
      used: isUsed,
      inProgress: false,
      name: curr.name || '',
      email: curr.email || '',
      usedByAddress: curr.usedByAddress || null,
      txHash: curr.txHash || null,
      tokenId: curr.tokenId || null,
      createdAt: curr.createdAt || new Date().toISOString(),
      mode: curr.mode || 'preloaded'
    };
    addToVault(item);
  });

  updateGpgUi(sourceName);
  renderVaultUi();
  renderAdminUi();
  const unused = getUnusedGpgKeys().length;
  log('Loaded ' + keys.length + ' GPG keys from ' + sourceName + ' (' + unused + ' unused).', 'success');

  // Asynchronously verify next candidate key against on-chain clavisUsed
  verifyNextKeyCandidate();
}

function getUnusedGpgKeys() {
  return gpgKeyPool.filter(function(k) { return !k.used && !usedKeyIdsSet.has(k.id) && !k.inProgress; });
}

function getNextUnusedKey() {
  return gpgKeyPool.find(function(k) { return !k.used && !usedKeyIdsSet.has(k.id) && !k.inProgress; }) || null;
}

async function verifyNextKeyCandidate() {
  const next = getNextUnusedKey();
  if (!next) return;

  const isUsedOnChain = await checkKeyUsedOnChain(next.armoredKey);
  if (isUsedOnChain) {
    log('Key #' + next.id + ' (' + next.email + ') is already used on-chain (clavisUsed = true). Auto-advancing...', 'warn');
    next.used = true;
    persistUsedKeyId(next.id);
    updateGpgUi();
    // Recursively check next key
    verifyNextKeyCandidate();
  }
}

function updateGpgUi(sourceName) {
  const unused = getUnusedGpgKeys().length;
  const total = gpgKeyPool.length;
  const next = getNextUnusedKey();

  if (elWmGpgAvail) elWmGpgAvail.textContent = unused;
  if (elWmGpgTotal) elWmGpgTotal.textContent = total;
  if (elWmGpgNext)  elWmGpgNext.textContent  = next ? ('#' + next.id) : 'None';
  if (elWmGpgSource && sourceName) elWmGpgSource.textContent = sourceName;

  if (walletKeySource === 'pool') {
    if (next) {
      elPreviewKeyTag.textContent = 'KEY #' + next.id + (next.email ? ' (' + next.email + ')' : '');
      elPreviewKeyText.textContent = next.armoredKey;
      const hasTriad = !!next.privateKey && !!next.revocationCertificate;
      elPreviewVaultTag.style.display = hasTriad ? 'inline-block' : 'none';
      elPreviewVaultTag.textContent = hasTriad ? '✓ TRIAD IN VAULT' : 'PUBLIC ONLY';
      if (connectedSigner) elBtnSingleMint.disabled = false;
    } else {
      elPreviewKeyTag.textContent = 'NO UNUSED KEYS';
      elPreviewKeyText.textContent = total > 0 ? '[ All loaded GPG keys have been marked used. Generate more in Option 3! ]' : '[ No keys loaded. ]';
      elPreviewVaultTag.style.display = 'none';
      elBtnSingleMint.disabled = true;
    }
  }

  if (elGpgCount)  elGpgCount.textContent = unused;
  if (elGpgTotal)  elGpgTotal.textContent = total;
  if (elStatGpg)   elStatGpg.textContent  = unused;
  if (elGpgSource && sourceName) elGpgSource.textContent = sourceName;
  updateVaultCounters();
}

async function autoLoadKeys() {
  loadPersistedState();
  try {
    log('Auto-loading keys.json from local repository...', 'info');
    const resp = await fetch('./keys.json');
    if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + resp.statusText);
    const data = await resp.json();
    const parsed = parseGpgJson(data);
    if (parsed) {
      loadGpgKeys(parsed, 'keys.json (Git / Local)');
    }
  } catch (err) {
    log('keys.json note: ' + err.message + '. Ready for in-browser generator.', 'warn');
    if (elWmGpgSource) elWmGpgSource.textContent = 'Not found (Use In-Browser Generator)';
    if (elGpgSource) elGpgSource.textContent = 'Not found (Use In-Browser Generator)';
    updateGpgUi();
  }
}

// ── BATCH IN-BROWSER KEY GENERATOR ────────────────────────────────────────────
async function runBatchGenerator() {
  if (isGeneratingKeys) return;
  const count = parseInt(elGenCount.value, 10) || 10;
  const style = elGenStyle.value || 'realistic';
  const shuffle = elGenTimeShuffle.value === 'shuffle';

  isGeneratingKeys = true;
  elBtnRunGenerator.disabled = true;
  elGenProgressBox.style.display = 'block';
  elGenProgressNum.textContent = '0 / ' + count;
  elGenProgressBar.style.width = '0%';
  log('Starting in-browser OpenPGP generator for ' + count + ' keypair(s) (Curve25519 ECC)...', 'info');

  const startId = keyVault.length + 1;
  const startT = Date.now();

  for (let i = 0; i < count; i++) {
    const identity = buildIdentity(style);
    const keyDate = getRandomDate(shuffle);
    const currNum = i + 1;
    elGenProgressLabel.textContent = 'Generating key for ' + identity.name + ' <' + identity.email + '>...';
    elGenProgressNum.textContent = currNum + ' / ' + count;
    elGenProgressBar.style.width = ((currNum / count) * 100).toFixed(1) + '%';

    try {
      const keys = await generateSingleKeypair(identity, keyDate);
      const newEntry = {
        id: startId + i,
        name: identity.name,
        email: identity.email,
        armoredKey: keys.armoredKey,
        privateKey: keys.privateKey,
        revocationCertificate: keys.revocationCertificate,
        createdAt: keyDate.toISOString(),
        used: false,
        usedByAddress: null,
        txHash: null,
        tokenId: null,
        mode: 'generated'
      };
      addToVault(newEntry);
    } catch (err) {
      log('Error generating key #' + currNum + ': ' + err.message, 'error');
    }

    await new Promise(function(r) { setTimeout(r, 10); });
  }

  const elapsed = ((Date.now() - startT) / 1000).toFixed(2);
  isGeneratingKeys = false;
  elBtnRunGenerator.disabled = false;
  elGenProgressLabel.textContent = '✓ ' + count + ' Keypairs generated successfully in ' + elapsed + 's!';
  log('Successfully created ' + count + ' cryptographic keypairs in ' + elapsed + 's. Added to Vault.', 'success');

  updateGpgUi('In-Browser Vault Generator');
  renderVaultUi();
}

// ── VAULT UI RENDERING ────────────────────────────────────────────────────────
function renderVaultUi() {
  updateVaultCounters();
  if (!elVaultKeysContainer) return;

  const filter = (elVaultSearchInput ? elVaultSearchInput.value : '').toLowerCase().trim();
  let list = keyVault.slice().reverse();

  if (filter) {
    list = list.filter(function(k) {
      return (
        String(k.id).includes(filter) ||
        (k.name && k.name.toLowerCase().includes(filter)) ||
        (k.email && k.email.toLowerCase().includes(filter)) ||
        (k.usedByAddress && k.usedByAddress.toLowerCase().includes(filter)) ||
        (k.armoredKey && k.armoredKey.toLowerCase().includes(filter))
      );
    });
  }

  if (elVaultFilteredCount) {
    elVaultFilteredCount.textContent = 'Showing ' + list.length + ' of ' + keyVault.length + ' keys';
  }

  if (list.length === 0) {
    elVaultKeysContainer.innerHTML = '<div class="empty-vault-card">- No matching keys in vault -</div>';
    return;
  }

  let html = '';
  list.forEach(function(k) {
    const isUsed = !!k.used || usedKeyIdsSet.has(k.id);
    const hasPriv = !!k.privateKey;
    const hasRev = !!k.revocationCertificate;

    html += '<div class="vault-card ' + (isUsed ? 'used' : 'fresh') + '">';
    html += '  <div class="vc-header">';
    html += '    <span class="vc-id">KEY #' + k.id + '</span>';
    html += '    <div class="vc-badges">';
    html += '      <span class="v-badge pub">PUB</span>';
    if (hasPriv) html += '      <span class="v-badge priv">PRIV</span>';
    if (hasRev)  html += '      <span class="v-badge rev">REV</span>';
    html += '      <span class="v-badge ' + (isUsed ? 'used' : 'fresh') + '">' + (isUsed ? 'USED' : 'FRESH') + '</span>';
    html += '    </div>';
    html += '  </div>';

    if (k.name) html += '  <div class="vc-name">' + escapeHtml(k.name) + '</div>';
    if (k.email) html += '  <div class="vc-email">&lt;' + escapeHtml(k.email) + '&gt;</div>';

    if (k.usedByAddress) {
      html += '  <div class="vc-mapped">&#128279; Bound Wallet: <span class="code-green">' + k.usedByAddress.substring(0, 10) + '...' + k.usedByAddress.substring(36) + '</span></div>';
    }

    html += '  <div class="vc-actions">';
    html += '    <button type="button" class="btn btn-tiny btn-primary" onclick="openKeyModal(' + k.id + ')">&#128065; INSPECT</button>';
    html += '    <button type="button" class="btn btn-tiny btn-muted" onclick="downloadKeyFile(' + k.id + ', \'pub\')">.PUB</button>';
    if (hasPriv) html += '    <button type="button" class="btn btn-tiny btn-muted" onclick="downloadKeyFile(' + k.id + ', \'priv\')">.KEY</button>';
    if (hasRev)  html += '    <button type="button" class="btn btn-tiny btn-muted" onclick="downloadKeyFile(' + k.id + ', \'rev\')">.REV</button>';
    html += '    <button type="button" class="btn btn-tiny btn-green" onclick="downloadSingleBundle(' + k.id + ')">BUNDLE</button>';
    html += '  </div>';
    html += '</div>';
  });

  elVaultKeysContainer.innerHTML = html;
}

// ── ADMIN REGISTRY & AUDIT LEDGER ─────────────────────────────────────────────
function recordAdminMint(entry) {
  const existingIdx = adminRegistry.findIndex(function(r) { return r.walletAddress.toLowerCase() === entry.walletAddress.toLowerCase(); });
  if (existingIdx !== -1) {
    adminRegistry[existingIdx] = Object.assign({}, adminRegistry[existingIdx], entry);
  } else {
    adminRegistry.push(entry);
  }
  persistAdminRegistry();
  renderAdminUi();
}

function renderAdminUi() {
  const total = adminRegistry.length;
  const walletCount = adminRegistry.filter(function(r) { return r.mode === 'wallet'; }).length;
  const bulkCount = adminRegistry.filter(function(r) { return r.mode === 'bulk'; }).length;
  const privSaved = adminRegistry.filter(function(r) { return r.hasPrivateKey; }).length;

  if (elAdmStatTotal)     elAdmStatTotal.textContent     = total;
  if (elAdmStatWallet)    elAdmStatWallet.textContent    = walletCount;
  if (elAdmStatBulk)      elAdmStatBulk.textContent      = bulkCount;
  if (elAdmStatPrivSaved) elAdmStatPrivSaved.textContent = privSaved;

  if (!elAdmTbody) return;

  const filterText = (elAdmSearchInput ? elAdmSearchInput.value : '').toLowerCase().trim();
  const activeFilterBtn = document.querySelector('.adm-f-btn.active');
  const filterType = activeFilterBtn ? activeFilterBtn.getAttribute('data-filter') : 'all';

  let list = adminRegistry.slice().reverse();

  if (filterType === 'wallet') list = list.filter(function(r) { return r.mode === 'wallet'; });
  else if (filterType === 'bulk') list = list.filter(function(r) { return r.mode === 'bulk'; });
  else if (filterType === 'has-priv') list = list.filter(function(r) { return r.hasPrivateKey; });

  if (filterText) {
    list = list.filter(function(r) {
      return (
        r.walletAddress.toLowerCase().includes(filterText) ||
        String(r.keyId).includes(filterText) ||
        (r.email && r.email.toLowerCase().includes(filterText)) ||
        (r.name && r.name.toLowerCase().includes(filterText)) ||
        (r.txHash && r.txHash.toLowerCase().includes(filterText)) ||
        (r.tokenId && String(r.tokenId).includes(filterText))
      );
    });
  }

  if (list.length === 0) {
    elAdmTbody.innerHTML = '<tr class="empty-row"><td colspan="10">- No mint records match the current filter -</td></tr>';
    return;
  }

  let html = '';
  list.forEach(function(r, idx) {
    const shortAddr = r.walletAddress.substring(0, 8) + '...' + r.walletAddress.substring(36);
    const shortTx   = r.txHash ? (r.txHash.substring(0, 10) + '...' + r.txHash.substring(60)) : '-';
    const txLink    = r.txHash ? ('<a href="https://etherscan.io/tx/' + r.txHash + '" target="_blank" class="code-green">' + shortTx + ' &nearr;</a>') : '-';
    const tokenDisplay = r.tokenId ? ('<a href="https://theyarefound.com/' + r.tokenId + '" target="_blank" class="amber">#' + r.tokenId + ' &nearr;</a>') : 'Pending Batch Survey';

    html += '<tr>';
    html += '  <td>' + (idx + 1) + '</td>';
    html += '  <td><a href="https://etherscan.io/address/' + r.walletAddress + '" target="_blank" class="code-green">' + shortAddr + ' &nearr;</a></td>';
    html += '  <td>' + escapeHtml(r.name || ('Key #' + r.keyId)) + '<br><span style="font-size:9.5px; color:var(--text-dim);">' + escapeHtml(r.email || '') + '</span></td>';
    html += '  <td><button type="button" class="btn btn-tiny btn-muted" onclick="openKeyModal(' + r.keyId + ')">KEY #' + r.keyId + '</button></td>';
    html += '  <td><span class="v-badge ' + (r.hasPrivateKey ? 'priv' : 'used') + '">' + (r.hasPrivateKey ? '✓ SAVED' : 'NO') + '</span></td>';
    html += '  <td><span class="v-badge ' + (r.hasRevocationCert ? 'rev' : 'used') + '">' + (r.hasRevocationCert ? '✓ SAVED' : 'NO') + '</span></td>';
    html += '  <td>' + txLink + '</td>';
    html += '  <td>' + tokenDisplay + '</td>';
    html += '  <td><span class="status-badge success">' + escapeHtml(r.status || 'AURIS') + '</span></td>';
    html += '  <td>';
    html += '    <button type="button" class="btn btn-tiny btn-primary" onclick="openKeyModal(' + r.keyId + ')">INSPECT</button>';
    html += '    <button type="button" class="btn btn-tiny btn-green" onclick="downloadSingleBundle(' + r.keyId + ')">BUNDLE</button>';
    html += '  </td>';
    html += '</tr>';
  });

  elAdmTbody.innerHTML = html;
}

// ── KEY INSPECTOR MODAL ───────────────────────────────────────────────────────
window.openKeyModal = function(keyId) {
  const item = keyVault.find(function(k) { return k.id === keyId; });
  if (!item) {
    log('Key #' + keyId + ' not found in vault.', 'error');
    return;
  }
  selectedModalKey = item;
  elModalTitle.textContent = '🔒 Cryptographic Inspector — Key #' + item.id + (item.email ? ' (' + item.email + ')' : '');

  let metaHtml = '';
  metaHtml += '<div class="modal-meta-item"><span class="modal-meta-k">Key ID</span><span class="modal-meta-v">#' + item.id + '</span></div>';
  metaHtml += '<div class="modal-meta-item"><span class="modal-meta-k">User Identity</span><span class="modal-meta-v">' + escapeHtml(item.name || 'Anonymous') + '</span></div>';
  metaHtml += '<div class="modal-meta-item"><span class="modal-meta-k">Email Address</span><span class="modal-meta-v">' + escapeHtml(item.email || '-') + '</span></div>';
  metaHtml += '<div class="modal-meta-item"><span class="modal-meta-k">Creation Date</span><span class="modal-meta-v">' + (item.createdAt || '-') + '</span></div>';
  metaHtml += '<div class="modal-meta-item"><span class="modal-meta-k">Mapped Wallet</span><span class="modal-meta-v code-green">' + (item.usedByAddress || 'Unassigned') + '</span></div>';
  metaHtml += '<div class="modal-meta-item"><span class="modal-meta-k">Token ID / Tx</span><span class="modal-meta-v amber">' + (item.tokenId ? ('#' + item.tokenId) : (item.txHash ? item.txHash.substring(0, 16) + '...' : '-')) + '</span></div>';
  elModalMetaGrid.innerHTML = metaHtml;

  setModalTab('pub');
  elModalOverlay.style.display = 'flex';
};

function setModalTab(tab) {
  activeModalTab = tab;
  elModalTabPub.classList.toggle('active', tab === 'pub');
  elModalTabPriv.classList.toggle('active', tab === 'priv');
  elModalTabRev.classList.toggle('active', tab === 'rev');

  if (!selectedModalKey) return;
  if (tab === 'pub') {
    elModalContentText.value = selectedModalKey.armoredKey || '[ No Public Key ]';
  } else if (tab === 'priv') {
    elModalContentText.value = selectedModalKey.privateKey || '[ No Private Key stored for this preloaded entry ]';
  } else if (tab === 'rev') {
    elModalContentText.value = selectedModalKey.revocationCertificate || '[ No Revocation Certificate stored for this preloaded entry ]';
  }
}

window.downloadKeyFile = function(keyId, type) {
  const item = keyVault.find(function(k) { return k.id === keyId; });
  if (!item) return;
  if (type === 'pub') {
    triggerDownload('key-' + item.id + '-public.asc', item.armoredKey);
  } else if (type === 'priv') {
    if (!item.privateKey) { alert('No private key stored for Key #' + item.id); return; }
    triggerDownload('key-' + item.id + '-private.asc', item.privateKey);
  } else if (type === 'rev') {
    if (!item.revocationCertificate) { alert('No revocation certificate stored for Key #' + item.id); return; }
    triggerDownload('key-' + item.id + '-revocation.asc', item.revocationCertificate);
  }
};

window.downloadSingleBundle = function(keyId) {
  const item = keyVault.find(function(k) { return k.id === keyId; });
  if (!item) return;
  let text = '======================================================================\n';
  text += 'THEY · SEEN CRYPTOGRAPHIC KEYPACK BUNDLE\n';
  text += '======================================================================\n';
  text += 'Key ID:                 #' + item.id + '\n';
  text += 'Identity:               ' + (item.name || 'Anonymous') + '\n';
  text += 'Email:                  ' + (item.email || '-') + '\n';
  text += 'Created At:             ' + (item.createdAt || '-') + '\n';
  text += 'Used / Mapped Wallet:   ' + (item.usedByAddress || 'Unassigned') + '\n';
  text += 'Transaction Hash:       ' + (item.txHash || '-') + '\n';
  text += 'Token ID:               ' + (item.tokenId ? ('#' + item.tokenId) : 'Pending') + '\n';
  text += 'Target Contract:        ' + CONTRACT_ADDRESS + '\n';
  text += 'Target Method:          Function #9 seen(string pgp) [0x363355d2]\n';
  text += '======================================================================\n\n';

  text += '----- 1. ARMORED PUBLIC KEY BLOCK -----\n';
  text += (item.armoredKey || '[NONE]') + '\n\n';

  text += '----- 2. ARMORED PRIVATE KEY BLOCK -----\n';
  text += (item.privateKey || '[NO PRIVATE KEY IN RECORD]') + '\n\n';

  text += '----- 3. REVOCATION CERTIFICATE BLOCK -----\n';
  text += (item.revocationCertificate || '[NO REVOCATION CERTIFICATE IN RECORD]') + '\n\n';

  triggerDownload('keypack-bundle-key-' + item.id + '.txt', text);
};

// ── GAS FEE MONITORING ────────────────────────────────────────────────────────
async function fetchGasFromProvider(provider, isWalletMode) {
  try {
    const feeData = await provider.getFeeData();
    let baseGwei = '0.20';
    let prioGwei = MIN_SAFE_PRIORITY_GWEI;

    if (feeData.maxFeePerGas) {
      baseGwei = (Number(feeData.maxFeePerGas) / 1e9).toFixed(2);
      if (feeData.maxPriorityFeePerGas) {
        const rawPrio = Number(feeData.maxPriorityFeePerGas) / 1e9;
        prioGwei = Math.min(rawPrio, 0.10).toFixed(2);
      }
    } else if (feeData.gasPrice) {
      baseGwei = (Number(feeData.gasPrice) / 1e9).toFixed(2);
      prioGwei = '0.00';
    }

    if (isWalletMode) {
      if (elWmGrBase) elWmGrBase.textContent = baseGwei;
      if (elWmGasStatus) elWmGasStatus.textContent = 'Live (Updated ' + new Date().toLocaleTimeString() + ')';
    } else {
      if (elGrBase) elGrBase.textContent = baseGwei;
      if (elGrPriority) elGrPriority.textContent = prioGwei;
      if (elGasStatus) elGasStatus.textContent = 'Live (Updated ' + new Date().toLocaleTimeString() + ')';
      if (elStatGas) elStatGas.textContent = baseGwei;

      const totalGweiPerTx = (parseFloat(baseGwei) + parseFloat(prioGwei));
      const estEthPerTx = (65000 * totalGweiPerTx / 1e9).toFixed(6);
      if (elGrEstCost) elGrEstCost.textContent = '~' + estEthPerTx + ' ETH';
    }
  } catch (err) {
    const statusEl = isWalletMode ? elWmGasStatus : elGasStatus;
    if (statusEl) statusEl.textContent = 'Fetch failed';
  }
}

async function fetchWalletGas() {
  if (!browserProvider) {
    const fallback = new ethers.JsonRpcProvider(DEFAULT_RPC, 1);
    await fetchGasFromProvider(fallback, true);
  } else {
    await fetchGasFromProvider(browserProvider, true);
  }
}

async function fetchBulkGas() {
  const rpc = elRpcUrl ? (elRpcUrl.value.trim() || DEFAULT_RPC) : DEFAULT_RPC;
  const p = new ethers.JsonRpcProvider(rpc, 1);
  await fetchGasFromProvider(p, false);
}

// ── WALLET CONNECTION (OPTION 1) ──────────────────────────────────────────────
async function connectBrowserWallet() {
  if (!window.ethereum) {
    alert('No Web3 browser wallet detected. Please install MetaMask, Rabby, or Coinbase Wallet.');
    return;
  }

  try {
    elBtnConnect.disabled = true;
    elBtnConnect.textContent = 'CONNECTING...';
    browserProvider = new ethers.BrowserProvider(window.ethereum);
    const network = await browserProvider.getNetwork();

    if (network.chainId !== CHAIN_ID) {
      log('Wallet on Chain ID ' + network.chainId + '. Prompting switch to Ethereum Mainnet (1)...', 'warn');
      if (elBtnSwitchNetwork) elBtnSwitchNetwork.style.display = 'inline-block';
      await switchWalletToMainnet();
      return;
    }

    connectedSigner = await browserProvider.getSigner();
    connectedAddress = await connectedSigner.getAddress();
    const balWei = await browserProvider.getBalance(connectedAddress);
    const balEth = ethers.formatEther(balWei);

    if (elWcAddress) elWcAddress.textContent = connectedAddress;
    if (elWcBalance) elWcBalance.textContent = parseFloat(balEth).toFixed(5) + ' ETH';
    if (elWcNetwork) elWcNetwork.textContent = 'Ethereum Mainnet (1)';
    if (elWcInfo) elWcInfo.style.display = 'grid';
    if (elBtnConnect) elBtnConnect.style.display = 'none';
    if (elBtnDisconnect) elBtnDisconnect.style.display = 'inline-block';
    if (elBtnSwitchNetwork) elBtnSwitchNetwork.style.display = 'none';

    elBtnSingleMint.disabled = false;
    log('Connected wallet: ' + connectedAddress + ' (' + parseFloat(balEth).toFixed(5) + ' ETH)', 'success');
    fetchWalletGas();
    verifyNextKeyCandidate();
  } catch (err) {
    log('Wallet connection failed: ' + sanitizeError(err), 'error');
    if (elBtnConnect) {
      elBtnConnect.disabled = false;
      elBtnConnect.textContent = 'CONNECT BROWSER WALLET (METAMASK / RABBY)';
    }
  }
}

function disconnectBrowserWallet() {
  browserProvider = null;
  connectedSigner = null;
  connectedAddress = null;
  if (elWcInfo) elWcInfo.style.display = 'none';
  if (elBtnConnect) {
    elBtnConnect.style.display = 'inline-block';
    elBtnConnect.disabled = false;
    elBtnConnect.textContent = 'CONNECT BROWSER WALLET (METAMASK / RABBY)';
  }
  if (elBtnDisconnect) elBtnDisconnect.style.display = 'none';
  if (elBtnSingleMint) elBtnSingleMint.disabled = true;
  log('Browser wallet disconnected.', 'info');
}

async function switchWalletToMainnet() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x1' }]
    });
    connectBrowserWallet();
  } catch (err) {
    log('Switch network error: ' + sanitizeError(err), 'error');
  }
}

// ── OPTION 1 MINT EXECUTION ───────────────────────────────────────────────────
async function executeSingleMint() {
  if (!connectedSigner || !connectedAddress) {
    alert('Please connect your browser wallet first.');
    return;
  }

  let chosenKey = null;

  if (walletKeySource === 'pool') {
    chosenKey = getNextUnusedKey();
    if (!chosenKey) {
      alert('No unused GPG keys available in pool. Generate one with the generator tab or load keys.json.');
      return;
    }
    // Final on-chain check
    const isUsed = await checkKeyUsedOnChain(chosenKey.armoredKey);
    if (isUsed) {
      log('Active key #' + chosenKey.id + ' is already used on-chain! Skipping...', 'warn');
      chosenKey.used = true;
      persistUsedKeyId(chosenKey.id);
      updateGpgUi();
      executeSingleMint(); // retry with next key
      return;
    }
  } else if (walletKeySource === 'generate') {
    if (!quickGeneratedKey) {
      alert('Please click "GENERATE NEW KEYPAIR NOW" first.');
      return;
    }
    chosenKey = quickGeneratedKey;
  } else if (walletKeySource === 'custom') {
    const customTxt = elWmCustomTextarea ? elWmCustomTextarea.value.trim() : '';
    if (!customTxt || !customTxt.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
      alert('Please enter a valid ASCII-armored PGP public key block.');
      return;
    }
    chosenKey = {
      id: keyVault.length + 1,
      name: 'Custom User Key',
      email: 'custom@user.local',
      armoredKey: customTxt,
      privateKey: '',
      revocationCertificate: '',
      used: false,
      mode: 'custom'
    };
    addToVault(chosenKey);
  }

  try {
    elBtnSingleMint.disabled = true;
    elBtnSingleMint.textContent = 'CONFIRM TRANSACTION IN YOUR WALLET...';
    if (elWmMintResult) elWmMintResult.style.display = 'none';

    log('Preparing Function #9 seen(string pgp) transaction for ' + connectedAddress + '...', 'info');
    log('PGP Payload Size: ' + chosenKey.armoredKey.length + ' bytes | Key ID: #' + chosenKey.id, 'info');

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, connectedSigner);
    const tx = await contract.seen(chosenKey.armoredKey, {
      gasLimit: DEFAULT_GAS_LIMIT
    });

    log('Transaction Broadcasted! TX: ' + tx.hash, 'tx');
    elBtnSingleMint.textContent = 'MINING ON ETHEREUM MAINNET...';

    const receipt = await tx.wait(1);
    const blockNum = receipt.blockNumber;
    const gasUsed = receipt.gasUsed.toString();

    // Mark key as used & persist
    chosenKey.used = true;
    chosenKey.usedByAddress = connectedAddress;
    chosenKey.txHash = tx.hash;
    chosenKey.mode = 'wallet';
    persistUsedKeyId(chosenKey.id);

    // Parse Token ID if available from Visus event
    let tokenId = null;
    if (receipt.logs) {
      for (const lg of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(lg);
          if (parsed && parsed.name === 'Visus') {
            tokenId = parsed.args.signum.toString();
            break;
          }
        } catch (_) {}
      }
    }
    chosenKey.tokenId = tokenId;

    // Record in Master Admin Registry
    recordAdminMint({
      id: adminRegistry.length + 1,
      walletAddress: connectedAddress,
      keyId: chosenKey.id,
      name: chosenKey.name,
      email: chosenKey.email,
      armoredKey: chosenKey.armoredKey,
      hasPrivateKey: !!chosenKey.privateKey,
      hasRevocationCert: !!chosenKey.revocationCertificate,
      privateKey: chosenKey.privateKey || '',
      revocationCertificate: chosenKey.revocationCertificate || '',
      txHash: tx.hash,
      blockNumber: blockNum,
      gasUsed: gasUsed,
      tokenId: tokenId,
      mode: 'wallet',
      status: 'AURUS',
      timestamp: new Date().toISOString()
    });

    // Reset quick generated key if used
    if (walletKeySource === 'generate') {
      quickGeneratedKey = null;
    }

    // Update UI immediately advancing to next unused key
    updateGpgUi();
    renderVaultUi();

    log('SUCCESS! Minted Token ' + (tokenId ? ('#' + tokenId) : '') + ' in block ' + blockNum + ' | Gas Used: ' + gasUsed, 'success');

    if (elWmMintResult) {
      let resultHtml = '<div class="mint-success-card" style="padding:14px; background:rgba(0,255,102,0.06); border:1px solid var(--green); margin-top:14px;">';
      resultHtml += '<div style="font-weight:700; color:var(--green); font-size:13px; margin-bottom:6px;">✓ TRANSACTION CONFIRMED ON ETHEREUM MAINNET!</div>';
      resultHtml += '<div style="font-size:11px; line-height:1.7;">';
      resultHtml += '  <div><strong>Transaction Hash:</strong> <a href="https://etherscan.io/tx/' + tx.hash + '" target="_blank" class="code-green">' + tx.hash + ' &nearr;</a></div>';
      resultHtml += '  <div><strong>Block:</strong> ' + blockNum + ' &bull; <strong>Gas Used:</strong> ' + gasUsed + '</div>';
      if (tokenId) {
        resultHtml += '  <div><strong>Assigned Token:</strong> <a href="https://theyarefound.com/' + tokenId + '" target="_blank" class="amber">Token #' + tokenId + ' &nearr;</a> (Status: <em>adhuc de te loquimur</em>)</div>';
      }
      resultHtml += '</div>';

      resultHtml += '<div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">';
      resultHtml += '  <button type="button" class="btn btn-tiny btn-green" onclick="downloadSingleBundle(' + chosenKey.id + ')">&#128190; DOWNLOAD FULL KEY BUNDLE (PUBLIC + PRIV + CERTS)</button>';
      resultHtml += '  <button type="button" class="btn btn-tiny btn-primary" onclick="openKeyModal(' + chosenKey.id + ')">&#128065; INSPECT KEYPAIR</button>';
      resultHtml += '  <button type="button" class="btn btn-tiny btn-muted" onclick="switchMode(\'admin\')">&#128203; VIEW IN ADMIN REGISTRY</button>';
      resultHtml += '</div>';
      resultHtml += '</div>';

      elWmMintResult.innerHTML = resultHtml;
      elWmMintResult.style.display = 'block';
    }

    elBtnSingleMint.textContent = 'EXECUTE TRANSACTION WITH CONNECTED WALLET (FUNCTION #9 · 1 GPG KEY)';
    elBtnSingleMint.disabled = false;
  } catch (err) {
    log('Mint failed: ' + sanitizeError(err), 'error');
    if (elWmMintResult) {
      elWmMintResult.innerHTML = '<div style="padding:10px; background:rgba(255,51,51,0.1); border:1px solid var(--red); color:var(--red); font-size:11px; margin-top:14px;"><strong>Transaction Error:</strong> ' + sanitizeError(err) + '</div>';
      elWmMintResult.style.display = 'block';
    }
    elBtnSingleMint.textContent = 'EXECUTE TRANSACTION WITH CONNECTED WALLET (FUNCTION #9 · 1 GPG KEY)';
    elBtnSingleMint.disabled = false;
  }
}

// ── QUICK KEY GENERATOR FOR WALLET MODE ───────────────────────────────────────
async function runQuickWalletGenerator() {
  if (isGeneratingKeys) return;
  isGeneratingKeys = true;
  elWmBtnQuickGen.disabled = true;
  elWmBtnQuickGen.textContent = 'GENERATING...';

  try {
    const identity = buildIdentity('realistic');
    const keyDate = getRandomDate(true);
    const keys = await generateSingleKeypair(identity, keyDate);
    const newId = keyVault.length + 1;

    quickGeneratedKey = {
      id: newId,
      name: identity.name,
      email: identity.email,
      armoredKey: keys.armoredKey,
      privateKey: keys.privateKey,
      revocationCertificate: keys.revocationCertificate,
      createdAt: keyDate.toISOString(),
      used: false,
      usedByAddress: null,
      txHash: null,
      tokenId: null,
      mode: 'wallet-quick'
    };

    addToVault(quickGeneratedKey);
    renderVaultUi();

    elPreviewKeyTag.textContent = '⚡ FRESH KEY #' + newId + ' (' + identity.email + ')';
    elPreviewKeyText.textContent = quickGeneratedKey.armoredKey;
    elPreviewVaultTag.style.display = 'inline-block';
    elPreviewVaultTag.textContent = '✓ TRIAD IN VAULT';

    if (connectedSigner) elBtnSingleMint.disabled = false;
    log('Generated fresh OpenPGP keypair for ' + identity.name + ' <' + identity.email + '> (Key #' + newId + '). Vault ready.', 'success');
  } catch (err) {
    log('Quick generator failed: ' + err.message, 'error');
  } finally {
    isGeneratingKeys = false;
    elWmBtnQuickGen.disabled = false;
    elWmBtnQuickGen.textContent = 'GENERATE NEW KEYPAIR NOW';
  }
}

// ── BULK BURNER WALLET MINT ENGINE (OPTION 2) ─────────────────────────────────
function parsePrivateKeys(raw) {
  return raw
    .split(/\r?\n/)
    .map(function(l) { return l.trim(); })
    .filter(function(l) { return l.length > 0 && !l.startsWith('#'); });
}

async function runBulkBatchSequence() {
  if (isBatchRunning) return;

  const rawPks = elPkInput ? elPkInput.value : '';
  const pks = parsePrivateKeys(rawPks);

  if (pks.length === 0) {
    alert('Please enter at least one private key in the burner wallets box.');
    return;
  }

  const rpc = elRpcUrl ? (elRpcUrl.value.trim() || DEFAULT_RPC) : DEFAULT_RPC;
  const delay = parseInt(elTxDelay ? elTxDelay.value : '2000', 10) || 2000;
  const provider = new ethers.JsonRpcProvider(rpc, 1);

  isBatchRunning = true;
  abortFlag = false;
  elBtnInitiate.disabled = true;
  elBtnAbort.disabled = false;
  if (elAbortNotice) elAbortNotice.style.display = 'none';

  let successCount = 0;
  let failCount = 0;
  const total = pks.length;

  log('Starting Autonomous Batch Sequence for ' + total + ' burner wallet(s)...', 'info');

  for (let i = 0; i < total; i++) {
    if (abortFlag) {
      log('Batch sequence halted by Operator.', 'warn');
      if (elAbortNotice) elAbortNotice.style.display = 'block';
      break;
    }

    const pk = pks[i];
    const currNum = i + 1;
    let wallet = null;
    let addr = 'Unknown';

    try {
      wallet = new ethers.Wallet(pk, provider);
      addr = wallet.address;
    } catch (err) {
      log('[' + currNum + '/' + total + '] Invalid private key: ' + sanitizeError(err), 'error');
      failCount++;
      updateBulkStats(total, currNum, successCount, failCount);
      continue;
    }

    let gpgKey = getNextUnusedKey();
    if (!gpgKey) {
      log('[' + currNum + '/' + total + '] Pool depleted — auto-generating key on the fly...', 'warn');
      const ident = buildIdentity('realistic');
      const dt = getRandomDate(true);
      const kPair = await generateSingleKeypair(ident, dt);
      gpgKey = {
        id: keyVault.length + 1,
        name: ident.name,
        email: ident.email,
        armoredKey: kPair.armoredKey,
        privateKey: kPair.privateKey,
        revocationCertificate: kPair.revocationCertificate,
        createdAt: dt.toISOString(),
        used: false,
        usedByAddress: null,
        txHash: null,
        tokenId: null,
        mode: 'bulk-autogen'
      };
      addToVault(gpgKey);
    }

    // Verify key on-chain before sending
    const isUsed = await checkKeyUsedOnChain(gpgKey.armoredKey);
    if (isUsed) {
      log('[' + currNum + '/' + total + '] Key #' + gpgKey.id + ' is already used on-chain! Skipping...', 'warn');
      gpgKey.used = true;
      persistUsedKeyId(gpgKey.id);
      i--; // repeat current wallet with next key
      continue;
    }

    gpgKey.inProgress = true;
    log('[' + currNum + '/' + total + '] Processing wallet ' + addr + ' with GPG Key #' + gpgKey.id + '...', 'info');

    try {
      const bal = await provider.getBalance(addr);
      const balEth = ethers.formatEther(bal);

      if (bal === 0n) {
        log('[' + currNum + '/' + total + '] ' + addr + ' has 0 ETH balance. Skipping.', 'warn');
        gpgKey.inProgress = false;
        failCount++;
        addTableRow(currNum, addr, balEth, gpgKey.id, '-', '-', '-', 'SKIPPED_NO_ETH');
        updateBulkStats(total, currNum, successCount, failCount);
        continue;
      }

      const feeData = await provider.getFeeData();
      const base = feeData.maxFeePerGas || ethers.parseUnits('0.2', 'gwei');
      const tip  = ethers.parseUnits(MIN_SAFE_PRIORITY_GWEI, 'gwei');
      const maxFee = base + tip;

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
      const tx = await contract.seen(gpgKey.armoredKey, {
        maxPriorityFeePerGas: tip,
        maxFeePerGas: maxFee,
        gasLimit: DEFAULT_GAS_LIMIT
      });

      log('[' + currNum + '/' + total + '] TX sent: ' + tx.hash, 'tx');
      const receipt = await tx.wait(1);
      const blockNum = receipt.blockNumber;
      const gasUsed = receipt.gasUsed.toString();

      gpgKey.used = true;
      gpgKey.inProgress = false;
      gpgKey.usedByAddress = addr;
      gpgKey.txHash = tx.hash;
      persistUsedKeyId(gpgKey.id);

      let tokenId = null;
      if (receipt.logs) {
        for (const lg of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(lg);
            if (parsed && parsed.name === 'Visus') {
              tokenId = parsed.args.signum.toString();
              break;
            }
          } catch (_) {}
        }
      }
      gpgKey.tokenId = tokenId;

      successCount++;
      addTableRow(currNum, addr, balEth, gpgKey.id, tx.hash, blockNum, gasUsed, 'SUCCESS');

      recordAdminMint({
        id: adminRegistry.length + 1,
        walletAddress: addr,
        keyId: gpgKey.id,
        name: gpgKey.name,
        email: gpgKey.email,
        armoredKey: gpgKey.armoredKey,
        hasPrivateKey: !!gpgKey.privateKey,
        hasRevocationCert: !!gpgKey.revocationCertificate,
        privateKey: gpgKey.privateKey || '',
        revocationCertificate: gpgKey.revocationCertificate || '',
        txHash: tx.hash,
        blockNumber: blockNum,
        gasUsed: gasUsed,
        tokenId: tokenId,
        mode: 'bulk',
        status: 'SUCCESS',
        timestamp: new Date().toISOString()
      });

      log('[' + currNum + '/' + total + '] SUCCESS: ' + addr + ' minted signum ' + (tokenId ? ('#' + tokenId) : '') + ' in block ' + blockNum, 'success');
    } catch (err) {
      gpgKey.inProgress = false;
      failCount++;
      log('[' + currNum + '/' + total + '] Error on ' + addr + ': ' + sanitizeError(err), 'error');
      addTableRow(currNum, addr, '-', gpgKey.id, '-', '-', '-', 'FAILED');
    }

    updateGpgUi();
    updateBulkStats(total, currNum, successCount, failCount);

    if (delay > 0 && currNum < total && !abortFlag) {
      await new Promise(function(r) { setTimeout(r, delay); });
    }
  }

  isBatchRunning = false;
  elBtnInitiate.disabled = false;
  elBtnAbort.disabled = true;
  log('Batch run complete: ' + successCount + ' succeeded, ' + failCount + ' failed/skipped.', 'success');
  renderVaultUi();
  renderAdminUi();
}

function updateBulkStats(total, progress, success, failed) {
  if (elStatProgress) elStatProgress.textContent = progress + ' / ' + total;
  if (elStatSuccess)  elStatSuccess.textContent  = success;
  if (elStatFailed)   elStatFailed.textContent   = failed;
  if (elProgressBar)  elProgressBar.style.width  = ((progress / total) * 100).toFixed(1) + '%';
}

function addTableRow(idx, addr, bal, keyId, txHash, block, gasUsed, status) {
  if (!elExecTbody) return;
  const emptyRow = elExecTbody.querySelector('.empty-row');
  if (emptyRow) elExecTbody.innerHTML = '';

  const shortAddr = addr.substring(0, 8) + '...' + addr.substring(36);
  const shortTx = txHash && txHash !== '-' ? (txHash.substring(0, 10) + '...' + txHash.substring(60)) : '-';
  const txLink = txHash && txHash !== '-' ? ('<a href="https://etherscan.io/tx/' + txHash + '" target="_blank" class="code-green">' + shortTx + ' &nearr;</a>') : '-';
  const statusClass = status === 'SUCCESS' ? 'success' : (status === 'SKIPPED_NO_ETH' ? 'skipped' : 'failed');

  const tr = document.createElement('tr');
  tr.innerHTML = '<td>' + idx + '</td>' +
    '<td><a href="https://etherscan.io/address/' + addr + '" target="_blank" class="code-green">' + shortAddr + ' &nearr;</a></td>' +
    '<td>' + (bal !== '-' ? (parseFloat(bal).toFixed(4) + ' ETH') : '-') + '</td>' +
    '<td><button type="button" class="btn btn-tiny btn-muted" onclick="openKeyModal(' + keyId + ')">KEY #' + keyId + '</button></td>' +
    '<td>' + txLink + '</td>' +
    '<td>' + block + '</td>' +
    '<td>' + gasUsed + '</td>' +
    '<td><span class="status-badge ' + statusClass + '">' + status + '</span></td>';

  elExecTbody.appendChild(tr);
}

// ── EXPORT SUITE ──────────────────────────────────────────────────────────────
function exportVaultJson() {
  const content = JSON.stringify(keyVault, null, 2);
  triggerDownload('they-seen-cryptographic-vault-backup.json', content, 'application/json');
  log('Exported full Cryptographic Vault (' + keyVault.length + ' keys).', 'success');
}

function exportVaultTxt() {
  let text = '======================================================================\n';
  text += 'THEY · SEEN MASTER CRYPTOGRAPHIC KEYPACK VAULT BUNDLE\n';
  text += 'Total Keys Stored: ' + keyVault.length + '\n';
  text += 'Export Timestamp:  ' + new Date().toISOString() + '\n';
  text += 'Target Contract:   ' + CONTRACT_ADDRESS + '\n';
  text += 'Target Method:     Function #9 seen(string pgp) [0x363355d2]\n';
  text += '======================================================================\n\n';

  keyVault.forEach(function(k) {
    text += '######################################################################\n';
    text += 'KEY #' + k.id + ' | ' + (k.name || 'Anonymous') + ' <' + (k.email || '-') + '>\n';
    text += 'Created:      ' + (k.createdAt || '-') + '\n';
    text += 'Used Status:  ' + (k.used ? 'USED' : 'FRESH / UNUSED') + '\n';
    text += 'Bound Wallet: ' + (k.usedByAddress || 'Unassigned') + '\n';
    text += 'Tx Hash:      ' + (k.txHash || '-') + '\n';
    text += 'Token ID:     ' + (k.tokenId ? ('#' + k.tokenId) : 'Pending') + '\n';
    text += '----------------------------------------------------------------------\n';
    text += '--- ARMORED PUBLIC KEY BLOCK ---\n' + (k.armoredKey || '[NONE]') + '\n\n';
    text += '--- ARMORED PRIVATE KEY BLOCK ---\n' + (k.privateKey || '[NO PRIVATE KEY IN RECORD]') + '\n\n';
    text += '--- REVOCATION CERTIFICATE BLOCK ---\n' + (k.revocationCertificate || '[NO REVOCATION CERTIFICATE IN RECORD]') + '\n\n';
  });

  triggerDownload('they-seen-keypack-vault-bundle.txt', text);
  log('Exported full TXT Keypack Bundle (' + keyVault.length + ' keys).', 'success');
}

function exportUnusedJson() {
  const unused = keyVault.filter(function(k) { return !k.used && !usedKeyIdsSet.has(k.id); });
  const content = JSON.stringify(unused, null, 2);
  triggerDownload('keys-unused-pool.json', content, 'application/json');
  log('Exported ' + unused.length + ' unused keys as keys-unused-pool.json.', 'success');
}

function exportAdminJson() {
  const content = JSON.stringify(adminRegistry, null, 2);
  triggerDownload('they-seen-admin-registry-ledger.json', content, 'application/json');
  log('Exported Admin Registry JSON (' + adminRegistry.length + ' records).', 'success');
}

function exportAdminCsv() {
  const headers = ['ID', 'WalletAddress', 'KeyID', 'IdentityName', 'Email', 'HasPrivateKey', 'HasRevocationCert', 'TxHash', 'BlockNumber', 'GasUsed', 'TokenID', 'Mode', 'Status', 'Timestamp'];
  const rows = adminRegistry.map(function(r) {
    return [
      r.id,
      r.walletAddress,
      r.keyId,
      '"' + (r.name || '').replace(/"/g, '""') + '"',
      '"' + (r.email || '').replace(/"/g, '""') + '"',
      r.hasPrivateKey ? 'TRUE' : 'FALSE',
      r.hasRevocationCert ? 'TRUE' : 'FALSE',
      r.txHash || '',
      r.blockNumber || '',
      r.gasUsed || '',
      r.tokenId || '',
      r.mode || '',
      r.status || '',
      r.timestamp || ''
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  triggerDownload('they-seen-admin-registry-ledger.csv', csv, 'text/csv');
  log('Exported Admin Registry CSV (' + adminRegistry.length + ' rows).', 'success');
}

// ── EVENT LISTENERS & INITIALIZATION ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  log('Initializing they · seen Autonomous Engine & Cryptographic Vault v4.1...', 'info');

  if (elModeBtnWallet) elModeBtnWallet.addEventListener('click', function() { switchMode('wallet'); });
  if (elModeBtnBulk)   elModeBtnBulk.addEventListener('click', function() { switchMode('bulk'); });
  if (elModeBtnVault)  elModeBtnVault.addEventListener('click', function() { switchMode('vault'); });
  if (elModeBtnAdmin)  elModeBtnAdmin.addEventListener('click', function() { switchMode('admin'); });

  if (elWmTabPool) elWmTabPool.addEventListener('click', function() {
    walletKeySource = 'pool';
    elWmTabPool.classList.add('active');
    elWmTabGenerate.classList.remove('active');
    elWmTabCustom.classList.remove('active');
    elWmPoolStatsRow.style.display = 'grid';
    elWmGenerateCard.style.display = 'none';
    elWmCustomCard.style.display = 'none';
    updateGpgUi();
  });

  if (elWmTabGenerate) elWmTabGenerate.addEventListener('click', function() {
    walletKeySource = 'generate';
    elWmTabPool.classList.remove('active');
    elWmTabGenerate.classList.add('active');
    elWmTabCustom.classList.remove('active');
    elWmPoolStatsRow.style.display = 'none';
    elWmGenerateCard.style.display = 'block';
    elWmCustomCard.style.display = 'none';
    if (!quickGeneratedKey) runQuickWalletGenerator();
  });

  if (elWmTabCustom) elWmTabCustom.addEventListener('click', function() {
    walletKeySource = 'custom';
    elWmTabPool.classList.remove('active');
    elWmTabGenerate.classList.remove('active');
    elWmTabCustom.classList.add('active');
    elWmPoolStatsRow.style.display = 'none';
    elWmGenerateCard.style.display = 'none';
    elWmCustomCard.style.display = 'block';
    elPreviewKeyTag.textContent = 'CUSTOM PASTED KEY';
    elPreviewVaultTag.style.display = 'none';
    elPreviewKeyText.textContent = elWmCustomTextarea.value || '[ Please paste armored key above ]';
  });

  if (elWmCustomTextarea) elWmCustomTextarea.addEventListener('input', function() {
    if (walletKeySource === 'custom') {
      elPreviewKeyText.textContent = elWmCustomTextarea.value || '[ Please paste armored key above ]';
      if (connectedSigner && elWmCustomTextarea.value.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
        elBtnSingleMint.disabled = false;
      }
    }
  });

  if (elWmBtnQuickGen) elWmBtnQuickGen.addEventListener('click', runQuickWalletGenerator);

  if (elBtnConnect) elBtnConnect.addEventListener('click', connectBrowserWallet);
  if (elBtnDisconnect) elBtnDisconnect.addEventListener('click', disconnectBrowserWallet);
  if (elBtnSwitchNetwork) elBtnSwitchNetwork.addEventListener('click', switchWalletToMainnet);
  if (elBtnSingleMint) elBtnSingleMint.addEventListener('click', executeSingleMint);
  if (elWmBtnFetchGas) elWmBtnFetchGas.addEventListener('click', fetchWalletGas);
  if (elWmBtnExportKeys) elWmBtnExportKeys.addEventListener('click', exportVaultJson);
  if (elWmBtnDownloadVault) elWmBtnDownloadVault.addEventListener('click', exportVaultTxt);

  if (elBtnInitiate) elBtnInitiate.addEventListener('click', runBulkBatchSequence);
  if (elBtnAbort) elBtnAbort.addEventListener('click', function() { abortFlag = true; log('Emergency abort signal registered.', 'warn'); });
  if (elBtnFetchGas) elBtnFetchGas.addEventListener('click', fetchBulkGas);
  if (elBtnExportKeys) elBtnExportKeys.addEventListener('click', exportVaultJson);
  if (elBtnExportCsv) elBtnExportCsv.addEventListener('click', exportAdminCsv);
  if (elBtnExportBulkVault) elBtnExportBulkVault.addEventListener('click', exportVaultTxt);
  if (elBtnClearTable) elBtnClearTable.addEventListener('click', function() {
    if (elExecTbody) elExecTbody.innerHTML = '<tr class="empty-row"><td colspan="8">- No transactions executed yet -</td></tr>';
  });
  if (elBtnClearPks) elBtnClearPks.addEventListener('click', function() {
    if (elPkInput) elPkInput.value = '';
    if (elWalletCount) elWalletCount.textContent = '0';
    if (elStatWallets) elStatWallets.textContent = '0';
  });
  if (elPkInput) elPkInput.addEventListener('input', function() {
    const c = parsePrivateKeys(elPkInput.value).length;
    if (elWalletCount) elWalletCount.textContent = c;
    if (elStatWallets) elStatWallets.textContent = c;
  });

  if (elBtnRunGenerator) elBtnRunGenerator.addEventListener('click', runBatchGenerator);
  if (elBtnDownloadVaultJson) elBtnDownloadVaultJson.addEventListener('click', exportVaultJson);
  if (elBtnDownloadVaultTxt)  elBtnDownloadVaultTxt.addEventListener('click', exportVaultTxt);
  if (elBtnDownloadUnusedJson) elBtnDownloadUnusedJson.addEventListener('click', exportUnusedJson);
  if (elBtnClearVault) elBtnClearVault.addEventListener('click', function() {
    if (confirm('Clear all stored keys in vault?')) {
      keyVault = [];
      gpgKeyPool = [];
      updateGpgUi('Cleared');
      renderVaultUi();
      log('Key vault cleared by operator.', 'warn');
    }
  });
  if (elVaultSearchInput) elVaultSearchInput.addEventListener('input', renderVaultUi);

  if (elBtnImportVault) elBtnImportVault.addEventListener('click', function() { if (elFileImportVault) elFileImportVault.click(); });
  if (elFileImportVault) elFileImportVault.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      const parsed = parseGpgJson(evt.target.result);
      if (parsed) {
        loadGpgKeys(parsed, file.name);
      }
    };
    reader.readAsText(file);
  });

  if (elAdmSearchInput) elAdmSearchInput.addEventListener('input', renderAdminUi);
  document.querySelectorAll('.adm-f-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.adm-f-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      renderAdminUi();
    });
  });
  if (elAdmBtnExportJson) elAdmBtnExportJson.addEventListener('click', exportAdminJson);
  if (elAdmBtnExportCsv)  elAdmBtnExportCsv.addEventListener('click', exportAdminCsv);
  if (elAdmBtnExportKeypack) elAdmBtnExportKeypack.addEventListener('click', exportVaultTxt);
  if (elAdmBtnClear) elAdmBtnClear.addEventListener('click', function() {
    if (confirm('Clear admin registry log?')) {
      adminRegistry = [];
      persistAdminRegistry();
      renderAdminUi();
      log('Admin registry log cleared.', 'warn');
    }
  });

  if (elModalClose) elModalClose.addEventListener('click', function() { elModalOverlay.style.display = 'none'; });
  if (elModalOverlay) elModalOverlay.addEventListener('click', function(e) {
    if (e.target === elModalOverlay) elModalOverlay.style.display = 'none';
  });
  if (elModalTabPub)  elModalTabPub.addEventListener('click', function() { setModalTab('pub'); });
  if (elModalTabPriv) elModalTabPriv.addEventListener('click', function() { setModalTab('priv'); });
  if (elModalTabRev)  elModalTabRev.addEventListener('click', function() { setModalTab('rev'); });
  if (elModalBtnCopy) elModalBtnCopy.addEventListener('click', function() {
    if (elModalContentText) {
      navigator.clipboard.writeText(elModalContentText.value).then(function() {
        if (elModalCopiedNotice) {
          elModalCopiedNotice.style.display = 'inline';
          setTimeout(function() { elModalCopiedNotice.style.display = 'none'; }, 2000);
        }
      });
    }
  });
  if (elModalBtnDownload) elModalBtnDownload.addEventListener('click', function() {
    if (selectedModalKey) downloadKeyFile(selectedModalKey.id, activeModalTab);
  });
  if (elModalBtnDownloadAll) elModalBtnDownloadAll.addEventListener('click', function() {
    if (selectedModalKey) downloadSingleBundle(selectedModalKey.id);
  });

  if (elBtnClearConsole) elBtnClearConsole.addEventListener('click', logClear);

  autoLoadKeys();
  fetchWalletGas();
});
