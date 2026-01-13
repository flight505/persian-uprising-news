import { NextRequest, NextResponse } from 'next/server';
import { ServiceContainer } from '@/lib/services/container';
import { getArticles as getFirestoreArticles, isFirestoreAvailable } from '@/lib/firestore';
import { logger } from '@/lib/logger';

let lastFetch = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/news
 * Returns paginated news articles
 * Query params:
 * - page: page number (default: 0)
 * - limit: items per page (default: 20)
 * - topic: filter by topic ID (optional)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '20');
    const topicFilter = searchParams.get('topic');

    const now = Date.now();
    if (now - lastFetch > CACHE_DURATION) {
      logger.info('background_refresh_triggered', {
        cache_expired: true,
        last_fetch_ago: now - lastFetch,
      });

      const newsService = ServiceContainer.getNewsService();
      newsService.refresh()
        .then(() => {
          lastFetch = now;
          logger.info('background_refresh_completed');
        })
        .catch(err => {
          logger.warn('background_refresh_failed', {
            error: err.message,
            non_blocking: true,
          });
        });
    }

    let articles: any[] = [];

    if (isFirestoreAvailable()) {
      if (topicFilter) {
        const allArticles = await getFirestoreArticles(200);
        articles = allArticles.filter(article =>
          article.topics?.includes(topicFilter) || false
        );
      } else {
        articles = await getFirestoreArticles(limit * (page + 1));
      }
    } else {
      logger.warn('firestore_unavailable', {
        returning_empty: true,
      });
    }

    const start = topicFilter ? page * limit : 0;
    const end = topicFilter ? start + limit : articles.length;
    const paginatedArticles = articles.slice(start, end);

    // Map sourceUrl to url for client compatibility
    const articlesWithUrl = paginatedArticles.map(article => ({
      ...article,
      url: article.sourceUrl || article.url || '',
    }));

    const duration = Date.now() - startTime;
    logger.http('GET', '/api/news', 200, duration, {
      page,
      limit,
      topic: topicFilter,
      articles_returned: articlesWithUrl.length,
    });

    return NextResponse.json({
      articles: articlesWithUrl,
      pagination: {
        page,
        limit,
        total: articles.length,
        hasMore: end < articles.length,
      },
      lastUpdated: lastFetch,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('api_news_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: duration,
    });

    logger.http('GET', '/api/news', 500, duration);

    return NextResponse.json({
      articles: [],
      pagination: {
        page: 0,
        limit: 20,
        total: 0,
        hasMore: false,
      },
      lastUpdated: lastFetch,
      warning: 'Temporary issue fetching latest news. Please refresh.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * POST /api/news/refresh
 * Manually trigger a news refresh
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    logger.info('manual_refresh_triggered');
    const newsService = ServiceContainer.getNewsService();
    const result = await newsService.refresh();
    lastFetch = Date.now();

    const duration = Date.now() - startTime;
    logger.http('POST', '/api/news/refresh', 200, duration, {
      articles_added: result.articlesAdded,
      articles_total: result.articlesTotal,
    });

    return NextResponse.json({
      success: true,
      result,
      lastUpdated: lastFetch,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('manual_refresh_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: duration,
    });

    logger.http('POST', '/api/news/refresh', 500, duration);

    return NextResponse.json(
      {
        error: 'Failed to refresh news',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
