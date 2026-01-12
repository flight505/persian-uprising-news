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
    console.log('🔄 Cron: Starting Telegram fetch...');
    const startTime = Date.now();

    // Get news service and refresh
    const newsService = ServiceContainer.getNewsService();
    const result = await newsService.refresh();

    const duration = Date.now() - startTime;

    console.log(`✅ Cron: Completed in ${duration}ms`);
    console.log(`📊 Results:`, {
      articlesAdded: result.articlesAdded,
      articlesTotal: result.articlesTotal,
      incidentsExtracted: result.incidentsExtracted,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration,
      results: {
        articlesAdded: result.articlesAdded,
        articlesTotal: result.articlesTotal,
        incidentsExtracted: result.incidentsExtracted,
      },
    });

  } catch (error) {
    console.error('❌ Cron: Telegram fetch failed:', error);

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
