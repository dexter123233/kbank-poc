# K-Bank PoC Deployment Guide

## Live Deployment

**Worker URL:** https://kbank-poc.ravella-aravind93.workers.dev
**Admin Panel:** https://kbank-poc.ravella-aravind93.workers.dev/admin.html

### KV Namespace IDs

- RECEIPTS: `c3e35cc18bdc4c75bfafbfca1796c71f`
- WALLETS: `f21218d1bc3a46bc8ffcc58d752b5ebf`

---

## Cloudflare Workers Deployment

### Prerequisites

1. **Cloudflare Account** - Sign up at cloudflare.com
2. **Workers Free Plan** - 100,000 requests/day free
3. **Telegram Bot Token** - Get from @BotFather

### Quick Deploy

```bash
# Install dependencies
npm install

# Login to Cloudflare
wrangler login

# Create KV namespaces
wrangler kv namespace create RECEIPTS
wrangler kv namespace create WALLETS

# Update wrangler.toml with KV IDs
# Then deploy
npm run deploy
# or
wrangler deploy
```

### Configuration

1. **Environment Variables:**
   - `BOT_TOKEN` - Telegram bot token (set via Cloudflare Dashboard or wrangler secret)
   - `TELEGRAM_SECRET` - Secret for webhook verification

2. **KV Namespaces:**
   - `RECEIPTS` - Transaction receipt storage
   - `WALLETS` - User wallet address storage

### Setting Up Telegram Webhook

**Option 1: Using the API**

After deployment, set the webhook:

```bash
# Replace YOUR_BOT_TOKEN with your actual Telegram bot token
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://kbank-poc.ravella-aravind93.workers.dev/webhook"
  }'
```

Or use the built-in endpoint:

```bash
curl -X POST "https://kbank-poc.ravella-aravind93.workers.dev/set-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://kbank-poc.ravella-aravind93.workers.dev/webhook",
    "secret_token": "YOUR_SECRET"
  }'
```

**Option 2: Via BotFather**

1. Open @BotFather
2. Select your bot
3. Go to Bot Settings > Menu Button > Configure
4. Add worker URL as callback: `https://kbank-poc.ravella-aravind93.workers.dev/webhook`

**Verify Webhook:**

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

### Set Bot Token

```bash
# Using wrangler
wrangler secret put BOT_TOKEN
# Enter your Telegram bot token when prompted
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/webhook` | POST | Telegram webhook receiver |
| `/set-webhook` | POST | Configure Telegram webhook |
| `/receipts` | GET | List all transaction receipts |
| `/api/admin/stats` | GET | Get bot statistics |
| `/api/admin/verify` | POST | Verify admin token |
| `/api/insurance/claims` | POST | Submit insurance claim |
| `/api/insurance/claims/:id` | GET | Get claim status |
| `/api/insurance/webhook/status` | POST | Insurance callback |

---

## Admin Panel

Access: https://kbank-poc.ravella-aravind93.workers.dev/admin.html

Features:
- Dashboard with stats (users, transactions, claims, proposals)
- Bot controls (restart, status)
- Broadcast messages to users
- Transaction history
- System info

**Note:** Set `ADMIN_TOKEN` in Cloudflare dashboard for authentication.

---

## Troubleshooting

**Bot not responding:**
- Verify webhook is set: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
- Check worker logs: `wrangler tail`

**KV not working:**
- Ensure KV namespaces are created
- Check wrangler.toml bindings

**Rate limiting:**
- Workers Free: 100,000 requests/day
- CPU time: 10ms per request (50ms paid)

---

## Local Development

```bash
# Run locally
wrangler dev

# Test webhook locally
curl -X POST "http://localhost:8787/webhook" \
  -H "Content-Type: application/json" \
  -d '{"message": {"chat": {"id": 123}, "from": {"id": "123"}, "text": "/start"}}'
```

---

## Architecture

```
┌─────────────────┐     Webhook      ┌──────────────────┐
│   Telegram      │ ───────────────► │  Cloudflare      │
│   User          │                  │  Workers         │
└─────────────────┘                  └────────┬─────────┘
                                              │
                     ┌────────────────────────┼────────────────────────┐
                     │                        │                        │
                     ▼                        ▼                        ▼
              ┌─────────────┐       ┌─────────────┐        ┌─────────────┐
              │   KV Store   │       │  Durable    │        │  Insurance  │
              │  (Receipts)  │       │  Objects    │        │    API      │
              └─────────────┘       └─────────────┘        └─────────────┘
```

---

## Cost Estimation

| Resource | Free Tier | Paid Tier |
|----------|-----------|-----------|
| Requests | 100,000/day | $0.50/million |
| CPU | 10ms/request | 50ms/request |
| KV Reads | 1M/day | $0.50/million |
| KV Writes | 1M/day | $5.00/million |
| Bandwidth | 1GB/month | $0.15/GB |

For a typical bot with ~1000 users: **$0/month** on free tier.
