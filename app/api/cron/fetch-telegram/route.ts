/**
 * Vercel Cron Job: Fetch Telegram news every 10 minutes
 *
 * IMPORTANT: This requires Vercel Pro ($20/month) for cron functionality
 * Configure in vercel.json with schedule: every 10 minutes
 *
 * Vercel Pro: 60-second function timeout (enough for Telegram User API)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ServiceContainer } from '@/lib/services/container';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 60; // Vercel Pro: 60 second max

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  // Verify cron secret
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const startTime = Date.now();

    logger.info('cron_fetch_telegram_started');

    // Get news service and refresh
    const newsService = ServiceContainer.getNewsService();
    const result = await newsService.refresh();

    const duration = Date.now() - startTime;

    logger.info('cron_fetch_telegram_completed', {
      articlesAdded: result.articlesAdded,
      articlesTotal: result.articlesTotal,
      incidentsExtracted: result.incidentsExtracted,
      duration_ms: duration,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      results: {
        articlesAdded: result.articlesAdded,
        articlesTotal: result.articlesTotal,
        incidentsExtracted: result.incidentsExtracted,
      },
    });

  } catch (error) {
    logger.error('cron_fetch_telegram_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
