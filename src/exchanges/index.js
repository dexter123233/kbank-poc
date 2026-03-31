class ExchangeClient {
  constructor(config) {
    this.name = config.name || 'Unknown Exchange';
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.passphrase = config.passphrase;
    this.testnet = config.testnet || false;
    this.markets = new Map();
    this.orders = new Map();
    this.balances = new Map();
  }

  async fetchTicker(pair) {
    throw new Error('fetchTicker not implemented');
  }

  async createOrder(orderType, pair, amount, price) {
    throw new Error('createOrder not implemented');
  }

  async getBalance(currency) {
    throw new Error('getBalance not implemented');
  }

  async getOrderBook(pair, depth = 20) {
    throw new Error('getOrderBook not implemented');
  }

  generateOrderId() {
    return `ord_${this.name.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  formatPair(base, quote) {
    return `${base}/${quote}`.toUpperCase();
  }

  calculateFees(amount, feeTier = 0) {
    const feeRates = [0.005, 0.0045, 0.004, 0.0035, 0.003, 0.0025];
    const rate = feeRates[Math.min(feeTier, feeRates.length - 1)];
    return amount * rate;
  }
}

class BinanceExchange extends ExchangeClient {
  constructor(config) {
    super({
      name: 'Binance',
      baseUrl: config.testnet ? 'https://testnet.binance.vision' : 'https://api.binance.com',
      ...config
    });
    this.quoteCurrencies = ['USDT', 'USDC', 'BUSD', 'BTC', 'ETH'];
  }

  async fetchTicker(pair) {
    const tickerUrl = `${this.baseUrl}/api/v3/ticker/price?symbol=${pair.replace('/', '')}`;
    try {
      const response = await fetch(tickerUrl);
      const data = await response.json();
      return {
        symbol: data.symbol,
        price: parseFloat(data.price),
        timestamp: Date.now()
      };
    } catch (error) {
      return { symbol: pair, price: 0, error: error.message };
    }
  }

  async getOrderBook(pair, depth = 20) {
    const url = `${this.baseUrl}/api/v3/depth?symbol=${pair.replace('/', '')}&limit=${depth}`;
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      return { bids: [], asks: [], error: error.message };
    }
  }

  async getBalance(currency) {
    return {
      currency: currency.toUpperCase(),
      available: 0,
      locked: 0,
      total: 0
    };
  }

  async createOrder(orderType, pair, amount, price) {
    const orderId = this.generateOrderId();
    const order = {
      id: orderId,
      exchange: this.name,
      type: orderType,
      pair,
      amount,
      price,
      status: 'filled',
      filledAmount: amount,
      createdAt: Date.now()
    };
    this.orders.set(orderId, order);
    return order;
  }

  async getMarkets() {
    const url = `${this.baseUrl}/api/v3/exchangeInfo`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      return data.symbols?.filter(s => s.quoteAsset === 'USDT').map(s => s.symbol) || [];
    } catch (error) {
      return [];
    }
  }
}

class CoinbaseExchange extends ExchangeClient {
  constructor(config) {
    super({
      name: 'Coinbase',
      baseUrl: config.testnet ? 'https://api-sandbox.coinbase.com' : 'https://api.coinbase.com',
      ...config
    });
  }

  async fetchTicker(pair) {
    const [base, quote] = pair.split('/');
    const url = `${this.baseUrl}/api/v3/brokerage/products/${base}-${quote}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      return {
        symbol: `${base}/${quote}`,
        price: parseFloat(data.price),
        volume24h: data.volume,
        timestamp: Date.now()
      };
    } catch (error) {
      return { symbol: pair, price: 0, error: error.message };
    }
  }

  async getOrderBook(pair, depth = 20) {
    const [base, quote] = pair.split('/');
    const url = `${this.baseUrl}/api/v3/brokerage/products/${base}-${quote}/product_book?limit=${depth}`;
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      return { bids: [], asks: [], error: error.message };
    }
  }

  async getBalance(currency) {
    return { currency, available: 0, total: 0 };
  }

  async createOrder(orderType, pair, amount, price) {
    const orderId = this.generateOrderId();
    const order = {
      id: orderId,
      exchange: this.name,
      type: orderType,
      pair,
      amount,
      price,
      status: 'done',
      createdAt: Date.now()
    };
    this.orders.set(orderId, order);
    return order;
  }
}

class KrakenExchange extends ExchangeClient {
  constructor(config) {
    super({
      name: 'Kraken',
      baseUrl: config.testnet ? 'https://sandbox.kraken.com' : 'https://api.kraken.com',
      ...config
    });
  }

