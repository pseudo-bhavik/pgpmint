/**
 * app.js — they · seen Autonomous Engine & Cryptographic Vault v4.2
 * 100% Client-Side · Ethereum Mainnet (Chain ID: 1)
 * Target Contract: 0x3286e6525A38cD1d277ECaF435b156c0cc892C29
 * Target Method: Function #9 seen(string pgp) [Selector: 0x363355d2]
 */

(function() {
  'use strict';

  const ethers = window.ethers;
  const openpgp = window.openpgp;

  // ── CONSTANTS & SECURITY BOUNDARIES ─────────────────────────────────────────
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

  const MIN_SAFE_PRIORITY_GWEI = '0.05';
  const DEFAULT_GAS_LIMIT      = 220000n;

  // ── STATE VARIABLES ─────────────────────────────────────────────────────────
  let gpgKeyPool       = [];
  let keyVault         = [];
  let adminRegistry    = [];
  let runLog           = [];
  let abortFlag        = false;
  let isBatchRunning   = false;
  let isGeneratingKeys = false;
  let activeMode       = 'wallet';
  let walletKeySource  = 'generate'; // Default to fresh generator

  let browserProvider  = null;
  let connectedSigner  = null;
  let connectedAddress = null;

  let selectedModalKey  = null;
  let quickGeneratedKey = null;

  // ── DOM SELECTOR HELPER ─────────────────────────────────────────────────────
  const $ = function(id) { return document.getElementById(id); };

  // DOM Elements
  let elModeBtnWallet, elModeBtnBulk, elModeBtnVault, elModeBtnAdmin, elModeDescText;
  let elWalletWrap, elBulkWrap, elVaultWrap, elAdminWrap;
  let elBtnConnect, elBtnDisconnect, elBtnSwitchNetwork, elWcInfo, elWcAddress, elWcBalance, elWcNetwork;
  let elWmBtnFetchGas, elWmGrBase, elWmGasStatus;
  let elWmTabPool, elWmTabGenerate, elWmTabCustom, elWmPoolStatsRow, elWmGenerateCard, elWmCustomCard, elWmCustomTextarea;
  let elWmGenModeRandom, elWmGenModeCustom, elWmCustomIdFields, elWmGenName, elWmGenEmail, elWmBtnQuickGen, elWmBtnDownloadActive, elWmGenStatus;
  let elWmGpgAvail, elWmGpgTotal, elWmGpgNext, elWmGpgSource, elPreviewKeyTag, elPreviewVaultTag, elPreviewKeyText;
  let elBtnSingleMint, elWmMintResult, elWmBtnExportKeys, elWmBtnDownloadVault;
  let elRpcUrl, elTxDelay, elBtnFetchGas, elGrBase, elGrPriority, elGrEstCost, elGasStatus;
  let elPkInput, elBtnClearPks, elWalletCount, elGpgCount, elGpgTotal, elGpgSource, elBtnGotoVaultGen, elGpgDropZone, elGpgFileInput, elDropFilename, elGpgPasteInput;
  let elStatWallets, elStatGpg, elStatGas, elStatProgress, elStatSuccess, elStatFailed, elProgressBar, elBtnInitiate, elBtnAbort, elAbortNotice, elExecTbody;
  let elBtnExportKeys, elBtnExportCsv, elBtnExportBulkVault, elBtnClearTable;
  let elGenCountGroup, elGenCount, elGenStyle, elGenTimeShuffle, elGenCustomIdFields, elGenCustomRowsContainer, elBtnAddCustomRow, elGenCustomRowCountBadge, elBtnRunGenerator, elGenProgressBox, elGenProgressLabel, elGenProgressNum, elGenProgressBar;
  let elVaultStatTotal, elVaultStatTriads, elVaultStatUnused, elVaultStatMapped, elVaultBadgeTotal;
  let elBtnMasterDownloadTxt, elBtnMasterDownloadJson;
  let elBtnDownloadUnusedJson, elBtnImportVault, elFileImportVault, elBtnClearVault, elVaultSearchInput, elVaultFilteredCount, elVaultKeysContainer;
  let elAdmStatTotal, elAdmStatWallet, elAdmStatBulk, elAdmStatPrivSaved, elAdmSearchInput, elAdmTbody, elAdmBtnExportJson, elAdmBtnExportCsv, elAdmBtnExportKeypack, elAdmBtnClear;
  let elConsoleLog, elBtnClearConsole;
  let elModalOverlay, elModalTitle, elModalClose, elModalMetaGrid, elModalTabPub, elModalTabPriv, elModalTabRev, elModalContentText, elModalBtnCopy, elModalBtnDownload, elModalBtnDownloadAll, elModalCopiedNotice;
  let activeModalTab = 'pub';

  // ── NAME & DOMAIN DICTIONARIES ──────────────────────────────────────────────
  const FIRST_NAMES = [
    'Alexander', 'Sophia', 'Marcus', 'Elena', 'Liam', 'Olivia', 'Ethan', 'Isabella',
    'Lucas', 'Mia', 'Noah', 'Emma', 'Oliver', 'Ava', 'Mateo', 'Camila', 'Sebastian',
    'Aria', 'Julian', 'Chloe', 'Nathan', 'Priya', 'Leo', 'Zoe', 'Gabriel', 'Hannah',
    'Daniel', 'Leila', 'Henry', 'Nora', 'Elijah', 'Mila', 'Samuel', 'Maya', 'Benjamin',
    'Bhavik', 'Aarav', 'Dmitri', 'Kaelen', 'Freja', 'Siddharth', 'Yuki', 'Seraphina'
  ];

  const LAST_NAMES = [
    'Vance', 'Rostova', 'Chen', 'Morales', 'Dubois', 'Sterling', 'Novak', 'Tanaka',
    'Lindqvist', 'Mercer', 'Kowalski', 'Sinclair', 'Hartmann', 'Nakamura', 'Moreau',
    'Fischer', 'Gomez', 'Weber', 'Becker', 'Hoffmann', 'Schulz', 'Wagner', 'Ricci',
    'Marino', 'Costa', 'Santos', 'Silva', 'Ferreira', 'Alvarez', 'Romero', 'Torres',
    'Patel', 'Sharma', 'Volkov', 'Lindstrom', 'Takahashi', 'Verdi'
  ];

  const DOMAINS_PUBLIC = [
    'proton.me', 'pm.me', 'gmail.com', 'outlook.com', 'icloud.com', 'fastmail.com',
    'mailbox.org', 'tuta.io', 'mailfence.com', 'zoho.com', 'posteo.de', 'gmx.com',
    'devmail.io', 'coder.net', 'bytehub.org', 'techflow.io', 'sysops.dev', 'cloudnative.cc',
    'nodeworks.io', 'sovereign.id'
  ];

  // ── UTILITIES ───────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const s = typeof str !== 'string' ? String(str) : str;
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeError(err) {
    if (!err) return 'Unknown error occurred.';
    let msg = err.reason || err.shortMessage || err.message || String(err);
    msg = msg.replace(/0x[a-fA-F0-9]{64}/gi, '[REDACTED_HEX]');
    msg = msg.replace(/\b[a-fA-F0-9]{64}\b/gi, '[REDACTED_HEX]');
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

  /**
   * Generates identity object with name and email based on style or custom parameters.
   */
  function buildIdentity(style, customName, customEmail) {
    // 1. Custom / Self-Authentic Identity
    if (style === 'custom') {
      let finalName = (customName || '').trim();
      let finalEmail = (customEmail || '').trim();

      if (finalName && !finalEmail) {
        const handle = finalName.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
        const dom = randomItem(DOMAINS_PUBLIC);
        finalEmail = handle + '@' + dom;
      } else if (!finalName && finalEmail) {
        const parts = finalEmail.split('@');
        const handle = parts[0] || 'User';
        finalName = handle.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); }).trim();
      } else if (!finalName && !finalEmail) {
        return buildIdentity('realistic');
      }

      return {
        name: finalName,
        email: finalEmail
      };
    }

    // 2. Anonymous Style
    if (style === 'anon') {
      const hex = Math.random().toString(16).substring(2, 10).toUpperCase();
      return {
        name: 'Anon-' + hex,
        email: 'anon_' + hex.toLowerCase() + '@vault.local'
      };
    }

    // 3. Developer / SysAdmin Style
    if (style === 'dev') {
      const fn = randomItem(FIRST_NAMES);
      const ln = randomItem(LAST_NAMES);
      const devDomains = ['sysops.dev', 'cloudnative.cc', 'coder.net', 'bytehub.org', 'techflow.io', 'nodeworks.io'];
      const dom = randomItem(devDomains);
      const handle = fn.toLowerCase().charAt(0) + ln.toLowerCase();
      return {
        name: fn + ' ' + ln + ' (Dev)',
        email: handle + '@' + dom
      };
    }

    // 4. Realistic Names & Diverse Domains (Default)
    const fn = randomItem(FIRST_NAMES);
    const ln = randomItem(LAST_NAMES);
    const dom = randomItem(DOMAINS_PUBLIC);
    const fLower = fn.toLowerCase();
    const lLower = ln.toLowerCase();
    const p = randomNum(1, 5);
    let userHandle = fLower + '.' + lLower;
    if (p === 2) userHandle = fLower.charAt(0) + lLower;
    else if (p === 3) userHandle = fLower + '_' + lLower;
    else if (p === 4) userHandle = fLower + '.' + lLower + randomNum(11, 99);

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

  /**
   * Resilient, zero-failure 1-click download trigger using Blob + temporary link + timeout revocation.
   */
  function triggerDownload(filename, content, mimeType) {
    try {
      const blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, filename);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      a.setAttribute('download', filename);
      document.body.appendChild(a);
      a.click();
      setTimeout(function() {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
      }, 2000);
    } catch (err) {
      console.error('Blob download error, trying data URI fallback:', err);
      try {
        const dataUri = 'data:' + (mimeType || 'text/plain;charset=utf-8') + ',' + encodeURIComponent(content);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = dataUri;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
          if (document.body.contains(a)) document.body.removeChild(a);
        }, 500);
      } catch (e2) {
        alert('Download failed in this browser. Please use Inspect to view/copy keys.');
      }
    }
  }

  // ── LOCAL STORAGE PERSISTENCE ───────────────────────────────────────────────
  function loadPersistedState() {
    try {
      localStorage.removeItem(STORAGE_KEY_USED);
    } catch (_) {}

    try {
      const rawVault = localStorage.getItem(STORAGE_KEY_VAULT);
      if (rawVault) {
        const arr = JSON.parse(rawVault);
        if (Array.isArray(arr) && arr.length > 0) {
          keyVault = arr;
          gpgKeyPool = arr.slice();
          log('Restored ' + arr.length + ' cryptographic keypairs from in-browser Vault.', 'info');
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

  function persistVault() {
    try {
      localStorage.setItem(STORAGE_KEY_VAULT, JSON.stringify(keyVault));
    } catch (_) {}
  }

  function persistUsedKeyId(keyId) {
    if (keyId === undefined || keyId === null) return;
    const item = keyVault.find(function(k) { return Number(k.id) === Number(keyId); });
    if (item) item.used = true;
    const poolItem = gpgKeyPool.find(function(k) { return Number(k.id) === Number(keyId); });
    if (poolItem) poolItem.used = true;
    persistVault();
  }

  function persistAdminRegistry() {
    try {
      localStorage.setItem(STORAGE_KEY_ADMIN, JSON.stringify(adminRegistry));
    } catch (_) {}
  }

  // ── ON-CHAIN CLAVIS USED VERIFICATION ───────────────────────────────────────
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

  // ── MODE SWITCHING ──────────────────────────────────────────────────────────
  window.switchMode = function(mode) {
    activeMode = mode;
    if (elModeBtnWallet) elModeBtnWallet.classList.toggle('active', mode === 'wallet');
    if (elModeBtnBulk)   elModeBtnBulk.classList.toggle('active', mode === 'bulk');
    if (elModeBtnVault)  elModeBtnVault.classList.toggle('active', mode === 'vault');
    if (elModeBtnAdmin)  elModeBtnAdmin.classList.toggle('active', mode === 'admin');

    if (elWalletWrap) elWalletWrap.style.display = mode === 'wallet' ? 'block' : 'none';
    if (elBulkWrap)   elBulkWrap.style.display   = mode === 'bulk'   ? 'block' : 'none';
    if (elVaultWrap)  elVaultWrap.style.display  = mode === 'vault'  ? 'block' : 'none';
    if (elAdminWrap)  elAdminWrap.style.display  = mode === 'admin'  ? 'block' : 'none';

    if (mode === 'wallet') {
      if (elModeDescText) elModeDescText.textContent = 'Option 1: Interactive single mint via MetaMask / Browser Wallet · Function #9 seen(string pgp)';
      fetchWalletGas();
      updateWalletModeUi();
    } else if (mode === 'bulk') {
      if (elModeDescText) elModeDescText.textContent = 'Option 2: Automated sequential batch loop over burner private keys (autonomous min gas)';
      fetchBulkGas();
      updateGpgUi('In-Browser Cryptographic Vault');
    } else if (mode === 'vault') {
      if (elModeDescText) elModeDescText.textContent = 'Option 3: Cryptographic Key Generator & Closed-System Vault (Public, Private, Revocation Triads)';
      renderVaultUi();
    } else if (mode === 'admin') {
      if (elModeDescText) elModeDescText.textContent = 'Option 4: Master Address-to-PGP Key Registry, Verification & Audit Ledger';
      renderAdminUi();
    }

    log('Switched navigation to ' + mode.toUpperCase() + ' panel.', 'info');
  };

  // ── CRYPTOGRAPHIC VAULT & KEYPAIR ENGINE ────────────────────────────────────
  async function generateSingleKeypair(identity, keyDate) {
    const pgpLib = window.openpgp || openpgp;
    if (!pgpLib || !pgpLib.generateKey) {
      throw new Error('OpenPGP.js library not loaded in browser.');
    }

    const { publicKey, privateKey, revocationCertificate } = await pgpLib.generateKey({
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
    if (keyEntry.id === undefined) {
      keyEntry.id = keyVault.length + 1;
    }
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

    persistVault();
    updateVaultCounters();
  }

  function updateVaultCounters() {
    const total = keyVault.length;
    const triads = keyVault.filter(function(k) { return !!k.privateKey && !!k.revocationCertificate; }).length;
    const unused = keyVault.filter(function(k) { return !k.used; }).length;
    const mapped = keyVault.filter(function(k) { return !!k.usedByAddress || k.used; }).length;

    if (elVaultStatTotal)  elVaultStatTotal.textContent  = total;
    if (elVaultStatTriads) elVaultStatTriads.textContent = triads;
    if (elVaultStatUnused) elVaultStatUnused.textContent = unused;
    if (elVaultStatMapped) elVaultStatMapped.textContent = mapped;
    if (elVaultBadgeTotal) elVaultBadgeTotal.textContent = total + ' Keypairs Stored';

    const wmAvailCount = $('wm-vault-avail-count');
    if (wmAvailCount) wmAvailCount.textContent = unused;
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
    sourceName = sourceName || 'Vault Import';
    keys.forEach(function(curr, idx) {
      const id = curr.id !== undefined ? curr.id : (idx + 1);
      const isUsed = !!curr.used || !!curr.usedByAddress;
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
        mode: curr.mode || 'imported'
      };
      addToVault(item);
    });

    updateGpgUi(sourceName);
    renderVaultUi();
    renderAdminUi();
    const unused = getUnusedGpgKeys().length;
    log('Loaded ' + keys.length + ' GPG keys from ' + sourceName + ' (' + unused + ' unused).', 'success');
  }

  function getUnusedGpgKeys() {
    return gpgKeyPool.filter(function(k) { return !k.used && !k.inProgress; });
  }

  function getNextUnusedKey() {
    return gpgKeyPool.find(function(k) { return !k.used && !k.inProgress; }) || null;
  }

  function updateGpgUi(sourceName) {
    const unused = getUnusedGpgKeys().length;
    const total = gpgKeyPool.length;
    const next = getNextUnusedKey();

    if (elWmGpgAvail) elWmGpgAvail.textContent = unused;
    if (elWmGpgTotal) elWmGpgTotal.textContent = total;
    if (elWmGpgNext)  elWmGpgNext.textContent  = next ? ('#' + next.id) : 'None';
    if (elWmGpgSource && sourceName) elWmGpgSource.textContent = sourceName;

    if (elGpgCount)  elGpgCount.textContent = unused;
    if (elGpgTotal)  elGpgTotal.textContent = total;
    if (elStatGpg)   elStatGpg.textContent  = unused;
    if (elGpgSource && sourceName) elGpgSource.textContent = sourceName;

    updateVaultCounters();
  }

  function updateWalletModeUi() {
    if (walletKeySource === 'generate') {
      if (quickGeneratedKey) {
        if (elPreviewKeyTag) elPreviewKeyTag.textContent = '⚡ FRESH KEY #' + quickGeneratedKey.id + (quickGeneratedKey.email ? ' (' + quickGeneratedKey.email + ')' : '');
        if (elPreviewKeyText) elPreviewKeyText.textContent = quickGeneratedKey.armoredKey;
        if (elPreviewVaultTag) {
          elPreviewVaultTag.style.display = 'inline-block';
          elPreviewVaultTag.textContent = '✓ TRIAD IN VAULT';
        }
        if (elWmBtnDownloadActive) elWmBtnDownloadActive.disabled = false;
        if (connectedSigner && elBtnSingleMint) elBtnSingleMint.disabled = false;
      } else {
        if (elPreviewKeyTag) elPreviewKeyTag.textContent = 'READY TO GENERATE';
        if (elPreviewKeyText) elPreviewKeyText.textContent = '[ Click "GENERATE NEW KEYPAIR NOW" above to create your fresh cryptographic triad ]';
        if (elPreviewVaultTag) elPreviewVaultTag.style.display = 'none';
        if (elWmBtnDownloadActive) elWmBtnDownloadActive.disabled = true;
        if (elBtnSingleMint) elBtnSingleMint.disabled = true;
      }
    } else if (walletKeySource === 'pool') {
      const next = getNextUnusedKey();
      if (next) {
        if (elPreviewKeyTag) elPreviewKeyTag.textContent = 'VAULT KEY #' + next.id + (next.email ? ' (' + next.email + ')' : '');
        if (elPreviewKeyText) elPreviewKeyText.textContent = next.armoredKey;
        const hasTriad = !!next.privateKey && !!next.revocationCertificate;
        if (elPreviewVaultTag) {
          elPreviewVaultTag.style.display = hasTriad ? 'inline-block' : 'none';
          elPreviewVaultTag.textContent = hasTriad ? '✓ TRIAD IN VAULT' : 'PUBLIC ONLY';
        }
        if (connectedSigner && elBtnSingleMint) elBtnSingleMint.disabled = false;
      } else {
        if (elPreviewKeyTag) elPreviewKeyTag.textContent = 'NO UNUSED VAULT KEYS';
        if (elPreviewKeyText) elPreviewKeyText.textContent = '[ No unused keys in vault. Click Tab [1] to generate fresh keys or Tab [2] to paste! ]';
        if (elPreviewVaultTag) elPreviewVaultTag.style.display = 'none';
        if (elBtnSingleMint) elBtnSingleMint.disabled = true;
      }
    } else if (walletKeySource === 'custom') {
      const txt = elWmCustomTextarea ? elWmCustomTextarea.value.trim() : '';
      if (elPreviewKeyTag) elPreviewKeyTag.textContent = 'CUSTOM PASTED KEY';
      if (elPreviewVaultTag) elPreviewVaultTag.style.display = 'none';
      if (elPreviewKeyText) elPreviewKeyText.textContent = txt || '[ Please paste armored PGP key block above ]';
      if (connectedSigner && txt.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
        if (elBtnSingleMint) elBtnSingleMint.disabled = false;
      } else {
        if (elBtnSingleMint) elBtnSingleMint.disabled = true;
      }
    }
  }

  // ── DYNAMIC CUSTOM IDENTITY ROWS (OPTION 3) ─────────────────────────────────
  function updateCustomRowsUi() {
    if (!elGenCustomRowsContainer) return;
    const rows = elGenCustomRowsContainer.querySelectorAll('.custom-id-row');
    rows.forEach(function(row, idx) {
      row.setAttribute('data-row-idx', idx + 1);
      const idxBadge = row.querySelector('.id-row-index');
      if (idxBadge) idxBadge.textContent = '#' + (idx + 1);
      const removeBtn = row.querySelector('.btn-remove-row');
      if (removeBtn) {
        removeBtn.style.display = rows.length > 1 ? 'inline-block' : 'none';
      }
    });

    if (elGenCustomRowCountBadge) {
      elGenCustomRowCountBadge.textContent = rows.length + (rows.length === 1 ? ' Keypair will be generated' : ' Keypairs will be generated');
    }
  }

  function addCustomIdentityRow(nameVal, emailVal) {
    if (!elGenCustomRowsContainer) return;
    const row = document.createElement('div');
    row.className = 'custom-id-row';
    row.innerHTML = '<span class="id-row-index">#</span>' +
      '<input type="text" class="gen-row-name" placeholder="Full Name (e.g. Maya Morales)" value="' + escapeHtml(nameVal || '') + '">' +
      '<input type="email" class="gen-row-email" placeholder="Email Address (e.g. maya@pm.me)" value="' + escapeHtml(emailVal || '') + '">' +
      '<button type="button" class="btn btn-tiny btn-danger btn-remove-row" title="Remove this row">&times;</button>';
    elGenCustomRowsContainer.appendChild(row);
    updateCustomRowsUi();
  }

  // ── BATCH IN-BROWSER KEY GENERATOR (OPTION 3) ───────────────────────────────
  async function runBatchGenerator() {
    if (isGeneratingKeys) return;
    const style = elGenStyle ? elGenStyle.value : 'realistic';
    const shuffle = elGenTimeShuffle ? (elGenTimeShuffle.value === 'shuffle') : true;

    let targets = [];
    if (style === 'custom') {
      const rows = elGenCustomRowsContainer ? elGenCustomRowsContainer.querySelectorAll('.custom-id-row') : [];
      if (rows.length === 0) {
        addCustomIdentityRow();
      }
      const updatedRows = elGenCustomRowsContainer.querySelectorAll('.custom-id-row');
      updatedRows.forEach(function(r, idx) {
        const nameInp = r.querySelector('.gen-row-name');
        const emailInp = r.querySelector('.gen-row-email');
        const rawName = nameInp ? nameInp.value.trim() : '';
        const rawEmail = emailInp ? emailInp.value.trim() : '';
        const identity = buildIdentity('custom', rawName, rawEmail);
        targets.push(identity);
      });
    } else {
      const count = parseInt(elGenCount ? elGenCount.value : '10', 10) || 10;
      for (let i = 0; i < count; i++) {
        targets.push(buildIdentity(style));
      }
    }

    const totalCount = targets.length;
    isGeneratingKeys = true;
    if (elBtnRunGenerator) elBtnRunGenerator.disabled = true;
    if (elGenProgressBox) elGenProgressBox.style.display = 'block';
    if (elGenProgressNum) elGenProgressNum.textContent = '0 / ' + totalCount;
    if (elGenProgressBar) elGenProgressBar.style.width = '0%';
    log('Starting in-browser OpenPGP generator for ' + totalCount + ' keypair(s) (Curve25519 ECC)...', 'info');

    const startId = keyVault.length + 1;
    const startT = Date.now();

    for (let i = 0; i < totalCount; i++) {
      const identity = targets[i];
      const keyDate = getRandomDate(shuffle);
      const currNum = i + 1;

      if (elGenProgressLabel) elGenProgressLabel.textContent = 'Generating key for ' + identity.name + ' <' + identity.email + '>...';
      if (elGenProgressNum) elGenProgressNum.textContent = currNum + ' / ' + totalCount;
      if (elGenProgressBar) elGenProgressBar.style.width = ((currNum / totalCount) * 100).toFixed(1) + '%';

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
          mode: 'batch-generated'
        };
        addToVault(newEntry);
      } catch (err) {
        log('Error generating key #' + currNum + ': ' + err.message, 'error');
      }

      // Small yield to keep UI responsive
      await new Promise(function(r) { setTimeout(r, 10); });
    }

    const elapsed = ((Date.now() - startT) / 1000).toFixed(2);
    isGeneratingKeys = false;
    if (elBtnRunGenerator) elBtnRunGenerator.disabled = false;
    if (elGenProgressLabel) elGenProgressLabel.textContent = '✓ ' + totalCount + ' Keypairs generated successfully in ' + elapsed + 's!';
    log('Successfully created ' + totalCount + ' cryptographic keypairs in ' + elapsed + 's. Added to Vault.', 'success');

    updateGpgUi('In-Browser Cryptographic Vault');
    renderVaultUi();
  }

  // ── VAULT UI RENDERING ──────────────────────────────────────────────────────
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
      const isUsed = !!k.used || !!k.usedByAddress;
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
        const shortBound = k.usedByAddress.length > 20 ? (k.usedByAddress.substring(0, 10) + '...' + k.usedByAddress.substring(36)) : k.usedByAddress;
        html += '  <div class="vc-mapped">&#128279; Bound Wallet: <span class="code-green">' + escapeHtml(shortBound) + '</span></div>';
      }

      html += '  <div class="vc-actions" style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">';
      html += '    <button type="button" class="btn btn-tiny btn-green btn-download-bundle" data-key-id="' + k.id + '" style="font-weight:700;">📥 DOWNLOAD THIS KEY (.TXT)</button>';
      html += '    <button type="button" class="btn btn-tiny btn-primary btn-inspect-key" data-key-id="' + k.id + '">&#128065; INSPECT / VIEW</button>';
      html += '  </div>';
      html += '</div>';
    });

    elVaultKeysContainer.innerHTML = html;
  }

  // ── ADMIN REGISTRY & AUDIT LEDGER ───────────────────────────────────────────
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
      const shortAddr = r.walletAddress && r.walletAddress.length > 20 ? (r.walletAddress.substring(0, 8) + '...' + r.walletAddress.substring(36)) : String(r.walletAddress || '');
      const shortTx   = r.txHash ? (r.txHash.length > 20 ? (r.txHash.substring(0, 10) + '...' + r.txHash.substring(60)) : r.txHash) : '-';
      const txLink    = r.txHash ? ('<a href="https://etherscan.io/tx/' + encodeURIComponent(r.txHash) + '" target="_blank" rel="noopener noreferrer" class="code-green">' + escapeHtml(shortTx) + ' &nearr;</a>') : '-';
      const tokenDisplay = r.tokenId ? ('<a href="https://theyarefound.com/' + encodeURIComponent(r.tokenId) + '" target="_blank" rel="noopener noreferrer" class="amber">#' + escapeHtml(r.tokenId) + ' &nearr;</a>') : 'Pending Batch Survey';

      html += '<tr>';
      html += '  <td>' + (idx + 1) + '</td>';
      html += '  <td><a href="https://etherscan.io/address/' + encodeURIComponent(r.walletAddress) + '" target="_blank" rel="noopener noreferrer" class="code-green">' + escapeHtml(shortAddr) + ' &nearr;</a></td>';
      html += '  <td>' + escapeHtml(r.name || ('Key #' + r.keyId)) + '<br><span style="font-size:9.5px; color:var(--text-dim);">' + escapeHtml(r.email || '') + '</span></td>';
      html += '  <td><button type="button" class="btn btn-tiny btn-muted btn-inspect-key" data-key-id="' + r.keyId + '">KEY #' + r.keyId + '</button></td>';
      html += '  <td><span class="v-badge ' + (r.hasPrivateKey ? 'priv' : 'used') + '">' + (r.hasPrivateKey ? '✓ SAVED' : 'NO') + '</span></td>';
      html += '  <td><span class="v-badge ' + (r.hasRevocationCert ? 'rev' : 'used') + '">' + (r.hasRevocationCert ? '✓ SAVED' : 'NO') + '</span></td>';
      html += '  <td>' + txLink + '</td>';
      html += '  <td>' + tokenDisplay + '</td>';
      html += '  <td><span class="status-badge success">' + escapeHtml(r.status || 'AURIS') + '</span></td>';
      html += '  <td>';
      html += '    <button type="button" class="btn btn-tiny btn-green btn-download-bundle" data-key-id="' + r.keyId + '" style="font-weight:700;">📥 DOWNLOAD (.TXT)</button>';
      html += '    <button type="button" class="btn btn-tiny btn-primary btn-inspect-key" data-key-id="' + r.keyId + '">INSPECT</button>';
      html += '  </td>';
      html += '</tr>';
    });

    elAdmTbody.innerHTML = html;
  }

  // ── KEY INSPECTOR MODAL ─────────────────────────────────────────────────────
  function openKeyModal(keyId) {
    const list = (keyVault && keyVault.length > 0) ? keyVault : gpgKeyPool;
    const item = list.find(function(k) { return Number(k.id) === Number(keyId); });
    if (!item) {
      log('Key #' + keyId + ' not found in vault.', 'error');
      alert('Key #' + keyId + ' not found in memory.');
      return;
    }
    selectedModalKey = item;
    if (elModalTitle) elModalTitle.textContent = '🔒 Cryptographic Inspector — Key #' + item.id + (item.email ? ' (' + item.email + ')' : '');

    let metaHtml = '';
    metaHtml += '<div class="modal-meta-item"><span class="modal-meta-k">Key ID</span><span class="modal-meta-v">#' + escapeHtml(item.id) + '</span></div>';
    metaHtml += '<div class="modal-meta-item"><span class="modal-meta-k">User Identity</span><span class="modal-meta-v">' + escapeHtml(item.name || 'Anonymous') + '</span></div>';
    metaHtml += '<div class="modal-meta-item"><span class="modal-meta-k">Email Address</span><span class="modal-meta-v">' + escapeHtml(item.email || '-') + '</span></div>';
    metaHtml += '<div class="modal-meta-item"><span class="modal-meta-k">Creation Date</span><span class="modal-meta-v">' + escapeHtml(item.createdAt || '-') + '</span></div>';
    metaHtml += '<div class="modal-meta-item"><span class="modal-meta-k">Mapped Wallet</span><span class="modal-meta-v code-green">' + escapeHtml(item.usedByAddress || 'Unassigned') + '</span></div>';
    const displayTx = item.tokenId ? ('#' + item.tokenId) : (item.txHash ? (item.txHash.substring(0, 16) + '...') : '-');
    metaHtml += '<div class="modal-meta-item"><span class="modal-meta-k">Token ID / Tx</span><span class="modal-meta-v amber">' + escapeHtml(displayTx) + '</span></div>';
    if (elModalMetaGrid) elModalMetaGrid.innerHTML = metaHtml;

    setModalTab('pub');
    if (elModalOverlay) elModalOverlay.style.display = 'flex';
  }

  function setModalTab(tab) {
    activeModalTab = tab;
    if (elModalTabPub) elModalTabPub.classList.toggle('active', tab === 'pub');
    if (elModalTabPriv) elModalTabPriv.classList.toggle('active', tab === 'priv');
    if (elModalTabRev) elModalTabRev.classList.toggle('active', tab === 'rev');

    if (!selectedModalKey || !elModalContentText) return;
    if (tab === 'pub') {
      elModalContentText.value = selectedModalKey.armoredKey || '[ No Public Key ]';
    } else if (tab === 'priv') {
      elModalContentText.value = selectedModalKey.privateKey || '[ No Private Key stored for this preloaded entry ]';
    } else if (tab === 'rev') {
      elModalContentText.value = selectedModalKey.revocationCertificate || '[ No Revocation Certificate stored for this preloaded entry ]';
    }
  }

  function downloadKeyFile(keyId, type) {
    const list = (keyVault && keyVault.length > 0) ? keyVault : gpgKeyPool;
    const item = list.find(function(k) { return Number(k.id) === Number(keyId); });
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
  }

  function downloadSingleBundle(keyId) {
    const list = (keyVault && keyVault.length > 0) ? keyVault : gpgKeyPool;
    const item = list.find(function(k) { return Number(k.id) === Number(keyId); });
    if (!item) {
      alert('Key #' + keyId + ' not found in memory.');
      return;
    }
    let text = '======================================================================\n';
    text += 'THEY · SEEN MASTER CRYPTOGRAPHIC KEYPACK BUNDLE — KEY #' + item.id + '\n';
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

    triggerDownload('they-seen-key-' + item.id + '-complete-bundle.txt', text);
    log('Downloaded complete bundle for Key #' + item.id + '.', 'success');
  }

  // ── GAS FEE MONITORING ──────────────────────────────────────────────────────
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
        const estEthPerTx = (165000 * totalGweiPerTx / 1e9).toFixed(6);
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

  // ── WALLET CONNECTION (OPTION 1) ────────────────────────────────────────────
  async function connectBrowserWallet() {
    if (!window.ethereum) {
      alert('No Web3 browser wallet detected. Please install MetaMask, Rabby, or Coinbase Wallet.');
      return;
    }

    try {
      if (elBtnConnect) {
        elBtnConnect.disabled = true;
        elBtnConnect.textContent = 'CONNECTING...';
      }
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

      if (elBtnSingleMint) elBtnSingleMint.disabled = false;
      log('Connected wallet: ' + connectedAddress + ' (' + parseFloat(balEth).toFixed(5) + ' ETH)', 'success');
      fetchWalletGas();
      updateWalletModeUi();

      if (walletKeySource === 'generate' && !quickGeneratedKey) {
        await runSingleWalletGenerator(false);
      }
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

  // ── OPTION 1 MINT EXECUTION ─────────────────────────────────────────────────
  async function executeSingleMint() {
    if (!connectedSigner || !connectedAddress) {
      alert('Please connect your browser wallet first.');
      return;
    }

    let chosenKey = null;

    if (walletKeySource === 'generate') {
      if (!quickGeneratedKey) {
        await runSingleWalletGenerator(true);
      }
      chosenKey = quickGeneratedKey;
    } else if (walletKeySource === 'pool') {
      chosenKey = getNextUnusedKey();
      if (!chosenKey) {
        alert('No unused GPG keys available in vault. Generate one with Tab [1] or Option 3.');
        return;
      }
      const isUsed = await checkKeyUsedOnChain(chosenKey.armoredKey);
      if (isUsed) {
        log('Vault key #' + chosenKey.id + ' is already used on-chain! Skipping...', 'warn');
        chosenKey.used = true;
        persistUsedKeyId(chosenKey.id);
        updateGpgUi('In-Browser Cryptographic Vault');
        updateWalletModeUi();
        executeSingleMint();
        return;
      }
    } else if (walletKeySource === 'custom') {
      const customTxt = elWmCustomTextarea ? elWmCustomTextarea.value.trim() : '';
      if (!customTxt || !customTxt.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
        alert('Please enter a valid ASCII-armored PGP public key block.');
        return;
      }
      chosenKey = {
        id: keyVault.length + 1,
        name: 'Custom Pasted Key',
        email: 'custom@user.local',
        armoredKey: customTxt,
        privateKey: '',
        revocationCertificate: '',
        used: false,
        mode: 'custom'
      };
      addToVault(chosenKey);
    }

    if (!chosenKey) {
      alert('No key available to mint.');
      return;
    }

    try {
      elBtnSingleMint.disabled = true;
      elBtnSingleMint.textContent = 'CONFIRM TRANSACTION IN YOUR WALLET...';
      if (elWmMintResult) elWmMintResult.style.display = 'none';

      log('Preparing Function #9 seen(string pgp) transaction for ' + connectedAddress + '...', 'info');
      log('PGP Payload Size: ' + chosenKey.armoredKey.length + ' bytes | Key ID: #' + chosenKey.id + ' (' + (chosenKey.email || 'Custom') + ')', 'info');

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, connectedSigner);
      
      let gasLimit = DEFAULT_GAS_LIMIT;
      try {
        const estimated = await contract.seen.estimateGas(chosenKey.armoredKey);
        gasLimit = (estimated * 125n) / 100n; // 25% safety buffer
        log('Dynamic Gas Estimation: ' + estimated.toString() + ' (Safe Limit with 25% buffer: ' + gasLimit.toString() + ')', 'info');
      } catch (estErr) {
        log('Gas estimation notice: using default safe limit ' + gasLimit.toString(), 'info');
      }

      const tx = await contract.seen(chosenKey.armoredKey, {
        gasLimit: gasLimit
      });

      log('Transaction Broadcasted! TX: ' + tx.hash, 'tx');
      elBtnSingleMint.textContent = 'MINING ON ETHEREUM MAINNET...';

      const receipt = await tx.wait(1);
      const blockNum = receipt.blockNumber;
      const gasUsed = receipt.gasUsed.toString();

      chosenKey.used = true;
      chosenKey.usedByAddress = connectedAddress;
      chosenKey.txHash = tx.hash;
      chosenKey.mode = 'wallet';
      persistUsedKeyId(chosenKey.id);

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
        status: 'AURIS',
        timestamp: new Date().toISOString()
      });

      const mintedKeyId = chosenKey.id;

      // Reset quick generated key reference so next mint gets a fresh one
      if (walletKeySource === 'generate') {
        quickGeneratedKey = null;
      }

      updateGpgUi('In-Browser Cryptographic Vault');
      renderVaultUi();
      updateWalletModeUi();

      log('SUCCESS! Minted Token ' + (tokenId ? ('#' + tokenId) : '') + ' in block ' + blockNum + ' | Gas Used: ' + gasUsed, 'success');

      if (elWmMintResult) {
        let resultHtml = '<div class="mint-success-card" style="padding:14px; background:rgba(0,255,102,0.06); border:1px solid var(--green); margin-top:14px;">';
        resultHtml += '<div style="font-weight:700; color:var(--green); font-size:13px; margin-bottom:6px;">✓ TRANSACTION CONFIRMED ON ETHEREUM MAINNET!</div>';
        resultHtml += '<div style="font-size:11px; line-height:1.7;">';
        resultHtml += '  <div><strong>Transaction Hash:</strong> <a href="https://etherscan.io/tx/' + encodeURIComponent(tx.hash) + '" target="_blank" rel="noopener noreferrer" class="code-green">' + escapeHtml(tx.hash) + ' &nearr;</a></div>';
        resultHtml += '  <div><strong>Block:</strong> ' + escapeHtml(blockNum) + ' &bull; <strong>Gas Used:</strong> ' + escapeHtml(gasUsed) + '</div>';
        if (tokenId) {
          resultHtml += '  <div><strong>Assigned Token:</strong> <a href="https://theyarefound.com/' + encodeURIComponent(tokenId) + '" target="_blank" rel="noopener noreferrer" class="amber">Token #' + escapeHtml(tokenId) + ' &nearr;</a> (Status: <em>adhuc de te loquimur</em>)</div>';
        }
        resultHtml += '</div>';

        resultHtml += '<div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">';
        resultHtml += '  <button type="button" class="btn btn-tiny btn-green" onclick="downloadSingleBundle(' + mintedKeyId + ')">&#128190; DOWNLOAD FULL KEY BUNDLE (PUBLIC + PRIV + CERTS)</button>';
        resultHtml += '  <button type="button" class="btn btn-tiny btn-primary" onclick="openKeyModal(' + mintedKeyId + ')">&#128065; INSPECT KEYPAIR</button>';
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

  // ── QUICK KEY GENERATOR FOR OPTION 1 ────────────────────────────────────────
  async function runSingleWalletGenerator(isUserTriggered) {
    if (isGeneratingKeys) return;
    isGeneratingKeys = true;

    if (elWmBtnQuickGen) {
      elWmBtnQuickGen.disabled = true;
      elWmBtnQuickGen.textContent = 'GENERATING...';
    }
    if (elWmGenStatus) elWmGenStatus.textContent = 'Computing Curve25519 triad (Pub + Priv + Rev)...';

    try {
      const isCustomMode = elWmGenModeCustom && elWmGenModeCustom.checked;
      let identity;

      if (isCustomMode) {
        const nameVal = elWmGenName ? elWmGenName.value.trim() : '';
        const emailVal = elWmGenEmail ? elWmGenEmail.value.trim() : '';
        identity = buildIdentity('custom', nameVal, emailVal, 0, 1);
      } else {
        identity = buildIdentity('realistic');
      }

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
        mode: 'wallet-generated'
      };

      addToVault(quickGeneratedKey);
      renderVaultUi();
      updateWalletModeUi();

      if (elWmGenStatus) {
        elWmGenStatus.textContent = '✓ Generated Key #' + newId + ' for ' + identity.name + ' <' + identity.email + '>';
      }

      log('Generated fresh OpenPGP keypair for ' + identity.name + ' <' + identity.email + '> (Key #' + newId + '). Triad preserved in vault.', 'success');
    } catch (err) {
      log('Quick generator error: ' + err.message, 'error');
      if (elWmGenStatus) elWmGenStatus.textContent = 'Generation failed: ' + err.message;
    } finally {
      isGeneratingKeys = false;
      if (elWmBtnQuickGen) {
        elWmBtnQuickGen.disabled = false;
        elWmBtnQuickGen.textContent = '⚡ GENERATE NEW KEYPAIR NOW';
      }
    }
  }

  // ── BULK BURNER WALLET MINT ENGINE (OPTION 2) ───────────────────────────────
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
    if (elBtnInitiate) elBtnInitiate.disabled = true;
    if (elBtnAbort) elBtnAbort.disabled = false;
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
        log('[' + currNum + '/' + total + '] Vault depleted — auto-generating fresh triad on the fly...', 'warn');
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

      const isUsed = await checkKeyUsedOnChain(gpgKey.armoredKey);
      if (isUsed) {
        log('[' + currNum + '/' + total + '] Key #' + gpgKey.id + ' is already used on-chain! Skipping...', 'warn');
        gpgKey.used = true;
        persistUsedKeyId(gpgKey.id);
        i--;
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
        
        let gasLimit = DEFAULT_GAS_LIMIT;
        try {
          const estimated = await contract.seen.estimateGas(gpgKey.armoredKey);
          gasLimit = (estimated * 125n) / 100n; // 25% safety buffer
        } catch (estErr) {
          gasLimit = DEFAULT_GAS_LIMIT;
        }

        const tx = await contract.seen(gpgKey.armoredKey, {
          maxPriorityFeePerGas: tip,
          maxFeePerGas: maxFee,
          gasLimit: gasLimit
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

      updateGpgUi('In-Browser Cryptographic Vault');
      updateBulkStats(total, currNum, successCount, failCount);

      if (delay > 0 && currNum < total && !abortFlag) {
        await new Promise(function(r) { setTimeout(r, delay); });
      }
    }

    isBatchRunning = false;
    if (elBtnInitiate) elBtnInitiate.disabled = false;
    if (elBtnAbort) elBtnAbort.disabled = true;
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

    const shortAddr = addr && addr.length > 20 ? (addr.substring(0, 8) + '...' + addr.substring(36)) : String(addr || '');
    const shortTx = txHash && txHash !== '-' ? (txHash.length > 20 ? (txHash.substring(0, 10) + '...' + txHash.substring(60)) : txHash) : '-';
    const txLink = txHash && txHash !== '-' ? ('<a href="https://etherscan.io/tx/' + encodeURIComponent(txHash) + '" target="_blank" rel="noopener noreferrer" class="code-green">' + escapeHtml(shortTx) + ' &nearr;</a>') : '-';
    const statusClass = status === 'SUCCESS' ? 'success' : (status === 'SKIPPED_NO_ETH' ? 'skipped' : 'failed');

    const tr = document.createElement('tr');
    tr.innerHTML = '<td>' + escapeHtml(idx) + '</td>' +
      '<td><a href="https://etherscan.io/address/' + encodeURIComponent(addr) + '" target="_blank" rel="noopener noreferrer" class="code-green">' + escapeHtml(shortAddr) + ' &nearr;</a></td>' +
      '<td>' + (bal !== '-' ? (parseFloat(bal).toFixed(4) + ' ETH') : '-') + '</td>' +
      '<td><button type="button" class="btn btn-tiny btn-muted btn-inspect-key" data-key-id="' + escapeHtml(keyId) + '">KEY #' + escapeHtml(keyId) + '</button></td>' +
      '<td>' + txLink + '</td>' +
      '<td>' + escapeHtml(block) + '</td>' +
      '<td>' + escapeHtml(gasUsed) + '</td>' +
      '<td><span class="status-badge ' + statusClass + '">' + escapeHtml(status) + '</span></td>';

    elExecTbody.appendChild(tr);
  }

  // ── EXPORT SUITE ────────────────────────────────────────────────────────────
  function exportVaultJson() {
    const list = (keyVault && keyVault.length > 0) ? keyVault : gpgKeyPool;
    if (!list || list.length === 0) {
      alert('No keys in vault to export. Please generate keys or import a vault JSON backup first.');
      return;
    }
    const content = JSON.stringify(list, null, 2);
    triggerDownload('they-seen-all-keys-vault-backup.json', content, 'application/json');
    log('Exported full Cryptographic Vault (' + list.length + ' keys).', 'success');
  }

  function exportVaultTxt() {
    const list = (keyVault && keyVault.length > 0) ? keyVault : gpgKeyPool;
    if (!list || list.length === 0) {
      alert('No keys in vault to export. Please generate keys or import a vault JSON backup first.');
      return;
    }
    let text = '======================================================================\n';
    text += 'THEY · SEEN MASTER CRYPTOGRAPHIC KEYPACK VAULT BUNDLE\n';
    text += 'Total Keys Stored: ' + list.length + '\n';
    text += 'Export Timestamp:  ' + new Date().toISOString() + '\n';
    text += 'Target Contract:   ' + CONTRACT_ADDRESS + '\n';
    text += 'Target Method:     Function #9 seen(string pgp) [0x363355d2]\n';
    text += '======================================================================\n\n';

    list.forEach(function(k) {
      text += '######################################################################\n';
      text += 'KEY #' + k.id + ' | ' + (k.name || 'Anonymous') + ' <' + (k.email || '-') + '>\n';
      text += 'Created:      ' + (k.createdAt || '-') + '\n';
      text += 'Used Status:  ' + (k.used ? 'USED' : 'FRESH / UNUSED') + '\n';
      text += 'Bound Wallet: ' + (k.usedByAddress || 'Unassigned') + '\n';
      text += 'Tx Hash:      ' + (k.txHash || '-') + '\n';
      text += 'Token ID:     ' + (k.tokenId ? ('#' + k.tokenId) : 'Pending') + '\n';
      text += '----------------------------------------------------------------------\n';
      text += '--- 1. ARMORED PUBLIC KEY BLOCK ---\n' + (k.armoredKey || '[NONE]') + '\n\n';
      text += '--- 2. ARMORED PRIVATE KEY BLOCK ---\n' + (k.privateKey || '[NO PRIVATE KEY IN RECORD]') + '\n\n';
      text += '--- 3. REVOCATION CERTIFICATE BLOCK ---\n' + (k.revocationCertificate || '[NO REVOCATION CERTIFICATE IN RECORD]') + '\n\n';
    });

    triggerDownload('they-seen-all-keys-vault-bundle.txt', text);
    log('Exported full TXT Keypack Bundle (' + list.length + ' keys).', 'success');
  }

  function exportUnusedJson() {
    const unused = keyVault.filter(function(k) { return !k.used && !k.usedByAddress; });
    const content = JSON.stringify(unused, null, 2);
    triggerDownload('keys-unused-pool.json', content, 'application/json');
    log('Exported ' + unused.length + ' unused keys as keys-unused-pool.json.', 'success');
  }

  function exportAdminJson() {
    const content = JSON.stringify(adminRegistry, null, 2);
    triggerDownload('they-seen-admin-registry-ledger.json', content, 'application/json');
    log('Exported Admin Registry JSON (' + adminRegistry.length + ' records).', 'success');
  }

  function escapeCsv(val) {
    const str = String(val === undefined || val === null ? '' : val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function exportAdminCsv() {
    const headers = ['ID', 'WalletAddress', 'KeyID', 'IdentityName', 'Email', 'HasPrivateKey', 'HasRevocationCert', 'TxHash', 'BlockNumber', 'GasUsed', 'TokenID', 'Mode', 'Status', 'Timestamp'];
    const rows = adminRegistry.map(function(r) {
      return [
        r.id,
        escapeCsv(r.walletAddress),
        r.keyId,
        escapeCsv(r.name || ''),
        escapeCsv(r.email || ''),
        r.hasPrivateKey ? 'TRUE' : 'FALSE',
        r.hasRevocationCert ? 'TRUE' : 'FALSE',
        escapeCsv(r.txHash || ''),
        escapeCsv(r.blockNumber || ''),
        escapeCsv(r.gasUsed || ''),
        escapeCsv(r.tokenId || ''),
        escapeCsv(r.mode || ''),
        escapeCsv(r.status || ''),
        escapeCsv(r.timestamp || '')
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    triggerDownload('they-seen-admin-registry-ledger.csv', csv, 'text/csv');
    log('Exported Admin Registry CSV (' + adminRegistry.length + ' rows).', 'success');
  }

  // ── BIND DOM & ATTACH LISTENERS ─────────────────────────────────────────────
  function bindElements() {
    elModeBtnWallet     = $('mode-btn-wallet');
    elModeBtnBulk       = $('mode-btn-bulk');
    elModeBtnVault      = $('mode-btn-vault');
    elModeBtnAdmin      = $('mode-btn-admin');
    elModeDescText      = $('mode-desc-text');

    elWalletWrap        = $('wallet-mode-wrap');
    elBulkWrap          = $('bulk-mode-wrap');
    elVaultWrap         = $('vault-mode-wrap');
    elAdminWrap         = $('admin-mode-wrap');

    elBtnConnect        = $('btn-connect-wallet');
    elBtnDisconnect     = $('btn-disconnect-wallet');
    elBtnSwitchNetwork  = $('btn-switch-network');
    elWcInfo            = $('wc-info');
    elWcAddress         = $('wc-address');
    elWcBalance         = $('wc-balance');
    elWcNetwork         = $('wc-network');

    elWmBtnFetchGas     = $('wm-btn-fetch-gas');
    elWmGrBase          = $('wm-gr-base');
    elWmGasStatus       = $('wm-gas-status');

    elWmTabPool         = $('wm-tab-pool');
    elWmTabGenerate     = $('wm-tab-generate');
    elWmTabCustom       = $('wm-tab-custom');
    elWmPoolStatsRow    = $('wm-pool-stats-row');
    elWmGenerateCard    = $('wm-generate-card');
    elWmCustomCard      = $('wm-custom-card');
    elWmCustomTextarea  = $('wm-custom-textarea');

    elWmGenModeRandom   = $('wm-gen-mode-random');
    elWmGenModeCustom   = $('wm-gen-mode-custom');
    elWmCustomIdFields  = $('wm-custom-identity-fields');
    elWmGenName         = $('wm-gen-name');
    elWmGenEmail        = $('wm-gen-email');
    elWmBtnQuickGen     = $('wm-btn-quick-gen');
    elWmBtnDownloadActive = $('wm-btn-download-active');
    elWmGenStatus       = $('wm-gen-status');

    elWmGpgAvail        = $('wm-gpg-avail');
    elWmGpgTotal        = $('wm-gpg-total');
    elWmGpgNext         = $('wm-gpg-next');
    elWmGpgSource       = $('wm-gpg-source');
    elPreviewKeyTag     = $('preview-key-tag');
    elPreviewVaultTag   = $('preview-vault-tag');
    elPreviewKeyText    = $('preview-key-text');

    elBtnSingleMint     = $('btn-single-mint');
    elWmMintResult      = $('wm-mint-result');
    elWmBtnExportKeys   = $('wm-btn-export-keys');
    elWmBtnDownloadVault= $('wm-btn-download-vault');

    elRpcUrl            = $('rpc-url');
    elTxDelay          = $('tx-delay');
    elBtnFetchGas      = $('btn-fetch-gas');
    elGrBase           = $('gr-base');
    elGrPriority       = $('gr-priority');
    elGrEstCost        = $('gr-est-cost');
    elGasStatus        = $('gas-status');

    elPkInput          = $('pk-input');
    elBtnClearPks      = $('btn-clear-pks');
    elWalletCount      = $('wallet-count');
    elGpgCount         = $('gpg-count');
    elGpgTotal         = $('wpg-total');
    elGpgSource        = $('gpg-source');
    elBtnGotoVaultGen  = $('btn-goto-vault-gen');
    elGpgDropZone      = $('gpg-drop-zone');
    elGpgFileInput     = $('gpg-file-input');
    elDropFilename     = $('drop-filename');
    elGpgPasteInput    = $('gpg-paste-input');

    elStatWallets      = $('stat-wallets');
    elStatGpg          = $('stat-gpg');
    elStatGas          = $('stat-gas');
    elStatProgress     = $('stat-progress');
    elStatSuccess      = $('stat-success');
    elStatFailed       = $('stat-failed');
    elProgressBar      = $('progress-bar');
    elBtnInitiate      = $('btn-initiate');
    elBtnAbort         = $('btn-abort');
    elAbortNotice      = $('abort-notice');
    elExecTbody        = $('exec-tbody');
    elBtnExportKeys    = $('btn-export-keys');
    elBtnExportCsv     = $('btn-export-csv');
    elBtnExportBulkVault = $('btn-export-bulk-vault');
    elBtnClearTable    = $('btn-clear-table');

    elGenCountGroup    = $('gen-count-group');
    elGenCount         = $('gen-count');
    elGenStyle         = $('gen-style');
    elGenTimeShuffle   = $('gen-time-shuffle');
    elGenCustomIdFields= $('gen-custom-identity-fields');
    elGenCustomRowsContainer = $('gen-custom-rows-container');
    elBtnAddCustomRow  = $('btn-add-custom-row');
    elGenCustomRowCountBadge = $('gen-custom-row-count-badge');
    elBtnRunGenerator  = $('btn-run-generator');
    elGenProgressBox   = $('gen-progress-box');
    elGenProgressLabel = $('gen-progress-label');
    elGenProgressNum   = $('gen-progress-num');
    elGenProgressBar   = $('gen-progress-bar');

    elVaultStatTotal   = $('vault-stat-total');
    elVaultStatTriads  = $('vault-stat-triads');
    elVaultStatUnused  = $('vault-stat-unused');
    elVaultStatMapped  = $('vault-stat-mapped');
    elVaultBadgeTotal  = $('vault-badge-total');
    elBtnMasterDownloadTxt  = $('btn-master-download-txt');
    elBtnMasterDownloadJson = $('btn-master-download-json');
    elBtnDownloadUnusedJson= $('btn-download-unused-json');
    elBtnImportVault   = $('btn-import-vault');
    elFileImportVault  = $('file-import-vault');
    elBtnClearVault    = $('btn-clear-vault');
    elVaultSearchInput = $('vault-search-input');
    elVaultFilteredCount = $('vault-filtered-count');
    elVaultKeysContainer = $('vault-keys-container');

    elAdmStatTotal     = $('adm-stat-total');
    elAdmStatWallet    = $('adm-stat-wallet');
    elAdmStatBulk      = $('adm-stat-bulk');
    elAdmStatPrivSaved = $('adm-stat-priv-saved');
    elAdmSearchInput   = $('adm-search-input');
    elAdmTbody         = $('adm-tbody');
    elAdmBtnExportJson = $('adm-btn-export-json');
    elAdmBtnExportCsv  = $('adm-btn-export-csv');
    elAdmBtnExportKeypack = $('adm-btn-export-keypack');
    elAdmBtnClear      = $('adm-btn-clear');

    elConsoleLog       = $('console-log');
    elBtnClearConsole  = $('btn-clear-console');

    elModalOverlay     = $('key-modal-overlay');
    elModalTitle       = $('modal-title');
    elModalClose       = $('modal-btn-close');
    elModalMetaGrid    = $('modal-meta-grid');
    elModalTabPub      = $('modal-tab-pub');
    elModalTabPriv     = $('modal-tab-priv');
    elModalTabRev      = $('modal-tab-rev');
    elModalContentText = $('modal-content-text');
    elModalBtnCopy     = $('modal-btn-copy');
    elModalBtnDownload = $('modal-btn-download');
    elModalBtnDownloadAll = $('modal-btn-download-all');
    elModalCopiedNotice= $('modal-copied-notice');
  }

  function attachListeners() {
    // Expose functions globally on window
    window.openKeyModal = openKeyModal;
    window.downloadKeyFile = downloadKeyFile;
    window.downloadSingleBundle = downloadSingleBundle;
    window.exportVaultTxt = exportVaultTxt;
    window.exportVaultJson = exportVaultJson;

    if (elModeBtnWallet) elModeBtnWallet.addEventListener('click', function() { window.switchMode('wallet'); });
    if (elModeBtnBulk)   elModeBtnBulk.addEventListener('click', function() { window.switchMode('bulk'); });
    if (elModeBtnVault)  elModeBtnVault.addEventListener('click', function() { window.switchMode('vault'); });
    if (elModeBtnAdmin)  elModeBtnAdmin.addEventListener('click', function() { window.switchMode('admin'); });

    // Option 1 Tab Switches
    if (elWmTabGenerate) elWmTabGenerate.addEventListener('click', function() {
      walletKeySource = 'generate';
      elWmTabGenerate.classList.add('active');
      elWmTabCustom.classList.remove('active');
      if (elWmTabPool) elWmTabPool.classList.remove('active');
      if (elWmGenerateCard) elWmGenerateCard.style.display = 'block';
      if (elWmCustomCard) elWmCustomCard.style.display = 'none';
      if (elWmPoolStatsRow) elWmPoolStatsRow.style.display = 'none';
      updateWalletModeUi();
    });

    if (elWmTabCustom) elWmTabCustom.addEventListener('click', function() {
      walletKeySource = 'custom';
      elWmTabGenerate.classList.remove('active');
      elWmTabCustom.classList.add('active');
      if (elWmTabPool) elWmTabPool.classList.remove('active');
      if (elWmGenerateCard) elWmGenerateCard.style.display = 'none';
      if (elWmCustomCard) elWmCustomCard.style.display = 'block';
      if (elWmPoolStatsRow) elWmPoolStatsRow.style.display = 'none';
      updateWalletModeUi();
    });

    if (elWmTabPool) elWmTabPool.addEventListener('click', function() {
      walletKeySource = 'pool';
      elWmTabGenerate.classList.remove('active');
      elWmTabCustom.classList.remove('active');
      elWmTabPool.classList.add('active');
      if (elWmGenerateCard) elWmGenerateCard.style.display = 'none';
      if (elWmCustomCard) elWmCustomCard.style.display = 'none';
      if (elWmPoolStatsRow) elWmPoolStatsRow.style.display = 'grid';
      updateGpgUi('In-Browser Cryptographic Vault');
      updateWalletModeUi();
    });

    // Option 1 Identity Mode Toggles
    if (elWmGenModeRandom) {
      elWmGenModeRandom.addEventListener('change', function() {
        if (elWmCustomIdFields) elWmCustomIdFields.style.display = 'none';
      });
    }
    if (elWmGenModeCustom) {
      elWmGenModeCustom.addEventListener('change', function() {
        if (elWmCustomIdFields) elWmCustomIdFields.style.display = 'grid';
      });
    }

    if (elWmBtnQuickGen) {
      elWmBtnQuickGen.addEventListener('click', function() {
        return runSingleWalletGenerator(true);
      });
    }

    if (elWmBtnDownloadActive) {
      elWmBtnDownloadActive.addEventListener('click', function() {
        if (quickGeneratedKey) {
          downloadSingleBundle(quickGeneratedKey.id);
        } else {
          alert('Please click "GENERATE NEW KEYPAIR NOW" first.');
        }
      });
    }

    if (elWmCustomTextarea) {
      elWmCustomTextarea.addEventListener('input', function() {
        if (walletKeySource === 'custom') {
          updateWalletModeUi();
        }
      });
    }

    if (elBtnConnect) elBtnConnect.addEventListener('click', connectBrowserWallet);
    if (elBtnDisconnect) elBtnDisconnect.addEventListener('click', disconnectBrowserWallet);
    if (elBtnSwitchNetwork) elBtnSwitchNetwork.addEventListener('click', switchWalletToMainnet);
    if (elBtnSingleMint) elBtnSingleMint.addEventListener('click', executeSingleMint);
    if (elWmBtnFetchGas) elWmBtnFetchGas.addEventListener('click', fetchWalletGas);
    if (elWmBtnExportKeys) elWmBtnExportKeys.addEventListener('click', exportVaultJson);
    if (elWmBtnDownloadVault) elWmBtnDownloadVault.addEventListener('click', exportVaultTxt);

    // Option 2 Buttons
    if (elBtnInitiate) elBtnInitiate.addEventListener('click', runBulkBatchSequence);
    if (elBtnAbort) elBtnAbort.addEventListener('click', function() { abortFlag = true; log('Emergency abort signal registered.', 'warn'); });
    if (elBtnFetchGas) elBtnFetchGas.addEventListener('click', fetchBulkGas);
    if (elBtnExportKeys) elBtnExportKeys.addEventListener('click', exportVaultJson);
    if (elBtnExportCsv) elBtnExportCsv.addEventListener('click', exportAdminCsv);
    if (elBtnExportBulkVault) elBtnExportBulkVault.addEventListener('click', exportVaultTxt);
    if (elBtnGotoVaultGen) elBtnGotoVaultGen.addEventListener('click', function() { window.switchMode('vault'); });
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

    // Option 3 Buttons & Inputs
    if (elGenStyle) {
      elGenStyle.addEventListener('change', function() {
        const isCustom = elGenStyle.value === 'custom';
        if (elGenCustomIdFields) {
          elGenCustomIdFields.style.display = isCustom ? 'block' : 'none';
        }
        if (elGenCountGroup) {
          elGenCountGroup.style.display = isCustom ? 'none' : 'block';
        }
        updateCustomRowsUi();
      });
    }

    if (elBtnAddCustomRow) {
      elBtnAddCustomRow.addEventListener('click', function() {
        addCustomIdentityRow();
      });
    }

    if (elGenCustomRowsContainer) {
      elGenCustomRowsContainer.addEventListener('click', function(e) {
        const removeBtn = e.target.closest('.btn-remove-row');
        if (removeBtn) {
          const row = removeBtn.closest('.custom-id-row');
          if (row && elGenCustomRowsContainer.querySelectorAll('.custom-id-row').length > 1) {
            row.remove();
            updateCustomRowsUi();
          }
        }
      });
      elGenCustomRowsContainer.addEventListener('input', function() {
        updateCustomRowsUi();
      });
    }

    if (elBtnRunGenerator) elBtnRunGenerator.addEventListener('click', runBatchGenerator);
    if (elBtnMasterDownloadTxt)  elBtnMasterDownloadTxt.addEventListener('click', exportVaultTxt);
    if (elBtnMasterDownloadJson) elBtnMasterDownloadJson.addEventListener('click', exportVaultJson);
    if (elBtnDownloadUnusedJson) elBtnDownloadUnusedJson.addEventListener('click', exportUnusedJson);
    if (elBtnClearVault) elBtnClearVault.addEventListener('click', function() {
      if (confirm('Clear all stored keys in vault?')) {
        keyVault = [];
        gpgKeyPool = [];
        quickGeneratedKey = null;
        persistVault();
        try { localStorage.removeItem(STORAGE_KEY_USED); } catch (_) {}
        updateGpgUi('Cleared');
        renderVaultUi();
        updateWalletModeUi();
        log('Key vault cleared by operator.', 'warn');
      }
    });
    if (elVaultSearchInput) elVaultSearchInput.addEventListener('input', renderVaultUi);

    // Event delegation on Vault grid for instant, zero-failure clicks
    if (elVaultKeysContainer) {
      elVaultKeysContainer.addEventListener('click', function(e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        const keyId = parseInt(btn.getAttribute('data-key-id'), 10);
        if (!keyId) return;
        if (btn.classList.contains('btn-inspect-key')) {
          openKeyModal(keyId);
        } else if (btn.classList.contains('btn-download-bundle')) {
          downloadSingleBundle(keyId);
        }
      });
    }

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

    // Option 2 GPG Drop Zone & Paste Handlers
    if (elGpgDropZone) {
      elGpgDropZone.addEventListener('click', function() { if (elGpgFileInput) elGpgFileInput.click(); });
      elGpgDropZone.addEventListener('dragover', function(e) { e.preventDefault(); elGpgDropZone.classList.add('drag-over'); });
      elGpgDropZone.addEventListener('dragleave', function() { elGpgDropZone.classList.remove('drag-over'); });
      elGpgDropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        elGpgDropZone.classList.remove('drag-over');
        const file = e.dataTransfer && e.dataTransfer.files[0];
        if (!file) return;
        if (elDropFilename) elDropFilename.textContent = file.name;
        const reader = new FileReader();
        reader.onload = function(evt) {
          const parsed = parseGpgJson(evt.target.result);
          if (parsed) loadGpgKeys(parsed, file.name);
        };
        reader.readAsText(file);
      });
    }

    if (elGpgFileInput) {
      elGpgFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (elDropFilename) elDropFilename.textContent = file.name;
        const reader = new FileReader();
        reader.onload = function(evt) {
          const parsed = parseGpgJson(evt.target.result);
          if (parsed) loadGpgKeys(parsed, file.name);
        };
        reader.readAsText(file);
      });
    }

    if (elGpgPasteInput) {
      elGpgPasteInput.addEventListener('input', function() {
        const val = elGpgPasteInput.value.trim();
        if (!val || val.length < 10) return;
        const parsed = parseGpgJson(val);
        if (parsed) {
          loadGpgKeys(parsed, 'Pasted JSON Array');
          elGpgPasteInput.value = '';
        }
      });
    }

    // Option 4 Buttons
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

    // Event delegation on Admin table
    if (elAdmTbody) {
      elAdmTbody.addEventListener('click', function(e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        const keyId = parseInt(btn.getAttribute('data-key-id'), 10);
        if (!keyId) return;
        if (btn.classList.contains('btn-inspect-key')) {
          openKeyModal(keyId);
        } else if (btn.classList.contains('btn-download-bundle')) {
          downloadSingleBundle(keyId);
        }
      });
    }

    // Event delegation on Bulk batch table
    if (elExecTbody) {
      elExecTbody.addEventListener('click', function(e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        const keyId = parseInt(btn.getAttribute('data-key-id'), 10);
        if (!keyId) return;
        if (btn.classList.contains('btn-inspect-key')) {
          openKeyModal(keyId);
        }
      });
    }

    // Modal Events
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
      if (selectedModalKey) window.downloadKeyFile(selectedModalKey.id, activeModalTab);
    });
    if (elModalBtnDownloadAll) elModalBtnDownloadAll.addEventListener('click', function() {
      if (selectedModalKey) window.downloadSingleBundle(selectedModalKey.id);
    });

    if (elBtnClearConsole) elBtnClearConsole.addEventListener('click', logClear);
  }

  function init() {
    bindElements();
    attachListeners();
    loadPersistedState();
    updateGpgUi('In-Browser Cryptographic Vault');
    updateWalletModeUi();
    fetchWalletGas();
    log('they · seen Autonomous Engine & Cryptographic Vault v4.3 initialized.', 'info');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
