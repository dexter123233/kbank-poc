export class BotState {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async initialize() {
    const stored = await this.state.get('botState');
    this.data = stored || {
      userWallets: {},
      pendingTransactions: [],
      rateLimits: {}
    };
  }

  async handleRequest(request) {
    await this.initialize();

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/bot/state' && request.method === 'GET') {
      return new Response(JSON.stringify({
        users: Object.keys(this.data.userWallets).length,
        pendingTransactions: this.data.pendingTransactions.length,
        rateLimits: Object.keys(this.data.rateLimits).length
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (path === '/api/bot/wallet' && request.method === 'POST') {
      const { userId, wallet } = await request.json();
      this.data.userWallets[userId] = wallet;
      await this.state.put('botState', this.data);
      return new Response(JSON.stringify({ success: true }));
    }

    if (path === '/api/bot/wallet' && request.method === 'GET') {
      const userId = url.searchParams.get('userId');
      const wallet = this.data.userWallets[userId] || null;
      return new Response(JSON.stringify({ wallet }));
    }

    return new Response('Not Found', { status: 404 });
  }
}

export default {
  async fetch(request, env, ctx) {
    const id = env.BOT_STATE.idFromName('kbank-bot-state');
    const stub = env.BOT_STATE.get(id);
    return stub.fetch(request);
  }
};
