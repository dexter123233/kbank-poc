import { createLogger } from '../errorHandler.js';
import mempool from './mempool.js';

const logger = createLogger('sandbox');

const NetworkType = {
  MAINNET: 'mainnet',
  TESTNET: 'testnet',
  SANDBOX: 'sandbox',
  DEVNET: 'devnet'
};

const SandboxEnvironment = {
  flowEmulator: {
    network: NetworkType.DEVNET,
    rpcUrl: 'http://localhost:8888',
    restUrl: 'http://localhost:8080',
    walletUrl: 'http://localhost:8081',
    chainId: '0x1234',
    token: 'FLOW',
    explorer: 'http://localhost:3000'
  },
  flowTestnet: {
    network: NetworkType.TESTNET,
    rpcUrl: 'https://access-testnet.onflow.org',
    restUrl: 'https://rest-testnet.onflow.org',
    walletUrl: 'https://wallet-testnet.onflow.org',
    chainId: '0x45,0x4',
    token: 'FLOW',
    explorer: 'https://testnet.flowdiver.io'
  },
  flowMainnet: {
    network: NetworkType.MAINNET,
    rpcUrl: 'https://access.mainnet.onflow.org',
    restUrl: 'https://rest-mainnet.onflow.org',
    walletUrl: 'https://wallet-mainnet.onflow.org',
    chainId: '0x165,0x1',
    token: 'FLOW',
    explorer: 'https://flowdiver.io'
  },
  sandbox: {
    network: NetworkType.SANDBOX,
    rpcUrl: 'sandbox://internal',
    restUrl: 'sandbox://internal',
    walletUrl: 'sandbox://internal',
    chainId: 'sandbox',
    token: 'tFLOW',
    explorer: null
  }
};

class Sandbox {
  constructor() {
    this.currentNetwork = process.env.NETWORK || NetworkType.TESTNET;
    this.environments = { ...SandboxEnvironment };
    this.sandboxState = new Map();
    this.mockBalances = new Map();
    this.testAccounts = new Map();
    this.transactionLogs = [];
    
    this.initializeTestAccounts();
  }

  initializeTestAccounts() {
    const testWallets = [
      { address: '0x01cf0e2f2f715450', alias: 'alice', balance: 1000 },
      { address: '0x179b6b1cb6755e31', alias: 'bob', balance: 500 },
      { address: '0x1b55db1c1e8b6a01', alias: 'charlie', balance: 750 },
      { address: '0x2d4b55db1c1e8b6a', alias: 'dave', balance: 250 },
      { address: '0xf846f03ac7e4d62e', alias: 'kbank_admin', balance: 10000 }
    ];

    testWallets.forEach(wallet => {
      this.testAccounts.set(wallet.address, wallet);
      this.mockBalances.set(wallet.address, wallet.balance);
    });

    logger.info(`Sandbox initialized with ${testWallets.length} test accounts`);
  }

  setNetwork(networkType) {
    if (!Object.values(NetworkType).includes(networkType)) {
      throw new Error(`Invalid network type: ${networkType}`);
    }
    this.currentNetwork = networkType;
    logger.info(`Sandbox network set to: ${networkType}`);
    return this.getNetworkConfig();
  }

  getNetworkConfig() {
    const envKey = this.currentNetwork === NetworkType.SANDBOX ? 'sandbox' : 
                   this.currentNetwork === NetworkType.TESTNET ? 'flowTestnet' : 
                   this.currentNetwork === NetworkType.MAINNET ? 'flowMainnet' : 'flowEmulator';
    return this.environments[envKey];
  }

  getTestAccount(addressOrAlias) {
    for (const [addr, account] of this.testAccounts) {
      if (addr === addressOrAlias || account.alias === addressOrAlias) {
        return { ...account };
      }
    }
    return null;
  }

  getAllTestAccounts() {
    return Array.from(this.testAccounts.values());
  }

  getMockBalance(address) {
    return this.mockBalances.get(address) || 0;
  }

  setMockBalance(address, balance) {
    this.mockBalances.set(address, balance);
    return balance;
  }

