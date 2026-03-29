# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-03-29

### Added
- Cloudflare Workers support for serverless deployment
- Webhook-based Telegram bot (replaces long-polling)
- KV storage for receipt persistence
- Durable Objects for bot state management
- GitHub Actions workflow for CI/CD
- `make.md` deployment guide

### Changed
- Migrated from Express to Cloudflare Workers fetch handler
- Simplified flowClient for worker environment
- Updated errorHandler to use console JSON logging
- Package type changed to ESM for Workers compatibility

### Removed
- Long-polling support (replaced with webhooks)
- File-based receipt storage (now uses KV)
- Winston file transports

### Fixed
- CPU time limit issues by using webhooks
- Cold start issues with always-warm workers

### Architecture Change

**Before (Node.js):**
```
Telegram ──polling──► Node.js Server ──Express──► Local Filesystem
```

**After (Cloudflare Workers):**
```
Telegram ──webhook──► Cloudflare Workers ──KV──► Cloudflare KV
                              │
                              └──► Insurance API
```

## [1.0.0] - 2024-xx-xx

### Added
- Initial K-Bank PoC implementation
- Telegram bot with commands
- Flow blockchain integration
- DAO governance
- Insurance bridge
- Receipt tracking
- Rate limiting

### Features
- Deposit/withdraw/stake tokens
- DAO proposal creation and voting
- Insurance claim submission
- Transaction receipt tracking
- User rate limiting

### Deployment
- Docker support
- Kubernetes manifests
- GitHub Actions CI/CD
