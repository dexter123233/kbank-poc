# Deployment Guide

## Prerequisites

- Docker & Docker Compose
- GitHub repository (created)
- Telegram Bot Token
- Flow Wallet Connect credentials

## Initial Setup

### 1. Create GitHub Repository

```bash
# Create repo on GitHub (via UI or API)
# Then link local repo
git init
git add .
git commit -m "Initial commit: K-Bank PoC with production features"
git branch -M main
git remote add origin https://github.com/your-org/kbank-poc.git
git push -u origin main
```

### 2. Configure Secrets

Set up GitHub Secrets for Actions:
- `BOT_TOKEN`
- `WALLET_CONNECT_CLIENT_ID`
- `WALLET_CONNECT_CLIENT_SECRET`
- `INSURANCE_API_KEY`
- `INSURANCE_API_URL`

### 3. Configure Environment

```bash
# Copy example env
cp .env.example .env

# Edit with your actual credentials
nano .env
```

### 4. Deploy with Docker Compose

```bash
# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f kbank-bot

# Health check
curl http://localhost:3001/health
```

## Production Deployment

### Using Docker Compose (Single Server)

```bash
# Pull latest image
docker pull yourusername/kbank-poc:latest

# Create override for production
cat > docker-compose.prod.yml <<EOF
version: '3.8'
services:
  kbank-bot:
    image: yourusername/kbank-poc:latest
    restart: always
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - BOT_TOKEN=${BOT_TOKEN}
      - FLOW_NETWORK=mainnet
      # ... other env vars
    volumes:
      - receipt_data:/app/data
      - logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
volumes:
  receipt_data:
  logs:
EOF

docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment

```bash
# Build and push to registry
docker build -t yourusername/kbank-poc:latest .
docker push yourusername/kbank-poc:latest

# Deploy
kubectl apply -f k8s/
kubectl get pods -w
```

## Monitoring

### Logs

```bash
# Docker
docker-compose logs -f kbank-bot

# Kubernetes
kubectl logs -f deployment/kbank-bot
```

### Metrics

```bash
# Health endpoint
curl http://localhost:3001/health

# Receipt stats (via bot admin command or direct query)
curl http://localhost:3000/admin/metrics
```

## Updating

```bash
git pull origin main
docker-compose build
docker-compose up -d
```

## Rollback

```bash
docker-compose up -d --force-recreate kbank-bot@previous
# or
docker-compose up -d --rollback
```

## Troubleshooting

### Bot not responding
1. Check BOT_TOKEN is valid
2. Check logs: `docker-compose logs kbank-bot`
3. Verify bot is running: `curl http://localhost:3001/health`

### Insurance bridge errors
1. Verify INSURANCE_API_URL and API_KEY
2. Check network connectivity
3. Review webhook logs

### Receipt persistence failing
1. Check write permissions on ./data directory
2. Verify disk space
3. Check receiptTracker logs

## Security Checklist

- [ ] All secrets in environment variables
- [ ] Docker image scanned for vulnerabilities
- [ ] Rate limiting enabled
- [ ] HTTPS enforced (via reverse proxy)
- [ ] Regular security updates
- [ ] Audit logging enabled
- [ ] Firewall configured (only 3000, 3001 open)

## Backup Strategy

```bash
# Backup receipt data
docker run --rm -v kbank-poc_receipt_data:/data -v $(pwd)/backup:/backup alpine tar czf /backup/receipts-$(date +%Y%m%d).tar.gz /data

# Restore
docker run --rm -v kbank-poc_receipt_data:/data -v $(pwd)/backup:/backup alpine sh -c "rm -rf /data/* && tar xzf /backup/receipts-*.tar.gz -C /data"
```

## CI/CD Pipeline

See `.github/workflows/deploy.yml` for automated deployment pipeline.
