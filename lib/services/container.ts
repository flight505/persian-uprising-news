/**
 * Dependency Injection Container
 * Manages service instances and dependencies
 */

import { NewsService } from './news/news-service';
import { PerplexityNewsSource } from './news/sources/perplexity-source';
import { TelegramNewsSource } from './news/sources/telegram-source';
import { MinHashDeduplicator } from './news/deduplication/minhash-deduplicator';
import { FirestoreArticleRepository } from './news/repositories/firestore-article-repository';
import { PushNotificationService } from './notifications/push-notification-service';
import { IncidentExtractorService } from './incidents/incident-extractor-service';
import { IncidentService } from './incidents/incident-service';
import { InMemoryRateLimiter } from './rate-limit/in-memory-rate-limiter';
import { RedisRateLimiter } from './rate-limit/redis-rate-limiter';
import { IRateLimiter } from './rate-limit/i-rate-limiter';
import { logger } from '@/lib/logger';

// Rate limit configurations for different endpoints
const RATE_LIMIT_CONFIGS = {
  incidents: {
    maxRequests: 5,
    windowMs: 3600000, // 1 hour
    keyPrefix: 'rl:incidents',
    failMode: 'closed' as const, // Block on Redis failure (prevent spam)
  },
  translation: {
    maxRequests: 100,
    windowMs: 3600000, // 1 hour
    keyPrefix: 'rl:translate',
    failMode: 'open' as const, // Allow on Redis failure (translation is cached)
  },
  channels: {
    maxRequests: 5,
    windowMs: 3600000, // 1 hour
    keyPrefix: 'rl:channels',
    failMode: 'closed' as const,
  },
  search: {
    maxRequests: 60,
    windowMs: 60000, // 1 minute
    keyPrefix: 'rl:search',
    failMode: 'open' as const,
  },
};

export class ServiceContainer {
  private static instances = new Map<string, any>();

  static getNewsService(): NewsService {
    if (!this.instances.has('newsService')) {
      const sources = [];

      if (process.env.PERPLEXITY_API_KEY) {
        sources.push(new PerplexityNewsSource(process.env.PERPLEXITY_API_KEY));
      }

      const telegramSource = new TelegramNewsSource(
        process.env.TELEGRAM_SESSION_STRING,
        process.env.TELEGRAM_API_ID,
        process.env.TELEGRAM_API_HASH,
        process.env.TELEGRAM_BOT_TOKEN
      );
      sources.push(telegramSource);

      if (sources.length === 0) {
        throw new Error('No news sources configured');
      }

      const deduplicator = new MinHashDeduplicator();
      const repository = new FirestoreArticleRepository();
      const notificationService = new PushNotificationService();
      const incidentExtractor = new IncidentExtractorService();

      this.instances.set(
        'newsService',
        new NewsService(
          sources,
          deduplicator,
          repository,
          notificationService,
          incidentExtractor
        )
      );

      logger.info('news_service_initialized', {
        sources_count: sources.length,
      });
    }

    return this.instances.get('newsService');
  }

  static getIncidentService(): IncidentService {
    if (!this.instances.has('incidentService')) {
      this.instances.set('incidentService', new IncidentService());
      logger.info('incident_service_initialized');
    }

    return this.instances.get('incidentService');
  }

  /**
   * Get rate limiter for incidents endpoint
   * Uses Redis with fail-closed mode (blocks on Redis failure)
   */
  static getIncidentRateLimiter(): IRateLimiter {
    return this.getRateLimiter('incidentRateLimiter', RATE_LIMIT_CONFIGS.incidents);
  }

  /**
   * Get rate limiter for translation endpoint
   * Uses Redis with fail-open mode (allows on Redis failure)
   */
  static getTranslationRateLimiter(): IRateLimiter {
    return this.getRateLimiter('translationRateLimiter', RATE_LIMIT_CONFIGS.translation);
  }

  /**
   * Get rate limiter for channel suggestions endpoint
   */
  static getChannelRateLimiter(): IRateLimiter {
    return this.getRateLimiter('channelRateLimiter', RATE_LIMIT_CONFIGS.channels);
  }

  /**
   * Get rate limiter for search endpoint
   */
  static getSearchRateLimiter(): IRateLimiter {
    return this.getRateLimiter('searchRateLimiter', RATE_LIMIT_CONFIGS.search);
  }

  /**
   * Get default rate limiter (backward compatible)
   */
  static getRateLimiter(
    name: string = 'rateLimiter',
    config: typeof RATE_LIMIT_CONFIGS[keyof typeof RATE_LIMIT_CONFIGS] = RATE_LIMIT_CONFIGS.incidents
  ): IRateLimiter {
    if (!this.instances.has(name)) {
      // Use Redis if available, otherwise fall back to in-memory
      const hasRedis = !!(
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
      );

      if (hasRedis) {
        const limiter = new RedisRateLimiter(config);
        this.instances.set(name, limiter);
        logger.info('rate_limiter_initialized', {
          name,
          storage: 'redis',
          fail_mode: config.failMode,
        });
      } else {
        this.instances.set(name, new InMemoryRateLimiter(config));
        logger.info('rate_limiter_initialized', {
          name,
          storage: 'in-memory',
        });
      }
    }

    return this.instances.get(name);
  }

  static clear() {
    this.instances.clear();
    logger.info('service_container_cleared');
  }

  static has(serviceName: string): boolean {
    return this.instances.has(serviceName);
  }

  /**
   * Get service availability status
   */
  static getStatus(): Record<string, boolean> {
    return {
      newsService: this.instances.has('newsService'),
      incidentService: this.instances.has('incidentService'),
      redisAvailable: !!(
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
      ),
      firestoreAvailable: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    };
  }
}
