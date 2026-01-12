import { NextRequest, NextResponse } from 'next/server';
import { ServiceContainer } from '@/lib/services/container';
import { getArticles as getFirestoreArticles, isFirestoreAvailable } from '@/lib/firestore';

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
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '20');
    const topicFilter = searchParams.get('topic');

    const now = Date.now();
    if (now - lastFetch > CACHE_DURATION) {
      console.log('🔄 Triggering background news refresh...');
      const newsService = ServiceContainer.getNewsService();
      newsService.refresh()
        .then(() => {
          lastFetch = now;
          console.log('✅ Background news refresh completed');
        })
        .catch(err => {
          console.error('⚠️ Background news refresh failed (non-blocking):', err);
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
      console.warn('⚠️ Firestore not available, returning empty array');
    }

    const start = topicFilter ? page * limit : 0;
    const end = topicFilter ? start + limit : articles.length;
    const paginatedArticles = articles.slice(start, end);

    return NextResponse.json({
      articles: paginatedArticles,
      pagination: {
        page,
        limit,
        total: articles.length,
        hasMore: end < articles.length,
      },
      lastUpdated: lastFetch,
    });
  } catch (error) {
    console.error('Error in /api/news:', error);

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
  try {
    console.log('🔄 Manual refresh triggered');
    const newsService = ServiceContainer.getNewsService();
    const result = await newsService.refresh();
    lastFetch = Date.now();

    return NextResponse.json({
      success: true,
      result,
      lastUpdated: lastFetch,
    });
  } catch (error) {
    console.error('Error refreshing news:', error);
    return NextResponse.json(
      {
        error: 'Failed to refresh news',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
