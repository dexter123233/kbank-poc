# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

Please report security vulnerabilities by emailing security@kbank.io.

**Please do not** open a public GitHub issue for security vulnerabilities.

## Security Best Practices

### 1. Secrets Management
- All secrets stored in environment variables
- Use GitHub Secrets for CI/CD
- Rotate API keys regularly
- Never commit `.env` files

### 2. Input Validation
- All user inputs validated
- Rate limiting on all endpoints
- SQL injection prevention (if using database)
- XSS protection via Helmet.js

### 3. Access Control
- Telegram user ID-based authentication
- Wallet Connect for Flow transactions
- API key middleware for admin endpoints
- Role-based access control (DAO members only)

### 4. Data Protection
- Receipts encrypted at rest (future)
- TLS 1.3 for all communications
- PII data minimization
- GDPR compliance (right to delete)

### 5. Monitoring & Logging
- Structured JSON logs
- Audit trails for all financial transactions
- Failed login attempts tracked
- Rate limit violations logged

### 6. Smart Contract Security
- Cadence code reviewed by security auditor
- Formal verification (future)
- Upgradeability paused in production
- Circuit breaker for emergency stops

## Security Checklist for Deployment

- [ ] All environment variables set
- [ ] Docker image scanned: `docker scan kbank-poc:latest`
- [ ] Non-root user in container
- [ ] Health checks enabled
- [ ] HTTPS configured (via reverse proxy)
- [ ] Rate limits configured
- [ ] Log rotation configured
- [ ] Backups scheduled
- [ ] Monitoring/alerting set up

## Regular Security Tasks

**Daily:**
- Review error logs for anomalies
- Check failed authentication attempts

**Weekly:**
- Review rate limit violations
- Check for dependency vulnerabilities: `npm audit`
- Verify backup integrity

**Monthly:**
- Rotate API keys
- Update dependencies: `npm update`
- Security audit: `npm audit audit`
- Review access logs

## Incident Response

1. **Detection**: Automated alerts for anomalies
2. **Containment**: Switch to read-only mode if needed
3. **Investigation**: Preserve logs, identify root cause
4. **Remediation**: Patch vulnerabilities, rotate keys
5. **Recovery**: Resume normal operations with monitoring
6. **Post-mortem**: Document lessons learned

## Contact

Security team: security@kbank.io
PGP Key: [Link to PGP key]
