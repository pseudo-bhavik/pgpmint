/**
 * app.js — Batch Mint Engine v3.2 (Wallet Native Picker + Auto Min Gas Burner Engine)
 * 100% Client-Side · Ethereum Mainnet (Chain ID: 1)
 * Target Contract: 0x3286e6525A38cD1d277ECaF435b156c0cc892C29
 * Target Method: Function #9 seen(string pgp) [Selector: 0x363355d2]
 */

const ethers = window.ethers;

// ── CONSTANTS & SECURITY BOUNDARIES ───────────────────────────────────────────
const CONTRACT_ADDRESS      = '0x3286e6525A38cD1d277ECaF435b156c0cc892C29';
const CONTRACT_ABI          = ['function seen(string pgp) public'];
const TARGET_FUNCTION_NAME  = 'seen';
const TARGET_SELECTOR       = '0x363355d2';
const CHAIN_ID              = 1n;
const DEFAULT_RPC           = 'https://ethereum-rpc.publicnode.com';

// Minimum Safe Gas Settings for Autonomous Burner Wallets (Ethereum Mainnet)
const MIN_SAFE_PRIORITY_GWEI = '0.05'; // 0.05 Gwei lowest safe miner tip for Mainnet
const DEFAULT_GAS_LIMIT      = 80000n; // Safe upper bound for seen(string pgp)

// ── STATE VARIABLES (TRANSIENT IN-MEMORY ONLY) ─────────────────────────────────
let gpgKeyPool       = [];
let runLog           = [];
let abortFlag        = false;
let isBatchRunning   = false;
let activeMode       = 'wallet';

let browserProvider  = null;
let connectedSigner  = null;
let connectedAddress = null;

// ── DOM SELECTORS ─────────────────────────────────────────────────────────────
const $ = function(id) { return document.getElementById(id); };

// Mode switch
const elModeBtnWallet     = $('mode-btn-wallet');
const elModeBtnBulk       = $('mode-btn-bulk');
const elModeDescText      = $('mode-desc-text');
const elWalletWrap        = $('wallet-mode-wrap');
const elBulkWrap          = $('bulk-mode-wrap');

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

const elWmGpgAvail        = $('wm-gpg-avail');
const elWmGpgTotal        = $('wm-gpg-total');
const elWmGpgNext         = $('wm-gpg-next');
const elWmGpgSource       = $('wm-gpg-source');
const elPreviewKeyTag     = $('preview-key-tag');
const elPreviewKeyText    = $('preview-key-text');

const elWmDropZone        = $('wm-drop-zone');
const elWmFileInput       = $('wm-file-input');
const elWmDropFilename    = $('wm-drop-filename');

const elBtnSingleMint     = $('btn-single-mint');
const elWmMintResult      = $('wm-mint-result');

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

// Shared / Export Elements
const elBtnExportKeys    = $('btn-export-keys');
const elBtnExportCsv     = $('btn-export-csv');
const elBtnClearTable   = $('btn-clear-table');
const elConsoleLog       = $('console-log');

// ── UTILITIES & SECURITY HELPERS ──────────────────────────────────────────────
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
  // Redact any potential 64-char hex strings (private keys / raw calldata)
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

// ── MODE SWITCHING ────────────────────────────────────────────────────────────
function switchMode(mode) {
  activeMode = mode;
  const isWallet = mode === 'wallet';

  elModeBtnWallet.classList.toggle('active', isWallet);
  elModeBtnBulk.classList.toggle('active', !isWallet);

  elWalletWrap.style.display = isWallet ? 'block' : 'none';
  elBulkWrap.style.display   = isWallet ? 'none'  : 'block';

  elModeDescText.textContent = isWallet
    ? 'Interactive single mint via MetaMask / Browser Wallet (native gas selector)'
    : 'Automated sequential batch loop over burner private keys (autonomous min gas mode)';

  log('Switched to ' + (isWallet ? 'OPTION 1 (Wallet Connect)' : 'OPTION 2 (Bulk Mint)') + ' mode.', 'info');

  if (isWallet) {
    fetchWalletGas();
  } else {
    fetchBulkGas();
  }
}

