const { handleTelegramUpdate, setBotToken } = require('./telegram');
const { initKV, getReceipt, saveReceipt, getAllReceipts } = require('./kv');

let botToken = null;

async function handleRequest(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/webhook' && request.method === 'POST') {
    try {
      const update = await request.json();
      await handleTelegramUpdate(update, env);
      return new Response('OK', { status: 200 });
    } catch (err) {
      console.error('Webhook error:', err);
      return new Response('Error processing update', { status: 500 });
    }
  }

  if (url.pathname === '/health' && request.method === 'GET') {
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      worker: 'kbank-poc',
      platform: 'cloudflare-workers'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (url.pathname === '/set-webhook' && request.method === 'POST') {
    try {
      const { url: webhookUrl, secret_token } = await request.json();
      botToken = env.BOT_TOKEN;

      if (!botToken) {
        return new Response(JSON.stringify({ error: 'BOT_TOKEN not configured' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const telegramUrl = `https://api.telegram.org/bot${botToken}/setWebhook`;
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: secret_token
        })
      });

      const result = await response.json();
      return new Response(JSON.stringify(result), {
        status: response.ok ? 200 : 400,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  if (url.pathname.startsWith('/api/insurance')) {
    return handleInsuranceApi(request, env);
  }

  if (url.pathname === '/receipts' && request.method === 'GET') {
    const receipts = await getAllReceipts(env);
    return new Response(JSON.stringify({ receipts }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response('Not Found', { status: 404 });
}

async function handleInsuranceApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (request.method === 'OPTIONS') {
    return new Response('', { headers: { ...headers, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } });
  }

  try {
    if (path === '/api/insurance/claims' && request.method === 'POST') {
      const body = await request.json();
      const { claimId, policyId, ownerAddress, lossAmount } = body;

      if (!claimId || !policyId || !lossAmount) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers });
      }

      const receipt = {
        id: claimId,
        type: 'insurance_claim',
        status: 'PENDING',
        policyId,
        ownerAddress,
        lossAmount,
        timestamp: Date.now()
      };

      await saveReceipt(env, receipt);

      return new Response(JSON.stringify({
        success: true,
        claimId,
        status: 'PENDING',
        estimatedProcessingTime: '3-5 business days'
      }), { status: 202, headers });
    }

    if (path.startsWith('/api/insurance/claims/') && request.method === 'GET') {
      const claimId = path.split('/').pop();
      const receipt = await getReceipt(env, claimId);

      if (!receipt) {
        return new Response(JSON.stringify({ error: 'Claim not found' }), { status: 404, headers });
      }

      return new Response(JSON.stringify(receipt), { headers });
    }

    if (path === '/api/insurance/stats' && request.method === 'GET') {
      return new Response(JSON.stringify({
        service: 'kbank-insurance',
        version: '2.0.0',
        platform: 'cloudflare-workers'
      }), { headers });
    }

    if (path === '/api/insurance/webhook/status' && request.method === 'POST') {
      const body = await request.json();
      const { claimId, status, decision } = body;

      const receipt = await getReceipt(env, claimId);
      if (receipt) {
        receipt.status = status;
        receipt.decision = decision;
        receipt.resolvedAt = Date.now();
        await saveReceipt(env, receipt);
      }

      return new Response(JSON.stringify({ received: true }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), { status: 404, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

async function fetch(request, env) {
  await initKV(env);

  if (request.method === 'POST') {
    const signature = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (signature !== env.TELEGRAM_SECRET && env.TELEGRAM_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  return handleRequest(request, env);
}

module.exports = { fetch };
