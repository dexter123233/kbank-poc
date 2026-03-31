const { createLogger } = require('./errorHandler');

const logger = createLogger('mempool');

const TransactionStatus = {
  PENDING: 'pending',
  VALIDATING: 'validating',
  SANDBOX: 'sandbox',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
  DROPPED: 'dropped'
};

const TransactionType = {
  DEPOSIT: 'deposit',
  WITHDRAW: 'withdraw',
  STAKE: 'stake',
  TRANSFER: 'transfer',
  SWAP: 'swap',
  PROPOSAL: 'create_proposal',
  VOTE: 'vote',
  CLAIM: 'claim_insurance'
};

class Mempool {
  constructor() {
    this.transactions = new Map();
    this.sandbox = new Map();
    this.pendingQueue = [];
    this.gasEstimates = new Map();
    this.testnetMode = process.env.TESTNET_MODE === 'true';
    
    this.initializeDefaults();
  }

  initializeDefaults() {
    this.gasEstimates.set('FLOW', { fast: 0.0001, standard: 0.00005, slow: 0.00001 });
    this.gasEstimates.set('USDC', { fast: 0.01, standard: 0.005, slow: 0.001 });
    this.gasEstimates.set('USDT', { fast: 0.01, standard: 0.005, slow: 0.001 });
    
    logger.info(`Mempool initialized. Testnet mode: ${this.testnetMode}`);
  }

  generateTxId() {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addTransaction(txData) {
    const txId = this.generateTxId();
    const transaction = {
      id: txId,
      type: txData.type || TransactionType.TRANSFER,
      payload: txData.payload || {},
      status: this.testnetMode ? TransactionStatus.SANDBOX : TransactionStatus.PENDING,
      priority: txData.priority || 5,
      nonce: txData.nonce || Date.now(),
      gasLimit: txData.gasLimit || 1000,
      gasPrice: txData.gasPrice || 0.00001,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      attempts: 0,
      maxAttempts: txData.maxAttempts || 3,
      metadata: txData.metadata || {},
      sandboxResult: null,
      onChainTxId: null,
      blockNumber: null,
      confirmations: 0
    };

    this.transactions.set(txId, transaction);
    this.pendingQueue.push({ txId, priority: transaction.priority });
    this.pendingQueue.sort((a, b) => b.priority - a.priority);
    
    logger.info(`Transaction added to mempool: ${txId} (${transaction.type}) - Status: ${transaction.status}`);
    
    if (this.testnetMode) {
      this.runSandboxSimulation(txId);
    }
    
    return txId;
  }

  runSandboxSimulation(txId) {
    const tx = this.transactions.get(txId);
    if (!tx) return;

    setTimeout(() => {
      tx.status = TransactionStatus.VALIDATING;
      tx.updatedAt = Date.now();
      
      setTimeout(() => {
        const simulationResult = this.simulateTransaction(tx);
        
        tx.sandboxResult = simulationResult;
        
        if (simulationResult.success) {
          tx.status = TransactionStatus.CONFIRMED;
          tx.onChainTxId = `0x${Buffer.from(txId).toString('hex').slice(0, 16)}`;
          tx.blockNumber = Math.floor(Math.random() * 1000000) + 100000;
          tx.gasUsed = simulationResult.gasUsed || tx.gasLimit;
          logger.info(`Sandbox simulation passed for tx ${txId}: ${simulationResult.message}`);
        } else {
          tx.status = TransactionStatus.FAILED;
          tx.error = simulationResult.error || 'Simulation failed';
          logger.warn(`Sandbox simulation failed for tx ${txId}: ${tx.error}`);
        }
        
        tx.updatedAt = Date.now();
        this.transactions.set(txId, tx);
      }, 500 + Math.random() * 500);
    }, 200 + Math.random() * 300);
  }

  simulateTransaction(tx) {
    const { type, payload } = tx;
    
    switch (type) {
      case TransactionType.DEPOSIT:
        if (!payload.amount || payload.amount <= 0) {
          return { success: false, error: 'Invalid deposit amount', gasUsed: 500 };
        }
        if (payload.amount > 1000000) {
          return { success: false, error: 'Amount exceeds sandbox limit', gasUsed: 300 };
        }
        return { success: true, message: 'Deposit simulated successfully', gasUsed: 800 };
        
      case TransactionType.WITHDRAW:
        if (!payload.amount || payload.amount <= 0) {
          return { success: false, error: 'Invalid withdrawal amount', gasUsed: 500 };
        }
        return { success: true, message: 'Withdrawal simulated successfully', gasUsed: 750 };
        
      case TransactionType.STAKE:
        if (!payload.amount || payload.amount <= 0) {
          return { success: false, error: 'Invalid stake amount', gasUsed: 400 };
        }
        if (!payload.duration || payload.duration < 1) {
          return { success: false, error: 'Stake duration must be at least 1 day', gasUsed: 300 };
        }
        return { success: true, message: `Staked ${payload.amount} FLOW for ${payload.duration} days`, gasUsed: 1200 };
        
      case TransactionType.TRANSFER:
        if (!payload.recipient || !payload.amount) {
          return { success: false, error: 'Missing recipient or amount', gasUsed: 400 };
        }
        return { success: true, message: 'Transfer simulated successfully', gasUsed: 600 };
        
      case TransactionType.SWAP:
        if (!payload.fromToken || !payload.toToken || !payload.amount) {
          return { success: false, error: 'Missing swap parameters', gasUsed: 300 };
        }
        return { success: true, message: `Swapped ${payload.amount} ${payload.fromToken} to ${payload.toToken}`, gasUsed: 2000 };
        
      case TransactionType.PROPOSAL:
        if (!payload.title) {
          return { success: false, error: 'Proposal title required', gasUsed: 300 };
        }
        return { success: true, message: 'Proposal created in sandbox', gasUsed: 1500 };
        
      case TransactionType.VOTE:
        if (!payload.proposalId || !payload.vote) {
          return { success: false, error: 'Missing proposal ID or vote', gasUsed: 300 };
        }
        return { success: true, message: 'Vote recorded in sandbox', gasUsed: 800 };
        
      case TransactionType.CLAIM:
        if (!payload.policyId) {
          return { success: false, error: 'Policy ID required', gasUsed: 300 };
        }
        return { success: true, message: 'Insurance claim submitted in sandbox', gasUsed: 1000 };
        
      default:
        return { success: true, message: 'Transaction simulated', gasUsed: tx.gasLimit };
    }
  }

  getTransaction(txId) {
    return this.transactions.get(txId) || null;
  }

  getPendingTransactions(limit = 50) {
    return Array.from(this.transactions.values())
      .filter(tx => tx.status === TransactionStatus.PENDING)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);
  }

