require('dotenv').config();

const mempool = require('./src/mempool/mempool');
const sandbox = require('./src/mempool/sandbox');

console.log('\n🔥 K-Bank Testnet Mempool Starting...\n');

async function runTestnet() {
  mempool.setTestnetMode(true);
  sandbox.setNetwork('testnet');
  
  console.log('📡 Network:', sandbox.getNetwork());
  console.log('📋 Test Accounts:', sandbox.getAllTestAccounts().map(a => `${a.alias}: ${a.address}`).join('\n   '));
  console.log('\n--- Testnet Pool Active ---\n');

  const testTxs = [
    { type: 'deposit', payload: { userAddress: '0x01cf0e2f2f715450', amount: 100, token: 'FLOW' }, priority: 10 },
    { type: 'stake', payload: { userAddress: '0x179b6b1cb6755e31', amount: 50, duration: 30 }, priority: 8 },
    { type: 'transfer', payload: { userAddress: '0x01cf0e2f2f715450', recipient: '0x179b6b1cb6755e31', amount: 25 }, priority: 7 },
  ];

  for (const tx of testTxs) {
    const txId = mempool.addTransaction(tx);
    console.log(`✅ Added: ${tx.type} (${txId})`);
  }

  await new Promise(r => setTimeout(r, 2000));
  
  console.log('\n📊 Mempool Stats:', JSON.stringify(mempool.getMempoolStats(), null, 2));
  console.log('\n✅ Testnet pool is running!');
  
  setInterval(async () => {
    const pending = mempool.getPendingTransactions();
    const confirmed = mempool.getConfirmedTransactions();
    if (pending.length > 0 || confirmed.length > 0) {
      console.log(`\n[${new Date().toISOString()}] Pending: ${pending.length}, Confirmed: ${confirmed.length}`);
    }
  }, 5000);
}

runTestnet().catch(console.error);
