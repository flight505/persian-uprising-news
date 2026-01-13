/**
 * Redis Rate Limiter with Sliding Window Algorithm
 * SEC-001: Production-grade rate limiting using Upstash Redis
 *
 * Features:
 * - Sliding window algorithm (more accurate than fixed window)
 * - Composite key support (IP + User-Agent for better defense)
 * - Configurable fail mode (open or closed)
 * - Graceful degradation when Redis unavailable
 */

import { Redis } from '@upstash/redis';
import { IRateLimiter, RateLimitConfig, RateLimitResult } from './i-rate-limiter';
import { InMemoryRateLimiter } from './in-memory-rate-limiter';
import { logger } from '@/lib/logger';

export class RedisRateLimiter implements IRateLimiter {
  private redis: Redis | null = null;
  private fallback: InMemoryRateLimiter;
  private keyPrefix: string;
  private failMode: 'open' | 'closed';
  private windowSeconds: number;

  constructor(private config: RateLimitConfig) {
    this.keyPrefix = config.keyPrefix || 'rl';
    this.failMode = config.failMode || 'closed';
    this.windowSeconds = Math.ceil(config.windowMs / 1000);

    // Create fallback in-memory limiter
    this.fallback = new InMemoryRateLimiter(config);

    // Initialize Redis client
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (url && token) {
      try {
        this.redis = new Redis({ url, token });
        logger.info('redis_rate_limiter_initialized', {
          key_prefix: this.keyPrefix,
          fail_mode: this.failMode,
        });
      } catch (error) {
        logger.error('redis_rate_limiter_init_failed', {
          error: error instanceof Error ? error.message : String(error),
          key_prefix: this.keyPrefix,
        });
      }
    } else {
      logger.warn('redis_credentials_missing_using_fallback', {
        key_prefix: this.keyPrefix,
      });
    }
  }

  async checkLimit(identifier: string): Promise<boolean> {
    const result = await this.checkLimitWithResult(identifier);
    return result.allowed;
  }

  async checkLimitWithResult(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();

    // Fall back to in-memory if Redis unavailable
    if (!this.redis) {
      return this.fallback.checkLimitWithResult(identifier);
    }

    const key = `${this.keyPrefix}:${identifier}`;
    const windowStart = now - this.config.windowMs;

    try {
      // Remove expired entries and count current requests in a pipeline
      const pipeline = this.redis.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zcard(key);

      const results = await pipeline.exec();
      const currentCount = (results[1] as number) || 0;

      if (currentCount >= this.config.maxRequests) {
        // Rate limited - calculate when to retry
        const oldestEntries = await this.redis.zrange(key, 0, 0, { withScores: true });

        let resetAt = now + this.config.windowMs;
        let retryAfter = this.windowSeconds;

        if (oldestEntries && oldestEntries.length >= 2) {
          const oldestTimestamp = oldestEntries[1] as number;
          resetAt = oldestTimestamp + this.config.windowMs;
          retryAfter = Math.ceil((resetAt - now) / 1000);
        }

        return {
          allowed: false,
          remaining: 0,
          resetAt,
          retryAfter: Math.max(1, retryAfter),
        };
      }

      // Add current request with unique member
      const member = `${now}:${Math.random().toString(36).slice(2, 8)}`;
      await this.redis.zadd(key, { score: now, member });
      await this.redis.expire(key, this.windowSeconds + 60);

      return {
        allowed: true,
        remaining: this.config.maxRequests - currentCount - 1,
        resetAt: now + this.config.windowMs,
      };
    } catch (error) {
      logger.error('redis_rate_limit_check_failed', {
        error: error instanceof Error ? error.message : String(error),
        key,
        fail_mode: this.failMode,
      });

      // Handle failure based on fail mode
      if (this.failMode === 'open') {
        logger.warn('rate_limit_fail_open', { key });
        return {
          allowed: true,
          remaining: this.config.maxRequests,
          resetAt: now + this.config.windowMs,
        };
      } else {
        logger.warn('rate_limit_fail_closed', { key });
        return {
          allowed: false,
          remaining: 0,
          resetAt: now + this.config.windowMs,
          retryAfter: this.windowSeconds,
        };
      }
    }
  }

  async reset(identifier: string): Promise<void> {
    if (this.redis) {
      const key = `${this.keyPrefix}:${identifier}`;
      try {
        await this.redis.del(key);
      } catch (error) {
        logger.error('redis_rate_limit_reset_failed', {
          error: error instanceof Error ? error.message : String(error),
          key,
        });
      }
    }
    this.fallback.reset(identifier);
  }

  getConfig(): RateLimitConfig {
    return this.config;
  }

  isRedisAvailable(): boolean {
    return this.redis !== null;
  }
}

/**
 * Generate composite identifier for better rate limiting defense
 * Combines IP + hashed User-Agent
 */
export function generateIdentifier(ip: string, userAgent?: string | null): string {
  const sanitizedIP = ip.split(',')[0].trim();

  if (!userAgent) {
    return sanitizedIP;
  }

  const uaHash = simpleHash(userAgent).toString(16).slice(0, 8);
  return `${sanitizedIP}:${uaHash}`;
}

/**
 * Extract client IP from request headers
 */
export function getClientIP(headers: Headers): string {
  const cfConnecting = headers.get('cf-connecting-ip');
  const forwarded = headers.get('x-forwarded-for');
  const realIP = headers.get('x-real-ip');

  if (cfConnecting) return cfConnecting;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;

  return 'unknown';
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