// ── GPG KEY POOL MANAGEMENT ───────────────────────────────────────────────────
function parseGpgJson(raw) {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(data)) throw new Error('Root element must be a JSON array.');
    data.forEach(function(entry, idx) {
      if (entry.id === undefined) throw new Error('Entry ' + idx + ' is missing id property.');
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
  gpgKeyPool = keys.map(function(curr) {
    return {
      id: curr.id,
      armoredKey: curr.armoredKey,
      used: !!curr.used,
      inProgress: false,
      name: curr.name || '',
      email: curr.email || ''
    };
  });

  updateGpgUi(sourceName);
  const unused = getUnusedGpgKeys().length;
  log('Loaded ' + gpgKeyPool.length + ' GPG keys from ' + sourceName + ' (' + unused + ' unused).', 'success');
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

  if (next) {
    elPreviewKeyTag.textContent = 'KEY #' + next.id + (next.email ? ' (' + next.email + ')' : '');
    elPreviewKeyText.textContent = next.armoredKey;
    if (connectedSigner) elBtnSingleMint.disabled = false;
  } else {
    elPreviewKeyTag.textContent = 'NO UNUSED KEYS';
    elPreviewKeyText.textContent = total > 0 ? '[ All loaded GPG keys have been marked used. ]' : '[ No keys loaded. ]';
    elBtnSingleMint.disabled = true;
  }

  if (elGpgCount)  elGpgCount.textContent = unused;
  if (elGpgTotal)  elGpgTotal.textContent = total;
  if (elStatGpg)   elStatGpg.textContent  = unused;
  if (elGpgSource && sourceName) elGpgSource.textContent = sourceName;
}

async function autoLoadKeys() {
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
    log('keys.json note: ' + err.message + '. Ready for custom drop.', 'warn');
    if (elWmGpgSource) elWmGpgSource.textContent = 'Not found (Drop keys.json)';
    if (elGpgSource) elGpgSource.textContent = 'Not found (Drop keys.json)';
    updateGpgUi();
  }
}

// ── GAS FEE CALCULATION ───────────────────────────────────────────────────────
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
      log('Live Base Fee: ' + baseGwei + ' Gwei (MetaMask will prompt its native fee picker on submit)', 'info');
    } else {
      if (elGrBase) elGrBase.textContent = baseGwei;
      if (elGrPriority) elGrPriority.textContent = prioGwei;
      if (elGasStatus) elGasStatus.textContent = 'Live (Updated ' + new Date().toLocaleTimeString() + ')';
      if (elStatGas) elStatGas.textContent = baseGwei;

      // Estimate total ETH cost per mint (e.g. ~60,000 gas * (base + 0.05))
      const totalGweiPerTx = (parseFloat(baseGwei) + parseFloat(prioGwei));
      const estEthPerTx = (65000 * totalGweiPerTx / 1e9).toFixed(6);
      if (elGrEstCost) elGrEstCost.textContent = '~' + estEthPerTx + ' ETH';

      log('Burner Auto Min Gas: Base = ' + baseGwei + ' Gwei | Miner Tip = ' + prioGwei + ' Gwei | Est: ' + estEthPerTx + ' ETH/tx', 'success');
    }
  } catch (err) {
    const statusEl = isWalletMode ? elWmGasStatus : elGasStatus;
    if (statusEl) statusEl.textContent = 'Fetch failed';
    log('Gas fetch note: ' + err.message, 'warn');
  }
}

async function fetchWalletGas() {
  if (!browserProvider) {
    const fallbackProvider = new ethers.JsonRpcProvider(DEFAULT_RPC, 1);
    await fetchGasFromProvider(fallbackProvider, true);
    return;
  }
  await fetchGasFromProvider(browserProvider, true);
}

async function fetchBulkGas() {
  const url = (elRpcUrl.value || DEFAULT_RPC).trim();
  if (elGasStatus) elGasStatus.textContent = 'Fetching...';
  try {
    const provider = new ethers.JsonRpcProvider(url, 1);
    await fetchGasFromProvider(provider, false);
  } catch (err) {
    if (elGasStatus) elGasStatus.textContent = 'Failed';
    log('RPC gas fetch error: ' + err.message, 'error');
  }
}

/**
 * Autonomous minimum gas calculator for Burner Private Keys (Option 2).
 * Strictly targets lowest safe gas:
 * - Miner Priority Tip: 0.05 Gwei
 * - maxFeePerGas: baseFee + 10% buffer + 0.05 Gwei tip (EVM refunds unused base fee)
 * - gasLimit: dynamic simulation + 10% margin (fallback: 80,000)
 */
