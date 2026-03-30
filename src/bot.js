// src/bot.js
const { Telegraf, Markup } = require('telegraf');
const { createLogger } = require('./errorHandler');
const flowClient = require('./flowClient');
const rateLimiter = require('./rateLimiter/rateLimiter');
const { addToQueue, getQueueStatus, getJobStatus } = require('./scheduler/scheduler');
const receiptTracker = require('./receiptTracker/receiptTracker');

const logger = createLogger('telegram-bot');

const PANTONE_THEMES = {
  spring: {
    name: 'Spring Lavender',
    primary: '#E6E6FA',
    secondary: '#B57EDC',
    accent: '#77DD77',
    background: '#F8F8FF',
    text: '#2D2D2D',
    success: '#98FB98',
    warning: '#FFD700',
    error: '#FF6B6B'
  },
  summer: {
    name: 'Summer Mosaic',
    primary: '#FFE5B4',
    secondary: '#FF7F50',
    accent: '#20B2AA',
    background: '#FFFEF0',
    text: '#363636',
    success: '#3CB371',
    warning: '#FFA500',
    error: '#DC143C'
  },
  fall: {
    name: 'Autumn Embers',
    primary: '#DEB887',
    secondary: '#CD5C5C',
    accent: '#DAA520',
    background: '#FAF0E6',
    text: '#3D2914',
    success: '#228B22',
    warning: '#FF8C00',
    error: '#B22222'
  },
  winter: {
    name: 'Winter Frost',
    primary: '#E0FFFF',
    secondary: '#87CEEB',
    accent: '#4682B4',
    background: '#F0F8FF',
    text: '#1C3144',
    success: '#00CED1',
    warning: '#FFB347',
    error: '#CD5C5C'
  },
  modern: {
    name: 'Modern Classic',
    primary: '#2C3E50',
    secondary: '#3498DB',
    accent: '#E74C3C',
    background: '#ECF0F1',
    text: '#2C3E50',
    success: '#27AE60',
    warning: '#F39C12',
    error: '#E74C3C'
  },
  vibrant: {
    name: 'Vibrant Pop',
    primary: '#FF006E',
    secondary: '#8338EC',
    accent: '#3A86FF',
    background: '#FFFFF0',
    text: '#1A1A2E',
    success: '#06D6A0',
    warning: '#FFD166',
    error: '#EF476F'
  }
};

const SUBSCRIPTION_PLATFORMS = {
  meta: {
    name: 'Meta (Facebook/Instagram)',
    icon: '📘',
    color: '#1877F2',
    api: 'meta',
    fields: ['access_token', 'page_id', 'product_id']
  },
  google: {
    name: 'Google Play',
    icon: '📱',
    color: '#4285F4',
    api: 'google',
    fields: ['service_account_json', 'package_name', 'subscription_id']
  },
  youtube: {
    name: 'YouTube Memberships',
    icon: '▶️',
    color: '#FF0000',
    api: 'youtube',
    fields: ['api_key', 'channel_id']
  },
  patreon: {
    name: 'Patreon',
    icon: '🎨',
    color: '#FF424D',
    api: 'patreon',
    fields: ['client_id', 'client_secret', 'creator_id']
  },
  stripe: {
    name: 'Stripe Subscriptions',
    icon: '💳',
    color: '#635BFF',
    api: 'stripe',
    fields: ['publishable_key', 'secret_key', 'product_id']
  },
  gumroad: {
    name: 'Gumroad',
    icon: '🛒',
    color: '#8F1C1C',
    api: 'gumroad',
    fields: ['access_code', 'product_id']
  },
  payhip: {
    name: 'Payhip',
    icon: '💰',
    color: '#3FAD5C',
    api: 'payhip',
    fields: ['api_key', 'product_id']
  },
  lemon: {
    name: 'Lemon Squeezy',
    icon: '🍋',
    color: '#FFAB00',
    api: 'lemon',
    fields: ['api_key', 'store_id']
  }
};

class KBankBot {
  constructor() {
    this.bot = null;
    this.userWallets = new Map();
    this.userThemes = new Map();
    this.userSubscriptions = new Map();
    this.currentTheme = 'modern';
  }

