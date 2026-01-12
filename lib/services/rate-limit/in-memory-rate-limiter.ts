/**
 * In-Memory Rate Limiter
 * Fallback implementation when Redis is unavailable
 */

import { IRateLimiter, RateLimitConfig, RateLimitResult } from './i-rate-limiter';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class InMemoryRateLimiter implements IRateLimiter {
  private map = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private config: RateLimitConfig) {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  checkLimit(identifier: string): boolean {
    const now = Date.now();
    const entry = this.map.get(identifier);

    if (!entry || now > entry.resetTime) {
      this.map.set(identifier, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
      return true;
    }

    if (entry.count >= this.config.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  async checkLimitWithResult(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.map.get(identifier);

    if (!entry || now > entry.resetTime) {
      this.map.set(identifier, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: now + this.config.windowMs,
      };
    }

    if (entry.count >= this.config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetTime,
        retryAfter: Math.max(1, retryAfter),
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetAt: entry.resetTime,
    };
  }

  reset(identifier: string): void {
    this.map.delete(identifier);
  }

  getConfig(): RateLimitConfig {
    return this.config;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.map.entries()) {
      if (now > entry.resetTime) {
        this.map.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.map.clear();
  }
}