async function buildBurnerGasOverrides(provider, contractInstance, keyPayload) {
  let gasLimit = DEFAULT_GAS_LIMIT;
  if (contractInstance && keyPayload) {
    try {
      const estimated = await contractInstance.seen.estimateGas(keyPayload);
      gasLimit = (estimated * 110n) / 100n; // 10% safety buffer
    } catch {
      gasLimit = DEFAULT_GAS_LIMIT;
    }
  }

  const feeData = await provider.getFeeData();
  const minPrioFee = ethers.parseUnits(MIN_SAFE_PRIORITY_GWEI, 'gwei');

  if (feeData.maxFeePerGas) {
    const baseFee = feeData.maxFeePerGas;
    const maxFeeWithBuffer = (baseFee * 110n) / 100n + minPrioFee;
    return {
      gasLimit: gasLimit,
      maxFeePerGas: maxFeeWithBuffer,
      maxPriorityFeePerGas: minPrioFee
    };
  }

  return {
    gasLimit: gasLimit,
    gasPrice: feeData.gasPrice || ethers.parseUnits('15', 'gwei')
  };
}

// ── WALLET CONNECT (OPTION 1) ─────────────────────────────────────────────────
async function connectWallet() {
  if (!window.ethereum) {
    log('No injected Web3 wallet found. Please install MetaMask or Rabby.', 'error');
    alert('No Web3 wallet detected. Please install MetaMask, Rabby, or another browser wallet.');
    return;
  }

  try {
    log('Requesting wallet connection...', 'info');
    browserProvider = new ethers.BrowserProvider(window.ethereum);
    await browserProvider.send('eth_requestAccounts', []);

    const network = await browserProvider.getNetwork();
    log('Connected to network: ' + network.name + ' (Chain ID ' + network.chainId + ')', 'info');

    if (network.chainId !== CHAIN_ID) {
      log('SECURITY WARNING: Wallet is NOT on Ethereum Mainnet (Chain ID 1). Transactions blocked.', 'warn');
      elBtnSwitchNetwork.style.display = 'inline-block';
      elBtnSingleMint.disabled = true;
    } else {
      elBtnSwitchNetwork.style.display = 'none';
    }

    connectedSigner  = await browserProvider.getSigner();
    connectedAddress = await connectedSigner.getAddress();
    const balanceWei = await browserProvider.getBalance(connectedAddress);
    const balanceEth = parseFloat(ethers.formatEther(balanceWei)).toFixed(5);

    elWcAddress.textContent = connectedAddress;
    elWcBalance.textContent = balanceEth + ' ETH';
    elWcNetwork.textContent = network.chainId === 1n ? 'Ethereum Mainnet (1)' : ('Chain ID ' + network.chainId + ' [WRONG CHAIN]');

    elWcInfo.style.display = 'grid';
    elBtnConnect.style.display = 'none';
    elBtnDisconnect.style.display = 'inline-block';

    if (getNextUnusedKey() && network.chainId === CHAIN_ID) {
      elBtnSingleMint.disabled = false;
    }

    log('Wallet connected: ' + connectedAddress + ' (Balance: ' + balanceEth + ' ETH)', 'success');
    await fetchWalletGas();

    window.ethereum.on('accountsChanged', function(accs) {
      if (!accs.length) disconnectWallet();
      else connectWallet();
    });
    window.ethereum.on('chainChanged', function() { connectWallet(); });

  } catch (err) {
    log('Wallet connection failed: ' + sanitizeError(err), 'error');
  }
}

function disconnectWallet() {
  connectedSigner  = null;
  connectedAddress = null;
  browserProvider  = null;

  elWcInfo.style.display = 'none';
  elBtnConnect.style.display = 'inline-block';
  elBtnDisconnect.style.display = 'none';
  elBtnSwitchNetwork.style.display = 'none';
  elBtnSingleMint.disabled = true;

  log('Wallet disconnected.', 'info');
}

async function switchToMainnet() {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x1' }]
    });
    elBtnSwitchNetwork.style.display = 'none';
    await connectWallet();
  } catch (switchError) {
    log('Failed to switch chain: ' + sanitizeError(switchError), 'error');
  }
}

