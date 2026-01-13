/**
 * Environment Variable Validator
 * SEC-003: Startup validation for environment configuration
 *
 * Features:
 * - Validates on app startup (fail-fast)
 * - Group validation (e.g., if one Telegram var exists, all must exist)
 * - Type-safe environment access
 * - Clear error messages
 * - Graceful degradation in development
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';

// Base environment schema
const baseEnvSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Firebase (required for core functionality)
  FIREBASE_SERVICE_ACCOUNT: z.string().optional(),

  // Perplexity API (optional - news aggregation)
  PERPLEXITY_API_KEY: z.string().min(1).optional(),

  // Telegram User API (optional - channel scraping)
  TELEGRAM_API_ID: z.string().regex(/^\d+$/, 'Must be numeric').optional(),
  TELEGRAM_API_HASH: z.string().min(32).optional(),
  TELEGRAM_SESSION_STRING: z.string().optional(),

  // Telegram Bot API (optional - alternative to User API)
  TELEGRAM_BOT_TOKEN: z.string().optional(),

  // Twitter/Apify (optional - Twitter scraping)
  APIFY_API_TOKEN: z.string().optional(),

  // Upstash Redis (optional - rate limiting and caching)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Google Cloud Translation (optional)
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

  // VAPID Push Notifications (optional)
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),

  // Cloudflare Images (optional)
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),

  // Algolia Search (optional)
  ALGOLIA_APP_ID: z.string().optional(),
  ALGOLIA_ADMIN_KEY: z.string().optional(),
  NEXT_PUBLIC_ALGOLIA_APP_ID: z.string().optional(),
  NEXT_PUBLIC_ALGOLIA_SEARCH_KEY: z.string().optional(),

  // Admin (optional)
  ADMIN_SECRET: z.string().min(16).optional(),

  // Base URL (optional, for production)
  NEXT_PUBLIC_BASE_URL: z.string().url().optional(),
});

// Enhanced schema with group validations
const EnvSchema = baseEnvSchema
  .refine(
    (data) => {
      // Telegram User API: If any var is set, all must be set
      const telegramVars = [
        data.TELEGRAM_API_ID,
        data.TELEGRAM_API_HASH,
        data.TELEGRAM_SESSION_STRING,
      ];
      const hasAny = telegramVars.some((v) => v !== undefined);
      const hasAll = telegramVars.every((v) => v !== undefined);
      return !hasAny || hasAll;
    },
    {
      message: 'Telegram User API: All three variables required (TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION_STRING)',
      path: ['TELEGRAM_API_ID'],
    }
  )
  .refine(
    (data) => {
      // Redis: If URL is set, token must be set
      const hasUrl = data.UPSTASH_REDIS_REST_URL !== undefined;
      const hasToken = data.UPSTASH_REDIS_REST_TOKEN !== undefined;
      return (!hasUrl && !hasToken) || (hasUrl && hasToken);
    },
    {
      message: 'Redis: Both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required together',
      path: ['UPSTASH_REDIS_REST_URL'],
    }
  )
  .refine(
    (data) => {
      // VAPID: If any key exists, all must exist
      const vapidVars = [
        data.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        data.VAPID_PRIVATE_KEY,
        data.VAPID_SUBJECT,
      ];
      const hasAny = vapidVars.some((v) => v !== undefined);
      const hasAll = vapidVars.every((v) => v !== undefined);
      return !hasAny || hasAll;
    },
    {
      message: 'VAPID: All three variables required (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)',
      path: ['NEXT_PUBLIC_VAPID_PUBLIC_KEY'],
    }
  )
  .refine(
    (data) => {
      // Cloudflare: If token is set, account ID must be set
      const hasToken = data.CLOUDFLARE_API_TOKEN !== undefined;
      const hasAccountId = data.CLOUDFLARE_ACCOUNT_ID !== undefined;
      return (!hasToken && !hasAccountId) || (hasToken && hasAccountId);
    },
    {
      message: 'Cloudflare: Both CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required together',
      path: ['CLOUDFLARE_API_TOKEN'],
    }
  )
  .refine(
    (data) => {
      // Algolia: If app ID is set, keys must be set
      const hasAppId = data.ALGOLIA_APP_ID !== undefined || data.NEXT_PUBLIC_ALGOLIA_APP_ID !== undefined;
      const hasKeys = data.ALGOLIA_ADMIN_KEY !== undefined || data.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY !== undefined;
      return !hasAppId || hasKeys;
    },
    {
      message: 'Algolia: API keys required when app ID is set',
      path: ['ALGOLIA_APP_ID'],
    }
  );

// Type for validated environment
export type ValidatedEnv = z.infer<typeof baseEnvSchema>;

// Singleton for validated environment
let validatedEnv: ValidatedEnv | null = null;
let validationRan = false;

/**
 * Validate environment variables
 * Call this at app startup to fail fast on misconfiguration
 */
