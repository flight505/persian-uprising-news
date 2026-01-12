import { NextRequest, NextResponse } from 'next/server';
import {
  searchArticles,
  initAlgolia,
  initFuse,
  getSearchMode,
  getFacets,
  getSearchSuggestions,
  SearchOptions,
} from '@/lib/algolia';
import { getArticles, isFirestoreAvailable } from '@/lib/firestore';

// Initialize search on first request
let searchInitialized = false;

async function ensureSearchInitialized() {
  if (searchInitialized) return;

  // Try Algolia first
  if (initAlgolia()) {
    searchInitialized = true;
    return;
  }

  // Fallback to Fuse.js with Firestore data
  if (isFirestoreAvailable()) {
    const articles = await getArticles(1000);
    initFuse(articles);
    searchInitialized = true;
    console.log(`📚 Fuse.js initialized with ${articles.length} articles from Firestore`);
  } else {
    throw new Error('Neither Algolia nor Firestore available for search');
  }
}

/**
 * GET /api/search
 * Full-text search with filters
 *
 * Query params:
 * - q: search query
 * - source: filter by source (perplexity, telegram, twitter)
 * - topics: filter by topics (comma-separated)
 * - channelName: filter by Telegram channel
 * - dateFrom: filter by start date (timestamp)
 * - dateTo: filter by end date (timestamp)
 * - page: page number (default: 0)
 * - limit: items per page (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    await ensureSearchInitialized();

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const query = searchParams.get('q') || '';
    const source = searchParams.get('source') || undefined;
    const topicsParam = searchParams.get('topics');
    const topics = topicsParam ? topicsParam.split(',').filter(Boolean) : undefined;
    const channelName = searchParams.get('channelName') || undefined;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '0');
    const hitsPerPage = parseInt(searchParams.get('limit') || '20');

    // Build search options
    const searchOptions: SearchOptions = {
      query,
      page,
      hitsPerPage,
    };

    // Add filters if provided
    if (source || topics || channelName || dateFrom || dateTo) {
      searchOptions.filters = {};

      if (source) {
        searchOptions.filters.source = source;
      }

      if (topics) {
        searchOptions.filters.topics = topics;
      }

      if (channelName) {
        searchOptions.filters.channelName = channelName;
      }

      if (dateFrom || dateTo) {
        searchOptions.filters.dateRange = {
          from: dateFrom ? parseInt(dateFrom) : undefined,
          to: dateTo ? parseInt(dateTo) : undefined,
        };
      }
    }

    // Execute search
    const startTime = Date.now();
    const results = await searchArticles(searchOptions);
    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      ...results,
      totalTime,
      mode: getSearchMode(),
    });
  } catch (error) {
    console.error('Error in /api/search:', error);
    return NextResponse.json(
      {
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/search/index
 * Re-index all articles to Algolia (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Check for admin authentication (simple secret for now)
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!isFirestoreAvailable()) {
      return NextResponse.json(
        { error: 'Firestore not available' },
        { status: 500 }
      );
    }

    // Fetch all articles
    const articles = await getArticles(10000);

    // Re-index to Algolia
    const { indexArticles, configureAlgoliaIndex } = await import('@/lib/algolia');
    await configureAlgoliaIndex();
    await indexArticles(articles);

    return NextResponse.json({
      success: true,
      articlesIndexed: articles.length,
      message: 'Articles indexed successfully',
    });
  } catch (error) {
    console.error('Error indexing articles:', error);
    return NextResponse.json(
      {
        error: 'Indexing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
