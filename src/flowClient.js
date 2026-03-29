const { v4: uuidv4 } = require('uuid');

class FlowClient {
  constructor() {
    this.network = 'testnet';
  }

  async getAccountBalance(address) {
    return {
      address,
      balance: 0,
      staked: 0,
      locked: 0,
      available: 0,
      lastUpdated: Date.now()
    };
  }

  async executeDeposit(payload) {
    const { userAddress, amount, token } = payload;
    const txId = `tx_deposit_${uuidv4()}`;

    return {
      txId,
      type: 'deposit',
      amount,
      token,
      userAddress,
      status: 'sealed',
      blockHeight: Math.floor(Math.random() * 1000000),
      timestamp: Date.now()
    };
  }

  async executeWithdraw(payload) {
    const { userAddress, amount, token } = payload;
    const txId = `tx_withdraw_${uuidv4()}`;

    return {
      txId,
      type: 'withdraw',
      amount,
      token,
      userAddress,
      status: 'sealed',
      blockHeight: Math.floor(Math.random() * 1000000),
      timestamp: Date.now()
    };
  }

  async executeStake(payload) {
    const { userAddress, amount, duration } = payload;
    const txId = `tx_stake_${uuidv4()}`;
    const unlockDate = Date.now() + (duration * 24 * 60 * 60 * 1000);

    return {
      txId,
      type: 'stake',
      amount,
      duration,
      userAddress,
      unlockDate,
      status: 'active',
      blockHeight: Math.floor(Math.random() * 1000000),
      timestamp: Date.now()
    };
  }

  async createGovernanceProposal(payload) {
    const { creatorAddress, title, description, fundingAmount } = payload;
    const proposalId = `proposal_${uuidv4()}`;

    return {
      proposalId,
      txId: `tx_proposal_${uuidv4()}`,
      title,
      description,
      fundingAmount,
      creator: creatorAddress,
      status: 'active',
      votesFor: 0,
      votesAgainst: 0,
      quorum: 100,
      deadline: Date.now() + (7 * 24 * 60 * 60 * 1000),
      blockHeight: Math.floor(Math.random() * 1000000),
      timestamp: Date.now()
    };
  }

  async submitVote(payload) {
    const { proposalId, voterAddress, vote, weight } = payload;

    return {
      txId: `tx_vote_${uuidv4()}`,
      proposalId,
      voter: voterAddress,
      vote,
      weight,
      status: 'recorded',
      blockHeight: Math.floor(Math.random() * 1000000),
      timestamp: Date.now()
    };
  }

  async submitInsuranceClaim(payload) {
    const { policyId, claimAmount, claimantAddress } = payload;
    const claimId = `claim_${uuidv4()}`;

    return {
      claimId,
      txId: `tx_claim_${uuidv4()}`,
      policyId,
      claimAmount,
      claimant: claimantAddress,
      status: 'PENDING',
      estimatedProcessingTime: '3-5 business days',
      blockHeight: Math.floor(Math.random() * 1000000),
      timestamp: Date.now()
    };
  }
}

module.exports = new FlowClient();