  getCurrentTheme() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  getTheme() {
    return PANTONE_THEMES[this.currentTheme] || PANTONE_THEMES.modern;
  }

  createWalletKeyboard() {
    const theme = this.getTheme();
    return Markup.inlineKeyboard([
      [Markup.button.callback('💰 Wallet', 'wallet_menu')],
      [Markup.button.callback('📊 Dashboard', 'dashboard_menu')],
      [Markup.button.callback('📱 Subscriptions', 'subscriptions_menu')],
      [Markup.button.callback('🎨 Theme', 'theme_menu')],
      [Markup.button.callback('❓ Help', 'help_menu')]
    ]);
  }

  createWalletButton(text, callback) {
    return Markup.button.callback(text, callback);
  }

  formatBalanceCard(balance, theme) {
    return `
╔══════════════════════════════════╗
║       💰 K-BANK WALLET            ║
╠══════════════════════════════════╣
║  Available   │  ${balance.available || '0'} FLOW     ║
║  Staked      │  ${balance.staked || '0'} FLOW       ║
║  Locked      │  ${balance.locked || '0'} FLOW       ║
╠══════════════════════════════════╣
║  TOTAL       │  ${balance.balance || '0'} FLOW       ║
╚══════════════════════════════════╝`;
  }

  formatSubscriptionPlatform(platform, config) {
    const p = SUBSCRIPTION_PLATFORMS[platform];
    return `${p.icon} ${p.name}
   Status: ${config.active ? '✅ Active' : '⏸️ Paused'}
   Revenue: ${config.totalRevenue || '$0'}
   Subscribers: ${config.subscriberCount || 0}`;
  }

  async initialize() {
    const botToken = process.env.BOT_TOKEN;
    
    this.currentTheme = this.getCurrentTheme();

    if (!botToken || botToken === 'your_telegram_bot_token_here') {
      logger.warn('BOT_TOKEN not configured. Telegram bot will not start.');
      return false;
    }

    this.bot = new Telegraf(botToken);
    this.setupCommands();
    this.setupCallbacks();
    this.setupMiddleware();
    
    try {
      this.bot.launch({ 
        polling: {
          timeout: 60,
          restartLocked: true
        }
      });
      
      this.bot.catch((err) => {
        logger.error(`Telegram bot error: ${err.message}`);
      });
      
      logger.info('Telegram bot started successfully');
      return true;
    } catch (err) {
      logger.error(`Failed to start Telegram bot: ${err.message}`);
      return false;
    }
  }

  setupMiddleware() {
    this.bot.use((ctx, next) => {
      const userId = ctx.from?.id?.toString();
      
      if (!userId) {
        return ctx.reply('Unable to identify user.');
      }

      const rateCheck = rateLimiter.checkLimit(userId);
      if (!rateCheck.allowed) {
        return ctx.reply(`⚠️ ${rateCheck.reason}`);
      }

      logger.info(`[${ctx.from.username || userId}] ${ctx.message?.text || 'action'}`);
      return next();
    });
  }

  setupCallbacks() {
    this.bot.action('wallet_menu', async (ctx) => {
      await ctx.answerCbQuery();
      const userId = ctx.from.id.toString();
      const wallet = this.userWallets.get(userId);
      
      if (!wallet) {
        return ctx.editMessageText(
          '🏦 *K-Bank Wallet*\n\nPlease set your wallet address first:',
          { 
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.input('Set Wallet', 'set_wallet_input')]
            ]).reply_markup
          }
        );
      }