  async executeInSandbox(txData) {
    const sandboxId = `sbx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const sandboxTx = {
      id: sandboxId,
      originalTx: txData,
      network: this.currentNetwork,
      status: 'preparing',
      result: null,
      logs: [],
      gasUsed: 0,
      blockTime: null,
      timestamp: Date.now()
    };

    this.sandboxState.set(sandboxId, sandboxTx);
    this.transactionLogs.push(sandboxTx);

    try {
      sandboxTx.status = 'simulating';
      const result = await this.simulateTransaction(txData);
      
      sandboxTx.result = result;
      sandboxTx.status = result.success ? 'confirmed' : 'failed';
      sandboxTx.gasUsed = result.gasUsed || 0;
      sandboxTx.blockTime = Math.floor(Math.random() * 15) + 1;
      
      sandboxTx.logs.push({
        event: 'simulation_complete',
        success: result.success,
        message: result.message
      });

      logger.info(`Sandbox execution ${sandboxId}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      
      return sandboxId;
    } catch (error) {
      sandboxTx.status = 'error';
      sandboxTx.result = { success: false, error: error.message };
      
      sandboxTx.logs.push({
        event: 'simulation_error',
        error: error.message
      });

      logger.error(`Sandbox execution error ${sandboxId}: ${error.message}`);
      return sandboxId;
    } finally {
      this.sandboxState.set(sandboxId, sandboxTx);
    }
  }

  simulateTransaction(txData) {
    const { type, payload } = txData;

    switch (type) {
      case 'deposit':
        const currentBalance = this.mockBalances.get(payload.userAddress) || 0;
        this.mockBalances.set(payload.userAddress, currentBalance + payload.amount);
        return {
          success: true,
          message: `Deposited ${payload.amount} ${payload.token || 'FLOW'}`,
          newBalance: currentBalance + payload.amount,
          gasUsed: 800
        };

      case 'withdraw':
        const withdrawBalance = this.mockBalances.get(payload.userAddress) || 0;
        if (withdrawBalance < payload.amount) {
          return {
            success: false,
            error: 'Insufficient balance',
            gasUsed: 500
          };
        }
        this.mockBalances.set(payload.userAddress, withdrawBalance - payload.amount);
        return {
          success: true,
          message: `Withdrew ${payload.amount} ${payload.token || 'FLOW'}`,
          newBalance: withdrawBalance - payload.amount,
          gasUsed: 750
        };

      case 'stake':
        const stakeBalance = this.mockBalances.get(payload.userAddress) || 0;
        if (stakeBalance < payload.amount) {
          return { success: false, error: 'Insufficient balance to stake', gasUsed: 400 };
        }
        return {
          success: true,
          message: `Staked ${payload.amount} FLOW for ${payload.duration || 30} days`,
          estimatedYield: (payload.amount * 0.05 * (payload.duration || 30) / 365).toFixed(2),
          gasUsed: 1200
        };

      case 'transfer':
        const senderBalance = this.mockBalances.get(payload.userAddress) || 0;
        if (senderBalance < payload.amount) {
          return { success: false, error: 'Insufficient balance', gasUsed: 400 };
        }
        const recipientBalance = this.mockBalances.get(payload.recipient) || 0;
        this.mockBalances.set(payload.userAddress, senderBalance - payload.amount);
        this.mockBalances.set(payload.recipient, recipientBalance + payload.amount);
        return {
          success: true,
          message: `Transferred ${payload.amount} to ${payload.recipient.slice(0, 10)}...`,
          gasUsed: 600
        };

      case 'swap':
        return {
          success: true,
          message: `Swapped ${payload.amount} ${payload.fromToken} to ~${(payload.amount * 0.98).toFixed(2)} ${payload.toToken}`,
          rate: 0.98,
          gasUsed: 2000
        };

      case 'create_proposal':
        const proposalId = `prop_${Date.now()}`;
        return {
          success: true,
          message: `Proposal created: ${payload.title}`,
          proposalId,
          fundingAmount: payload.fundingAmount,
          gasUsed: 1500
        };

      case 'vote':
        return {
          success: true,
          message: `Vote (${payload.vote}) recorded for proposal ${payload.proposalId}`,
          gasUsed: 800
        };

      case 'claim_insurance':
        return {
          success: true,
          message: `Insurance claim submitted for policy ${payload.policyId}`,
          claimId: `claim_${Date.now()}`,
          gasUsed: 1000
        };

      default:
        return {
          success: true,
          message: 'Transaction simulated',
          gasUsed: 500
        };
    }
  }

  getSandboxResult(sandboxId) {
    return this.sandboxState.get(sandboxId) || null;
  }

  getSandboxStats() {
    const logs = this.transactionLogs;
    return {
      network: this.currentNetwork,
      config: this.getNetworkConfig(),
      testAccounts: this.getAllTestAccounts().length,
      sandboxTransactions: this.sandboxState.size,
      recentTransactions: {
        total: logs.length,
        confirmed: logs.filter(l => l.status === 'confirmed').length,
        failed: logs.filter(l => l.status === 'failed').length,
        pending: logs.filter(l => l.status === 'simulating').length
      }
    };
  }

  resetSandbox() {
    this.sandboxState.clear();
    this.transactionLogs = [];
    
    this.testAccounts.forEach((account, address) => {
      this.mockBalances.set(address, account.balance);
    });
    
    logger.info('Sandbox reset complete');
  }

  getNetwork() {
    return this.currentNetwork;
  }

  getSupportedNetworks() {
    return Object.values(NetworkType);
  }
}

export default new Sandbox();
