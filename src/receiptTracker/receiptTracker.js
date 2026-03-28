// src/receiptTracker/receiptTracker.js
const fs = require('fs').promises;
const path = require('path');
const { createLogger } = require('../errorHandler');

const logger = createLogger('receiptTracker');

class ReceiptTracker {
  constructor() {
    this.cache = new Map();
    this.persistencePath = process.env.RECEIPT_PERSISTENCE_PATH || './data/receipts.json';
    this.loadInterval = parseInt(process.env.RECEIPT_SAVE_INTERVAL || '300000'); // 5 minutes
    this.loadFromDisk();
    this.startPersistenceLoop();
  }

  async loadFromDisk() {
    try {
      const data = await fs.readFile(this.persistencePath, 'utf-8');
      const receipts = JSON.parse(data);
      receipts.forEach(receipt => {
        this.cache.set(receipt.id, receipt);
      });
      logger.info(`Loaded ${receipts.length} receipts from disk`);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        logger.error(`Failed to load receipts: ${err.message}`);
      }
    }
  }

  async saveToDisk() {
    try {
      const receipts = Array.from(this.cache.values());
      await fs.writeFile(
        this.persistencePath,
        JSON.stringify(receipts, null, 2),
        'utf-8'
      );
      logger.debug(`Saved ${receipts.length} receipts to disk`);
    } catch (err) {
      logger.error(`Failed to save receipts: ${err.message}`);
    }
  }

  startPersistenceLoop() {
    setInterval(() => {
      this.saveToDisk().catch(err => logger.error(`Persistence loop error: ${err.message}`));
    }, this.loadInterval);
  }

  async captureReceipt(txId, receiptData) {
    const receipt = {
      id: txId,
      timestamp: Date.now(),
      status: receiptData.status || 'pending',
      blockHeight: receiptData.blockHeight,
      transactionStatus: receiptData.transactionStatus,
      events: receiptData.events || [],
      data: receiptData.data || {},
      ...receiptData
    };

    this.cache.set(txId, receipt);
    logger.info(`Captured receipt for transaction ${txId}`);

    // Immediately save to disk for critical receipts
    if (receiptData.critical) {
      await this.saveToDisk();
    }

    return receipt;
  }

  getReceipt(txId) {
    return this.cache.get(txId) || null;
  }

  getAllReceipts() {
    return Array.from(this.cache.values());
  }

  async pruneExpired(days = 30) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    let pruned = 0;
    for (const [txId, receipt] of this.cache.entries()) {
      if (receipt.timestamp < cutoff) {
        this.cache.delete(txId);
        pruned++;
      }
    }
    if (pruned > 0) {
      logger.info(`Pruned ${pruned} old receipts`);
      await this.saveToDisk();
    }
  }

  getStats() {
    const receipts = this.getAllReceipts();
    const statusCounts = receipts.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    return {
      total: receipts.length,
      byStatus: statusCounts,
      oldestReceipt: receipts.length > 0 ? Math.min(...receipts.map(r => r.timestamp)) : null,
      newestReceipt: receipts.length > 0 ? Math.max(...receipts.map(r => r.timestamp)) : null
    };
  }
}

module.exports = new ReceiptTracker();