      try {
        const balance = await flowClient.getAccountBalance(wallet);
        const theme = this.getTheme();
        ctx.editMessageText(
          this.formatBalanceCard(balance, theme),
          { parse_mode: 'Markdown' }
        );
      } catch (err) {
        ctx.editMessageText('❌ Failed to fetch balance.');
      }
    });

    this.bot.action('dashboard_menu', async (ctx) => {
      await ctx.answerCbQuery();
      const theme = this.getTheme();
      const userId = ctx.from.id.toString();
      const wallet = this.userWallets.get(userId);
      const subs = this.userSubscriptions.get(userId) || {};
      
      let totalRevenue = 0;
      Object.values(subs).forEach(s => {
        totalRevenue += parseFloat(s.totalRevenue || 0);
      });

      ctx.editMessageText(
        `📊 *K-Bank Dashboard*\n\n` +
        `Theme: ${theme.name}\n\n` +
        `💵 Total Revenue: $${totalRevenue.toFixed(2)}\n` +
        `📱 Connected Platforms: ${Object.keys(subs).length}\n` +
        `🏦 Wallet: ${wallet ? wallet.slice(0, 10) + '...' : 'Not set'}`,
        { parse_mode: 'Markdown' }
      );
    });

    this.bot.action('subscriptions_menu', async (ctx) => {
      await ctx.answerCbQuery();
      const userId = ctx.from.id.toString();
      const subs = this.userSubscriptions.get(userId) || {};
      
      if (Object.keys(subs).length === 0) {
        return ctx.editMessageText(
          '📱 *Subscriptions*\n\nNo platforms connected yet.\n\nClick below to connect a platform:',
          { 
            parse_mode: 'Markdown',
            reply_markup: this.getSubscriptionKeyboard()
          }
        );
      }

      let text = '📱 *Connected Subscriptions*\n\n';
      Object.entries(subs).forEach(([platform, config]) => {
        text += this.formatSubscriptionPlatform(platform, config) + '\n\n';
      });

      ctx.editMessageText(text, { parse_mode: 'Markdown' });
    });

    this.bot.action('theme_menu', async (ctx) => {
      await ctx.answerCbQuery();
      ctx.editMessageText(
        '🎨 *Choose Theme*\n\nSelect a color theme:',
        {
          parse_mode: 'Markdown',
          reply_markup: this.getThemeKeyboard()
        }
      );
    });

    Object.keys(PANTONE_THEMES).forEach(themeKey => {
      this.bot.action(`theme_${themeKey}`, async (ctx) => {
        await ctx.answerCbQuery();
        const userId = ctx.from.id.toString();
        this.userThemes.set(userId, themeKey);
        this.currentTheme = themeKey;
        const theme = PANTONE_THEMES[themeKey];
        
        ctx.editMessageText(
          `✅ Theme set to *${theme.name}*`,
          { parse_mode: 'Markdown' }
        );
      });
    });

    Object.keys(SUBSCRIPTION_PLATFORMS).forEach(platform => {
      this.bot.action(`connect_${platform}`, async (ctx) => {
        await ctx.answerCbQuery();
        const p = SUBSCRIPTION_PLATFORMS[platform];
        ctx.editMessageText(
          `🔗 *Connect ${p.name}*\n\n` +
          `Send me your ${p.name} credentials in this format:\n\n` +
          `For ${p.name}:\n${p.fields.map(f => `• ${f}`).join('\n')}\n\n` +
          `Example: /connect ${platform} field1_value field2_value`,
          { parse_mode: 'Markdown' }
        );
      });
    });

    this.bot.action('help_menu', async (ctx) => {
      await ctx.answerCbQuery();
      ctx.editMessageText(
        '❓ *Help*\n\n' +
        '💰 *Wallet*: Deposit, withdraw, stake tokens\n' +
        '📱 *Subscriptions*: Connect platforms to collect payments\n' +
        '🎨 *Theme*: Customize the bot appearance\n\n' +
        'Commands:\n' +
        '/start - Open wallet\n' +
        '/balance - Check balance\n' +
        '/deposit <amount> - Deposit funds\n' +
        '/withdraw <amount> - Withdraw\n' +
        '/stake <amount> - Stake tokens\n' +
        '/connect <platform> - Connect subscription\n' +
        '/theme <name> - Change theme',
        { parse_mode: 'Markdown' }
      );
    });
  }

  getThemeKeyboard() {
    const buttons = Object.entries(PANTONE_THEMES).map(([key, theme]) => 
      [Markup.button.callback(`🎨 ${theme.name}`, `theme_${key}`)]
    );
    return Markup.inlineKeyboard(buttons);
  }

  getSubscriptionKeyboard() {
    const buttons = Object.entries(SUBSCRIPTION_PLATFORMS).map(([key, platform]) =>
      [Markup.button.callback(`${platform.icon} ${platform.name}`, `connect_${key}`)]
    );
    return Markup.inlineKeyboard(buttons);
  }

  setupCommands() {
    this.bot.start((ctx) => {
      const theme = this.getTheme();
      ctx.reply(
        `🏦 *K-Bank*\n\n` +
        `Your Consumer DeFi funding platform on Flow blockchain\n\n` +
        `Current Theme: *${theme.name}*\n\n` +
        `Tap a button to get started:`,
        { 
          parse_mode: 'Markdown',
          ...this.createWalletKeyboard()
        }
      );
    });

    this.bot.help((ctx) => {
      ctx.reply(
        '📚 *Commands:*\n\n' +
        '💰 *Funds*\n' +
        '/deposit <amount> - Deposit funds\n' +
        '/withdraw <amount> - Withdraw funds\n' +
        '/stake <amount> [days] - Stake tokens\n' +
        '/balance - Check your balance\n\n' +
        '📱 *Subscriptions*\n' +
        '/connect <platform> - Connect payment platform\n' +
        '/subscriptions - View connected platforms\n' +
        '/revenue - View revenue summary\n\n' +
        '🎨 *Theme*\n' +
        '/theme - Change UI theme\n\n' +
        '🗳️ *DAO Governance*\n' +
        '/proposal create <title> - Create proposal\n' +
        '/proposal vote <id> <yes|no> - Vote\n\n' +
        '🛡️ *Insurance*\n' +
        '/insurance claim <claimId> - Submit claim\n' +
        '/insurance status <claimId> - Check status\n\n' +
        '📊 *Info*\n' +
        '/status - System status\n' +
        '/receipts - Transaction receipts',
        { parse_mode: 'Markdown' }
      );
    });

    this.bot.command('theme', (ctx) => {
      const args = ctx.message.text.split(' ').slice(1);
      const themeName = args[0]?.toLowerCase();
      
      if (themeName && PANTONE_THEMES[themeName]) {
        const userId = ctx.from.id.toString();
        this.userThemes.set(userId, themeName);
        this.currentTheme = themeName;
        return ctx.reply(
          `✅ Theme set to *${PANTONE_THEMES[themeName].name}*`,
          { parse_mode: 'Markdown' }
        );
      }

      ctx.reply(
        '🎨 *Available Themes:*\n\n' +
        Object.entries(PANTONE_THEMES).map(([key, t]) => 
          `• ${t.name} (${key})`
        ).join('\n') +
        '\n\nUsage: /theme <name>',
        { parse_mode: 'Markdown' }
      );
    });

    this.bot.command('connect', (ctx) => {
      const args = ctx.message.text.split(' ').slice(1);
      const platform = args[0]?.toLowerCase();
      
      if (!platform || !SUBSCRIPTION_PLATFORMS[platform]) {
        return ctx.reply(
          '📱 *Available Platforms:*\n\n' +
          Object.entries(SUBSCRIPTION_PLATFORMS).map(([key, p]) => 
            `${p.icon} ${p.name}`
          ).join('\n') +
          '\n\nUsage: /connect <platform> [credentials...]',
          { parse_mode: 'Markdown' }
        );
      }

      const userId = ctx.from.id.toString();
      const userSubs = this.userSubscriptions.get(userId) || {};
      
      userSubs[platform] = {
        active: true,
        connectedAt: Date.now(),
        credentials: args.slice(1),
        totalRevenue: 0,
        subscriberCount: 0
      };
      
      this.userSubscriptions.set(userId, userSubs);

      ctx.reply(
        `✅ *${SUBSCRIPTION_PLATFORMS[platform].name}* connected!\n\n` +
        `Use /subscriptions to view all connected platforms.\n` +
        `Use /revenue to see your earnings.`,
        { parse_mode: 'Markdown' }
      );
    });

    this.bot.command('subscriptions', (ctx) => {
      const userId = ctx.from.id.toString();
      const subs = this.userSubscriptions.get(userId) || {};
      
      if (Object.keys(subs).length === 0) {
        return ctx.reply(
          '📱 No platforms connected yet.\n\n' +
          'Use /connect <platform> to connect a subscription service.\n\n' +
          'Available: meta, google, youtube, patreon, stripe, gumroad, payhip, lemon'
        );
      }

      let text = '📱 *Connected Subscriptions*\n\n';
      Object.entries(subs).forEach(([platform, config]) => {
        text += this.formatSubscriptionPlatform(platform, config) + '\n\n';
      });

      ctx.reply(text, { parse_mode: 'Markdown' });
    });

    this.bot.command('revenue', (ctx) => {
      const userId = ctx.from.id.toString();
      const subs = this.userSubscriptions.get(userId) || {};
      
      let totalRevenue = 0;
      let platformBreakdown = [];
      
      Object.entries(subs).forEach(([platform, config]) => {
        const revenue = parseFloat(config.totalRevenue || 0);
        totalRevenue += revenue;
        const p = SUBSCRIPTION_PLATFORMS[platform];
        platformBreakdown.push(`${p.icon} ${p.name}: $${revenue.toFixed(2)}`);
      });

      ctx.reply(
        '💰 *Revenue Summary*\n\n' +
        `Total: *$${totalRevenue.toFixed(2)}*\n\n` +
        platformBreakdown.join('\n') +
        '\n\n📊 Use /analytics for detailed insights',
        { parse_mode: 'Markdown' }
      );
    });

    this.bot.command('analytics', (ctx) => {
      const userId = ctx.from.id.toString();
      const subs = this.userSubscriptions.get(userId) || {};
      
      ctx.reply(
        '📊 *Analytics Coming Soon*\n\n' +
        'This feature will include:\n' +
        '• Revenue charts\n' +
        '• Subscriber growth\n' +
        '• Platform performance\n' +
        '• Export reports'
      );
    });

    this.bot.command('disconnect', (ctx) => {
      const args = ctx.message.text.split(' ').slice(1);
      const platform = args[0]?.toLowerCase();
      
      if (!platform) {
        return ctx.reply('Usage: /disconnect <platform>');
      }

      const userId = ctx.from.id.toString();
      const userSubs = this.userSubscriptions.get(userId) || {};
      
      if (!userSubs[platform]) {
        return ctx.reply(`Platform "${platform}" not connected.`);
      }

      delete userSubs[platform];
      this.userSubscriptions.set(userId, userSubs);

      ctx.reply(`✅ ${SUBSCRIPTION_PLATFORMS[platform]?.name || platform} disconnected.`);
    });

    this.bot.command('balance', async (ctx) => {
      const userId = ctx.from.id.toString();
      const wallet = this.userWallets.get(userId);
      
      if (!wallet) {
        return ctx.reply('Please set your wallet address first:\n/setwallet <address>');
      }

      try {
        const balance = await flowClient.getAccountBalance(wallet);
        ctx.reply(
          this.formatBalanceCard(balance, this.getTheme()),
          { parse_mode: 'Markdown' }
        );
      } catch (err) {
        logger.error(`Balance check failed: ${err.message}`);
        ctx.reply('❌ Failed to fetch balance. Please try again.');
      }
    });

    this.bot.command('deposit', (ctx) => {
      const args = ctx.message.text.split(' ').slice(1);
      const amount = parseFloat(args[0]);
      
      if (isNaN(amount) || amount <= 0) {
        return ctx.reply('❌ Please specify a valid amount:\n/deposit <amount>');
      }

      const userId = ctx.from.id.toString();
      const wallet = this.userWallets.get(userId);
      
      if (!wallet) {
        return ctx.reply('Please set your wallet address first:\n/setwallet <address>');
      }

      const jobId = addToQueue({
        type: 'deposit',
        payload: { userAddress: wallet, amount, token: 'FLOW' },
        priority: 10
      });

      ctx.reply(`✅ Deposit of ${amount} FLOW queued!\nJob ID: ${jobId}\n\nTrack with /receipt ${jobId}`);
    });

    this.bot.command('withdraw', (ctx) => {
      const args = ctx.message.text.split(' ').slice(1);
      const amount = parseFloat(args[0]);
      
      if (isNaN(amount) || amount <= 0) {
        return ctx.reply('❌ Please specify a valid amount:\n/withdraw <amount>');
      }

      const userId = ctx.from.id.toString();
      const wallet = this.userWallets.get(userId);
      
      if (!wallet) {
        return ctx.reply('Please set your wallet address first:\n/setwallet <address>');
      }

      const jobId = addToQueue({
        type: 'withdraw',
        payload: { userAddress: wallet, amount, token: 'FLOW' },
        priority: 10
      });

      ctx.reply(`✅ Withdrawal of ${amount} FLOW queued!\nJob ID: ${jobId}`);
    });

    this.bot.command('stake', (ctx) => {
      const args = ctx.message.text.split(' ').slice(1);
      const amount = parseFloat(args[0]);
      const duration = parseInt(args[1]) || 30;
      
      if (isNaN(amount) || amount <= 0) {
        return ctx.reply('❌ Usage: /stake <amount> [days]');
      }

      const userId = ctx.from.id.toString();
      const wallet = this.userWallets.get(userId);
      
      if (!wallet) {
        return ctx.reply('Please set your wallet address first:\n/setwallet <address>');
      }

      const jobId = addToQueue({
        type: 'stake',
        payload: { userAddress: wallet, amount, duration },
        priority: 8
      });

      ctx.reply(`✅ Staking ${amount} FLOW for ${duration} days queued!`);
    });

    this.bot.command('setwallet', (ctx) => {
      const args = ctx.message.text.split(' ').slice(1);
      const address = args[0];
      
      if (!address || !address.startsWith('0x')) {
        return ctx.reply('❌ Please provide a valid Flow address:\n/setwallet 0x...');
      }

      const userId = ctx.from.id.toString();
      this.userWallets.set(userId, address);
      
      ctx.reply(`✅ Wallet address set to:\n\`${address}\``, { parse_mode: 'Markdown' });
    });

    this.bot.command('proposal', (ctx) => {
      const args = ctx.message.text.split(' ').slice(1);
      const action = args[0];

      if (action === 'create') {
        const parts = ctx.message.text.slice(10).split('|');
        const proposalTitle = parts[0]?.trim();
        const description = parts[1]?.trim() || 'No description provided';
        const fundingAmount = parseFloat(parts[2]) || 0;

        if (!proposalTitle) {
          return ctx.reply('❌ Usage: /proposal create <title> | <description> | <amount>');
        }

        const userId = ctx.from.id.toString();
        const wallet = this.userWallets.get(userId);
        
        if (!wallet) {
          return ctx.reply('Please set your wallet address first:\n/setwallet <address>');
        }

        const jobId = addToQueue({
          type: 'create_proposal',
          payload: { creatorAddress: wallet, title: proposalTitle, description, fundingAmount },
          priority: 5
        });

        ctx.reply(`✅ Proposal created!\nTitle: ${proposalTitle}\nFunding: ${fundingAmount} FLOW`);
      } else if (action === 'vote') {
        const proposalId = args[1];
        const vote = args[2];
        
        if (!proposalId || !vote) {
          return ctx.reply('❌ Usage: /proposal vote <proposal_id> <yes|no>');
        }

        if (!['yes', 'no'].includes(vote.toLowerCase())) {
          return ctx.reply('❌ Vote must be "yes" or "no"');
        }

        const userId = ctx.from.id.toString();
        const wallet = this.userWallets.get(userId);
        
        if (!wallet) {
          return ctx.reply('Please set your wallet address first:\n/setwallet <address>');
        }

        const jobId = addToQueue({
          type: 'vote',
          payload: { proposalId, voterAddress: wallet, vote: vote.toLowerCase(), weight: 1 },
          priority: 5
        });

        ctx.reply(`✅ Vote (${vote}) submitted for proposal ${proposalId}`);
      } else {
        ctx.reply('📋 Proposal commands:\n/proposal create <title> | <description> | <amount>\n/proposal vote <id> <yes|no>');
      }
    });

    this.bot.command('insurance', (ctx) => {
      const args = ctx.message.text.split(' ').slice(1);
      const action = args[0];

      if (action === 'claim') {
        const claimId = args[1];
        
        if (!claimId) {
          return ctx.reply('❌ Usage: /insurance claim <policy_id>');
        }

        const userId = ctx.from.id.toString();
        const wallet = this.userWallets.get(userId);
        
        if (!wallet) {
          return ctx.reply('Please set your wallet address first:\n/setwallet <address>');
        }

        const jobId = addToQueue({
          type: 'claim_insurance',
          payload: { policyId: claimId, claimantAddress: wallet, claimAmount: 0, evidence: [] },
          priority: 9
        });

        ctx.reply(`🛡️ Insurance claim submitted!\nClaim ID: ${jobId}`);
      } else if (action === 'status') {
        const claimId = args[1];
        
        if (!claimId) {
          return ctx.reply('❌ Usage: /insurance status <claim_id>');
        }

        const receipt = receiptTracker.getReceipt(claimId);
        
        if (receipt) {
          ctx.reply(
            `📋 *Claim Status*\n\n` +
            `ID: ${receipt.claimId || claimId}\n` +
            `Status: ${receipt.status}\n` +
            `Submitted: ${new Date(receipt.timestamp).toLocaleString()}`,
            { parse_mode: 'Markdown' }
          );
        } else {
          ctx.reply('❌ Claim not found');
        }
      } else {
        ctx.reply('🛡️ Insurance commands:\n/insurance claim <policy_id>\n/insurance status <claim_id>');
      }
    });

    this.bot.command('status', (ctx) => {
      const queue = getQueueStatus();
      const receipts = receiptTracker.getStats();
      const rateLimit = rateLimiter.getStats();
      const theme = this.getTheme();

      ctx.reply(
        '📊 *System Status*\n\n' +
        `🔄 Queue: ${queue.pending} pending, ${queue.processing} processing\n` +
        `📝 Receipts: ${receipts.total} total\n` +
        `👥 Active users: ${rateLimit.totalUsers}\n` +
        `🚫 Blocked: ${rateLimit.blockedUsers}\n\n` +
        `🎨 Theme: ${theme.name}`,
        { parse_mode: 'Markdown' }
      );
    });

    this.bot.command('receipts', (ctx) => {
      const userId = ctx.from.id.toString();
      const allReceipts = receiptTracker.getAllReceipts();
      
      const userReceipts = allReceipts.slice(-5).reverse();
      
      if (userReceipts.length === 0) {
        return ctx.reply('No recent transactions found.');
      }

      const text = userReceipts.map(r => 
        `• ${r.type}: ${r.status} (${new Date(r.timestamp).toLocaleTimeString()})`
      ).join('\n');

      ctx.reply(`📝 *Recent Transactions*\n\n${text}`, { parse_mode: 'Markdown' });
    });

    this.bot.command('receipt', (ctx) => {
      const args = ctx.message.text.split(' ').slice(1);
      const receiptId = args[0];
      
      if (!receiptId) {
        return ctx.reply('❌ Usage: /receipt <transaction_id>');
      }

      const receipt = receiptTracker.getReceipt(receiptId);
      
      if (receipt) {
        ctx.reply(
          `📋 *Transaction Receipt*\n\n` +
          `ID: ${receipt.id || receiptId}\n` +
          `Type: ${receipt.type || 'unknown'}\n` +
          `Status: ${receipt.status}\n` +
          `Time: ${new Date(receipt.timestamp).toLocaleString()}` +
          (receipt.txId ? `\nTxHash: \`${receipt.txId}\`` : ''),
          { parse_mode: 'Markdown' }
        );
      } else {
        ctx.reply('❌ Receipt not found');
      }
    });

    this.bot.on('text', (ctx) => {
      ctx.reply('I didn\'t understand that. Type /help for available commands.');
    });
  }

  stop() {
    if (this.bot) {
      try {
        this.bot.stop();
        logger.info('Telegram bot stopped');
      } catch (err) {
        logger.error(`Error stopping bot: ${err.message}`);
      }
    }
  }
}

module.exports = new KBankBot();
