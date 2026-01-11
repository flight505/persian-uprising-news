/**
 * Twitter/X Scraper using Apify
 * Scrapes tweets from specific hashtags related to Persian uprising
 * Cost: ~$7/month for regular usage
 */

export interface TwitterArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  url: string;
  publishedAt: string;
  topics: string[];
  source: 'twitter';
  author?: string;
  imageUrl?: string;
}

// Hashtags to monitor
const TWITTER_HASHTAGS = [
  '#MahsaAmini',
  '#IranProtests',
  '#OpIran',
  '#IranRevolution',
  '#IranRevoIution2022',
  '#زن_زندگی_آزادی',
  '#مهسا_امینی',
];

// Twitter keywords related to our topics
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'iran.now': ['protest', 'demonstration', 'clash', 'crackdown', 'iran', 'tehran'],
  'iran.statements_official': ['iran government', 'iran ministry', 'khamenei', 'raisi', 'irgc'],
  'iran.statements_opposition': ['opposition', 'dissident', 'activist', 'critic'],
  'entity.reza_pahlavi': ['reza pahlavi', 'crown prince', 'pahlavi'],
  'leaders.world_statements': ['biden', 'macron', 'trudeau', 'sunak', 'un', 'eu', 'white house'],
  'protests.solidarity_global': ['solidarity', 'support iran', 'global protest'],
  'top.breaking_global': ['breaking', 'urgent', 'just in'],
  'events.embassy_incidents': ['embassy', 'consulate', 'diplomatic'],
};

/**
 * Classify tweet into topic categories based on content
 */
function classifyTweetTopics(text: string): string[] {
  const lowerText = text.toLowerCase();
  const topics: string[] = [];

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      topics.push(topic);
    }
  }

  // Default to iran.now if no specific topics matched
  if (topics.length === 0) {
    topics.push('iran.now');
  }

  return topics;
}

/**
 * Fetch tweets using Apify Twitter Scraper
 * Docs: https://apify.com/apidojo/twitter-scraper
 */
export async function fetchTwitterNews(): Promise<TwitterArticle[]> {
  const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

  if (!APIFY_TOKEN) {
    console.warn('⚠️ APIFY_API_TOKEN not set. Skipping Twitter scraping.');
    return [];
  }

  try {
    console.log('🐦 Fetching tweets from Apify...');

    // Build search queries for hashtags
    const searchQueries = TWITTER_HASHTAGS.map(tag => tag).join(' OR ');

    // Call Apify API to run the Twitter scraper
    // Using Actor: apidojo/twitter-scraper
    const response = await fetch('https://api.apify.com/v2/acts/apidojo~twitter-scraper/runs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${APIFY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        searchTerms: [searchQueries],
        maxTweets: 50, // Limit to 50 most recent tweets
        includeSearchTerms: true,
        twitterHandles: [], // Could add specific handles like @AlinejadMasih
        startUrls: [],
        onlyVerifiedUsers: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Apify API error: ${response.status} ${response.statusText}`);
    }

    const runData = await response.json();
    const runId = runData.data.id;

    // Wait for the run to finish (with timeout)
    let tweets: any[] = [];
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts = ~2 minutes

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 4000)); // Wait 4 seconds

      // Check run status
      const statusResponse = await fetch(
        `https://api.apify.com/v2/acts/apidojo~twitter-scraper/runs/${runId}`,
        {
          headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` },
        }
      );

      const statusData = await statusResponse.json();
      const status = statusData.data.status;

      if (status === 'SUCCEEDED') {
        // Fetch results from dataset
        const datasetId = statusData.data.defaultDatasetId;
        const resultsResponse = await fetch(
          `https://api.apify.com/v2/datasets/${datasetId}/items`,
          {
            headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` },
          }
        );

        tweets = await resultsResponse.json();
        break;
      } else if (status === 'FAILED' || status === 'ABORTED') {
        throw new Error(`Apify run ${status.toLowerCase()}`);
      }

      attempts++;
    }

    if (tweets.length === 0) {
      console.warn('⚠️ No tweets returned from Apify');
      return [];
    }

    // Transform tweets to articles
    const articles: TwitterArticle[] = tweets
      .filter(tweet => tweet.text && tweet.createdAt) // Only valid tweets
      .slice(0, 20) // Limit to 20 most recent
      .map(tweet => {
        const text = tweet.text || '';
        const topics = classifyTweetTopics(text);

        return {
          id: `twitter-${tweet.id}`,
          title: text.length > 100 ? text.substring(0, 100) + '...' : text,
          summary: text,
          content: text,
          url: `https://twitter.com/i/status/${tweet.id}`,
          publishedAt: new Date(tweet.createdAt).toISOString(),
          topics,
          source: 'twitter' as const,
          author: tweet.author?.userName,
          imageUrl: tweet.media?.[0]?.url,
        };
      });

    console.log(`🐦 Received ${articles.length} tweets from Apify`);
    return articles;

  } catch (error) {
    console.error('Error fetching Twitter data:', error);
    return [];
  }
}

/**
 * Mock Twitter data for testing without Apify
 */
export function getMockTwitterArticles(): TwitterArticle[] {
  return [
    {
      id: 'twitter-mock-1',
      title: 'Breaking: Large protests reported in Tehran universities tonight',
      summary: 'Breaking: Large protests reported in Tehran universities tonight #MahsaAmini #IranProtests',
      content: 'Breaking: Large protests reported in Tehran universities tonight #MahsaAmini #IranProtests',
      url: 'https://twitter.com/mock/status/1',
      publishedAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
      topics: ['iran.now', 'top.breaking_global'],
      source: 'twitter',
      author: 'IranWire',
    },
    {
      id: 'twitter-mock-2',
      title: 'Crown Prince Reza Pahlavi addresses protesters in new video message',
      summary: 'Crown Prince Reza Pahlavi addresses protesters in new video message calling for unity and peaceful resistance #IranRevolution',
      content: 'Crown Prince Reza Pahlavi addresses protesters in new video message calling for unity and peaceful resistance #IranRevolution',
      url: 'https://twitter.com/mock/status/2',
      publishedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      topics: ['entity.reza_pahlavi', 'iran.statements_opposition'],
      source: 'twitter',
      author: 'PahlaviReza',
    },
    {
      id: 'twitter-mock-3',
      title: 'Global solidarity protests held in 50+ cities worldwide',
      summary: 'Global solidarity protests held in 50+ cities worldwide in support of Iranian protesters #OpIran',
      content: 'Global solidarity protests held in 50+ cities worldwide in support of Iranian protesters #OpIran',
      url: 'https://twitter.com/mock/status/3',
      publishedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      topics: ['protests.solidarity_global'],
      source: 'twitter',
      author: 'IranIntl',
    },
  ];
}
