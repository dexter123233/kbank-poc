// src/insurance/insuranceBridge.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { createLogger } = require('../errorHandler');
const insuranceService = require('./insuranceService');
const flowClient = require('../flowClient');

const logger = createLogger('insurance-bridge');

class InsuranceBridge {
  constructor() {
    this.app = express();
    this.port = process.env.INSURANCE_PORT || 3001;
    this.rateLimitConfig = {
      windowMs: 60 * 1000, // 1 minute
      max: 30, // limit each IP to 30 requests per windowMs
      message: 'Too many insurance claims from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    };
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable for now, configure properly in production
      crossOriginEmbedderPolicy: false
    }));

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    const limiter = rateLimit(this.rateLimitConfig);
    this.app.use('/api/insurance/*', limiter);

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
      next();
    });

    // Error handling middleware
    this.app.use((err, req, res, next) => {
      logger.error(`Insurance bridge error: ${err.message}`);
      res.status(500).json({
        error: 'Internal server error',
        requestId: req.headers['x-request-id']
      });
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Submit insurance claim
    this.app.post('/api/insurance/claims', async (req, res) => {
      try {
        const { claimId, policyId, ownerAddress, eventType, eventDate, lossAmount, evidence, txHash, blockNumber } = req.body;

        // Validation
        if (!claimId || !policyId || !lossAmount) {
          return res.status(400).json({
            error: 'Missing required fields: claimId, policyId, lossAmount'
          });
        }

        if (lossAmount <= 0) {
          return res.status(400).json({
            error: 'Invalid loss amount'
          });
        }

        // Verify policy
        try {
          const policy = await insuranceService.verifyPolicy(policyId);
          if (policy.beneficiary !== ownerAddress) {
            return res.status(403).json({
              error: 'Policy beneficiary mismatch'
            });
          }
          if (policy.coverageAmount < lossAmount) {
            return res.status(400).json({
              error: 'Loss amount exceeds coverage limit',
              coverageLimit: policy.coverageAmount
            });
          }
        } catch (err) {
          logger.error(`Policy verification failed: ${err.message}`);
          return res.status(404).json({
            error: 'Policy not found or invalid'
          });
        }

        // Validate claim evidence
        try {
          const isValid = await insuranceService.validateClaim(claimId, evidence || []);
          if (!isValid) {
            return res.status(400).json({
              error: 'Invalid or insufficient evidence provided'
            });
          }
        } catch (err) {
          return res.status(400).json({
            error: `Evidence validation failed: ${err.message}`
          });
        }

        // Submit claim to insurance provider
        const claim = await insuranceService.submitClaim({
          claimId,
          policyId,
          eventType,
          eventDate,
          lossAmount,
          evidence,
          txHash,
          blockNumber,
          claimantAddress: ownerAddress
        });

        // Record on-chain (for callback simulation)
        try {
          await flowClient.recordClaim({
            claimId,
            policyId,
            ownerAddress,
            amount: lossAmount,
            status: 'PENDING'
          });

          logger.info(`Claim recorded on-chain: ${claimId}`);
        } catch (err) {
          logger.warn(`Failed to record claim on-chain: ${err.message}`);
          // Continue - off-chain tracking is more critical
        }

        res.status(202).json({
          success: true,
          message: 'Claim submitted successfully',
          claimId: claim.claimId,
          status: claim.status,
          estimatedProcessingTime: claim.estimatedProcessingTime || '3-5 business days',
          claimReference: claim.referenceNumber
        });

      } catch (err) {
        logger.error(`Claim submission error: ${err.message}`);
        res.status(500).json({
          error: 'Failed to submit claim',
          details: err.message
        });
      }
    });

    // Get claim status
    this.app.get('/api/insurance/claims/:claimId', async (req, res) => {
      try {
        const { claimId } = req.params;

        const status = await insuranceService.getClaimStatus(claimId);

        res.json({
          claimId,
          ...status
        });
      } catch (err) {
        logger.error(`Failed to get claim status: ${err.message}`);
        res.status(500).json({
          error: 'Failed to retrieve claim status'
        });
      }
    });

    // Insurance provider webhook callback
    this.app.post('/api/insurance/webhook/status', async (req, res) => {
      try {
        const { claimId, status, decision, txHash, reason } = req.body;

        // Verify webhook signature (implement based on provider)
        const signature = req.headers['x-insurance-signature'];
        if (!signature) {
          return res.status(401).json({ error: 'Missing signature' });
        }

        // Process claim decision
        await insuranceService.processClaimDecision(claimId, status, reason);

        // Record final transaction on-chain if approved
        if (status === 'APPROVED' && txHash) {
          await flowClient.recordClaimResolution({
            claimId,
            txHash,
            status,
            timestamp: Date.now()
          });
        }

        logger.info(`Webhook processed for claim ${claimId}: ${status}`);
        res.json({ received: true });
      } catch (err) {
        logger.error(`Webhook processing error: ${err.message}`);
        res.status(500).json({ error: 'Webhook processing failed' });
      }
    });

    // Create automatic policy
    this.app.post('/api/insurance/policies/auto', async (req, res) => {
      try {
        const { ownerAddress, depositAmount } = req.body;

        if (!ownerAddress || !depositAmount) {
          return res.status(400).json({
            error: 'Missing required fields: ownerAddress, depositAmount'
          });
        }

        const policy = await insuranceService.createAutomaticPolicy(ownerAddress, depositAmount);

        if (!policy) {
          return res.status(200).json({
            success: false,
            message: 'Deposit amount below threshold for automatic policy'
          });
        }

        res.json({
          success: true,
          policy,
          message: 'Automatic policy created'
        });
      } catch (err) {
        logger.error(`Auto-policy creation failed: ${err.message}`);
        res.status(500).json({
          error: 'Failed to create automatic policy'
        });
      }
    });

    // Premium calculator
    this.app.get('/api/insurance/premium/:coverageAmount/:riskScore?', (req, res) => {
      try {
        const { coverageAmount } = req.params;
        const riskScore = parseFloat(req.params.riskScore) || 1.0;

        const premium = insuranceService.calculatePremium(parseFloat(coverageAmount), riskScore);

        res.json({
          coverageAmount: parseFloat(coverageAmount),
          riskScore,
          premium,
          currency: 'USD'
        });
      } catch (err) {
        logger.error(`Premium calculation failed: ${err.message}`);
        res.status(500).json({
          error: 'Failed to calculate premium'
        });
      }
    });

    // Stats endpoint
    this.app.get('/api/insurance/stats', (req, res) => {
      res.json({
        service: 'kbank-insurance',
        version: '1.0.0',
        baseUrl: this.baseUrl,
        coverageLimit: insuranceService.coverageAmount,
        premiumRate: insuranceService.premiumRate
      });
    });
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, '0.0.0.0', () => {
          logger.info(`✅ Insurance bridge listening on port ${this.port}`);
          resolve();
        });

        this.server.on('error', (err) => {
          logger.error(`Insurance bridge failed to start: ${err.message}`);
          reject(err);
        });

        // Graceful shutdown
        process.on('SIGTERM', async () => {
          logger.info('SIGTERM received, shutting down gracefully');
          await this.shutdown();
        });

        process.on('SIGINT', async () => {
          logger.info('SIGINT received, shutting down gracefully');
          await this.shutdown();
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  async shutdown() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('Insurance bridge server closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = new InsuranceBridge();