async function executeSingleMint() {
  if (!connectedSigner || !browserProvider) {
    log('No wallet connected.', 'error');
    return;
  }

  const network = await browserProvider.getNetwork();
  if (network.chainId !== CHAIN_ID) {
    log('SECURITY HALT: Chain ID is not Ethereum Mainnet (1). Switch network first.', 'error');
    alert('Please switch to Ethereum Mainnet before minting.');
    return;
  }

  const gpgKey = getNextUnusedKey();
  if (!gpgKey) {
    log('No unused GPG key available in pool.', 'error');
    alert('No unused GPG keys available. Please add keys to keys.json.');
    return;
  }

  // Lock key during processing
  gpgKey.inProgress = true;
  elBtnSingleMint.disabled = true;
  elWmMintResult.className = 'mint-result-box pending';
  elWmMintResult.style.display = 'block';
  elWmMintResult.innerHTML = '<div>&squf; Submitting transaction for GPG Key #' + gpgKey.id + '... Please choose your preferred gas fees (e.g. Low) in your wallet popup.</div>';

  log('Initiating transaction with GPG Key #' + gpgKey.id + ' via Function #9 seen(string pgp)...', 'info');

  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, connectedSigner);

    // MANUAL WALLET CONNECT MODE: We do not pass fee overrides so MetaMask / Rabby
    // displays its native gas selection UI (Low / Market / Custom) directly to the user.
    const tx = await contract[TARGET_FUNCTION_NAME](gpgKey.armoredKey);
    log('Transaction broadcast: ' + tx.hash, 'tx');

    const cleanHash = escapeHtml(tx.hash);
    elWmMintResult.innerHTML = '<div>&squf; Transaction broadcast!<br>Waiting for confirmation...<br><a href="https://etherscan.io/tx/' + cleanHash + '" target="_blank" rel="noopener noreferrer" style="color:var(--blue);">View on Etherscan: ' + cleanHash + ' &nearr;</a></div>';

    const receipt = await tx.wait(1);

    // SECURITY CHECK: Verify transaction status === 1 (Success)
    if (!receipt || receipt.status !== 1) {
      throw new Error('Transaction was included on-chain but reverted (status 0).');
    }

    gpgKey.used = true;
    gpgKey.inProgress = false;
    updateGpgUi();

    const blockNum = receipt.blockNumber;
    const gasUsed  = receipt.gasUsed.toString();

    elWmMintResult.className = 'mint-result-box success';
    elWmMintResult.innerHTML = '<div><strong>&check; MINT SUCCESSFUL!</strong><br>Block: #' + blockNum + ' · Gas Used: ' + gasUsed + '<br><a href="https://etherscan.io/tx/' + cleanHash + '" target="_blank" rel="noopener noreferrer" style="color:var(--green);">Etherscan TX: ' + cleanHash + ' &nearr;</a><br>GPG Key #' + gpgKey.id + ' marked USED. Next key in queue staged!</div>';

    log('Transaction confirmed in block #' + blockNum + ' (Gas Used: ' + gasUsed + ')', 'success');

    const balWei = await browserProvider.getBalance(connectedAddress);
    elWcBalance.textContent = parseFloat(ethers.formatEther(balWei)).toFixed(5) + ' ETH';

  } catch (err) {
    gpgKey.inProgress = false;
    const safeErrMsg = sanitizeError(err);
    elWmMintResult.className = 'mint-result-box error';
    elWmMintResult.innerHTML = '<div><strong>&cross; TRANSACTION FAILED</strong><br>' + safeErrMsg + '</div>';
    log('Mint failed: ' + safeErrMsg, 'error');
  } finally {
    if (getNextUnusedKey() && connectedSigner) {
      elBtnSingleMint.disabled = false;
    }
  }
}

// ── BULK BURNER WALLET ENGINE (OPTION 2) ──────────────────────────────────────
function parsePrivateKeys() {
  return (elPkInput.value || '')
    .split('\n')
    .map(function(line) { return line.trim(); })
    .filter(function(line) { return line.startsWith('0x') && line.length >= 64; });
}

function updateWalletCount() {
  const pks = parsePrivateKeys();
  elWalletCount.textContent = pks.length;
  elStatWallets.textContent = pks.length;
}

function truncateStr(s, max) {
  max = max || 16;
  if (!s || s.length <= max) return s || '-';
  const half = Math.floor((max - 3) / 2);
  return s.substring(0, half) + '...' + s.substring(s.length - half);
}

