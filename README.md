# K-Bank PoC

Consumer DeFi funding platform built on Flow blockchain with DAO governance, crypto insurance, and subscription management for content creators.

## About

K-Bank is a comprehensive DeFi platform that combines blockchain-based banking features with modern subscription management tools for social media creators. Built with Telegram Wallet-inspired UI, it offers a seamless experience for managing crypto assets while collecting payments from multiple platforms.

### Key Features

- **Telegram Wallet-Style UI**: Modern, dynamic interface inspired by Telegram Wallet with inline keyboard navigation
- **Dynamic Theming**: Automatically updates based on Pantone's seasonal color recommendations (Spring Lavender, Summer Mosaic, Autumn Embers, Winter Frost, Modern Classic, Vibrant Pop)
- **Subscription Collection**: Plug-and-play integration with multiple payment platforms for content creators
- **Funding Mechanism**: Deposit, withdraw, and stake tokens with automated waypoints
- **DAO Governance**: On-chain voting for project approvals
- **Insurance Protection**: Integrated with crypto insurance providers
- **Transaction Transparency**: Full audit trail with receipt tracking
- **Production-Ready**: Error handling, rate limiting, and security best practices
- **Serverless**: Deploy on Cloudflare Workers for 100K free requests/day

## Subscription Platforms Supported

| Platform | Icon | Description |
|----------|------|-------------|
| Meta | 📘 | Facebook/Instagram subscriptions |
| Google Play | 📱 | Android app subscriptions |
| YouTube | ▶️ | Channel memberships |
| Patreon | 🎨 | Creator memberships |
| Stripe | 💳 | Custom subscriptions |
| Gumroad | 🛒 | Digital product sales |
| Payhip | 💰 | Online courses/products |
| Lemon Squeezy | 🍋 | Software subscriptions |

## Quick Start

### 1. Connect a Wallet

```bash
/setwallet 0xYourFlowAddress
```

### 2. Connect Subscription Platforms

```bash
/connect stripe your_publishable_key your_secret_key product_id
/connect patreon your_client_id your_client_secret your_creator_id
```

### 3. Check Revenue

```bash
/revenue
```

### 4. Change Theme

```bash
/theme vibrant
/theme modern
```

## Telegram Bot Commands

### Wallet Commands
- `/start` - Open the wallet dashboard
- `/balance` - Check your token balance
- `/deposit <amount>` - Deposit funds
- `/withdraw <amount>` - Withdraw funds
- `/stake <amount> [days]` - Stake tokens
- `/setwallet <address>` - Set your Flow wallet address

### Subscription Commands
- `/connect <platform>` - Connect a subscription platform
- `/subscriptions` - View all connected platforms
- `/revenue` - View revenue summary
- `/disconnect <platform>` - Disconnect a platform
- `/analytics` - View detailed analytics

### Theme Commands
- `/theme` - List available themes
- `/theme <name>` - Change to a specific theme

### Governance Commands
- `/proposal create <title> | <description> | <amount>` - Create a proposal
- `/proposal vote <id> <yes|no>` - Vote on a proposal

### Insurance Commands
- `/insurance claim <policy_id>` - Submit an insurance claim
- `/insurance status <claim_id>` - Check claim status

### Utility Commands
- `/status` - View system status
- `/receipts` - View recent transactions
- `/receipt <id>` - View a specific receipt
- `/help` - Show all commands

## Dynamic Themes

The bot automatically updates its theme based on the current season, following Pantone's color of the year recommendations:

- **Spring**: Spring Lavender theme
- **Summer**: Summer Mosaic theme  
- **Fall**: Autumn Embers theme
- **Winter**: Winter Frost theme

You can also manually select from:
- `modern` - Modern Classic
- `vibrant` - Vibrant Pop
- `spring` - Spring Lavender
- `summer` - Summer Mosaic
- `fall` - Autumn Embers
- `winter` - Winter Frost

## For Content Creators

K-Bank provides a simple plug-and-play approach to collect subscriptions from multiple platforms:

1. **Connect Platforms**: Use `/connect <platform>` to link your Meta, Google, Patreon, Stripe, or other accounts
2. **Track Revenue**: Use `/revenue` to see earnings across all platforms
3. **Convert to Crypto**: Deposit funds to your Flow wallet and stake for yields

### Example: Connect Stripe

```
/connect stripe pk_live_xxx sk_live_xxx prod_xxx
```

### Example: Connect Patreon

```
/connect patreon your_client_id your_client_secret creator_id
```

## Deployment Options

### Option 1: Cloudflare Workers (Recommended - Free)

```bash
npm install
wrangler login
npm run deploy
```

### Option 2: Docker/Node.js

```bash
npm install
npm run docker:build
npm run docker:run
```

## Prerequisites

- Node.js 18+
- Docker (optional)
- Flow CLI (for contract deployment)
- Telegram Bot Token (from @BotFather)
- Flow Wallet Connect credentials
- Cloudflare account (for Workers deployment)

## Project Structure

```
k-bank-poc/
├── contracts/              # Cadence smart contracts
│   └── k_bank/
│       ├── Bank.cdc       # Main banking contract
│       └── Governance.cdc # DAO governance contract
├── src/
│   ├── bot.js            # Telegram bot interface with Wallet UI
│   ├── flowClient.js     # Flow SDK wrapper
│   ├── errorHandler.js   # Centralized error handling
│   ├── scheduler/        # Async transaction scheduling
│   ├── receiptTracker/   # Receipt persistence
│   ├── rateLimiter/      # Rate limiting middleware
│   ├── insurance/        # Insurance integration
│   └── index.js          # Application entry point
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

## API Endpoints

### Insurance Bridge (Port 3001)

- `GET /health` - Health check
- `POST /api/insurance/claims` - Submit insurance claim
- `GET /api/insurance/claims/:claimId` - Get claim status
- `POST /api/insurance/webhook/status` - Insurance provider callback
- `POST /api/insurance/policies/auto` - Create automatic policy
- `GET /api/insurance/premium/:amount/:riskScore?` - Calculate premium

## Production Features

### Dynamic UI
- Telegram Wallet-inspired inline keyboard navigation
- Real-time theme updates based on seasonal Pantone colors
- Rich Markdown formatting with emoji support

### Error Handling
- Centralized error handling with Winston logger
- Structured logging to file and console
- Graceful degradation on failures

### Rate Limiting
- Token bucket algorithm per user
- Configurable limits (default: 10 req/min)
- Automatic blocking of abusive users

### Transaction Receipt Tracking
- Persistent storage (JSON file)
- Auto-save every 5 minutes
- Receipt lookup and audit capabilities

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## License

MIT

## Support

- Issues: https://github.com/your-org/kbank-poc/issues
- Documentation: See `/docs` folder
- Flow Docs: https://docs.onflow.org

---

Built with ❤️ for the creator economy
