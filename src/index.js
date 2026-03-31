// src/index.js
require('dotenv').config();

const logger = require('./errorHandler').createLogger('main');
const { KBankBot } = require('./bot');
const insuranceBridge = require('./insurance/insuranceBridge');
const receiptTracker = require('./receiptTracker/receiptTracker');
const { processQueue } = require('./scheduler/scheduler');
const rateLimiter = require('./rateLimiter/rateLimiter');
const testnetPool = require('./testnetPool');

// Initialize services
let insuranceServer;
let bot;

async function initializeServices() {
  try {
    logger.info('Starting K-Bank PoC services...');

    // Initialize and start Telegram bot
    bot = new KBankBot();
    const botStarted = await bot.initialize();
    if (botStarted) {
      logger.info('Telegram bot launched');
    }

    logger.info('Testnet pool initialized with 100 FLOW per account');

    // Start insurance bridge server
    await insuranceBridge.start();
    logger.info('Insurance bridge started');

    // Start receipt persistence
    logger.info('Receipt tracker initialized with persistence');

    // Start scheduler processing
    setInterval(() => {
      processQueue().catch(err => logger.error('Scheduler error:', err));
    }, 30000); // Process every 30 seconds
    logger.info('Scheduler started');

    // Health check endpoint
    const express = require('express');
    const healthApp = express();
    healthApp.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          bot: bot ? 'running' : 'stopped',
          insurance: insuranceBridge.server ? 'running' : 'stopped',
          receiptTracker: 'running',
          scheduler: 'running'
        },
        metrics: {
          receipts: receiptTracker.getStats(),
          rateLimiter: rateLimiter.getStats()
        }
      });
    });

    const healthPort = process.env.HEALTH_PORT || 3002;
    healthApp.listen(healthPort, () => {
      logger.info(`Health server listening on port ${healthPort}`);
    });

    // Startup complete
    logger.info('✅ K-Bank PoC started successfully');
    logger.info(`Telegram bot: ${bot.bot ? 'active' : 'inactive'}`);
    logger.info(`Insurance bridge: ${insuranceBridge.server ? 'active' : 'inactive'}`);
    logger.info(`Health check: http://localhost:${healthPort}/health`);

  } catch (err) {
    logger.error('Failed to start services:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await shutdown();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await shutdown();
});

async function shutdown() {
  try {
    logger.info('Stopping services...');

    // Stop bot
    if (bot && bot.stop) {
      bot.stop();
      logger.info('Telegram bot stopped');
    }

    // Stop insurance bridge
    if (insuranceBridge && insuranceBridge.shutdown) {
      await insuranceBridge.shutdown();
      logger.info('Insurance bridge stopped');
    }

    // Save receipts
    await receiptTracker.saveToDisk();
    logger.info('Receipts saved to disk');

    // Prune old receipts
    await receiptTracker.pruneExpired(30);
    logger.info('Old receipts pruned');

    logger.info('Shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown:', err);
    process.exit(1);
  }
}

// Error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  // Try to save state before exit
  receiptTracker.saveToDisk().catch(console.error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  receiptTracker.saveToDisk().catch(console.error);
});

// Start the application
initializeServices().catch(err => {
  logger.error('Failed to initialize services:', err);
  process.exit(1);
});
