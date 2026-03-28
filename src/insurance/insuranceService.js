// src/insurance/insuranceService.js
const axios = require('axios');
const { createLogger } = require('../errorHandler');
const receiptTracker = require('../receiptTracker/receiptTracker');

const logger = createLogger('insurance');

class InsuranceService {
  constructor() {
    this.baseUrl = process.env.INSURANCE_API_URL || 'https://api.nexusmutual.io';
    this.apiKey = process.env.INSURANCE_API_KEY;
    this.contractAddress = process.env.INSURANCE_CONTRACT_ADDRESS || '0xInsuranceContract';
    this.coverageAmount = parseFloat(process.env.INSURANCE_COVERAGE_AMOUNT) || 1000000;
    this.premiumRate = parseFloat(process.env.INSURANCE_PREMIUM_RATE) || 0.001; // 0.1%
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000
    };
  }

  async retryWithBackoff(fn, retryCount = 0) {
    try {
      return await fn();
    } catch (err) {
      if (retryCount >= this.retryConfig.maxRetries) {
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, this.retryConfig.retryDelay * (retryCount + 1)));
      return this.retryWithBackoff(fn, retryCount + 1);
    }
  }

  async createPolicy(userAddress: string, coverageAmount: number, premium: number) {
    return this.retryWithBackoff(async () => {
      const response = await axios.post(
        `${this.baseUrl}/policies`,
        {
          contractAddress: this.contractAddress,
          beneficiary: userAddress,
          coverageAmount,
          premium,
          currency: 'USD',
          period: 365, // 1 year
          product: 'kbank-deposit-protection'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const policy = response.data;
      logger.info(`Policy created for ${userAddress}: ${policy.policyId}`);
      return policy;
    });
  }

  async submitClaim(claimData) {
    return this.retryWithBackoff(async () => {
      const { claimId, policyId, eventType, eventDate, lossAmount, evidence } = claimData;

      const response = await axios.post(
        `${this.baseUrl}/claims`,
        {
          policyId,
          eventType,
          eventDate,
          lossAmount,
          evidence: evidence || [],
          claimant: claimData.claimantAddress,
          metadata: {
            source: 'kbank-poc',
            transactionHash: claimData.txHash,
            blockNumber: claimData.blockNumber
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const claim = response.data;
      logger.info(`Claim submitted ${claimId}: policy ${policyId}`);
      return claim;
    });
  }

  async getClaimStatus(claimId) {
    return this.retryWithBackoff(async () => {
      const response = await axios.get(
        `${this.baseUrl}/claims/${claimId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 15000
        }
      );
      return response.data;
    });
  }

  async verifyPolicy(policyId) {
    return this.retryWithBackoff(async () => {
      const response = await axios.get(
        `${this.baseUrl}/policies/${policyId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 15000
        }
      );

      const policy = response.data;
      // Check if policy is active
      const now = new Date();
      const expiration = new Date(policy.expiresAt);
      const isActive = now < expiration && policy.status === 'ACTIVE';

      if (!isActive) {
        throw new Error(`Policy ${policyId} is not active`);
      }

      return policy;
    });
  }

  async processClaimDecision(claimId, decision, reason = null) {
    try {
      // Update cache with claim decision
      const receipt = receiptTracker.getReceipt(claimId);
      if (receipt) {
        receiptTracker.captureReceipt(claimId, {
          ...receipt,
          claimStatus: decision,
          claimReason: reason,
          claimProcessedAt: Date.now()
        });
      }

      logger.info(`Claim ${claimId} processed: ${decision}`);
      return { success: true, decision };
    } catch (err) {
      logger.error(`Failed to process claim decision: ${err.message}`);
      throw err;
    }
  }

  async calculatePremium(coverageAmount: number, userRiskScore: number = 1.0): Promise<number> {
    // Risk-based pricing (lower risk score = lower premium)
    const baseRate = this.premiumRate;
    const adjustedRate = baseRate * userRiskScore;
    return coverageAmount * adjustedRate;
  }

  async createAutomaticPolicy(userAddress: string, depositAmount: number) {
    // Automatically create policy for users with deposits > threshold
    if (depositAmount < 1000) {
      return null;
    }

    const coverageAmount = Math.min(depositAmount, this.coverageAmount);
    const premium = await this.calculatePremium(coverageAmount);

    try {
      const policy = await this.createPolicy(userAddress, coverageAmount, premium);
      logger.info(`Auto-policy created for ${userAddress}: coverage ${coverageAmount}, premium ${premium}`);
      return policy;
    } catch (err) {
      logger.error(`Failed to create auto-policy: ${err.message}`);
      return null;
    }
  }

  getRiskScore(userAddress: string, transactionHistory: any[]): number {
    // Simple risk assessment
    let riskScore = 1.0;

    // Based on transaction counts
    const txCount = transactionHistory.length;
    if (txCount < 5) riskScore += 0.3; // New user
    if (txCount > 100) riskScore += 0.1; // Active user

    // More sophisticated scoring would go here
    // Including: age of account, withdrawal patterns, gas usage patterns, etc.

    return riskScore;
  }

  async validateClaim(claimId: string, evidence: any[]): Promise<boolean> {
    // Validate claim evidence
    if (!evidence || evidence.length === 0) {
      throw new Error('No evidence provided');
    }

    // Simple validation - in production would include:
    // - Transaction proofs
    // - Multisig verification
    // - External audit data
    // - Time-based validation

    const isValid = evidence.every(item =>
      item.verified !== false && item.timestamp > (Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    return isValid;
  }
}

module.exports = new InsuranceService();
