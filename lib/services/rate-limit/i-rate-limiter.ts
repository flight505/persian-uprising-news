/**
 * Rate Limiter Interface
 * SEC-001: Abstraction for rate limiting implementations
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export interface IRateLimiter {
  checkLimit(identifier: string): boolean | Promise<boolean>;
  checkLimitWithResult(identifier: string): Promise<RateLimitResult>;
  reset(identifier: string): void | Promise<void>;
  getConfig(): RateLimitConfig;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
  failMode?: 'open' | 'closed';
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
}

export function createRateLimitHeaders(result: RateLimitResult, config: RateLimitConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': Math.max(0, result.remaining).toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}
