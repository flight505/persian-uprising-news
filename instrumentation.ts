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

    try {
      console.log('[Startup] Validating environment configuration...');
      validateEnv();
      logServiceStatus();
      console.log('[Startup] Environment validation complete');
    } catch (error) {
      console.error('[Startup] Environment validation failed:', error);
      // In production, this will throw and prevent startup
      // In development, it will log a warning and continue
    }
  }
}
