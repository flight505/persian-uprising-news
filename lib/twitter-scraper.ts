/**
 * Twitter scraper using Apify Tweet Scraper V2
 * Scrapes tweets from hashtags related to Persian uprising
 */

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_ACTOR_ID = 'apidojo~tweet-scraper';

// Hashtags to monitor for Persian uprising news
const PERSIAN_UPRISING_HASHTAGS = [
  '#MahsaAmini',
  '#IranProtests',
  '#OpIran',
  '#IranRevolution',
  '#WomanLifeFreedom',
  '#مهسا_امینی',
];

interface ApifyTweet {
  id: string;
  url: string;
  text: string;
  created_at: string;
  author: {
    id: string;
    username: string;
    name: string;
    verified: boolean;
    followers_count: number;
  };
  retweet_count: number;
  reply_count: number;
  like_count: number;
  quote_count: number;
  bookmark_count: number;
  lang: string;
  media?: {
    photos?: { url: string }[];
    videos?: { thumbnail_url: string }[];
  };
}

export interface ScrapedArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl?: string;
  source: 'twitter';
  sourceUrl: string;
  publishedAt: number;
  tags: string[];
  createdAt: number;
  author?: {
    username: string;
    name: string;
    verified: boolean;
    followers: number;
  };
  engagement?: {
    retweets: number;
    replies: number;
    likes: number;
    quotes: number;
  };
}

/**
 * Scrape recent tweets from Persian uprising hashtags
 * @param maxTweetsPerHashtag - Maximum tweets per hashtag (default: 50, min required by Apify)
 * @param hoursBack - How many hours back to search (default: 1)
 */
export async function scrapeTwitter(
  maxTweetsPerHashtag: number = 50,
  hoursBack: number = 1
): Promise<ScrapedArticle[]> {
  if (!APIFY_API_TOKEN) {
    console.error('❌ APIFY_API_TOKEN not configured');
    return [];
  }

  try {
    // Build search queries - one for each hashtag to ensure we get results
    // Apify works better with individual searches than OR queries
    const searchTerms = PERSIAN_UPRISING_HASHTAGS.slice(0, 3); // Start with first 3 hashtags

    console.log(`🐦 Starting Twitter scrape for hashtags: ${searchTerms.join(', ')}`);
    console.log(`📊 Will scrape up to ${maxTweetsPerHashtag} tweets per hashtag`);

    // Start Apify actor run
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchTerms: searchTerms,
          maxItems: maxTweetsPerHashtag,
          // Don't filter by language - get all tweets from hashtags
        }),
      }
    );

    if (!runResponse.ok) {
      const error = await runResponse.text();
      console.error('❌ Failed to start Apify run:', error);
      return [];
    }

    const runData = await runResponse.json();
    const runId = runData.data.id;

    console.log(`⏳ Apify run started: ${runId}, waiting for completion...`);

    // Wait for run to complete
    const tweets = await waitForApifyRun(runId);

    // Transform tweets to articles
    const articles = tweets
      .map(transformTweetToArticle)
      .filter((article): article is ScrapedArticle => article !== null);

    console.log(`✅ Scraped ${articles.length} tweets from Twitter (${tweets.length - articles.length} failed transformation)`);
    return articles;

  } catch (error) {
    console.error('❌ Error scraping Twitter:', error);
    return [];
  }
}

/**
 * Wait for Apify run to complete and fetch results
 */
async function waitForApifyRun(runId: string): Promise<ApifyTweet[]> {
  const maxAttempts = 60; // 5 minutes max wait
  const pollInterval = 5000; // 5 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    const statusResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
    );

    const statusData = await statusResponse.json();
    const status = statusData.data.status;

    console.log(`⏳ Apify run status: ${status} (attempt ${attempt + 1}/${maxAttempts})`);

    if (status === 'SUCCEEDED') {
      // Fetch dataset results
      const datasetId = statusData.data.defaultDatasetId;
      const datasetResponse = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`
      );

      const tweets = await datasetResponse.json();
      console.log(`📦 Received ${tweets.length} raw tweets from Apify`);

      // Debug: log first tweet structure
      if (tweets.length > 0) {
        console.log('🔍 Sample tweet structure:', JSON.stringify(tweets[0], null, 2).substring(0, 500));
      }

      return tweets as ApifyTweet[];
    }

    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      console.error(`❌ Apify run ${status}`);
      return [];
    }
  }

  console.error('❌ Apify run timeout');
  return [];
}

/**
 * Transform Apify tweet to article format
 */
function transformTweetToArticle(tweet: any): ScrapedArticle | null {
  try {
    // Validate required fields
    if (!tweet.id || !tweet.full_text) {
      console.warn('⚠️ Skipping tweet with missing required fields:', tweet.id);
      return null;
    }

    // Extract first image if available
    const imageUrl = tweet.entities?.media?.[0]?.media_url_https ||
                     tweet.extended_entities?.media?.[0]?.media_url_https;

    // Extract hashtags from text
    const text = tweet.full_text || tweet.text || '';
    const hashtags = text.match(/#\w+/g) || [];

    // Create title from first 100 chars of tweet
    const title = text.length > 100
      ? text.substring(0, 97) + '...'
      : text;

    // Create summary (same as title for tweets)
    const summary = title;

    // Parse publish date
    const publishedAt = new Date(tweet.created_at).getTime();

    // Build tweet URL
    const username = tweet.user?.screen_name || tweet.author?.username || 'unknown';
    const tweetUrl = tweet.url || `https://twitter.com/${username}/status/${tweet.id}`;

    return {
      id: `twitter-${tweet.id}`,
      title,
      summary,
      content: text,
      imageUrl,
      source: 'twitter',
      sourceUrl: tweetUrl,
      publishedAt,
      tags: [...hashtags, 'twitter', 'social-media'],
      createdAt: Date.now(),
      author: {
        username: username,
        name: tweet.user?.name || tweet.author?.name || username,
        verified: tweet.user?.verified || tweet.author?.verified || false,
        followers: tweet.user?.followers_count || tweet.author?.followers_count || 0,
      },
      engagement: {
        retweets: tweet.retweet_count || 0,
        replies: tweet.reply_count || 0,
        likes: tweet.favorite_count || tweet.like_count || 0,
        quotes: tweet.quote_count || 0,
      },
    };
  } catch (error) {
    console.error('❌ Error transforming tweet:', error);
    return null;
  }
}

/**
 * Get estimated cost for a scraping run
 * @param maxTweets - Maximum number of tweets to scrape
 * @returns Estimated cost in USD
 */
export function estimateCost(maxTweets: number): number {
  const costPerTweet = 0.0004; // $0.40 per 1000 tweets
  return maxTweets * costPerTweet;
}