  async fetchTicker(pair) {
    const url = `${this.baseUrl}/0/public/Ticker?pair=${pair.replace('/', '')}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      const result = data.result?.[Object.keys(data.result)[0]];
      return {
        symbol: pair,
        price: parseFloat(result?.c?.[0] || 0),
        volume24h: result?.v?.[1],
        timestamp: Date.now()
      };
    } catch (error) {
      return { symbol: pair, price: 0, error: error.message };
    }
  }

  async getBalance(currency) {
    return { currency, available: 0, total: 0 };
  }

  async createOrder(orderType, pair, amount, price) {
    const orderId = this.generateOrderId();
    const order = {
      id: orderId,
      exchange: this.name,
      type: orderType,
      pair,
      amount,
      price,
      status: 'closed',
      createdAt: Date.now()
    };
    this.orders.set(orderId, order);
    return order;
  }
}

class FlowExchange extends ExchangeClient {
  constructor(config) {
    super({
      name: 'Flow',
      baseUrl: config.rpcUrl || 'https://access-testnet.onflow.org',
      ...config
    });
    this.rpcUrl = config.rpcUrl;
  }

  async fetchTicker(pair) {
    const [token, quote] = pair.split('/');
    const prices = {
      'FLOW/USDT': 1.25,
      'FLOW/USDC': 1.25,
      'FLOW/BTC': 0.00002,
      'USDC/USDT': 1.0
    };
    return {
      symbol: pair,
      price: prices[pair] || 0,
      timestamp: Date.now()
    };
  }

  async getBalance(currency) {
    return { currency, available: 0, total: 0 };
  }

  async createOrder(orderType, pair, amount, price) {
    const orderId = this.generateOrderId();
    const order = {
      id: orderId,
      exchange: this.name,
      type: orderType,
      pair,
      amount,
      price,
      status: 'completed',
      createdAt: Date.now()
    };
    this.orders.set(orderId, order);
    return order;
  }

  async swapTokens(fromToken, toToken, amount) {
    const orderId = this.generateOrderId();
    const rate = fromToken === 'FLOW' && toToken === 'USDC' ? 1.25 : 1;
    return {
      id: orderId,
      type: 'swap',
      fromToken,
      toToken,
      amountIn: amount,
      amountOut: amount * rate,
      rate,
      status: 'completed',
      createdAt: Date.now()
    };
  }
}

class MultiExchangeAggregator {
  constructor() {
    this.exchanges = new Map();
    this.arbitrageOpportunities = [];
  }

  registerExchange(name, exchange) {
    this.exchanges.set(name, exchange);
  }

  async getBestPrice(pair, side = 'buy') {
    let bestPrice = null;
    let bestExchange = null;

    for (const [name, exchange] of this.exchanges) {
      try {
        const ticker = await exchange.fetchTicker(pair);
        if (ticker.price > 0) {
          if (!bestPrice || (side === 'buy' ? ticker.price < bestPrice.price : ticker.price > bestPrice.price)) {
            bestPrice = { ...ticker, exchange: name };
            bestExchange = name;
          }
        }
      } catch (error) {
        console.error(`Error fetching ${pair} from ${name}:`, error.message);
      }
    }

    return bestPrice;
  }

  async getAllPrices(pairs) {
    const prices = {};
    for (const pair of pairs) {
      prices[pair] = await this.getBestPrice(pair);
    }
    return prices;
  }

  async executeSwap(exchangeName, fromToken, toToken, amount) {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeName} not registered`);
    }
    return exchange.swapTokens(fromToken, toToken, amount);
  }

  async findArbitrage(pairs) {
    const opportunities = [];
    for (const pair of pairs) {
      const prices = [];
      for (const [name, exchange] of this.exchanges) {
        try {
          const ticker = await exchange.fetchTicker(pair);
          if (ticker.price > 0) {
            prices.push({ exchange: name, price: ticker.price });
          }
        } catch (error) {
          continue;
        }
      }

      if (prices.length >= 2) {
        prices.sort((a, b) => b.price - a.price);
        const maxSpread = (prices[0].price - prices[prices.length - 1].price) / prices[prices.length - 1].price * 100;
        
        if (maxSpread > 0.5) {
          opportunities.push({
            pair,
            buyExchange: prices[prices.length - 1].exchange,
            sellExchange: prices[0].exchange,
            buyPrice: prices[prices.length - 1].price,
            sellPrice: prices[0].price,
            spreadPercent: maxSpread.toFixed(2)
          });
        }
      }
    }
    this.arbitrageOpportunities = opportunities;
    return opportunities;
  }

  getExchangeStatus() {
    const status = {};
    for (const [name, exchange] of this.exchanges) {
      status[name] = {
        connected: exchange.apiKey ? true : false,
        testnet: exchange.testnet,
        markets: exchange.markets?.size || 0,
        orders: exchange.orders?.size || 0
      };
    }
    return status;
  }
}

module.exports = {
  ExchangeClient,
  BinanceExchange,
  CoinbaseExchange,
  KrakenExchange,
  FlowExchange,
  MultiExchangeAggregator
};
