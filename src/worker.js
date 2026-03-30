const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

const PANTONE_THEMES = {
  spring: { name: 'Spring Lavender', primary: '#E6E6FA', secondary: '#B57EDC', accent: '#77DD77', emoji: '🌸' },
  summer: { name: 'Summer Mosaic', primary: '#FFE5B4', secondary: '#FF7F50', accent: '#20B2AA', emoji: '☀️' },
  fall: { name: 'Autumn Embers', primary: '#DEB887', secondary: '#CD5C5C', accent: '#DAA520', emoji: '🍂' },
  winter: { name: 'Winter Frost', primary: '#E0FFFF', secondary: '#87CEEB', accent: '#4682B4', emoji: '❄️' },
  modern: { name: 'Modern Classic', primary: '#2C3E50', secondary: '#3498DB', accent: '#E74C3C', emoji: '🎯' },
  vibrant: { name: 'Vibrant Pop', primary: '#FF006E', secondary: '#8338EC', accent: '#3A86FF', emoji: '🎨' }
};

const SUBSCRIPTION_PLATFORMS = {
  meta: { name: 'Meta', icon: '📘', color: '#1877F2', desc: 'Facebook/Instagram' },
  google: { name: 'Google Play', icon: '📱', color: '#4285F4', desc: 'Android Subscriptions' },
  youtube: { name: 'YouTube', icon: '▶️', color: '#FF0000', desc: 'Channel Memberships' },
  patreon: { name: 'Patreon', icon: '🎨', color: '#FF424D', desc: 'Creator Memberships' },
  stripe: { name: 'Stripe', icon: '💳', color: '#635BFF', desc: 'Custom Subscriptions' },
  gumroad: { name: 'Gumroad', icon: '🛒', color: '#8F1C1C', desc: 'Digital Products' },
  payhip: { name: 'Payhip', icon: '💰', color: '#3FAD5C', desc: 'Courses & Products' },
  lemon: { name: 'Lemon Squeezy', icon: '🍋', color: '#FFAB00', desc: 'Software Subscriptions' }
};

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K-Bank Admin</title>
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
          <p class="text-gray-400 text-sm">v2.1 - Enhanced UI</p>
        </div>
        <form id="login-form" class="space-y-4">
          <input type="password" id="admin-token" placeholder="Admin Token" class="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 focus:border-blue-400 focus:outline-none">
          <button type="submit" class="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition">
            <i class="fas fa-sign-in-alt mr-2"></i>Login
          </button>
        </form>
      </div>
    </div>
    <div id="dashboard" class="hidden">
      <div class="flex justify-between items-center mb-8">
        <div class="flex items-center gap-4">
          <i class="fas fa-university text-2xl text-blue-400"></i>
          <div>
            <h1 class="text-2xl font-bold">K-Bank Admin</h1>
            <p class="text-gray-400 text-sm">Cloudflare Workers v2.1</p>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <span class="glass px-4 py-2 rounded-lg"><i class="fas fa-circle text-green-400 pulse mr-2"></i>Online</span>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="glass rounded-xl p-6"><p class="text-gray-400 text-sm">Users</p><p class="text-3xl font-bold" id="stat-users">-</p></div>
        <div class="glass rounded-xl p-6"><p class="text-gray-400 text-sm">Transactions</p><p class="text-3xl font-bold" id="stat-tx">-</p></div>
        <div class="glass rounded-xl p-6"><p class="text-gray-400 text-sm">Subscriptions</p><p class="text-3xl font-bold" id="stat-subs">-</p></div>
        <div class="glass rounded-xl p-6"><p class="text-gray-400 text-sm">Claims</p><p class="text-3xl font-bold" id="stat-claims">-</p></div>
      </div>
      <div class="glass rounded-xl p-6">
        <h2 class="text-xl font-bold mb-4"><i class="fas fa-list text-green-400 mr-2"></i>Recent Transactions</h2>
        <table class="w-full"><thead><tr class="text-left text-gray-400 border-b border-white/10"><th class="pb-3">ID</th><th class="pb-3">Type</th><th class="pb-3">Status</th></tr></thead>
        <tbody id="tx-list"><tr><td colspan="3" class="py-4 text-center text-gray-400">Loading...</td></tr></tbody></table>
      </div>
    </div>
  </div>
  <script>
    const API_BASE = window.location.origin;
    let adminToken = localStorage.getItem('adminToken') || '';
    if (adminToken) { document.getElementById('login-screen').classList.add('hidden'); document.getElementById('dashboard').classList.remove('hidden'); loadStats(); }
    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      adminToken = document.getElementById('admin-token').value;
      localStorage.setItem('adminToken', adminToken);
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      loadStats();
    });
    async function loadStats() {
      try {
        const res = await fetch(API_BASE + '/api/admin/stats');
        if (res.ok) {
          const s = await res.json();
          document.getElementById('stat-users').textContent = s.users || 0;
          document.getElementById('stat-tx').textContent = s.transactions || 0;
          document.getElementById('stat-subs').textContent = s.subs || 0;
          document.getElementById('stat-claims').textContent = s.claims || 0;
        }
      } catch(e) {}
    }
  </script>
