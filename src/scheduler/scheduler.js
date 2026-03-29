// src/scheduler/scheduler.js
const { createLogger } = require('../errorHandler');
const flowClient = require('../flowClient');
const receiptTracker = require('../receiptTracker/receiptTracker');

const logger = createLogger('scheduler');

const queue = [];
const processing = new Set();
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

class TransactionJob {
  constructor(data) {
    this.id = data.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = data.type;
    this.payload = data.payload;
    this.priority = data.priority || 5;
    this.retries = 0;
    this.createdAt = Date.now();
    this.status = 'pending';
  }
}

function addToQueue(job) {
  const transactionJob = job instanceof TransactionJob ? job : new TransactionJob(job);
  queue.push(transactionJob);
  queue.sort((a, b) => b.priority - a.priority);
  logger.debug(`Job ${transactionJob.id} added to queue. Queue size: ${queue.length}`);
  return transactionJob.id;
}

async function processQueue() {
  if (processing.size >= (parseInt(process.env.MAX_CONCURRENT_TX) || 5)) {
    logger.debug('Max concurrent transactions reached, skipping...');
    return;
  }

  while (queue.length > 0 && processing.size < (parseInt(process.env.MAX_CONCURRENT_TX) || 5)) {
    const job = queue.shift();
    if (!job) break;

    processing.add(job.id);
    
    try {
      job.status = 'processing';
      logger.info(`Processing job ${job.id} (${job.type})`);

      const result = await executeTransaction(job);

      job.status = 'completed';
      job.completedAt = Date.now();
      job.result = result;

      receiptTracker.captureReceipt(job.id, {
        status: 'completed',
        ...result,
        jobType: job.type
      });

      logger.info(`Job ${job.id} completed successfully`);
    } catch (err) {
      job.retries++;
      job.lastError = err.message;
      job.status = 'pending';

      if (job.retries < MAX_RETRIES) {
        logger.warn(`Job ${job.id} failed (attempt ${job.retries}/${MAX_RETRIES}): ${err.message}`);
        setTimeout(() => {
          queue.unshift(job);
        }, RETRY_DELAY * job.retries);
      } else {
        job.status = 'failed';
        job.failedAt = Date.now();
        logger.error(`Job ${job.id} failed permanently after ${MAX_RETRIES} attempts: ${err.message}`);
        
        receiptTracker.captureReceipt(job.id, {
          status: 'failed',
          error: err.message,
          jobType: job.type,
          retries: job.retries
        });
      }
    } finally {
      processing.delete(job.id);
    }
  }
}

async function executeTransaction(job) {
  switch (job.type) {
    case 'deposit':
      return await flowClient.executeDeposit(job.payload);
    case 'withdraw':
      return await flowClient.executeWithdraw(job.payload);
    case 'stake':
      return await flowClient.executeStake(job.payload);
    case 'create_proposal':
      return await flowClient.createGovernanceProposal(job.payload);
    case 'vote':
      return await flowClient.submitVote(job.payload);
    case 'claim_insurance':
      return await flowClient.submitInsuranceClaim(job.payload);
    default:
      throw new Error(`Unknown transaction type: ${job.type}`);
  }
}

function getQueueStatus() {
  return {
    pending: queue.length,
    processing: processing.size,
    jobs: queue.map(j => ({
      id: j.id,
      type: j.type,
      priority: j.priority,
      status: j.status,
      retries: j.retries,
      createdAt: j.createdAt
    }))
  };
}

function getJobStatus(jobId) {
  return queue.find(j => j.id === jobId) || 
    Array.from(processing).includes(jobId) ? { status: 'processing' } : null;
}

function cancelJob(jobId) {
  const index = queue.findIndex(j => j.id === jobId);
  if (index !== -1) {
    const job = queue.splice(index, 1)[0];
    job.status = 'cancelled';
    logger.info(`Job ${jobId} cancelled`);
    return true;
  }
  return false;
}

module.exports = {
  addToQueue,
  processQueue,
  getQueueStatus,
  getJobStatus,
  cancelJob,
  TransactionJob
};
