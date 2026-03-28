// src/rateLimiter/rateLimiter.js
const { createLogger } = require('../errorHandler');

const logger = createLogger('rateLimiter');

class RateLimiter {
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10;
    this.windowMs = options.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000; // 1 minute
    this.cleanupInterval = options.cleanupInterval || 600000; // 10 minutes
    this.requests = new Map(); // userId -> [{timestamp, count}]
    this.blockedUsers = new Map(); // userId -> unblock timestamp
    this.startCleanupLoop();
  }

  getBucketKey(userId) {
    const window = Math.floor(Date.now() / this.windowMs);
    return `${userId}:${window}`;
  }

  isBlocked(userId) {
    const unblockTime = this.blockedUsers.get(userId);
    if (unblockTime && Date.now() < unblockTime) {
      return true;
    }
    if (unblockTime && Date.now() >= unblockTime) {
      this.blockedUsers.delete(userId);
    }
    return false;
  }

  blockUser(userId, durationMs = 300000) { // 5 minutes default
    const unblockTime = Date.now() + durationMs;
    this.blockedUsers.set(userId, unblockTime);
    logger.warn(`User ${userId} blocked for ${durationMs}ms`);
  }

  checkLimit(userId) {
    if (this.isBlocked(userId)) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded. User temporarily blocked.',
        remaining: 0,
        resetTime: this.blockedUsers.get(userId)
      };
    }

    const bucketKey = this.getBucketKey(userId);
    const bucket = this.requests.get(bucketKey) || [];
    const currentCount = bucket.reduce((sum, b) => sum + b.count, 0);

    if (currentCount >= this.maxRequests) {
      // Block user if they repeatedly hit limit
      if (currentCount >= this.maxRequests * 3) { // 3x over limit
        this.blockUser(userId);
      }

      return {
        allowed: false,
        reason: `Rate limit exceeded. Max ${this.maxRequests} requests per ${this.windowMs}ms.`,
        remaining: 0,
        current: currentCount,
        max: this.maxRequests,
        window: this.windowMs
      };
    }

    // Increment count for current bucket
    bucket.push({ timestamp: Date.now(), count: 1 });
    this.requests.set(bucketKey, bucket);

    return {
      allowed: true,
      remaining: this.maxRequests - currentCount - 1,
      current: currentCount + 1,
      max: this.maxRequests,
      window: this.windowMs
    };
  }

  getStats(userId = null) {
    if (userId) {
      const userBuckets = Array.from(this.requests.keys())
        .filter(key => key.startsWith(userId + ':'));

      const totalRequests = userBuckets.reduce((sum, key) => {
        const bucket = this.requests.get(key) || [];
        return sum + bucket.reduce((s, b) => s + b.count, 0);
      }, 0);

      return {
        userId,
        totalRequests,
        blocked: this.isBlocked(userId),
        unblockTime: this.blockedUsers.get(userId) || null
      };
    }

    return {
      totalUsers: new Set(Array.from(this.requests.keys()).map(k => k.split(':')[0])).size,
      totalRequests: Array.from(this.requests.values())
        .reduce((sum, bucket) => sum + bucket.reduce((s, b) => s + b.count, 0), 0),
      blockedUsers: Array.from(this.blockedUsers.entries())
        .filter(([_, unblockTime]) => Date.now() < unblockTime).length,
      cleanupInterval: this.cleanupInterval
    };
  }

  startCleanupLoop() {
    setInterval(() => {
      const now = Date.now();
      const cutoff = now - this.cleanupInterval;

      // Clean old buckets
      let cleaned = 0;
      for (const [bucketKey, bucket] of this.requests.entries()) {
        if (bucket[0]?.timestamp < cutoff) {
          this.requests.delete(bucketKey);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.debug(`Cleaned ${cleaned} old rate limit buckets`);
      }

      // Clean expired blocks
      let unblocked = 0;
      for (const [userId, unblockTime] of this.blockedUsers.entries()) {
        if (unblockTime < now) {
          this.blockedUsers.delete(userId);
          unblocked++;
        }
      }
      if (unblocked > 0) {
        logger.info(`Unblocked ${unblocked} users`);
      }
    }, this.cleanupInterval);
  }

  resetUser(userId) {
    // Remove all buckets for user
    for (const [bucketKey] of this.requests.entries()) {
      if (bucketKey.startsWith(userId + ':')) {
        this.requests.delete(bucketKey);
      }
    }
    this.blockedUsers.delete(userId);
    logger.info(`Reset rate limits for user ${userId}`);
  }
}

module.exports = new RateLimiter({
  maxRequests: 10,
  windowMs: 60000,
  cleanupInterval: 600000
});
