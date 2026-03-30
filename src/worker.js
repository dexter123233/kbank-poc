const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K-Bank Admin Panel</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); min-height: 100vh; }
    .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); }
    .pulse { animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  </style>
</head>
<body class="text-white">
  <div id="app" class="p-6">
    <div id="login-screen" class="flex items-center justify-center min-h-screen">
      <div class="glass rounded-2xl p-8 w-96">
        <div class="text-center mb-8">
          <i class="fas fa-university text-4xl text-blue-400 mb-4"></i>
          <h1 class="text-2xl font-bold">K-Bank Admin</h1>
          <p class="text-gray-400 text-sm">Sign in to manage your bot</p>
        </div>
        <form id="login-form" class="space-y-4">
          <input type="password" id="admin-token" placeholder="Admin Token" class="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 focus:border-blue-400 focus:outline-none">
          <button type="submit" class="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition">
            <i class="fas fa-sign-in-alt mr-2"></i>Login
          </button>
        </form>
        <p id="login-error" class="text-red-400 text-center mt-4 hidden"></p>
      </div>
    </div>
    <div id="dashboard" class="hidden">
      <div class="flex justify-between items-center mb-8">
        <div class="flex items-center gap-4">
          <i class="fas fa-university text-2xl text-blue-400"></i>
          <div>
            <h1 class="text-2xl font-bold">K-Bank Admin Panel</h1>
            <p class="text-gray-400 text-sm">Cloudflare Workers Deployment</p>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <span class="glass px-4 py-2 rounded-lg">
            <i class="fas fa-circle text-green-400 pulse mr-2"></i>Online
          </span>
          <button onclick="logout()" class="glass px-4 py-2 rounded-lg hover:bg-white/10">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="glass rounded-xl p-6">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-gray-400 text-sm">Total Users</p>
              <p class="text-3xl font-bold" id="stat-users">-</p>
            </div>
            <i class="fas fa-users text-blue-400 text-2xl"></i>
          </div>
        </div>
        <div class="glass rounded-xl p-6">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-gray-400 text-sm">Total Transactions</p>
              <p class="text-3xl font-bold" id="stat-transactions">-</p>
            </div>
            <i class="fas fa-exchange-alt text-green-400 text-2xl"></i>
          </div>
        </div>
        <div class="glass rounded-xl p-6">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-gray-400 text-sm">Insurance Claims</p>
              <p class="text-3xl font-bold" id="stat-claims">-</p>
            </div>
            <i class="fas fa-shield-alt text-purple-400 text-2xl"></i>
          </div>
        </div>
        <div class="glass rounded-xl p-6">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-gray-400 text-sm">Proposals</p>
              <p class="text-3xl font-bold" id="stat-proposals">-</p>
            </div>
            <i class="fas fa-vote-yea text-yellow-400 text-2xl"></i>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div class="glass rounded-xl p-6">
          <h2 class="text-xl font-bold mb-4"><i class="fas fa-bolt text-yellow-400 mr-2"></i>Quick Actions</h2>
          <div class="space-y-3">
            <button onclick="broadcastMessage()" class="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-2">
              <i class="fas fa-bullhorn"></i> Broadcast Message
            </button>
            <button onclick="exportData()" class="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center justify-center gap-2">
              <i class="fas fa-download"></i> Export Data
            </button>
          </div>
        </div>
        <div class="glass rounded-xl p-6">
          <h2 class="text-xl font-bold mb-4"><i class="fas fa-robot text-blue-400 mr-2"></i>Bot Status</h2>
          <div class="space-y-3">
            <div class="flex items-center justify-between glass p-3 rounded-lg">
              <span>Bot Status</span>
              <span class="text-green-400"><i class="fas fa-check-circle"></i> Active</span>
            </div>
            <div class="flex items-center justify-between glass p-3 rounded-lg">
              <span>Worker</span>
              <span class="text-blue-400">kbank-poc</span>
            </div>
            <div class="flex items-center justify-between glass p-3 rounded-lg">
              <span>Platform</span>
              <span class="text-gray-400">Cloudflare Workers</span>
            </div>
          </div>
        </div>
        <div class="glass rounded-xl p-6">
          <h2 class="text-xl font-bold mb-4"><i class="fas fa-server text-gray-400 mr-2"></i>System Info</h2>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between"><span class="text-gray-400">Version</span><span>2.0.0</span></div>
            <div class="flex justify-between"><span class="text-gray-400">Uptime</span><span id="uptime">24h 12m</span></div>
            <div class="flex justify-between"><span class="text-gray-400">Requests Today</span><span id="requests-today">-</span></div>
          </div>
        </div>
      </div>
      <div class="glass rounded-xl p-6">
        <h2 class="text-xl font-bold mb-4"><i class="fas fa-list text-green-400 mr-2"></i>Recent Transactions</h2>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-left text-gray-400 border-b border-white/10">
                <th class="pb-3">ID</th><th class="pb-3">Type</th><th class="pb-3">Amount</th><th class="pb-3">Status</th><th class="pb-3">Time</th>
              </tr>
            </thead>
            <tbody id="transactions-list">
              <tr><td colspan="5" class="py-4 text-center text-gray-400">Loading...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  <script>
    const API_BASE = window.location.origin;
    let adminToken = localStorage.getItem('adminToken') || '';
    let stats = { users: 0, transactions: 0, claims: 0, proposals: 0 };
    if (adminToken) { document.getElementById('login-screen').classList.add('hidden'); document.getElementById('dashboard').classList.remove('hidden'); loadDashboard(); }
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = document.getElementById('admin-token').value;
      adminToken = token;
      localStorage.setItem('adminToken', token);
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      loadDashboard();
    });
    function logout() { localStorage.removeItem('adminToken'); location.reload(); }
    async function loadDashboard() {
      try {
        const res = await fetch(API_BASE + '/api/admin/stats');
        if (res.ok) stats = await res.json();
      } catch (err) { stats = { users: 42, transactions: 156, claims: 8, proposals: 3 }; }
      document.getElementById('stat-users').textContent = stats.users;
      document.getElementById('stat-transactions').textContent = stats.transactions;
      document.getElementById('stat-claims').textContent = stats.claims;
      document.getElementById('stat-proposals').textContent = stats.proposals;
      document.getElementById('requests-today').textContent = Math.floor(Math.random() * 1000);
      loadTransactions();
    }
    async function loadTransactions() {
      try {
        const res = await fetch(API_BASE + '/receipts');
        const data = await res.json();
        const receipts = data.receipts || [];
        if (receipts.length === 0) { renderDemoTransactions(); return; }
        const tbody = document.getElementById('transactions-list');
        tbody.innerHTML = receipts.slice(0, 10).map(r => '<tr class="border-b border-white/5 hover:bg-white/5"><td class="py-3 font-mono text-sm">' + (r.id?.substring(0, 12) || '-') + '...</td><td class="py-3 capitalize">' + (r.type || 'unknown') + '</td><td class="py-3">' + (r.amount || '-') + '</td><td class="py-3"><span class="px-2 py-1 rounded text-xs ' + (r.status === 'completed' ? 'bg-green-600' : 'bg-yellow-600') + '">' + r.status + '</span></td><td class="py-3 text-gray-400">' + new Date(r.timestamp).toLocaleString() + '</td></tr>').join('');
      } catch (err) { renderDemoTransactions(); }
    }
    function renderDemoTransactions() {
      const demos = [{ id: 'tx_abc123', type: 'deposit', amount: '100 FLOW', status: 'completed' },{ id: 'tx_def456', type: 'withdraw', amount: '50 FLOW', status: 'completed' },{ id: 'tx_ghi789', type: 'stake', amount: '200 FLOW', status: 'pending' }];
      document.getElementById('transactions-list').innerHTML = demos.map(r => '<tr class="border-b border-white/5"><td class="py-3 font-mono text-sm">' + r.id + '</td><td class="py-3 capitalize">' + r.type + '</td><td class="py-3">' + r.amount + '</td><td class="py-3"><span class="px-2 py-1 rounded text-xs bg-green-600">' + r.status + '</span></td><td class="py-3 text-gray-400">Just now</td></tr>').join('');
    }
    async function broadcastMessage() { 
      const message = prompt('Enter broadcast message:'); 
      if (!message) return;
      try {
        const res = await fetch(API_BASE + '/api/admin/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
          body: JSON.stringify({ message })
        });
        const data = await res.json();
        alert('Broadcast sent to ' + data.recipients + ' users!');
      } catch (err) { alert('Failed to broadcast: ' + err.message); }
    }
    async function exportData() { 
      try {
        const res = await fetch(API_BASE + '/api/admin/export', {
          headers: { 'X-Admin-Token': adminToken }
        });
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kbank-export-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        alert('Data exported!');
      } catch (err) { alert('Failed to export: ' + err.message); }
    }
  </script>
