const { createLogger } = require('./errorHandler');
const flowClient = require('./flowClient');
const { getReceipt, saveReceipt, getAllReceipts, getWallet, setWallet } = require('./kv');

const logger = createLogger('telegram');

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

  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query, env);
    return;
  }

  const text = message.text;
  const command = text?.split(' ')[0];
  const args = text?.split(' ').slice(1);

  logger.info(`[${message.from.username || userId}] ${text}`);

  switch (command) {
    case '/start':
      await sendMessage(env, message.chat.id,
        '🏦 *Welcome to K-Bank!*\n\n' +
        'Your Consumer DeFi funding platform on Flow blockchain.\n\n' +
        'Available commands:\n' +
        '/help - Show all commands\n' +
        '/balance - Check your balance\n' +
        '/deposit <amount> - Deposit funds\n' +
        '/withdraw <amount> - Withdraw funds\n' +
        '/stake <amount> [days] - Stake tokens\n' +
        '/proposal - DAO governance\n' +
        '/insurance - Insurance claims\n' +
        '/status - System status',
        { parse_mode: 'Markdown' }
      );
      break;

    case '/help':
      await sendMessage(env, message.chat.id,
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
      break;

    case '/balance':
      await handleBalance(env, message, userId);
      break;

    case '/deposit':
      await handleDeposit(env, message, args, userId);
      break;

    case '/withdraw':
      await handleWithdraw(env, message, args, userId);
      break;

    case '/stake':
      await handleStake(env, message, args, userId);
      break;

    case '/setwallet':
      await handleSetWallet(env, message, args, userId);
      break;

    case '/proposal':
      await handleProposal(env, message, args, userId);
      break;

    case '/insurance':
      await handleInsurance(env, message, args, userId);
      break;

    case '/status':
      await handleStatus(env, message);
      break;

    case '/receipts':
      await handleReceipts(env, message);
      break;

    default:
      await sendMessage(env, message.chat.id, "I didn't understand that. Type /help for available commands.");
  }
}

async function handleBalance(env, message, userId) {
  const wallet = await getWallet(env, userId);

  if (!wallet) {
    await sendMessage(env, message.chat.id, 'Please set your wallet address first:\n/setwallet <address>');
    return;
  }

  const balance = await flowClient.getAccountBalance(wallet);
  await sendMessage(env, message.chat.id,
    '💰 *Your Balance*\n\n' +
    `Available: ${balance.available} FLOW\n` +
    `Staked: ${balance.staked} FLOW\n` +
    `Locked: ${balance.locked} FLOW\n` +
    `Total: ${balance.balance} FLOW`,
    { parse_mode: 'Markdown' }
  );
}

async function handleDeposit(env, message, args, userId) {
  const amount = parseFloat(args[0]);

  if (isNaN(amount) || amount <= 0) {
    await sendMessage(env, message.chat.id, '❌ Please specify a valid amount:\n/deposit <amount>');
    return;
  }

  const wallet = await getWallet(env, userId);
  if (!wallet) {
    await sendMessage(env, message.chat.id, 'Please set your wallet address first:\n/setwallet <address>');
    return;
  }

  const result = await flowClient.executeDeposit({ userAddress: wallet, amount, token: 'FLOW' });
  const receipt = {
    id: result.txId,
    type: 'deposit',
    status: result.status,
    amount,
    timestamp: Date.now()
  };
  await saveReceipt(env, receipt);

  await sendMessage(env, message.chat.id,
    `✅ Deposit of ${amount} FLOW queued!\nTx ID: ${result.txId}`
  );
}

async function handleWithdraw(env, message, args, userId) {
  const amount = parseFloat(args[0]);

  if (isNaN(amount) || amount <= 0) {
    await sendMessage(env, message.chat.id, '❌ Please specify a valid amount:\n/withdraw <amount>');
    return;
  }

  const wallet = await getWallet(env, userId);
  if (!wallet) {
    await sendMessage(env, message.chat.id, 'Please set your wallet address first:\n/setwallet <address>');
    return;
  }

  const result = await flowClient.executeWithdraw({ userAddress: wallet, amount, token: 'FLOW' });
  const receipt = {
    id: result.txId,
    type: 'withdraw',
    status: result.status,
    amount,
    timestamp: Date.now()
  };
  await saveReceipt(env, receipt);

  await sendMessage(env, message.chat.id,
    `✅ Withdrawal of ${amount} FLOW queued!\nTx ID: ${result.txId}`
  );
}

async function handleStake(env, message, args, userId) {
  const amount = parseFloat(args[0]);
  const duration = parseInt(args[1]) || 30;

  if (isNaN(amount) || amount <= 0) {
    await sendMessage(env, message.chat.id, '❌ Usage: /stake <amount> [days]');
    return;
  }

  const wallet = await getWallet(env, userId);
  if (!wallet) {
    await sendMessage(env, message.chat.id, 'Please set your wallet address first:\n/setwallet <address>');
    return;
  }

  const result = await flowClient.executeStake({ userAddress: wallet, amount, duration });
  const receipt = {
    id: result.txId,
    type: 'stake',
    status: result.status,
    amount,
    duration,
    timestamp: Date.now()
  };
  await saveReceipt(env, receipt);

  await sendMessage(env, message.chat.id,
    `✅ Staking ${amount} FLOW for ${duration} days!\nTx ID: ${result.txId}`
  );
}

async function handleSetWallet(env, message, args, userId) {
  const address = args[0];

  if (!address || !address.startsWith('0x')) {
    await sendMessage(env, message.chat.id, '❌ Please provide a valid Flow address:\n/setwallet 0x...');
    return;
  }

  await setWallet(env, userId, address);
  await sendMessage(env, message.chat.id, `✅ Wallet address set to:\n\`${address}\``, { parse_mode: 'Markdown' });
}