</body>
</html>`;

const rateLimits = new Map();
const subscriptions = new Map();
const userWallets = new Map();
const userStates = new Map();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 10;

function getCurrentTheme() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

function getUserTheme(userId) {
  if (userThemes.has(userId)) return userThemes.get(userId);
  return getCurrentTheme();
}

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
  } catch (err) { return null; }
}

async function saveReceipt(env, receipt) {
  if (!env.RECEIPTS) return;
  try {
    await env.RECEIPTS.put(receipt.id, JSON.stringify(receipt), { expirationTtl: 86400 * 30 });
  } catch (err) { console.error('KV saveReceipt error:', err); }
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
  } catch (err) { return []; }
}

async function getWallet(env, userId) {
  if (userWallets.has(userId)) return userWallets.get(userId);
  if (!env.WALLETS) return null;
  try {
    const wallet = await env.WALLETS.get(userId);
    return wallet || null;
  } catch (err) { return null; }
}

async function setWallet(env, userId, address) {
  userWallets.set(userId, address);
  if (!env.WALLETS) return;
  try {
    await env.WALLETS.put(userId, address, { expirationTtl: 86400 * 365 });
  } catch (err) { console.error('KV setWallet error:', err); }
}

async function getSubscriptions(env, userId) {
  return subscriptions.get(userId) || {};
}

async function setSubscriptions(env, userId, subs) {
  subscriptions.set(userId, subs);
}

async function sendMessage(env, chatId, text, options = {}) {
  const token = env.BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: options.parse_mode || 'Markdown', reply_markup: options.reply_markup ? JSON.stringify(options.reply_markup) : undefined })
    });
  } catch (err) { console.error('Failed to send message:', err); }
}

async function editMessage(env, chatId, messageId, text, options = {}) {
  const token = env.BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: options.parse_mode || 'Markdown', reply_markup: options.reply_markup ? JSON.stringify(options.reply_markup) : undefined })
    });
  } catch (err) { console.error('Failed to edit message:', err); }
}

function createBackKeyboard(mainMenu = false) {
  if (mainMenu) {
    return {
      inline_keyboard: [
        [{ text: '🔙 Back to Menu', callback_data: 'main_menu' }]
      ]
    };
  }
  return {
    inline_keyboard: [
      [{ text: '🔙 Back', callback_data: 'back' }]
    ]
  };
}

function createMainKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '💰 Wallet', callback_data: 'nav_wallet' }, { text: '📊 Dashboard', callback_data: 'nav_dashboard' }],
      [{ text: '📱 Subscriptions', callback_data: 'nav_subs' }, { text: '🎨 Theme', callback_data: 'nav_theme' }],
      [{ text: '📥 Deposit', callback_data: 'nav_deposit' }, { text: '📤 Withdraw', callback_data: 'nav_withdraw' }],
      [{ text: '🔒 Stake', callback_data: 'nav_stake' }, { text: '📜 Receipts', callback_data: 'nav_receipts' }],
      [{ text: '❓ Help', callback_data: 'nav_help' }]
    ]
  };
}

function createWalletKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '💳 Set Wallet', callback_data: 'wallet_set' }],
      [{ text: '💰 Check Balance', callback_data: 'wallet_balance' }],
      [{ text: '🔙 Back to Menu', callback_data: 'main_menu' }]
    ]
  };
}

function createThemeKeyboard() {
  const rows = [];
  for (let i = 0; i < PANTONE_THEMES.length; i += 2) {
    const entries = Object.entries(PANTONE_THEMES);
    const row = [];
    if (entries[i]) row.push({ text: `${entries[i][1].emoji} ${entries[i][1].name}`, callback_data: `theme_${entries[i][0]}` });
    if (entries[i + 1]) row.push({ text: `${entries[i + 1][1].emoji} ${entries[i + 1][1].name}`, callback_data: `theme_${entries[i + 1][0]}` });
    rows.push(row);
  }
  rows.push([{ text: '🔙 Back', callback_data: 'back' }]);
  return { inline_keyboard: rows };
}

function createSubscriptionPlatformsKeyboard() {
  const rows = [];
  const entries = Object.entries(SUBSCRIPTION_PLATFORMS);
  for (let i = 0; i < entries.length; i += 2) {
    const row = [];
    if (entries[i]) row.push({ text: `${entries[i][1].icon} ${entries[i][1].name}`, callback_data: `sub_platform_${entries[i][0]}` });
    if (entries[i + 1]) row.push({ text: `${entries[i + 1][1].icon} ${entries[i + 1][1].name}`, callback_data: `sub_platform_${entries[i + 1][0]}` });
    rows.push(row);
  }
  rows.push([{ text: '📊 My Revenue', callback_data: 'sub_revenue' }]);
  rows.push([{ text: '🔙 Back', callback_data: 'back' }]);
  return { inline_keyboard: rows };
}

function createConnectedSubsKeyboard(userSubs) {
  const rows = [];
  Object.keys(userSubs).forEach(key => {
    const p = SUBSCRIPTION_PLATFORMS[key] || { name: key, icon: '📱' };
    rows.push([{ text: `${p.icon} ${p.name} - $${userSubs[key].totalRevenue || 0}`, callback_data: `sub_detail_${key}` }]);
  });
  rows.push([{ text: '➕ Add Platform', callback_data: 'sub_add' }]);
  rows.push([{ text: '🔙 Back to Menu', callback_data: 'main_menu' }]);
  return { inline_keyboard: rows };
}

async function handleCallbackQuery(env, callbackQuery) {
  const userId = callbackQuery.from.id.toString();
  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;
  const data = callbackQuery.data;

  if (!chatId) return;

  const currentState = userStates.get(userId) || 'main';

  if (data === 'back') {
    if (currentState === 'wallet') {
      userStates.set(userId, 'main');
      await editMessage(env, chatId, messageId, '🏦 *K-Bank*\n\nYour Consumer DeFi Funding Platform\n\nSelect an option:', { reply_markup: createMainKeyboard() });
      return;
    } else if (currentState === 'theme') {
      userStates.set(userId, 'main');
      await editMessage(env, chatId, messageId, '🏦 *K-Bank*\n\nYour Consumer DeFi Funding Platform\n\nSelect an option:', { reply_markup: createMainKeyboard() });
      return;
    } else if (currentState === 'subs' || currentState === 'subs_detail' || currentState === 'sub_platform') {
      userStates.set(userId, 'main');
      await editMessage(env, chatId, messageId, '🏦 *K-Bank*\n\nYour Consumer DeFi Funding Platform\n\nSelect an option:', { reply_markup: createMainKeyboard() });
      return;
    }
    userStates.set(userId, 'main');
    await editMessage(env, chatId, messageId, '🏦 *K-Bank*\n\nYour Consumer DeFi Funding Platform\n\nSelect an option:', { reply_markup: createMainKeyboard() });
    return;
  }

  if (data === 'main_menu') {
    userStates.set(userId, 'main');
    const theme = PANTONE_THEMES[getUserTheme(userId)];
    await editMessage(env, chatId, messageId, `🏦 *K-Bank*\n\n📱 Theme: *${theme.name}*\n\nYour Consumer DeFi Funding Platform\n\nSelect an option:`, { reply_markup: createMainKeyboard() });
    return;
  }

  if (data === 'nav_wallet') {
    userStates.set(userId, 'wallet');
    await editMessage(env, chatId, messageId, '💰 *Wallet Management*\n\nChoose an action:', { reply_markup: createWalletKeyboard() });
    return;
  }

  if (data === 'nav_dashboard') {
    const wallet = await getWallet(env, userId);
    const subs = await getSubscriptions(env, userId);
    const receipts = await getAllReceipts(env);
    let totalRevenue = 0;
    Object.values(subs).forEach(s => { totalRevenue += parseFloat(s.totalRevenue || 0); });
    const theme = PANTONE_THEMES[getUserTheme(userId)];
    await editMessage(env, chatId, messageId, 
      `📊 *Dashboard*\n\n` +
      `🎨 Theme: ${theme.name}\n\n` +
      `💰 Wallet: ${wallet ? wallet.slice(0, 12) + '...' : 'Not set'}\n` +
      `💵 Revenue: $${totalRevenue.toFixed(2)}\n` +
      `📱 Platforms: ${Object.keys(subs).length}\n` +
      `📜 Transactions: ${receipts.length}`,
      { reply_markup: createMainKeyboard() }
    );
    return;
  }

  if (data === 'nav_subs') {
    userStates.set(userId, 'subs');
    const subs = await getSubscriptions(env, userId);
    if (Object.keys(subs).length === 0) {
      await editMessage(env, chatId, messageId, 
        '📱 *Subscriptions*\n\n' +
        'No platforms connected yet.\n\n' +
        'Connect a platform to start collecting payments:',
        { reply_markup: createSubscriptionPlatformsKeyboard() }
      );
    } else {
      await editMessage(env, chatId, messageId, 
        '📱 *Your Subscriptions*\n\n' +
        `${Object.keys(subs).length} platform(s) connected\n\n` +
        'Select a platform to manage:',
        { reply_markup: createConnectedSubsKeyboard(subs) }
      );
    }
    return;
  }

  if (data === 'nav_theme') {
    userStates.set(userId, 'theme');
    const theme = PANTONE_THEMES[getUserTheme(userId)];
    await editMessage(env, chatId, messageId, 
      `🎨 *Theme Selection*\n\n` +
      `Current: *${theme.name}*\n\n` +
      'Choose a new theme:',
      { reply_markup: createThemeKeyboard() }
    );
    return;
  }

  if (data === 'nav_deposit') {
    userStates.set(userId, 'deposit');
    const wallet = await getWallet(env, userId);
    if (!wallet) {
      await editMessage(env, chatId, messageId, 
        '⚠️ *No Wallet Set*\n\n' +
        'Please set your wallet first:\n\n' +
        '💰 /setwallet 0xYourAddress',
        { reply_markup: createBackKeyboard() }
      );
      return;
    }
    await editMessage(env, chatId, messageId, 
      '📥 *Deposit*\n\n' +
      `Wallet: \`${wallet.slice(0, 8)}...${wallet.slice(-4)}\`\n\n` +
      'Enter amount:\n\n' +
      '💡 Example: /deposit 100',
      { reply_markup: createBackKeyboard() }
    );
    return;
  }

  if (data === 'nav_withdraw') {
    userStates.set(userId, 'withdraw');
    const wallet = await getWallet(env, userId);
    if (!wallet) {
      await editMessage(env, chatId, messageId, 
        '⚠️ *No Wallet Set*\n\n' +
        'Please set your wallet first:\n\n' +
        '💰 /setwallet 0xYourAddress',
        { reply_markup: createBackKeyboard() }
      );
      return;
    }
    await editMessage(env, chatId, messageId, 
      '📤 *Withdraw*\n\n' +
      `Wallet: \`${wallet.slice(0, 8)}...${wallet.slice(-4)}\`\n\n` +
      'Enter amount:\n\n' +
      '💡 Example: /withdraw 50',
      { reply_markup: createBackKeyboard() }
    );
    return;
  }

  if (data === 'nav_stake') {
    userStates.set(userId, 'stake');
    await editMessage(env, chatId, messageId, 
      '🔒 *Stake FLOW*\n\n' +
      'Lock your FLOW tokens to earn rewards.\n\n' +
      'Usage: /stake <amount> [days]\n\n' +
      '💡 Example: /stake 100 30\n\n' +
      'Minimum: 10 FLOW\nLock period: 30-365 days',
      { reply_markup: createBackKeyboard() }
    );
    return;
  }

  if (data === 'nav_receipts') {
    const receipts = await getAllReceipts(env);
    const userReceipts = receipts.filter(r => r.userId === userId).slice(-10).reverse();
    let text = '📜 *Recent Transactions*\n\n';
    if (userReceipts.length === 0) {
      text += 'No transactions yet.';
    } else {
      userReceipts.forEach(r => {
        const emoji = r.type === 'deposit' ? '📥' : r.type === 'withdraw' ? '📤' : r.type === 'stake' ? '🔒' : '📋';
        text += `${emoji} ${r.type}: ${r.amount || '-'} (${r.status})\n`;
      });
    }
    await editMessage(env, chatId, messageId, text, { reply_markup: createMainKeyboard() });
    return;
  }

  if (data === 'nav_help') {
    await editMessage(env, chatId, messageId, 
      '❓ *Help*\n\n' +
      '💰 *Wallet*\n' +
      '• Set wallet: /setwallet <address>\n' +
      '• Check balance: /balance\n' +
      '• Deposit: /deposit <amount>\n' +
      '• Withdraw: /withdraw <amount>\n' +
      '• Stake: /stake <amount> [days]\n\n' +
      '📱 *Subscriptions*\n' +
      '• Connect: /connect <platform>\n' +
      '• View: /subscriptions\n' +
      '• Revenue: /revenue\n\n' +
      '🎨 *Theme*\n' +
      '• /theme <name>',
      { reply_markup: createMainKeyboard() }
    );
    return;
  }

  if (data === 'wallet_set') {
    await editMessage(env, chatId, messageId, 
      '💳 *Set Wallet Address*\n\n' +
      'Send your Flow wallet address:\n\n' +
      '💡 Example:\n/setwallet 0x1234567890abcdef',
      { reply_markup: createWalletKeyboard() }
    );
    return;
  }

  if (data === 'wallet_balance') {
    const wallet = await getWallet(env, userId);
    if (!wallet) {
      await editMessage(env, chatId, messageId, 
        '⚠️ *No Wallet Set*\n\n' +
        'Please set your wallet first.',
        { reply_markup: createWalletKeyboard() }
      );
      return;
    }
    const balance = await flowClient.getAccountBalance(wallet);
    await editMessage(env, chatId, messageId, 
      `💰 *Your Balance*\n\n` +
      `\`${wallet.slice(0, 8)}...${wallet.slice(-4)}\`\n\n` +
      `💵 Available: ${balance.available || 0} FLOW\n` +
      `🔒 Staked: ${balance.staked || 0} FLOW\n` +
      `📦 Locked: ${balance.locked || 0} FLOW\n\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `Total: *${balance.balance || 0} FLOW*`,
      { reply_markup: createWalletKeyboard() }
    );
    return;
  }

  if (data === 'sub_add' || data === 'sub_platform') {
    userStates.set(userId, 'sub_platform');
    await editMessage(env, chatId, messageId, 
      '➕ *Connect Platform*\n\n' +
      'Select a platform to connect:',
      { reply_markup: createSubscriptionPlatformsKeyboard() }
    );
    return;
  }

  if (data === 'sub_revenue') {
    const subs = await getSubscriptions(env, userId);
    let totalRev = 0;
    let breakdown = '━━━━━━━━━━━━━━━━\n';
    Object.entries(subs).forEach(([key, config]) => {
      const rev = parseFloat(config.totalRevenue || 0);
      totalRev += rev;
      const p = SUBSCRIPTION_PLATFORMS[key] || { name: key, icon: '📱' };
      breakdown += `${p.icon} ${p.name}: $${rev.toFixed(2)}\n`;
    });
    await editMessage(env, chatId, messageId, 
      '💰 *Revenue Summary*\n\n' +
      `Total: *$${totalRev.toFixed(2)}*\n\n` +
      breakdown +
      '━━━━━━━━━━━━━━━━',
      { reply_markup: createSubscriptionPlatformsKeyboard() }
    );
    return;
  }

  if (data.startsWith('sub_detail_')) {
    const platform = data.replace('sub_detail_', '');
    const p = SUBSCRIPTION_PLATFORMS[platform] || { name: platform, icon: '📱', desc: '' };
    const detailSubs = await getSubscriptions(env, userId);
    const config = detailSubs[platform] || {};
    userStates.set(userId, 'subs_detail');
    await editMessage(env, chatId, messageId, 
      `${p.icon} *${p.name}*\n\n` +
      `📝 ${p.desc}\n\n` +
      `Status: ${config.active ? '✅ Active' : '⏸️ Inactive'}\n` +
      `Revenue: $${config.totalRevenue || 0}\n` +
      `Subscribers: ${config.subscriberCount || 0}\n\n` +
      `━━━━━━━━━━━━━━━━\n\n` +
      `💡 To disconnect:\n/disconnect ${platform}`,
      { reply_markup: { inline_keyboard: [[{ text: '🔙 Back', callback_data: 'nav_subs' }]] }}
    );
    return;
  }

  if (data.startsWith('sub_platform_')) {
    const platform = data.replace('sub_platform_', '');
    const p = SUBSCRIPTION_PLATFORMS[platform] || { name: platform, icon: '📱' };
    await editMessage(env, chatId, messageId, 
      `🔗 *Connect ${p.name}*\n\n` +
      `Send your credentials:\n\n` +
      `💡 /connect ${platform} <credentials>\n\n` +
      `Example:\n/connect ${platform} api_key_here`,
      { reply_markup: { inline_keyboard: [[{ text: '🔙 Back', callback_data: 'nav_subs' }]] }}
    );
    return;
  }

  if (data.startsWith('theme_')) {
    const themeKey = data.replace('theme_', '');
    const theme = PANTONE_THEMES[themeKey];
    if (theme) {
      userThemes.set(userId, themeKey);
      await editMessage(env, chatId, messageId, 
        `✅ *Theme Updated*\n\n` +
        `Now using: *${theme.emoji} ${theme.name}*\n\n` +
        `Primary: ${theme.primary}\n` +
        `Secondary: ${theme.secondary}\n` +
        `Accent: ${theme.accent}`,
        { reply_markup: createMainKeyboard() }
      );
    }
    return;
  }
}

class FlowClient {
  constructor() { this.network = 'testnet'; }
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
}

const flowClient = new FlowClient();

async function handleTelegramUpdate(update, env) {
  if (update.callback_query) {
    await handleCallbackQuery(env, update.callback_query);
    return;
  }

  if (!update.message) return;
  const message = update.message;
  const userId = message.from?.id?.toString();
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

  const theme = PANTONE_THEMES[getUserTheme(userId)];

  switch (command) {
    case '/start':
      userStates.set(userId, 'main');
      await sendMessage(env, message.chat.id, 
        `🏦 *K-Bank*\n\n${theme.emoji} Theme: *${theme.name}*\n\n` +
        `Your Consumer DeFi Funding Platform\n\n` +
        `Select an option below:`,
        { reply_markup: createMainKeyboard() }
      );
      break;

    case '/help':
      await sendMessage(env, message.chat.id, 
        '❓ *Help Menu*\n\n' +
        '💰 *Wallet Commands*\n' +
        '/setwallet <address> - Set Flow wallet\n' +
        '/balance - Check balance\n' +
        '/deposit <amount> - Deposit\n' +
        '/withdraw <amount> - Withdraw\n' +
        '/stake <amount> [days] - Stake\n\n' +
        '📱 *Subscription Commands*\n' +
        '/connect <platform> - Connect platform\n' +
        '/subscriptions - View platforms\n' +
        '/revenue - View earnings\n' +
        '/disconnect <platform> - Remove\n\n' +
        '🎨 *Theme*\n' +
        '/theme - List themes\n' +
        '/theme <name> - Set theme\n\n' +
        'Or tap buttons on the menu!',
        { reply_markup: createMainKeyboard() }
      );
      break;

    case '/theme':
      if (args[0] && PANTONE_THEMES[args[0].toLowerCase()]) {
        userThemes.set(userId, args[0].toLowerCase());
        const t = PANTONE_THEMES[args[0].toLowerCase()];
        await sendMessage(env, message.chat.id, 
          `✅ *Theme Updated*\n\nNow using: *${t.emoji} ${t.name}*`,
          { reply_markup: createMainKeyboard() }
        );
      } else {
        let themeList = '🎨 *Available Themes*\n\n';
        Object.entries(PANTONE_THEMES).forEach(([key, t]) => {
          themeList += `${t.emoji} ${t.name} - \`/theme ${key}\`\n`;
        });
        await sendMessage(env, message.chat.id, themeList, { reply_markup: createMainKeyboard() });
      }
      break;

    case '/connect':
      const platform = args[0]?.toLowerCase();
      if (!platform || !SUBSCRIPTION_PLATFORMS[platform]) {
        let platformList = '📱 *Available Platforms*\n\n';
        Object.entries(SUBSCRIPTION_PLATFORMS).forEach(([key, p]) => {
          platformList += `${p.icon} ${p.name} - ${p.desc}\n`;
        });
        platformList += '\n💡 Usage: /connect <platform>';
        await sendMessage(env, message.chat.id, platformList, { reply_markup: createMainKeyboard() });
        break;
      }
      const connectSubs = await getSubscriptions(env, userId);
      connectSubs[platform] = {
        active: true,
        connectedAt: Date.now(),
        credentials: args.slice(1),
        totalRevenue: 0,
        subscriberCount: 0
      };
      await setSubscriptions(env, userId, connectSubs);
      const p = SUBSCRIPTION_PLATFORMS[platform];
      await sendMessage(env, message.chat.id, 
        `✅ *${p.icon} ${p.name} Connected!*\n\n` +
        'Your platform is now active.\n\n' +
        '📊 /revenue - View earnings\n' +
        '📱 /subscriptions - Manage platforms',
        { reply_markup: createMainKeyboard() }
      );
      break;

    case '/subscriptions':
      const subs = await getSubscriptions(env, userId);
      if (Object.keys(subs).length === 0) {
        await sendMessage(env, message.chat.id, 
          '📱 *Subscriptions*\n\nNo platforms connected.\n\n' +
          '💡 /connect <platform>\n\n' +
          'Available: meta, google, youtube, patreon, stripe, gumroad, payhip, lemon',
          { reply_markup: createMainKeyboard() }
        );
        break;
      }
      let subsText = '📱 *Connected Platforms*\n\n';
      Object.entries(subs).forEach(([pKey, config]) => {
        const p = SUBSCRIPTION_PLATFORMS[pKey] || { name: pKey, icon: '📱' };
        subsText += `${p.icon} ${p.name}: $${config.totalRevenue || 0}\n`;
      });
      await sendMessage(env, message.chat.id, subsText, { reply_markup: createMainKeyboard() });
      break;

    case '/revenue':
      const allSubs = await getSubscriptions(env, userId);
      let totalRev = 0;
      let breakdown = '';
      Object.entries(allSubs).forEach(([pKey, config]) => {
        const rev = parseFloat(config.totalRevenue || 0);
        totalRev += rev;
        const p = SUBSCRIPTION_PLATFORMS[pKey] || { name: pKey, icon: '📱' };
        breakdown += `${p.icon} ${p.name}: $${rev.toFixed(2)}\n`;
      });
      if (!breakdown) breakdown = 'No platforms connected yet.';
      await sendMessage(env, message.chat.id, 
        `💰 *Revenue Summary*\n\n` +
        `*Total: $${totalRev.toFixed(2)}*\n\n` +
        breakdown,
        { reply_markup: createMainKeyboard() }
      );
      break;

    case '/disconnect':
      const toDisconnect = args[0]?.toLowerCase();
      if (!toDisconnect) {
        await sendMessage(env, message.chat.id, '💡 /disconnect <platform>');
        break;
      }
      const currentSubs = await getSubscriptions(env, userId);
      if (!currentSubs[toDisconnect]) {
        await sendMessage(env, message.chat.id, `Platform "${toDisconnect}" not connected.`);
        break;
      }
      delete currentSubs[toDisconnect];
      await setSubscriptions(env, userId, currentSubs);
      const pDisc = SUBSCRIPTION_PLATFORMS[toDisconnect] || { name: toDisconnect, icon: '📱' };
      await sendMessage(env, message.chat.id, `✅ ${pDisc.icon} ${pDisc.name} disconnected.`);
      break;

    case '/balance':
      const wallet1 = await getWallet(env, userId);
      if (!wallet1) { 
        await sendMessage(env, message.chat.id, 
          '⚠️ *No Wallet Set*\n\n' +
          '💡 /setwallet 0xYourAddress',
          { reply_markup: createMainKeyboard() }
        );
        return; 
      }
      const balance = await flowClient.getAccountBalance(wallet1);
      await sendMessage(env, message.chat.id, 
        `💰 *Your Balance*\n\n\`${wallet1.slice(0, 8)}...${wallet1.slice(-4)}\`\n\n` +
        `💵 Available: ${balance.available || 0} FLOW\n` +
        `🔒 Staked: ${balance.staked || 0} FLOW\n` +
        `📦 Locked: ${balance.locked || 0} FLOW\n\n` +
        `━━━━━━━━━━━━━━━━\n` +
        `Total: *${balance.balance || 0} FLOW*`,
        { reply_markup: createMainKeyboard() }
      );
      break;

    case '/deposit':
      const amount1 = parseFloat(args[0]);
      if (isNaN(amount1) || amount1 <= 0) { 
        await sendMessage(env, message.chat.id, 
          '💡 *Deposit*\n\n' +
          'Usage: /deposit <amount>\n\n' +
          'Example: /deposit 100',
          { reply_markup: createMainKeyboard() }
        );
        return; 
      }
      const wallet2 = await getWallet(env, userId);
      if (!wallet2) { 
        await sendMessage(env, message.chat.id, 
          '⚠️ *Set Wallet First*\n\n' +
          '💡 /setwallet 0xYourAddress',
          { reply_markup: createMainKeyboard() }
        );
        return; 
      }
      const result1 = await flowClient.executeDeposit({ userAddress: wallet2, amount: amount1, token: 'FLOW' });
      await saveReceipt(env, { id: result1.txId, type: 'deposit', status: result1.status, amount: amount1, timestamp: Date.now(), userId });
      await sendMessage(env, message.chat.id, 
        `✅ *Deposit Initiated*\n\n` +
        `Amount: ${amount1} FLOW\n` +
        `Status: ${result1.status}\n\n` +
        `📜 ID: \`${result1.txId}\``,
        { reply_markup: createMainKeyboard() }
      );
      break;

    case '/withdraw':
      const amount2 = parseFloat(args[0]);
      if (isNaN(amount2) || amount2 <= 0) { 
        await sendMessage(env, message.chat.id, 
          '💡 *Withdraw*\n\n' +
          'Usage: /withdraw <amount>\n\n' +
          'Example: /withdraw 50',
          { reply_markup: createMainKeyboard() }
        );
        return; 
      }
      const wallet3 = await getWallet(env, userId);
      if (!wallet3) { 
        await sendMessage(env, message.chat.id, 
          '⚠️ *Set Wallet First*\n\n' +
          '💡 /setwallet 0xYourAddress',
          { reply_markup: createMainKeyboard() }
        );
        return; 
      }
      const result2 = await flowClient.executeWithdraw({ userAddress: wallet3, amount: amount2, token: 'FLOW' });
      await saveReceipt(env, { id: result2.txId, type: 'withdraw', status: result2.status, amount: amount2, timestamp: Date.now(), userId });
      await sendMessage(env, message.chat.id, 
        `✅ *Withdraw Initiated*\n\n` +
        `Amount: ${amount2} FLOW\n` +
        `Status: ${result2.status}\n\n` +
        `📜 ID: \`${result2.txId}\``,
        { reply_markup: createMainKeyboard() }
      );
      break;

    case '/stake':
      const amount3 = parseFloat(args[0]);
      const duration3 = parseInt(args[1]) || 30;
      if (isNaN(amount3) || amount3 <= 0) { 
        await sendMessage(env, message.chat.id, 
          '💡 *Stake*\n\n' +
          'Usage: /stake <amount> [days]\n\n' +
          'Example: /stake 100 30',
          { reply_markup: createMainKeyboard() }
        );
        return; 
      }
      const wallet4 = await getWallet(env, userId);
      if (!wallet4) { 
        await sendMessage(env, message.chat.id, 
          '⚠️ *Set Wallet First*\n\n' +
          '💡 /setwallet 0xYourAddress',
          { reply_markup: createMainKeyboard() }
        );
        return; 
      }
      const result3 = await flowClient.executeStake({ userAddress: wallet4, amount: amount3, duration: duration3 });
      await saveReceipt(env, { id: result3.txId, type: 'stake', status: result3.status, amount: amount3, timestamp: Date.now(), userId });
      await sendMessage(env, message.chat.id, 
        `🔒 *Stake Initiated*\n\n` +
        `Amount: ${amount3} FLOW\n` +
        `Duration: ${duration3} days\n` +
        `Status: ${result3.status}\n\n` +
        `📜 ID: \`${result3.txId}\``,
        { reply_markup: createMainKeyboard() }
      );
      break;

    case '/setwallet':
      const address = args[0];
      if (!address || !address.startsWith('0x')) { 
        await sendMessage(env, message.chat.id, 
          '⚠️ *Invalid Address*\n\n' +
          'Usage: /setwallet 0x...\n\n' +
          'Example: /setwallet 0x1234567890abcdef',
          { reply_markup: createMainKeyboard() }
        );
        return; 
      }
      await setWallet(env, userId, address);
      await sendMessage(env, message.chat.id, 
        `✅ *Wallet Set*\n\n` +
        `Address: \`${address}\``,
        { reply_markup: createMainKeyboard() }
      );
      break;

    case '/status':
      const receipts = await getAllReceipts(env);
      const statusSubs = await getSubscriptions(env, userId);
      await sendMessage(env, message.chat.id, 
        `📊 *System Status*\n\n` +
        `Theme: ${theme.emoji} ${theme.name}\n` +
        `Receipts: ${receipts.length}\n` +
        `Platforms: ${Object.keys(statusSubs).length}\n` +
        `Bot: ✅ Active`,
        { reply_markup: createMainKeyboard() }
      );
      break;

    case '/receipts':
      const allReceipts = await getAllReceipts(env);
      const userReceipts = allReceipts.filter(r => r.userId === userId).slice(-10).reverse();
      let receiptText = '📜 *Your Transactions*\n\n';
      if (userReceipts.length === 0) {
        receiptText += 'No transactions yet.';
      } else {
        userReceipts.forEach(r => {
          const emoji = r.type === 'deposit' ? '📥' : r.type === 'withdraw' ? '📤' : r.type === 'stake' ? '🔒' : '📋';
          receiptText += `${emoji} ${r.type}: ${r.amount || '-'} (${r.status})\n`;
        });
      }
      await sendMessage(env, message.chat.id, receiptText, { reply_markup: createMainKeyboard() });
      break;

    default:
      await sendMessage(env, message.chat.id, 
        `🤔 *Unknown Command*\n\n` +
        `Type /help for available commands\n\n` +
        `Or use the menu below:`,
        { reply_markup: createMainKeyboard() }
      );
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
    return new Response(JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(), 
      worker: 'kbank-poc', 
      platform: 'cloudflare-workers',
      version: '2.1',
      features: ['dynamic-themes', 'subscriptions', 'improved-ui']
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    if (url.pathname === '/api/admin/stats' && request.method === 'GET') {
      const receipts = await getAllReceipts(env);
      const uniqueUsers = new Set(receipts.map(r => r.userId).filter(Boolean));
      return new Response(JSON.stringify({ 
        users: uniqueUsers.size, 
        transactions: receipts.filter(r => ['deposit', 'withdraw', 'stake'].includes(r.type)).length,
        subs: subscriptions.size,
        claims: receipts.filter(r => r.type === 'insurance_claim').length
      }), { headers });
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
