import { NextRequest, NextResponse } from 'next/server';
import { fetchPerplexityNews, PerplexityArticle } from '@/lib/perplexity';
import { getMockTwitterArticles, TwitterArticle } from '@/lib/twitter';
import { scrapeTwitter, ScrapedArticle as TwitterScrapedArticle } from '@/lib/twitter-scraper';
import { getMockTelegramArticles, TelegramArticle } from '@/lib/telegram';
import { scrapeTelegram, ScrapedTelegramArticle } from '@/lib/telegram-scraper';
import { initTelegramClient, fetchRecentMessages, TelegramArticle as UserAPIArticle } from '@/lib/telegram-user-api';
import { minHashDeduplicator, computeContentHash, generateMinHashSignature } from '@/lib/minhash';
import { sendPushNotification } from '@/lib/push-notifications';
import {
  saveArticles,
  getArticles as getFirestoreArticles,
  getArticleByContentHash,
  getRecentArticles,
  isFirestoreAvailable,
  Article as FirestoreArticle,
} from '@/lib/firestore';

type Article = (PerplexityArticle | TwitterArticle | TwitterScrapedArticle | TelegramArticle | ScrapedTelegramArticle | UserAPIArticle) & {
  id: string;
  contentHash: string;
  minHash: number[];
  createdAt: number;
  topics?: string[]; // Optional field for filtering (normalized from tags for Twitter)
};

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

    // Check if we need to refresh the cache
    // DON'T AWAIT - run in background to not block users
    const now = Date.now();
    if (now - lastFetch > CACHE_DURATION) {
      console.log('🔄 Fetching fresh news from sources (background)...');
      refreshNewsCache()
        .then(() => {
          lastFetch = now;
          console.log('✅ Background news refresh completed');
        })
        .catch(err => {
          console.error('⚠️ Background news refresh failed (non-blocking):', err);
          // Don't update lastFetch so we try again next time
        });
    }

    // Get articles from Firestore
    let articles: FirestoreArticle[];

    if (isFirestoreAvailable()) {
      if (topicFilter) {
        // Note: Topic filtering not yet implemented in Firestore queries
        // For now, fetch all and filter in memory
        const allArticles = await getFirestoreArticles(200);
        articles = allArticles.filter(article =>
          article.topics?.includes(topicFilter) || false
        );
      } else {
        articles = await getFirestoreArticles(limit * (page + 1));
      }
    } else {
      console.warn('⚠️ Firestore not available, returning empty array');
      articles = [];
    }

    // Paginate if needed (when topic filtering was applied)
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
    // NEVER fail completely - always return something
    console.error('Error in /api/news (returning empty gracefully):', error);

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
    const newArticlesCount = await refreshNewsCache();
    lastFetch = Date.now();

    return NextResponse.json({
      success: true,
      articlesCount: newArticlesCount,
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
async function refreshNewsCache(): Promise<number> {
  try {
    if (!isFirestoreAvailable()) {
      console.error('❌ Firestore not available, cannot refresh news');
      return 0;
    }

    // Determine which sources to use
    const useRealTwitter = false; // Disabled - Apify too expensive, Telegram provides better coverage
    const useUserAPITelegram = !!(process.env.TELEGRAM_SESSION_STRING && process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH);
    const useBotAPITelegram = !!process.env.TELEGRAM_BOT_TOKEN;
    const twitterSource = 'Disabled';
    const telegramSource = useUserAPITelegram ? 'User API' : useBotAPITelegram ? 'Bot API' : 'Mock';

    // Fetch from multiple sources in parallel
    console.log(`🔄 Fetching from Perplexity and Telegram (${telegramSource})...`);
    console.log(`📊 Telegram credentials check: SESSION=${!!process.env.TELEGRAM_SESSION_STRING}, ID=${!!process.env.TELEGRAM_API_ID}, HASH=${!!process.env.TELEGRAM_API_HASH}`);
    const [perplexityArticles, twitterArticles, telegramArticles] = await Promise.all([
      fetchPerplexityNews(),
      Promise.resolve([]), // Twitter disabled
      useUserAPITelegram
        ? (async () => {
            try {
              const client = await initTelegramClient();
              const articles = await fetchRecentMessages(client, 24);
              await client.disconnect();
              return articles;
            } catch (err) {
              console.error('❌ Telegram User API failed, trying Bot API or mock:', err);
              if (useBotAPITelegram) {
                return scrapeTelegram(20).catch(() => getMockTelegramArticles());
              }
              return getMockTelegramArticles();
            }
          })()
        : useBotAPITelegram
        ? scrapeTelegram(20).catch(err => {
            console.error('❌ Telegram scraping failed, using mock data:', err);
            return getMockTelegramArticles();
          })
        : getMockTelegramArticles(),
    ]);

    console.log(`📰 Received ${perplexityArticles.length} articles from Perplexity`);
    console.log(`📱 Received ${telegramArticles.length} articles from Telegram (${telegramSource})`);

    // Normalize Twitter and Telegram articles to have 'topics' field (map from 'tags')
    const normalizedTwitterArticles = (twitterArticles as any[]).map(article => ({
      ...article,
      topics: ('tags' in article ? article.tags : article.topics) || []
    }));

    const normalizedTelegramArticles = (telegramArticles as any[]).map(article => ({
      ...article,
      topics: ('tags' in article ? article.tags : article.topics) || []
    }));

    // Combine articles from all sources
    const newArticles = [...perplexityArticles, ...normalizedTwitterArticles, ...normalizedTelegramArticles];

    if (newArticles.length === 0) {
      console.log('⚠️ No new articles returned from any source');
      return 0;
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

    // Get recent articles from Firestore for deduplication (last 24 hours)
    const recentArticles = await getRecentArticles(24);

    // Deduplicate against Firestore
    const deduplicatedArticles = processedArticles.filter(newArticle => {
      // Check for exact duplicates
      const exactDuplicate = recentArticles.some(
        existing => existing.contentHash === newArticle.contentHash
      );

      if (exactDuplicate) {
        console.log(`⏭️  Skipping exact duplicate: ${newArticle.title.substring(0, 50)}...`);
        return false;
      }

      // Check for fuzzy duplicates (80% similarity threshold)
      const fuzzyDuplicate = recentArticles.some(existing => {
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

    console.log(`✅ Found ${deduplicatedArticles.length} new articles (${processedArticles.length - deduplicatedArticles.length} duplicates removed)`);

    // Save new articles to Firestore
    if (deduplicatedArticles.length > 0) {
      const firestoreArticles = deduplicatedArticles.map(article => ({
        ...article,
        publishedAt: typeof article.publishedAt === 'string'
          ? new Date(article.publishedAt).getTime()
          : article.publishedAt,
      })) as FirestoreArticle[];

      await saveArticles(firestoreArticles);
      console.log(`💾 Saved ${firestoreArticles.length} articles to Firestore`);

      // Auto-extract incidents from Telegram articles (don't await, run in background)
      extractIncidentsFromArticles(normalizedTelegramArticles).catch(err =>
        console.error('Failed to extract incidents:', err)
      );

      // Send push notification - don't await
      sendNewArticleNotification(deduplicatedArticles.length, deduplicatedArticles[0]).catch(err =>
        console.error('Failed to send push notification:', err)
      );
    }

    return deduplicatedArticles.length;
  } catch (error) {
    console.error('Error refreshing news cache:', error);
    throw error;
  }
}

/**
 * Auto-extract incidents from Telegram articles
 */
async function extractIncidentsFromArticles(articles: any[]) {
  try {
    if (articles.length === 0) {
      return;
    }

    console.log(`🔍 Auto-extracting incidents from ${articles.length} Telegram articles...`);

    // Import extraction functions
    const { extractIncidentsFromArticles: extractFn } = await import('@/lib/incident-extractor');
    const { geocodeLocations } = await import('@/lib/geocoder');
    const { saveIncident, isFirestoreAvailable } = await import('@/lib/firestore');

    if (!isFirestoreAvailable()) {
      console.warn('⚠️ Firestore not available, skipping incident extraction');
      return;
    }

    // Extract potential incidents
    const extractedIncidents = extractFn(articles);

    if (extractedIncidents.length === 0) {
      console.log('ℹ️  No incidents extracted from articles');
      return;
    }

    // Geocode all unique locations
    const uniqueLocations = [...new Set(extractedIncidents.map((i) => i.location))];
    console.log(`🗺️ Geocoding ${uniqueLocations.length} unique locations...`);

    const geocodedLocations = await geocodeLocations(uniqueLocations);
    console.log(`✅ Geocoded ${geocodedLocations.size} locations`);

    // Build incidents with geocoded coordinates and filter by confidence
    let savedCount = 0;
    for (const extracted of extractedIncidents) {
      try {
        const geocoded = geocodedLocations.get(extracted.location);

        if (!geocoded) {
          console.log(`⚠️ Failed to geocode: ${extracted.location}`);
          continue;
        }

        // Only save incidents with sufficient confidence (≥40%)
        if (extracted.confidence < 40) {
          console.log(`⚠️ Skipping low-confidence incident (${extracted.confidence}): ${extracted.title}`);
          continue;
        }

        await saveIncident({
          type: extracted.type,
          title: extracted.title.substring(0, 200),
          description: extracted.description.substring(0, 500),
          location: {
            lat: geocoded.lat,
            lon: geocoded.lon,
            address: geocoded.address,
          },
          verified: false, // Auto-extracted incidents need manual verification
          reportedBy: 'official', // From news sources
          timestamp: extracted.timestamp,
          upvotes: 0,
          confidence: extracted.confidence,
          keywords: extracted.keywords,
          relatedArticles: extracted.extractedFrom ? [{
            title: extracted.extractedFrom.articleTitle,
            url: extracted.extractedFrom.articleUrl,
            source: extracted.extractedFrom.source
          }] : undefined,
        });
        savedCount++;
      } catch (err) {
        console.error(`Failed to save incident: ${extracted.title}`, err);
      }
    }

    console.log(`💾 Saved ${savedCount}/${extractedIncidents.length} auto-extracted incidents`);
  } catch (error) {
    console.error('Error in auto-extraction:', error);
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