async function handleProposal(env, message, args, userId) {
  const action = args[0];

  if (action === 'create') {
    const title = args.slice(1).join(' ').split('|')[0]?.trim();
    if (!title) {
      await sendMessage(env, message.chat.id, '❌ Usage: /proposal create <title> | <description> | <amount>');
      return;
    }

    const parts = message.text.slice(10).split('|');
    const proposalTitle = parts[0]?.trim();
    const description = parts[1]?.trim() || 'No description';
    const fundingAmount = parseFloat(parts[2]) || 0;

    const wallet = await getWallet(env, userId);
    if (!wallet) {
      await sendMessage(env, message.chat.id, 'Please set your wallet address first:\n/setwallet <address>');
      return;
    }

    const result = await flowClient.createGovernanceProposal({
      creatorAddress: wallet,
      title: proposalTitle,
      description,
      fundingAmount
    });

    const receipt = {
      id: result.proposalId,
      type: 'proposal',
      status: result.status,
      title: proposalTitle,
      timestamp: Date.now()
    };
    await saveReceipt(env, receipt);

    await sendMessage(env, message.chat.id,
      `✅ Proposal created!\nTitle: ${proposalTitle}\nID: ${result.proposalId}`
    );
  } else if (action === 'vote') {
    const proposalId = args[1];
    const vote = args[2];

    if (!proposalId || !vote) {
      await sendMessage(env, message.chat.id, '❌ Usage: /proposal vote <proposal_id> <yes|no>');
      return;
    }

    if (!['yes', 'no'].includes(vote.toLowerCase())) {
      await sendMessage(env, message.chat.id, '❌ Vote must be "yes" or "no"');
      return;
    }

    const wallet = await getWallet(env, userId);
    if (!wallet) {
      await sendMessage(env, message.chat.id, 'Please set your wallet address first:\n/setwallet <address>');
      return;
    }

    const result = await flowClient.submitVote({
      proposalId,
      voterAddress: wallet,
      vote: vote.toLowerCase(),
      weight: 1
    });

    await sendMessage(env, message.chat.id, `✅ Vote (${vote}) submitted for proposal ${proposalId}`);
  } else {
    await sendMessage(env, message.chat.id,
      '📋 Proposal commands:\n/proposal create <title> | <description> | <amount>\n/proposal vote <id> <yes|no>'
    );
  }
}

async function handleInsurance(env, message, args, userId) {
  const action = args[0];

  if (action === 'claim') {
    const claimId = args[1];
    if (!claimId) {
      await sendMessage(env, message.chat.id, '❌ Usage: /insurance claim <policy_id>');
      return;
    }

    const wallet = await getWallet(env, userId);
    if (!wallet) {
      await sendMessage(env, message.chat.id, 'Please set your wallet address first:\n/setwallet <address>');
      return;
    }

    const claimIdResult = `claim_${Date.now()}`;
    const receipt = {
      id: claimIdResult,
      type: 'insurance_claim',
      status: 'PENDING',
      policyId: claimId,
      timestamp: Date.now()
    };
    await saveReceipt(env, receipt);

    await sendMessage(env, message.chat.id, `🛡️ Insurance claim submitted!\nClaim ID: ${claimIdResult}`);
  } else if (action === 'status') {
    const claimId = args[1];
    if (!claimId) {
      await sendMessage(env, message.chat.id, '❌ Usage: /insurance status <claim_id>');
      return;
    }

    const receipt = await getReceipt(env, claimId);
    if (receipt) {
      await sendMessage(env, message.chat.id,
        `📋 *Claim Status*\n\n` +
        `ID: ${receipt.id}\n` +
        `Status: ${receipt.status}\n` +
        `Submitted: ${new Date(receipt.timestamp).toLocaleString()}`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await sendMessage(env, message.chat.id, '❌ Claim not found');
    }
  } else {
    await sendMessage(env, message.chat.id,
      '🛡️ Insurance commands:\n/insurance claim <policy_id>\n/insurance status <claim_id>'
    );
  }
}

async function handleStatus(env, message) {
  const receipts = await getAllReceipts(env);
  await sendMessage(env, message.chat.id,
    '📊 *System Status*\n\n' +
    `📝 Receipts: ${receipts.length} total\n` +
    `🤖 Platform: Cloudflare Workers\n` +
    `⚡ Status: Running`,
    { parse_mode: 'Markdown' }
  );
}

async function handleReceipts(env, message) {
  const receipts = await getAllReceipts(env);
  const recentReceipts = receipts.slice(-5).reverse();

  if (recentReceipts.length === 0) {
    await sendMessage(env, message.chat.id, 'No recent transactions found.');
    return;
  }

  const text = recentReceipts.map(r =>
    `• ${r.type}: ${r.status} (${new Date(r.timestamp).toLocaleTimeString()})`
  ).join('\n');

  await sendMessage(env, message.chat.id, `📝 *Recent Transactions*\n\n${text}`, { parse_mode: 'Markdown' });
}

async function handleCallbackQuery(callbackQuery, env) {
  await sendMessage(env, callbackQuery.message.chat.id, 'Callback received');
}

async function sendMessage(env, chatId, text, options = {}) {
  const token = env.BOT_TOKEN;
  if (!token) {
    console.error('BOT_TOKEN not configured');
    return;
  }

  const payload = {
    chat_id: chatId,
    text,
    ...options
  };

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Telegram API error:', error);
    }
  } catch (err) {
    console.error('Failed to send message:', err);
  }
}

function setBotToken(token) {
  console.log('Bot token configured');
}

module.exports = { handleTelegramUpdate, setBotToken };