function initTableRow(idx, addr) {
  const placeholder = elExecTbody.querySelector('.empty-row');
  if (placeholder && placeholder.parentElement) placeholder.parentElement.remove();

  const tr = document.createElement('tr');
  tr.id = 'row-' + idx;
  tr.innerHTML =
    '<td>' + (idx + 1) + '</td>' +
    '<td title="' + escapeHtml(addr) + '">' + escapeHtml(truncateStr(addr, 18)) + '</td>' +
    '<td id="row-' + idx + '-bal">-</td>' +
    '<td id="row-' + idx + '-gpg">-</td>' +
    '<td id="row-' + idx + '-tx">-</td>' +
    '<td id="row-' + idx + '-blk">-</td>' +
    '<td id="row-' + idx + '-gas">&mdash;</td>' +
    '<td id="row-' + idx + '-st"><span class="status-badge queued">QUEUED</span></td>';
  elExecTbody.appendChild(tr);
}

function updateTableRow(idx, status, meta) {
  meta = meta || {};
  const stCell = $('row-' + idx + '-st');
  if (stCell) {
    stCell.innerHTML = '<span class="status-badge ' + escapeHtml(status) + '">' + escapeHtml(status.toUpperCase()) + '</span>';
  }
  if (meta.bal !== undefined) {
    const el = $('row-' + idx + '-bal');
    if (el) el.textContent = meta.bal;
  }
  if (meta.gpgId !== undefined) {
    const el = $('row-' + idx + '-gpg');
    if (el) el.textContent = '#' + meta.gpgId;
  }
  if (meta.tx !== undefined) {
    const el = $('row-' + idx + '-tx');
    if (el) {
      if (meta.tx === '-') {
        el.textContent = '-';
      } else {
        const cleanTx = escapeHtml(meta.tx);
        el.innerHTML = '<a href="https://etherscan.io/tx/' + cleanTx + '" target="_blank" rel="noopener noreferrer" style="color:var(--blue);">' + escapeHtml(truncateStr(meta.tx, 14)) + '</a>';
      }
    }
  }
  if (meta.blk !== undefined) {
    const el = $('row-' + idx + '-blk');
    if (el) el.textContent = meta.blk === '-' ? '-' : ('#' + meta.blk);
  }
  if (meta.gas !== undefined) {
    const el = $('row-' + idx + '-gas');
    if (el) el.textContent = meta.gas;
  }
}

let batchStats = { done: 0, total: 0, success: 0, failed: 0 };

function resetBatchStats(total) {
  batchStats = { done: 0, total: total, success: 0, failed: 0 };
  elStatProgress.textContent = '0 / ' + total;
  elStatSuccess.textContent  = '0';
  elStatFailed.textContent   = '0';
  elProgressBar.style.width  = '0%';
}

function advanceBatchProgress(isSuccess) {
  batchStats.done++;
  if (isSuccess) batchStats.success++;
  else batchStats.failed++;

  elStatProgress.textContent = batchStats.done + ' / ' + batchStats.total;
  elStatSuccess.textContent  = batchStats.success;
  elStatFailed.textContent   = batchStats.failed;
  elProgressBar.style.width  = Math.round((batchStats.done / batchStats.total) * 100) + '%';
}

function sleep(ms) {
  return new Promise(function(res) { setTimeout(res, ms); });
}

