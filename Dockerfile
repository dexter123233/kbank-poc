# K-Bank PoC Dockerfile - Production Ready
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src
COPY contracts ./contracts

FROM node:20-alpine AS production

RUN apk add --no-cache dumb-init curl

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/contracts ./contracts
COPY --chown=nodejs:nodejs package*.json ./

RUN mkdir -p /app/logs /app/data && \
    chown -R nodejs:nodejs /app/logs /app/data

USER nodejs

ENV NODE_ENV=production \
    PORT=3000 \
    INSURANCE_PORT=3001 \
    HEALTH_PORT=3002

EXPOSE 3000 3001 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
