# K-Bank PoC Deployment Guide

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
wrangler kv:namespace create RECEIPTS
wrangler kv:namespace create WALLETS

# Update wrangler.toml with KV IDs
# Then deploy
npm run deploy
```

### Configuration

1. **Environment Variables:**
   - `BOT_TOKEN` - Telegram bot token
   - `TELEGRAM_SECRET` - Secret for webhook verification

2. **KV Namespaces:**
   - `RECEIPTS` - Transaction receipt storage
   - `WALLETS` - User wallet address storage

### Setting Up Telegram Webhook

After deployment, set the webhook:

```bash
curl -X POST "https://your-worker.workers.dev/set-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-worker.workers.dev/webhook",
    "secret_token": "YOUR_SECRET"
  }'
```

Configure in BotFather:
1. Open @BotFather
2. Select your bot
3. Go to Bot Settings > Menu Button > Configure
4. Add your worker URL as the callback

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/webhook` | POST | Telegram webhook |
| `/api/insurance/claims` | POST | Submit insurance claim |
| `/api/insurance/claims/:id` | GET | Get claim status |
| `/api/insurance/webhook/status` | POST | Insurance callback |
| `/receipts` | GET | List all receipts |
| `/set-webhook` | POST | Configure webhook |

### Troubleshooting

**Bot not responding:**
- Verify webhook is set: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
- Check worker logs: `wrangler tail`

**KV not working:**
- Ensure KV namespaces are created
- Check wrangler.toml bindings

**Rate limiting:**
- Workers Free: 100,000 requests/day
- CPU time: 10ms per request (50ms paid)

### Local Development

```bash
# Run locally
npm run dev

# Test webhook locally
curl -X POST "http://localhost:8787/webhook" \
  -H "Content-Type: application/json" \
  -d '{"message": {"chat": {"id": 123}, "from": {"id": "123"}, "text": "/start"}}'
```

### Architecture

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

### Cost Estimation

| Resource | Free Tier | Paid Tier |
|----------|-----------|-----------|
| Requests | 100,000/day | $0.50/million |
| CPU | 10ms/request | 50ms/request |
| KV Reads | 1M/day | $0.50/million |
| KV Writes | 1M/day | $5.00/million |
| Bandwidth | 1GB/month | $0.15/GB |

For a typical bot with ~1000 users: **$0/month** on free tier.
