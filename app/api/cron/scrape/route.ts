import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/cron/scrape
 * Automated scraping endpoint triggered by Vercel Cron
 *
 * Security: Verifies CRON_SECRET header to prevent unauthorized access
 *
 * Schedule: Every 10 minutes (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.error('cron_scrape_unauthorized');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const endTimer = logger.time('cron_scrape');
    logger.info('cron_scrape_started');

    // Trigger the news refresh endpoint (which handles all scraping and deduplication)
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const refreshResponse = await fetch(`${baseUrl}/api/news`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!refreshResponse.ok) {
      const error = await refreshResponse.text();
      logger.error('cron_scrape_refresh_failed', { error });
      return NextResponse.json(
        { error: 'Failed to refresh news', details: error },
        { status: 500 }
      );
    }

    const result = await refreshResponse.json();
    endTimer();

    logger.info('cron_scrape_completed', {
      articlesCount: result.articlesCount,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      articlesCount: result.articlesCount,
      lastUpdated: result.lastUpdated,
    });

  } catch (error) {
    logger.error('cron_scrape_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
