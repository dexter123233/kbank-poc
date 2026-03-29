# K-Bank PoC

Consumer DeFi funding platform built on Flow blockchain with DAO governance and crypto insurance.

## Features

- **Funding Mechanism**: Deposit, withdraw, and stake tokens with automated waypoints
- **DAO Governance**: On-chain voting for project approvals
- **Insurance Protection**: Integrated with crypto insurance providers
- **Telegram Bot**: User-friendly interface via Telegram
- **Transaction Transparency**: Full audit trail with receipt tracking
- **Production-Ready**: Error handling, rate limiting, and security best practices
- **Serverless**: Deploy on Cloudflare Workers for 100K free requests/day

## Deployment Options

### Option 1: Cloudflare Workers (Recommended - Free)

See [make.md](make.md) for detailed instructions.

```bash
npm install
wrangler login
npm run deploy
```

### Option 2: Docker/Node.js

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## Prerequisites

- Node.js 18+
- Docker (optional)
- Flow CLI (for contract deployment)
- Telegram Bot Token (from @BotFather)
- Flow Wallet Connect credentials
- Cloudflare account (for Workers deployment)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/your-org/kbank-poc.git
cd kbank-poc
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required environment variables:
- `BOT_TOKEN`: Telegram bot token
- `WALLET_CONNECT_CLIENT_ID`: Flow Wallet Connect client ID
- `WALLET_CONNECT_CLIENT_SECRET`: Flow Wallet Connect secret
- `FLOW_NETWORK`: Flow network (testnet/mainnet)
- `INSURANCE_API_URL`: Insurance provider API endpoint
- `INSURANCE_API_KEY`: Insurance provider API key

### 3. Run with Docker (Recommended)

```bash
# Build and start
npm run docker:build
npm run docker:run

# Or use docker-compose
docker-compose up -d
```

### 4. Run Locally

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Project Structure

```
k-bank-poc/
├── contracts/              # Cadence smart contracts
│   └── k_bank/
│       ├── Bank.cdc       # Main banking contract
│       └── Governance.cdc # DAO governance contract
├── src/
│   ├── bot.js            # Telegram bot interface
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

## Telegram Bot Commands

- `/start` - Start the bot
- `/help` - Show available commands
- `/deposit <amount>` - Deposit funds
- `/withdraw <amount>` - Withdraw funds
- `/stake <amount>` - Stake tokens
- `/check-balance` - Check your balance
- `/proposal create <title> <description>` - Create governance proposal
- `/proposal vote <id> <yes|no>` - Vote on proposal
- `/claim-insurance <claimId>` - Submit insurance claim

## API Endpoints

### Insurance Bridge (Port 3001)

- `GET /health` - Health check
- `POST /api/insurance/claims` - Submit insurance claim
- `GET /api/insurance/claims/:claimId` - Get claim status
- `POST /api/insurance/webhook/status` - Insurance provider callback
- `POST /api/insurance/policies/auto` - Create automatic policy
- `GET /api/insurance/premium/:amount/:riskScore?` - Calculate premium

## Production Features

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

### DAO Governance
- On-chain proposal creation and voting
- Quorum and threshold enforcement
- Transparent voting results

### Insurance Integration
- Nexus Mutual API integration pattern
- Automatic policy creation for qualifying deposits
- Claim submission and tracking
- Webhook callbacks for claim decisions

## Deployment

### Docker Deployment

```bash
# Build image
docker build -t kbank-poc:latest .

# Run with environment
docker run -d \
  --name kbank-bot \
  -p 3000:3000 \
  -p 3001:3001 \
  -e BOT_TOKEN="your-token" \
  -e WALLET_CONNECT_CLIENT_ID="your-id" \
  -e WALLET_CONNECT_CLIENT_SECRET="your-secret" \
  -v $(pwd)/data:/app/data \
  kbank-poc:latest
```

### Kubernetes Deployment

```yaml
# k8s deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kbank-bot
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kbank-bot
  template:
    metadata:
      labels:
        app: kbank-bot
    spec:
      containers:
      - name: bot
        image: kbank-poc:latest
        ports:
        - containerPort: 3000
        - containerPort: 3001
        env:
        - name: BOT_TOKEN
          valueFrom:
            secretKeyRef:
              name: kbank-secrets
              key: bot-token
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Monitoring & Logging

### Health Checks

- Insurance Bridge: `GET http://localhost:3001/health`
- Returns: `{ status: 'healthy', timestamp: '...', uptime: ... }`

### Logs

Logs are written to:
- Console (JSON format)
- `app.log` file

Log levels: `error`, `warn`, `info`, `debug`

### Metrics

```bash
# Check bot status
curl http://localhost:3001/health

# View logs
docker logs kbank-bot
tail -f app.log
```

## Security

- Helmet.js for security headers
- Rate limiting on all endpoints
- Request size limits
- Input validation on all endpoints
- Environment variable secrets
- No hardcoded credentials

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Load testing
npm run test:load
```

## Development

### Adding New Commands

1. Add command handler in `src/bot.js`
2. Add rate limit check
3. Add error handling with try/catch
4. Test with Telegram bot

### Smart Contract Development

1. Edit Cadence files in `contracts/k_bank/`
2. Deploy with Flow CLI:
   ```bash
   flow accounts add --network testnet
   flow contracts deploy ./contracts/k_bank/Bank.cdc
   ```
3. Test transactions with Flow emulator

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
