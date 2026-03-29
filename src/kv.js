const RECEIPTS_KV = 'RECEIPTS';
const WALLETS_KV = 'WALLETS';

async function initKV(env) {
  if (!env.RECEIPTS || !env.WALLETS) {
    console.warn('KV namespaces not configured');
  }
}

async function getReceipt(env, id) {
  if (!env.RECEIPTS) return null;
  try {
    const data = await env.RECEIPTS.get(id);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('KV getReceipt error:', err);
    return null;
  }
}

async function saveReceipt(env, receipt) {
  if (!env.RECEIPTS) {
    console.warn('RECEIPTS KV not configured, skipping save');
    return;
  }
  try {
    await env.RECEIPTS.put(receipt.id, JSON.stringify(receipt), {
      expirationTtl: 86400 * 30
    });
  } catch (err) {
    console.error('KV saveReceipt error:', err);
  }
}

async function getAllReceipts(env) {
  if (!env.RECEIPTS) return [];
  try {
    const list = await env.RECEIPTS.list();
    const receipts = [];

    for (const key of list.keys) {
      const receipt = await env.RECEIPTS.get(key.name);
      if (receipt) {
        receipts.push(JSON.parse(receipt));
      }
    }

    return receipts.sort((a, b) => b.timestamp - a.timestamp);
  } catch (err) {
    console.error('KV getAllReceipts error:', err);
    return [];
  }
}

async function getWallet(env, userId) {
  if (!env.WALLETS) return null;
  try {
    const wallet = await env.WALLETS.get(userId);
    return wallet || null;
  } catch (err) {
    console.error('KV getWallet error:', err);
    return null;
  }
}

async function setWallet(env, userId, address) {
  if (!env.WALLETS) {
    console.warn('WALLETS KV not configured');
    return;
  }
  try {
    await env.WALLETS.put(userId, address, {
      expirationTtl: 86400 * 365
    });
  } catch (err) {
    console.error('KV setWallet error:', err);
  }
}

async function deleteWallet(env, userId) {
  if (!env.WALLETS) return;
  try {
    await env.WALLETS.delete(userId);
  } catch (err) {
    console.error('KV deleteWallet error:', err);
  }
}

module.exports = {
  initKV,
  getReceipt,
  saveReceipt,
  getAllReceipts,
  getWallet,
  setWallet,
  deleteWallet
};
