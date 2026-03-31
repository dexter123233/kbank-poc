class TestnetPool {
  constructor() {
    this.accounts = new Map();
    this.transactions = [];
    this.isRunning = false;
  }

  initialize() {
    const testAccounts = [
      { alias: 'alice', address: '0x01cf0e2f2f715450', balance: 100 },
      { alias: 'bob', address: '0x179b6b1cb6755e31', balance: 100 },
      { alias: 'charlie', address: '0x0746d958cf6151e1', balance: 100 },
    ];

    for (const account of testAccounts) {
      this.accounts.set(account.address, {
        ...account,
        balance: 100,
        staked: 0,
      });
    }

    this.isRunning = true;
    console.log('\n🔥 K-Bank Testnet Pool Started');
    console.log('💰 Each account initialized with 100 FLOW\n');
    this.printBalances();
  }

  printBalances() {
    console.log('📊 Testnet Balances:');
    for (const [addr, acc] of this.accounts) {
      console.log(`   ${acc.alias}: ${acc.balance} FLOW`);
    }
    console.log('');
  }

  getBalance(address) {
    return this.accounts.get(address)?.balance || 0;
  }

  getAllBalances() {
    const balances = {};
    for (const [addr, acc] of this.accounts) {
      balances[acc.alias] = { address: addr, balance: acc.balance };
    }
    return balances;
  }

  transfer(fromAddress, toAddress, amount) {
    const fromAcc = this.accounts.get(fromAddress);
    const toAcc = this.accounts.get(toAddress);

    if (!fromAcc || !toAcc) {
      throw new Error('Invalid address(es)');
    }

    if (fromAcc.balance < amount) {
      throw new Error('Insufficient balance');
    }

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    fromAcc.balance -= amount;
    toAcc.balance += amount;

    const tx = {
      id: `tx_${Date.now()}`,
      type: 'transfer',
      from: fromAddress,
      fromAlias: fromAcc.alias,
      to: toAddress,
      toAlias: toAcc.alias,
      amount,
      timestamp: Date.now(),
      status: 'sealed',
    };

    this.transactions.push(tx);
    return tx;
  }

  faucet(address) {
    if (!this.accounts.has(address)) {
      this.accounts.set(address, {
        alias: `user_${address.slice(-4)}`,
        address,
        balance: 100,
        staked: 0,
      });
    }
    return this.accounts.get(address).balance;
  }

  getTransactions(address) {
    return this.transactions.filter(
      (tx) => tx.from === address || tx.to === address
    );
  }
}

const testnetPool = new TestnetPool();
export default testnetPool;