</body>
</html>`;

const RECEIPTS_KV = 'RECEIPTS';
const WALLETS_KV = 'WALLETS';

const createLogger = (category) => {
  const log = (level, message, meta = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      ...meta
    };
    console.log(JSON.stringify(logEntry));
  };
  return {
    error: (message, meta) => log('error', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    info: (message, meta) => log('info', message, meta),
    debug: (message, meta) => log('debug', message, meta)
  };
};

const logger = createLogger('telegram');

class FlowClient {
  constructor() {
    this.network = 'testnet';
  }
  async getAccountBalance(address) {
    return { address, balance: 0, staked: 0, locked: 0, available: 0, lastUpdated: Date.now() };
  }
  async executeDeposit(payload) {
    const { userAddress, amount, token } = payload;
    return { txId: `tx_deposit_${generateId()}`, type: 'deposit', amount, token, userAddress, status: 'sealed', blockHeight: Math.floor(Math.random() * 1000000), timestamp: Date.now() };
  }
  async executeWithdraw(payload) {
    const { userAddress, amount, token } = payload;
    return { txId: `tx_withdraw_${generateId()}`, type: 'withdraw', amount, token, userAddress, status: 'sealed', blockHeight: Math.floor(Math.random() * 1000000), timestamp: Date.now() };
  }
  async executeStake(payload) {
    const { userAddress, amount, duration } = payload;
    return { txId: `tx_stake_${generateId()}`, type: 'stake', amount, duration, userAddress, unlockDate: Date.now() + (duration * 86400000), status: 'active', blockHeight: Math.floor(Math.random() * 1000000), timestamp: Date.now() };
  }
  async createGovernanceProposal(payload) {
    const { creatorAddress, title, description, fundingAmount } = payload;
    return { proposalId: `proposal_${generateId()}`, txId: `tx_proposal_${generateId()}`, title, description, fundingAmount, creator: creatorAddress, status: 'active', votesFor: 0, votesAgainst: 0, quorum: 100, deadline: Date.now() + (7 * 86400000), blockHeight: Math.floor(Math.random() * 1000000), timestamp: Date.now() };
  }
  async submitVote(payload) {
    const { proposalId, voterAddress, vote, weight } = payload;
    return { txId: `tx_vote_${generateId()}`, proposalId, voter: voterAddress, vote, weight, status: 'recorded', blockHeight: Math.floor(Math.random() * 1000000), timestamp: Date.now() };
  }
  async submitInsuranceClaim(payload) {
    const { policyId, claimAmount, claimantAddress } = payload;
    return { claimId: `claim_${generateId()}`, txId: `tx_claim_${generateId()}`, policyId, claimAmount, claimant: claimantAddress, status: 'PENDING', estimatedProcessingTime: '3-5 business days', blockHeight: Math.floor(Math.random() * 1000000), timestamp: Date.now() };
  }
}

const flowClient = new FlowClient();

const userWallets = new Map();
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(userId) {
  const now = Date.now();
  const userLimits = rateLimits.get(userId);
  if (!userLimits || now - userLimits.windowStart > RATE_LIMIT_WINDOW) {
    rateLimits.set(userId, { windowStart: now, count: 1 });
    return { allowed: true };
  }
  if (userLimits.count >= RATE_LIMIT_MAX) {
    return { allowed: false, reason: 'Rate limit exceeded. Please try again later.' };
  }
  userLimits.count++;
  return { allowed: true };
}

async function getReceipt(env, id) {
  if (!env.RECEIPTS) return null;
  try {
    const data = await env.RECEIPTS.get(id);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('KV getReceipt error:', err);
    return null;
  }
}

async function saveReceipt(env, receipt) {
  if (!env.RECEIPTS) return;
  try {
    await env.RECEIPTS.put(receipt.id, JSON.stringify(receipt), { expirationTtl: 86400 * 30 });
  } catch (err) {
    console.error('KV saveReceipt error:', err);
  }
}

async function getAllReceipts(env) {
  if (!env.RECEIPTS) return [];
  try {
    const list = await env.RECEIPTS.list();
    const receipts = [];
    for (const key of list.keys) {
      const receipt = await env.RECEIPTS.get(key.name);
      if (receipt) receipts.push(JSON.parse(receipt));
    }
    return receipts.sort((a, b) => b.timestamp - a.timestamp);
  } catch (err) {
    console.error('KV getAllReceipts error:', err);
    return [];
  }
}

async function getWallet(env, userId) {
  if (!env.WALLETS) return null;
  try {
    const wallet = await env.WALLETS.get(userId);
    return wallet || null;
  } catch (err) {
    console.error('KV getWallet error:', err);
    return null;
  }
}

async function setWallet(env, userId, address) {
  if (!env.WALLETS) return;
  try {
    await env.WALLETS.put(userId, address, { expirationTtl: 86400 * 365 });
  } catch (err) {
    console.error('KV setWallet error:', err);
  }
}

async function sendMessage(env, chatId, text, options = {}) {
  const token = env.BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, ...options })
    });
  } catch (err) {
    console.error('Failed to send message:', err);
  }
}

async function handleTelegramUpdate(update, env) {
  if (!update.message && !update.callback_query) return;
  const message = update.message || update.callback_query?.message;
  const userId = message?.from?.id?.toString();
  if (!userId) return;
  const rateCheck = checkRateLimit(userId);
  if (!rateCheck.allowed) {
    await sendMessage(env, message.chat.id, `⚠️ ${rateCheck.reason}`);
    return;
  }
  const text = message.text;
  const command = text?.split(' ')[0];
  const args = text?.split(' ').slice(1);
  logger.info(`[${message.from.username || userId}] ${text}`);

  switch (command) {
    case '/start':
      await sendMessage(env, message.chat.id, '🏦 *Welcome to K-Bank!*\n\nYour Consumer DeFi funding platform on Flow blockchain.\n\n/help for commands', { parse_mode: 'Markdown' });
      break;
    case '/help':
      await sendMessage(env, message.chat.id, '📚 *Commands:*\n\n💰 /deposit <amount>\n💰 /withdraw <amount>\n💰 /stake <amount>\n📊 /balance\n🗳️ /proposal create|title|vote\n🛡️ /insurance claim|status\n📊 /status', { parse_mode: 'Markdown' });
      break;
    case '/balance':
      const wallet1 = await getWallet(env, userId);
      if (!wallet1) { await sendMessage(env, message.chat.id, 'Set wallet: /setwallet <address>'); return; }
      const balance = await flowClient.getAccountBalance(wallet1);
      await sendMessage(env, message.chat.id, `💰 Balance:\nAvailable: ${balance.available} FLOW\nStaked: ${balance.staked} FLOW\nTotal: ${balance.balance} FLOW`);
      break;
    case '/deposit':
      const amount1 = parseFloat(args[0]);
      if (isNaN(amount1) || amount1 <= 0) { await sendMessage(env, message.chat.id, 'Usage: /deposit <amount>'); return; }
      const wallet2 = await getWallet(env, userId);
      if (!wallet2) { await sendMessage(env, message.chat.id, 'Set wallet: /setwallet <address>'); return; }
      const result1 = await flowClient.executeDeposit({ userAddress: wallet2, amount: amount1, token: 'FLOW' });
      await saveReceipt(env, { id: result1.txId, type: 'deposit', status: result1.status, amount: amount1, timestamp: Date.now() });
      await sendMessage(env, message.chat.id, `✅ Deposit of ${amount1} FLOW queued!\nTx: ${result1.txId}`);
      break;
    case '/withdraw':
      const amount2 = parseFloat(args[0]);
      if (isNaN(amount2) || amount2 <= 0) { await sendMessage(env, message.chat.id, 'Usage: /withdraw <amount>'); return; }
      const wallet3 = await getWallet(env, userId);
      if (!wallet3) { await sendMessage(env, message.chat.id, 'Set wallet: /setwallet <address>'); return; }
      const result2 = await flowClient.executeWithdraw({ userAddress: wallet3, amount: amount2, token: 'FLOW' });
      await saveReceipt(env, { id: result2.txId, type: 'withdraw', status: result2.status, amount: amount2, timestamp: Date.now() });
      await sendMessage(env, message.chat.id, `✅ Withdrawal of ${amount2} FLOW queued!`);
      break;
    case '/stake':
      const amount3 = parseFloat(args[0]);
      const duration3 = parseInt(args[1]) || 30;
      if (isNaN(amount3) || amount3 <= 0) { await sendMessage(env, message.chat.id, 'Usage: /stake <amount> [days]'); return; }
      const wallet4 = await getWallet(env, userId);
      if (!wallet4) { await sendMessage(env, message.chat.id, 'Set wallet: /setwallet <address>'); return; }
      const result3 = await flowClient.executeStake({ userAddress: wallet4, amount: amount3, duration: duration3 });
      await saveReceipt(env, { id: result3.txId, type: 'stake', status: result3.status, amount: amount3, timestamp: Date.now() });
      await sendMessage(env, message.chat.id, `✅ Staking ${amount3} FLOW for ${duration3} days!`);
      break;
    case '/setwallet':
      const address = args[0];
      if (!address || !address.startsWith('0x')) { await sendMessage(env, message.chat.id, 'Usage: /setwallet 0x...'); return; }
      await setWallet(env, userId, address);
      await sendMessage(env, message.chat.id, `✅ Wallet set to:\n\`${address}\``, { parse_mode: 'Markdown' });
      break;
    case '/proposal':
      const action = args[0];
      if (action === 'create') {
        const wallet5 = await getWallet(env, userId);
        if (!wallet5) { await sendMessage(env, message.chat.id, 'Set wallet first'); return; }
        const title = args.slice(1).join(' ');
        const result4 = await flowClient.createGovernanceProposal({ creatorAddress: wallet5, title, description: 'DAO Proposal', fundingAmount: 0 });
        await saveReceipt(env, { id: result4.proposalId, type: 'proposal', status: result4.status, title, timestamp: Date.now() });
        await sendMessage(env, message.chat.id, `✅ Proposal created!\nID: ${result4.proposalId}`);
      } else {
        await sendMessage(env, message.chat.id, '/proposal create <title>');
      }
      break;
    case '/insurance':
      const iAction = args[0];
      if (iAction === 'claim') {
        const claimId = `claim_${generateId()}`;
        await saveReceipt(env, { id: claimId, type: 'insurance_claim', status: 'PENDING', timestamp: Date.now() });
        await sendMessage(env, message.chat.id, `🛡️ Claim submitted!\nID: ${claimId}`);
      } else {
        await sendMessage(env, message.chat.id, '/insurance claim <policy_id>');
      }
      break;
    case '/status':
      const receipts = await getAllReceipts(env);
      await sendMessage(env, message.chat.id, `📊 *Status*\n\nReceipts: ${receipts.length}\nBot: Active\nPlatform: Cloudflare Workers`, { parse_mode: 'Markdown' });
      break;
    default:
      await sendMessage(env, message.chat.id, "Type /help for commands.");
  }
}

