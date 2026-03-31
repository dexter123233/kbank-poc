import express from 'express';
import mempool from './src/mempool/mempool.js';
import sandbox from './src/mempool/sandbox.js';

const app = express();
const PORT = 3005;

mempool.setTestnetMode(true);
sandbox.setNetwork('testnet');

const testTxs = [
  { type: 'deposit', payload: { userAddress: '0x01cf0e2f2f715450', amount: 100, token: 'FLOW' }, priority: 10 },
  { type: 'stake', payload: { userAddress: '0x179b6b1cb6755e31', amount: 50, duration: 30 }, priority: 8 },
  { type: 'transfer', payload: { userAddress: '0x01cf0e2f2f715450', recipient: '0x179b6b1cb6755e31', amount: 25 }, priority: 7 },
  { type: 'withdraw', payload: { userAddress: '0x1b55db1c1e8b6a01', amount: 75 }, priority: 9 },
];

testTxs.forEach(tx => mempool.addTransaction(tx));

setTimeout(() => {
  const getStats = () => {
    const stats = mempool.getMempoolStats();
    const confirmed = mempool.getConfirmedTransactions();
    return { stats, confirmed };
  };

  app.get('/', (req, res) => {
    const { stats, confirmed } = getStats();
    
    res.send(`<!DOCTYPE html>
<html>
<head>
  <title>K-Bank Testnet Mempool</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%); min-height: 100vh; color: #fff; font-family: system-ui; }
    .glow { animation: glow 2s ease-in-out infinite alternate; }
    @keyframes glow { from { box-shadow: 0 0 10px #00ff88; } to { box-shadow: 0 0 20px #00ff88, 0 0 30px #00ff88; } }
  </style>
</head>
<body>
  <div class="max-w-5xl mx-auto p-8">
    <div class="text-center mb-8">
      <h1 class="text-5xl font-bold mb-2 glow">🔥 K-Bank Testnet Mempool</h1>
      <p class="text-xl text-green-400">Network: ${sandbox.getNetwork().toUpperCase()}</p>
    </div>
    
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
        <div class="text-gray-400 text-sm">Total TXs</div>
        <div class="text-3xl font-bold">${stats.total}</div>
      </div>
      <div class="bg-gray-800/50 p-6 rounded-xl border border-yellow-600">
        <div class="text-gray-400 text-sm">Pending</div>
        <div class="text-3xl font-bold text-yellow-400">${stats.pending}</div>
      </div>
      <div class="bg-gray-800/50 p-6 rounded-xl border border-green-600 glow">
        <div class="text-gray-400 text-sm">Confirmed</div>
        <div class="text-3xl font-bold text-green-400">${stats.confirmed}</div>
      </div>
      <div class="bg-gray-800/50 p-6 rounded-xl border border-red-600">
        <div class="text-gray-400 text-sm">Failed</div>
        <div class="text-3xl font-bold text-red-400">${stats.failed}</div>
      </div>
    </div>
    
    <div class="bg-gray-800/30 p-6 rounded-xl border border-gray-700 mb-8">
      <h2 class="text-xl font-bold mb-4">📋 Test Accounts</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
        ${sandbox.getAllTestAccounts().map(a => `<div class="bg-gray-800 p-2 rounded">${a.alias}: ${a.address.slice(0,12)}... (${a.balance} FLOW)</div>`).join('')}
      </div>
    </div>
    
    <h2 class="text-xl font-bold mb-4">Recent Transactions</h2>
    <table class="w-full bg-gray-800/30 rounded-xl overflow-hidden">
      <thead class="bg-gray-800">
        <tr class="text-left text-gray-400">
          <th class="p-3">ID</th>
          <th class="p-3">Type</th>
          <th class="p-3">Status</th>
          <th class="p-3">Amount</th>
          <th class="p-3">Time</th>
        </tr>
      </thead>
      <tbody>
        ${confirmed.slice(0,10).map(tx => `
        <tr class="border-t border-gray-700">
          <td class="p-3 text-sm font-mono">${tx.id.slice(0,20)}...</td>
          <td class="p-3"><span class="bg-blue-900 text-blue-300 px-2 py-1 rounded text-sm">${tx.type}</span></td>
          <td class="p-3"><span class="bg-green-900 text-green-300 px-2 py-1 rounded text-sm">${tx.status}</span></td>
          <td class="p-3">${tx.payload.amount || '-'} ${tx.payload.token || ''}</td>
          <td class="p-3 text-gray-400 text-sm">${new Date(tx.createdAt).toLocaleTimeString()}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="mt-8 text-center text-gray-500">
      <p>K-Bank Testnet Pool Running • Auto-refresh every 5s</p>
    </div>
  </div>
  
  <meta http-equiv="refresh" content="5">
</body>
</html>`);
  });

  app.listen(PORT, () => {
    console.log(`🌐 http://localhost:${PORT}`);
  });
}, 3000);
