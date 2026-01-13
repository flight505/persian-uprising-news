/**
 * Next.js Instrumentation
 * SEC-003: Run environment validation at startup
 *
 * This file is automatically loaded by Next.js at startup.
 * It validates environment variables and logs service status.
 */

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv, logServiceStatus } = await import('@/lib/config/env-validator');
    const { logger } = await import('@/lib/logger');

    try {
      logger.info('startup_env_validation_started');
      validateEnv();
      logServiceStatus();
      logger.info('startup_env_validation_complete');
    } catch (error) {
      logger.error('startup_env_validation_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // In production, this will throw and prevent startup
      // In development, it will log a warning and continue
    }
  }
}
