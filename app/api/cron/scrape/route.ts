import { NextRequest, NextResponse } from 'next/server';

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
      console.error('❌ Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const startTime = Date.now();
    console.log('⏰ Cron job triggered: Starting automated news scraping');

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
      console.error('❌ News refresh failed:', error);
      return NextResponse.json(
        { error: 'Failed to refresh news', details: error },
        { status: 500 }
      );
    }

    const result = await refreshResponse.json();
    const duration = Date.now() - startTime;

    console.log(`✅ Cron job completed in ${duration}ms`);
    console.log(`📊 Articles in cache: ${result.articlesCount}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      articlesCount: result.articlesCount,
      lastUpdated: result.lastUpdated,
    });

  } catch (error) {
    console.error('❌ Error in cron job:', error);
    return NextResponse.json(
      {
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