async function processWalletItem(params) {
  let pk = params.pk;
  const idx = params.idx;
  const provider = params.provider;
  const minBalWei = params.minBalWei;

  let wallet = null;
  let gpgKey = null;

  try {
    wallet = new ethers.Wallet(pk, provider);
    const addr = wallet.address;

    log('[' + (idx + 1) + '] Processing burner wallet: ' + addr, 'info');
    initTableRow(idx, addr);

    const balWei = await provider.getBalance(addr);
    const balEth = parseFloat(ethers.formatEther(balWei)).toFixed(5);
    updateTableRow(idx, 'queued', { bal: balEth + ' ETH' });

    if (balWei < minBalWei) {
      log('[' + (idx + 1) + '] INSUFFICIENT ETH (' + balEth + ' ETH < ' + ethers.formatEther(minBalWei) + ' required) — Skipping.', 'warn');
      updateTableRow(idx, 'skipped');
      runLog.push({ idx: idx + 1, addr: addr, bal: balEth, gpgId: '-', tx: '-', blk: '-', gas: '-', status: 'SKIPPED', error: 'INSUFFICIENT_FUNDS' });
      return false;
    }

    gpgKey = getNextUnusedKey();
    if (!gpgKey) {
      log('[' + (idx + 1) + '] NO GPG KEY AVAILABLE IN POOL — Skipping.', 'error');
      updateTableRow(idx, 'skipped');
      runLog.push({ idx: idx + 1, addr: addr, bal: balEth, gpgId: '-', tx: '-', blk: '-', gas: '-', status: 'SKIPPED', error: 'NO_GPG_KEY' });
      return false;
    }

    gpgKey.inProgress = true;
    updateTableRow(idx, 'pending', { gpgId: gpgKey.id });
    log('[' + (idx + 1) + '] Assigned GPG Key #' + gpgKey.id + '. Broadcasting via Function #9 at minimum safe cost...', 'info');

    const contract  = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
    const overrides = await buildBurnerGasOverrides(provider, contract, gpgKey.armoredKey);

    let tx;
    try {
      tx = await contract[TARGET_FUNCTION_NAME](gpgKey.armoredKey, overrides);
    } catch (sendErr) {
      gpgKey.inProgress = false;
      const safeErr = sanitizeError(sendErr);
      log('[' + (idx + 1) + '] Send failed: ' + safeErr, 'error');
      updateTableRow(idx, 'failed');
      runLog.push({ idx: idx + 1, addr: addr, bal: balEth, gpgId: gpgKey.id, tx: '-', blk: '-', gas: '-', status: 'FAILED', error: safeErr.substring(0, 100) });
      return false;
    }

    updateTableRow(idx, 'pending', { tx: tx.hash });
    log('[' + (idx + 1) + '] Broadcast: ' + tx.hash + '. Waiting for confirmation...', 'tx');

    let receipt;
    try {
      receipt = await tx.wait(1);
      if (!receipt || receipt.status !== 1) {
        throw new Error('Transaction reverted on-chain (status 0).');
      }
    } catch (waitErr) {
      gpgKey.inProgress = false;
      const safeErr = sanitizeError(waitErr);
      log('[' + (idx + 1) + '] Transaction reverted: ' + safeErr, 'error');
      updateTableRow(idx, 'failed', { tx: tx.hash });
      runLog.push({ idx: idx + 1, addr: addr, bal: balEth, gpgId: gpgKey.id, tx: tx.hash, blk: '-', gas: '-', status: 'FAILED', error: safeErr.substring(0, 100) });
      return false;
    }

    gpgKey.used = true;
    gpgKey.inProgress = false;
    updateGpgUi();

    const blk = receipt.blockNumber;
    const gas = receipt.gasUsed.toString();

    updateTableRow(idx, 'success', { tx: tx.hash, blk: blk, gas: gas });
    log('[' + (idx + 1) + '] CONFIRMED block #' + blk + ' (Gas Used: ' + gas + ')', 'success');

    runLog.push({ idx: idx + 1, addr: addr, bal: balEth, gpgId: gpgKey.id, tx: tx.hash, blk: blk, gas: gas, status: 'SUCCESS', error: '' });
    return true;

  } catch (err) {
    if (gpgKey) gpgKey.inProgress = false;
    const safeErr = sanitizeError(err);
    log('[' + (idx + 1) + '] Error: ' + safeErr, 'error');
    updateTableRow(idx, 'failed');
    return false;
  } finally {
    // SECURITY: Nullify private key and wallet reference immediately
    wallet = null;
    pk = null;
  }
}