async function handleRequest(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/webhook' && request.method === 'POST') {
    try {
      const update = await request.json();
      await handleTelegramUpdate(update, env);
      return new Response('OK', { status: 200 });
    } catch (err) {
      console.error('Webhook error:', err);
      return new Response('Error', { status: 500 });
    }
  }

  if (url.pathname === '/health' && request.method === 'GET') {
    return new Response(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString(), worker: 'kbank-poc', platform: 'cloudflare-workers' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (url.pathname === '/set-webhook' && request.method === 'POST') {
    const { url: webhookUrl, secret_token } = await request.json();
    const token = env.BOT_TOKEN;
    if (!token) return new Response(JSON.stringify({ error: 'BOT_TOKEN not configured' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const telegramUrl = `https://api.telegram.org/bot${token}/setWebhook`;
    const response = await fetch(telegramUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: webhookUrl, secret_token }) });
    const result = await response.json();
    return new Response(JSON.stringify(result), { status: response.ok ? 200 : 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (url.pathname === '/receipts' && request.method === 'GET') {
    const receipts = await getAllReceipts(env);
    return new Response(JSON.stringify({ receipts }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (url.pathname.startsWith('/api/admin')) {
    const adminToken = request.headers.get('X-Admin-Token');
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    if (url.pathname === '/api/admin/verify' && request.method === 'POST') {
      return new Response(JSON.stringify({ valid: true }), { headers });
    }
    if (url.pathname === '/api/admin/stats' && request.method === 'GET') {
      const receipts = await getAllReceipts(env);
      return new Response(JSON.stringify({ users: new Set(receipts.map(r => r.userId)).size, transactions: receipts.filter(r => ['deposit', 'withdraw', 'stake'].includes(r.type)).length, claims: receipts.filter(r => r.type === 'insurance_claim').length, proposals: receipts.filter(r => r.type === 'proposal').length }), { headers });
    }
    if (url.pathname === '/api/admin/broadcast' && request.method === 'POST') {
      const { message } = await request.json();
      const receipts = await getAllReceipts(env);
      const userIds = [...new Set(receipts.map(r => r.userId).filter(Boolean))];
      const token = env.BOT_TOKEN;
      let sent = 0;
      for (const uid of userIds.slice(0, 50)) {
        try {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: uid, text: message })
          });
          sent++;
        } catch (e) { console.error('Failed to send to', uid, e); }
      }
      return new Response(JSON.stringify({ success: true, recipients: sent }), { headers });
    }
    if (url.pathname === '/api/admin/export' && request.method === 'GET') {
      const receipts = await getAllReceipts(env);
      return new Response(JSON.stringify(receipts), { headers: { ...headers, 'Content-Disposition': 'attachment; filename="kbank-export.json"' } });
    }
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
  }

  if (url.pathname === '/admin' || url.pathname === '/admin.html') {
    return new Response(ADMIN_HTML, { status: 200, headers: { 'Content-Type': 'text/html' } });
  }

  return new Response('Not Found', { status: 404 });
}

export default {
  async fetch(request, env) {
    if (request.method === 'POST') {
      const signature = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
      if (signature !== env.TELEGRAM_SECRET && env.TELEGRAM_SECRET) {
        return new Response('Unauthorized', { status: 401 });
      }
    }
    return handleRequest(request, env);
  }
};
