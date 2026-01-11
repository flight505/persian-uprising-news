import { NextRequest, NextResponse } from 'next/server';
import { fetchPerplexityNews, PerplexityArticle } from '@/lib/perplexity';
import { getMockTwitterArticles, TwitterArticle } from '@/lib/twitter';
import { getMockTelegramArticles, TelegramArticle } from '@/lib/telegram';
import { minHashDeduplicator, computeContentHash, generateMinHashSignature } from '@/lib/minhash';
import { sendPushNotification } from '../push/route';

type Article = (PerplexityArticle | TwitterArticle | TelegramArticle) & {
  id: string;
  contentHash: string;
  minHash: number[];
  createdAt: number;
};

// In-memory cache for development (will be replaced with DynamoDB in production)
let articlesCache: Article[] = [];
let lastFetch = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (increased for development to reduce API calls)

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

    // Check if we need to refresh the cache
    const now = Date.now();
    if (now - lastFetch > CACHE_DURATION || articlesCache.length === 0) {
      console.log('🔄 Fetching fresh news from Perplexity...');
      await refreshNewsCache();
      lastFetch = now;
    }

    // Filter by topic if requested
    let articles = articlesCache;
    if (topicFilter) {
      articles = articles.filter(article => article.topics.includes(topicFilter));
    }

    // Sort by createdAt (newest first)
    articles.sort((a, b) => b.createdAt - a.createdAt);

    // Paginate
    const start = page * limit;
    const end = start + limit;
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
    return NextResponse.json(
      { error: 'Failed to fetch news', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/news/refresh
 * Manually trigger a news refresh
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Manual refresh triggered');
    await refreshNewsCache();
    lastFetch = Date.now();

    return NextResponse.json({
      success: true,
      articlesCount: articlesCache.length,
      lastUpdated: lastFetch,
    });
  } catch (error) {
    console.error('Error refreshing news:', error);
    return NextResponse.json(
      { error: 'Failed to refresh news', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Refresh news cache with deduplication
 */
async function refreshNewsCache() {
  try {
    // Fetch from multiple sources in parallel
    console.log('🔄 Fetching from Perplexity, Twitter, and Telegram...');
    const [perplexityArticles, twitterArticles, telegramArticles] = await Promise.all([
      fetchPerplexityNews(),
      getMockTwitterArticles(), // Using mock data for now (replace with fetchTwitterNews() when Apify token is available)
      getMockTelegramArticles(), // Using mock data for now (replace with fetchTelegramNews() when bot token is available)
    ]);

    console.log(`📰 Received ${perplexityArticles.length} articles from Perplexity`);
    console.log(`🐦 Received ${twitterArticles.length} articles from Twitter`);
    console.log(`📱 Received ${telegramArticles.length} articles from Telegram`);

    // Combine articles from all sources
    const newArticles = [...perplexityArticles, ...twitterArticles, ...telegramArticles];

    if (newArticles.length === 0) {
      console.log('⚠️ No new articles returned from any source');
      return;
    }

    // Process and deduplicate
    const processedArticles = await Promise.all(
      newArticles.map(async (article) => {
        const contentHash = await computeContentHash(article.content || article.summary);
        const minHash = generateMinHashSignature(article.content || article.summary);

        return {
          ...article,
          id: crypto.randomUUID(),
          contentHash,
          minHash,
          createdAt: Date.now(),
        };
      })
    );

    // Deduplicate against existing cache
    const deduplicatedArticles = processedArticles.filter(newArticle => {
      // Check for exact duplicates
      const exactDuplicate = articlesCache.some(
        existing => existing.contentHash === newArticle.contentHash
      );

      if (exactDuplicate) {
        console.log(`⏭️  Skipping exact duplicate: ${newArticle.title.substring(0, 50)}...`);
        return false;
      }

      // Check for fuzzy duplicates (80% similarity threshold)
      const fuzzyDuplicate = articlesCache.some(existing => {
        const similarity = minHashDeduplicator.jaccardSimilarity(
          existing.minHash,
          newArticle.minHash
        );
        return similarity >= 0.8;
      });

      if (fuzzyDuplicate) {
        console.log(`⏭️  Skipping fuzzy duplicate: ${newArticle.title.substring(0, 50)}...`);
        return false;
      }

      return true;
    });

    console.log(`✅ Added ${deduplicatedArticles.length} new articles (${processedArticles.length - deduplicatedArticles.length} duplicates removed)`);

    // Add to cache and keep only last 200 articles
    articlesCache = [...deduplicatedArticles, ...articlesCache].slice(0, 200);

    console.log(`📊 Total articles in cache: ${articlesCache.length}`);

    // Send push notification if there are new articles
    if (deduplicatedArticles.length > 0) {
      // Don't await - send in background
      sendNewArticleNotification(deduplicatedArticles.length, deduplicatedArticles[0]).catch(err =>
        console.error('Failed to send push notification:', err)
      );
    }
  } catch (error) {
    console.error('Error refreshing news cache:', error);
    throw error;
  }
}

/**
 * Send push notification for new articles
 */
async function sendNewArticleNotification(count: number, firstArticle: Article) {
  try {
    const title = count === 1
      ? '📰 New Article'
      : `📰 ${count} New Articles`;

    const message = count === 1
      ? firstArticle.title
      : `${firstArticle.title} and ${count - 1} more`;

    const result = await sendPushNotification(title, message, '/');

    if (result.sent > 0) {
      console.log(`📬 Sent push notification to ${result.sent} subscriber(s)`);
    }
  } catch (error) {
    console.error('Error sending new article notification:', error);
  }
}