async function runAutonomousBatch() {
  if (isBatchRunning) return;

  logClear();
  log('=============== BATCH INITIATION SEQUENCE ================', 'info');

  const rpcUrl = (elRpcUrl.value || DEFAULT_RPC).trim();
  const pks = parsePrivateKeys();

  if (pks.length === 0) {
    log('Validation failed: No valid 0x private keys entered.', 'error');
    alert('Please enter at least one valid 0x-prefixed private key.');
    return;
  }

  const unusedCount = getUnusedGpgKeys().length;
  if (unusedCount === 0) {
    log('Validation failed: No unused GPG keys loaded in pool.', 'error');
    alert('No unused GPG keys in pool. Please load keys.json.');
    return;
  }

  if (unusedCount < pks.length) {
    log('WARNING: ' + pks.length + ' private keys loaded, but only ' + unusedCount + ' GPG keys available in pool.', 'warn');
  }

  log('Target Method: Function #9 seen(string pgp) [0x363355d2] · Contract: ' + CONTRACT_ADDRESS, 'info');

  let provider;
  try {
    provider = new ethers.JsonRpcProvider(rpcUrl, 1);
    const net = await provider.getNetwork();
    if (net.chainId !== CHAIN_ID) {
      log('SECURITY HALT: Chain ID mismatch! Expected 1 (Mainnet), got ' + net.chainId + '. Halting.', 'error');
      alert('RPC endpoint is not connected to Ethereum Mainnet (Chain ID 1).');
      return;
    }
    log('Connected to Ethereum Mainnet via ' + rpcUrl, 'success');
  } catch (err) {
    log('RPC Connection failed: ' + sanitizeError(err), 'error');
    return;
  }

  let minBalWei;
  try {
    const overrides = await buildBurnerGasOverrides(provider, null, null);
    const gasPrice = overrides.maxFeePerGas || overrides.gasPrice || ethers.parseUnits('15', 'gwei');
    minBalWei = overrides.gasLimit * gasPrice;
    log('Estimated minimum balance required per burner: ' + ethers.formatEther(minBalWei) + ' ETH', 'info');
  } catch (e) {
    minBalWei = ethers.parseEther('0.0008');
    log('Gas estimation fallback: 0.0008 ETH', 'warn');
  }

  isBatchRunning = true;
  abortFlag = false;
  runLog = [];
  elExecTbody.innerHTML = '';
  elBtnInitiate.disabled = true;
  elBtnAbort.disabled = false;
  elAbortNotice.style.display = 'none';
  resetBatchStats(pks.length);

  const delayMs = parseInt(elTxDelay.value, 10) || 2000;
  log('Batch started: ' + pks.length + ' wallets · ' + unusedCount + ' available GPG keys · ' + delayMs + 'ms delay · Min gas mode active', 'info');
  log('-----------------------------------------------------------', 'info');

  for (let i = 0; i < pks.length; i++) {
    if (abortFlag) {
      log('EMERGENCY STOP TRIGGERED: Batch execution stopped by operator.', 'error');
      break;
    }

    const isSuccess = await processWalletItem({
      pk: pks[i],
      idx: i,
      provider: provider,
      minBalWei: minBalWei
    });

    advanceBatchProgress(isSuccess);

    if (i < pks.length - 1 && !abortFlag) {
      log('Waiting ' + delayMs + 'ms before next wallet...', 'info');
      await sleep(delayMs);
    }
  }

  log('-----------------------------------------------------------', 'info');
  log('Batch Complete: ' + batchStats.success + ' Succeeded | ' + batchStats.failed + ' Failed/Skipped | ' + batchStats.total + ' Total', 'success');

  isBatchRunning = false;
  elBtnInitiate.disabled = false;
  elBtnAbort.disabled = true;
  elAbortNotice.style.display = 'none';
  provider = null;
}

