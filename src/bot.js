// src/bot.js
const { Telegraf, Markup } = require('telegraf');
const { createLogger } = require('./errorHandler');
const flowClient = require('./flowClient');
const rateLimiter = require('./rateLimiter/rateLimiter');
const { addToQueue, getQueueStatus, getJobStatus } = require('./scheduler/scheduler');
const receiptTracker = require('./receiptTracker/receiptTracker');

const logger = createLogger('telegram-bot');

class KBankBot {
  constructor() {
    this.bot = null;
    this.userWallets = new Map();
  }

  async initialize() {
    const botToken = process.env.BOT_TOKEN;
    
    if (!botToken || botToken === 'your_telegram_bot_token_here') {
      logger.warn('BOT_TOKEN not configured. Telegram bot will not start.');
      return false;
    }

    this.bot = new Telegraf(botToken);
    this.setupCommands();
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

  setupCommands() {
    this.bot.start((ctx) => {
      ctx.reply(
        '🏦 *Welcome to K-Bank!*\n\n' +
        'Your Consumer DeFi funding platform on Flow blockchain.\n\n' +
        'Available commands:\n' +
        '/help - Show all commands\n' +
        '/balance - Check your balance\n' +
        '/deposit - Deposit funds\n' +
        '/withdraw - Withdraw funds\n' +
        '/stake - Stake tokens\n' +
        '/proposal - DAO governance\n' +
        '/insurance - Insurance claims\n' +
        '/status - System status',
        { parse_mode: 'Markdown' }
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

    this.bot.command('balance', async (ctx) => {
      const userId = ctx.from.id.toString();
      const wallet = this.userWallets.get(userId);
      
      if (!wallet) {
        return ctx.reply('Please set your wallet address first:\n/setwallet <address>');
      }

      try {
        const balance = await flowClient.getAccountBalance(wallet);
        ctx.reply(
          '💰 *Your Balance*\n\n' +
          `Available: ${balance.available} FLOW\n` +
          `Staked: ${balance.staked} FLOW\n` +
          `Locked: ${balance.locked} FLOW\n` +
          `Total: ${balance.balance} FLOW`,
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
        const title = args.slice(1).join(' ').split('|')[0]?.trim();
        
        if (!title) {
          return ctx.reply('❌ Usage: /proposal create <title> | <description>');
        }

        const parts = ctx.message.text.slice(10).split('|');
        const proposalTitle = parts[0]?.trim();
        const description = parts[1]?.trim() || 'No description provided';
        const fundingAmount = parseFloat(parts[2]) || 0;

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

      ctx.reply(
        '📊 *System Status*\n\n' +
        `🔄 Queue: ${queue.pending} pending, ${queue.processing} processing\n` +
        `📝 Receipts: ${receipts.total} total\n` +
        `👥 Active users: ${rateLimit.totalUsers}\n` +
        `🚫 Blocked: ${rateLimit.blockedUsers}`,
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
