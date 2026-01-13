import { NextResponse } from 'next/server';
import { getBotInfo, scrapeTelegram, deleteWebhook } from '@/lib/telegram-scraper';
import { logger } from '@/lib/logger';

/**
 * GET /api/telegram/test
 * Test Telegram bot connection and scrape recent messages
 */
export async function GET() {
  try {
    // Test bot connection
    const botInfo = await getBotInfo();

    if (!botInfo.success) {
      return NextResponse.json(
        { error: 'Bot connection failed', details: botInfo.error },
        { status: 500 }
      );
    }

    // Ensure we're using polling (not webhook)
    await deleteWebhook();

    // Try to scrape messages
    const articles = await scrapeTelegram(20);

    return NextResponse.json({
      success: true,
      bot: botInfo.bot,
      articlesFound: articles.length,
      articles: articles.slice(0, 5), // Return first 5 as sample
      message: articles.length === 0
        ? 'Bot is working but no relevant messages found. Make sure to add the bot to channels or send test messages.'
        : `Successfully scraped ${articles.length} articles from Telegram`,
    });

  } catch (error) {
    logger.error('telegram_test_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to test Telegram bot',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