// ── EXPORT & FILE HELPERS ─────────────────────────────────────────────────────
function downloadBlob(filename, data, mimeType) {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

function exportUpdatedKeysJson() {
  if (!gpgKeyPool.length) {
    log('No GPG keys in pool to export.', 'warn');
    return;
  }
  const cleanPool = gpgKeyPool.map(function(k) {
    return {
      id: k.id,
      name: k.name || '',
      email: k.email || '',
      armoredKey: k.armoredKey,
      used: !!k.used
    };
  });
  const jsonStr = JSON.stringify(cleanPool, null, 2);
  downloadBlob('keys.json', jsonStr, 'application/json');
  log('Exported updated keys.json with updated used flags for Git commit.', 'success');
}

function exportRunLogCsv() {
  if (!runLog.length) {
    log('No run log entries to export.', 'warn');
    return;
  }
  const headers = ['Index', 'Wallet Address', 'Balance (ETH)', 'GPG Key ID', 'TX Hash', 'Block', 'Gas Used', 'Status', 'Error'];
  const rows = runLog.map(function(r) {
    return [
      r.idx,
      r.addr,
      r.bal,
      r.gpgId,
      r.tx,
      r.blk,
      r.gas,
      r.status,
      '"' + (r.error || '').replace(/"/g, '""') + '"'
    ].join(',');
  });
  downloadBlob('mint_run_log_' + Date.now() + '.csv', [headers.join(','), ...rows].join('\r\n'), 'text/csv');
  log('Exported run log as CSV.', 'success');
}

function handleGpgFile(file, nameEl) {
  if (nameEl) nameEl.textContent = file.name;
  const reader = new FileReader();
  reader.onload = function(e) {
    const parsed = parseGpgJson(e.target.result);
    if (parsed) {
      loadGpgKeys(parsed, file.name);
      if (elGpgPasteInput) elGpgPasteInput.value = '';
    }
  };
  reader.readAsText(file);
}

function attachDropZone(zoneEl, inputEl, nameEl) {
  if (!zoneEl || !inputEl) return;
  zoneEl.addEventListener('click', function() { inputEl.click(); });
  zoneEl.addEventListener('dragover', function(e) { e.preventDefault(); zoneEl.classList.add('drag-over'); });
  zoneEl.addEventListener('dragleave', function() { zoneEl.classList.remove('drag-over'); });
  zoneEl.addEventListener('drop', function(e) {
    e.preventDefault();
    zoneEl.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleGpgFile(e.dataTransfer.files[0], nameEl);
  });
  inputEl.addEventListener('change', function() {
    if (inputEl.files[0]) handleGpgFile(inputEl.files[0], nameEl);
  });
}

// ── EVENT BINDINGS ────────────────────────────────────────────────────────────
elModeBtnWallet.addEventListener('click', function() { switchMode('wallet'); });
elModeBtnBulk.addEventListener('click',   function() { switchMode('bulk'); });

elBtnConnect.addEventListener('click', connectWallet);
elBtnDisconnect.addEventListener('click', disconnectWallet);
elBtnSwitchNetwork.addEventListener('click', switchToMainnet);

if (elWmBtnFetchGas) elWmBtnFetchGas.addEventListener('click', fetchWalletGas);
if (elBtnFetchGas) elBtnFetchGas.addEventListener('click', fetchBulkGas);
if (elRpcUrl) elRpcUrl.addEventListener('change', fetchBulkGas);

elBtnSingleMint.addEventListener('click', executeSingleMint);

elPkInput.addEventListener('input', updateWalletCount);
if (elBtnClearPks) {
  elBtnClearPks.addEventListener('click', function() {
    elPkInput.value = '';
    updateWalletCount();
    log('Private keys input cleared from memory.', 'info');
  });
}

attachDropZone(elWmDropZone, elWmFileInput, elWmDropFilename);
attachDropZone(elGpgDropZone, elGpgFileInput, elDropFilename);

elGpgPasteInput.addEventListener('input', function() {
  const val = elGpgPasteInput.value.trim();
  if (!val) return;
  const parsed = parseGpgJson(val);
  if (parsed) loadGpgKeys(parsed, 'Pasted JSON');
});

elBtnInitiate.addEventListener('click', runAutonomousBatch);
elBtnAbort.addEventListener('click', function() {
  if (!isBatchRunning) return;
  abortFlag = true;
  elAbortNotice.style.display = 'block';
  log('Emergency abort requested by operator.', 'warn');
});

elBtnExportKeys.addEventListener('click', exportUpdatedKeysJson);
elBtnExportCsv.addEventListener('click', exportRunLogCsv);
elBtnClearTable.addEventListener('click', function() {
  elExecTbody.innerHTML = '<tr><td colspan="8" class="empty-row">- No transactions yet -</td></tr>';
  runLog = [];
  log('Transaction table cleared.', 'info');
});

// ── INITIALIZATION ────────────────────────────────────────────────────────────
async function init() {
  log('BATCH MINT DASHBOARD INITIALIZED', 'success');
  log('Contract: ' + CONTRACT_ADDRESS + ' · Ethereum Mainnet (Chain ID 1)', 'info');
  log('Target Method: Function #9 seen(string pgp) [0x363355d2] (Locked)', 'info');

  updateWalletCount();
  await fetchWalletGas();
  await autoLoadKeys();

  log('System ready. Choose Option 1 (Wallet Connect) or Option 2 (Bulk Mint).', 'info');
}

init();