export function validateEnv(): ValidatedEnv {
  if (validatedEnv) {
    return validatedEnv;
  }

  validationRan = true;
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.join('.') || 'root';
      return `  - ${path}: ${issue.message}`;
    });

    const errorMessage = `Environment validation failed:\n${errors.join('\n')}`;

    if (process.env.NODE_ENV === 'production') {
      logger.error('env_validation_failed', { message: errorMessage });
      throw new Error('Environment validation failed. Check logs for details.');
    } else {
      logger.warn('env_validation_failed_development', { message: errorMessage });
      logger.warn('env_continuing_with_partial_config');

      // Return partial env in development (type-unsafe fallback)
      validatedEnv = process.env as unknown as ValidatedEnv;
      return validatedEnv;
    }
  }

  logger.info('env_validation_successful');
  validatedEnv = result.data;
  return validatedEnv;
}

/**
 * Get validated environment
 * Lazily validates on first call
 */
export function getEnv(): ValidatedEnv {
  if (!validatedEnv) {
    return validateEnv();
  }
  return validatedEnv;
}

/**
 * Check if a specific service is configured
 */
export const serviceAvailability = {
  firebase: () => {
    const env = getEnv();
    return !!env.FIREBASE_SERVICE_ACCOUNT;
  },

  telegramUserApi: () => {
    const env = getEnv();
    return !!(env.TELEGRAM_API_ID && env.TELEGRAM_API_HASH && env.TELEGRAM_SESSION_STRING);
  },

  telegramBotApi: () => {
    const env = getEnv();
    return !!env.TELEGRAM_BOT_TOKEN;
  },

  perplexity: () => {
    const env = getEnv();
    return !!env.PERPLEXITY_API_KEY;
  },

  redis: () => {
    const env = getEnv();
    return !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
  },

  googleTranslation: () => {
    const env = getEnv();
    return !!(env.GOOGLE_CLOUD_PROJECT && env.GOOGLE_APPLICATION_CREDENTIALS);
  },

  pushNotifications: () => {
    const env = getEnv();
    return !!(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
  },

  algolia: () => {
    const env = getEnv();
    return !!(env.ALGOLIA_APP_ID || env.NEXT_PUBLIC_ALGOLIA_APP_ID);
  },

  cloudflare: () => {
    const env = getEnv();
    return !!(env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ACCOUNT_ID);
  },
};

/**
 * Get status report of all services
 */
export function getServiceStatus(): Record<string, boolean> {
  return {
    firebase: serviceAvailability.firebase(),
    telegramUserApi: serviceAvailability.telegramUserApi(),
    telegramBotApi: serviceAvailability.telegramBotApi(),
    perplexity: serviceAvailability.perplexity(),
    redis: serviceAvailability.redis(),
    googleTranslation: serviceAvailability.googleTranslation(),
    pushNotifications: serviceAvailability.pushNotifications(),
    algolia: serviceAvailability.algolia(),
    cloudflare: serviceAvailability.cloudflare(),
  };
}

/**
 * Log service status on startup
 */
export function logServiceStatus(): void {
  const status = getServiceStatus();
  const enabled = Object.entries(status)
    .filter(([, v]) => v)
    .map(([k]) => k);
  const disabled = Object.entries(status)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  logger.info('service_status', {
    enabled: enabled.join(', '),
    disabled: disabled.join(', '),
    enabled_count: enabled.length,
    disabled_count: disabled.length
  });
}

// Export validation status check
export function hasValidationRun(): boolean {
  return validationRan;
}