  getSandboxTransactions(limit = 50) {
    return Array.from(this.transactions.values())
      .filter(tx => tx.status === TransactionStatus.SANDBOX || tx.status === TransactionStatus.VALIDATING)
      .slice(0, limit);
  }

  getConfirmedTransactions(limit = 50) {
    return Array.from(this.transactions.values())
      .filter(tx => tx.status === TransactionStatus.CONFIRMED)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  getFailedTransactions(limit = 50) {
    return Array.from(this.transactions.values())
      .filter(tx => tx.status === TransactionStatus.FAILED)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  updateTransactionStatus(txId, status, metadata = {}) {
    const tx = this.transactions.get(txId);
    if (!tx) return null;
    
    tx.status = status;
    tx.updatedAt = Date.now();
    tx.attempts += 1;
    Object.assign(tx, metadata);
    
    this.transactions.set(txId, tx);
    logger.info(`Transaction ${txId} status updated to: ${status}`);
    
    return tx;
  }

  estimateGas(token = 'FLOW', speed = 'standard') {
    const estimates = this.gasEstimates.get(token);
    if (!estimates) {
      return { fast: 0.0001, standard: 0.00005, slow: 0.00001 };
    }
    return estimates[speed] || estimates.standard;
  }

  setTestnetMode(enabled) {
    this.testnetMode = enabled;
    process.env.TESTNET_MODE = enabled ? 'true' : 'false';
    logger.info(`Testnet mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  getMempoolStats() {
    const txs = Array.from(this.transactions.values());
    return {
      total: txs.length,
      pending: txs.filter(t => t.status === TransactionStatus.PENDING).length,
      validating: txs.filter(t => t.status === TransactionStatus.VALIDATING).length,
      sandbox: txs.filter(t => t.status === TransactionStatus.SANDBOX).length,
      confirmed: txs.filter(t => t.status === TransactionStatus.CONFIRMED).length,
      failed: txs.filter(t => t.status === TransactionStatus.FAILED).length,
      testnetMode: this.testnetMode,
      gasEstimates: Object.fromEntries(this.gasEstimates)
    };
  }

  clearExpired(maxAge = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    let cleared = 0;
    
    for (const [txId, tx] of this.transactions) {
      if (now - tx.createdAt > maxAge && tx.status !== TransactionStatus.CONFIRMED) {
        tx.status = TransactionStatus.DROPPED;
        tx.updatedAt = now;
        cleared++;
      }
    }
    
    logger.info(`Cleared ${cleared} expired transactions`);
    return cleared;
  }

  getTransactionHistory(address, limit = 20) {
    return Array.from(this.transactions.values())
      .filter(tx => tx.payload.userAddress === address || tx.payload.recipient === address)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }
}

module.exports = new Mempool();
