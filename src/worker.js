const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

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
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
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
