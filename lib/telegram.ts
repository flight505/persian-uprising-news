/**
 * Telegram Channel Scraper
 * Monitors public Telegram channels for news about Persian uprising
 * Cost: FREE - uses Telegram Bot API
 */

import { logger } from '@/lib/logger';

export interface TelegramArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  url: string;
  publishedAt: string;
  topics: string[];
  source: 'telegram';
  author?: string;
  imageUrl?: string;
  channelName?: string;
}

// Public Telegram channels to monitor
const TELEGRAM_CHANNELS = [
  '@iranintl',           // Iran International (English)
  '@bbc_persian',        // BBC Persian
  '@voapersian',         // VOA Persian
  '@iranwire',           // IranWire
  '@alinejadmasih',      // Masih Alinejad (activist)
  '@rezapahlavi',        // Reza Pahlavi (Crown Prince)
  '@manoto_tv',          // Manoto TV
];

// Topic classification keywords
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'iran.now': ['protest', 'demonstration', 'clash', 'crackdown', 'iran', 'tehran', 'تهران', 'تظاهرات'],
  'iran.statements_official': ['iran government', 'khamenei', 'raisi', 'irgc', 'ministry', 'دولت', 'خامنه‌ای'],
  'iran.statements_opposition': ['opposition', 'dissident', 'activist', 'critic', 'مخالف', 'فعال'],
  'entity.reza_pahlavi': ['reza pahlavi', 'crown prince', 'pahlavi', 'رضا پهلوی'],
  'leaders.world_statements': ['biden', 'macron', 'trudeau', 'un', 'eu', 'white house', 'سازمان ملل'],
  'protests.solidarity_global': ['solidarity', 'support iran', 'global protest', 'حمایت', 'همبستگی'],
  'top.breaking_global': ['breaking', 'urgent', 'alert', 'فوری', 'خبر فوری'],
  'events.embassy_incidents': ['embassy', 'consulate', 'diplomatic', 'سفارت'],
};

/**
 * Classify message into topic categories based on content
 */
function classifyTelegramTopics(text: string): string[] {
  const lowerText = text.toLowerCase();
  const topics: string[] = [];

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
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
 * Extract title from Telegram message (first line or first 100 chars)
 */
function extractTitle(text: string): string {
  // Try to get first line
  const firstLine = text.split('\n')[0].trim();

  if (firstLine.length > 10 && firstLine.length <= 200) {
    return firstLine;
  }

  // Otherwise take first 100 chars
  return text.length > 100 ? text.substring(0, 97) + '...' : text;
}

/**
 * Fetch messages from Telegram channels using Bot API
 * Requires: TELEGRAM_BOT_TOKEN in environment
 */
export async function fetchTelegramNews(): Promise<TelegramArticle[]> {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  if (!BOT_TOKEN) {
    logger.warn('telegram_bot_token_missing');
    return [];
  }

  try {
    logger.info('telegram_fetch_started');

    const articles: TelegramArticle[] = [];

    // Fetch recent messages from each channel
    for (const channel of TELEGRAM_CHANNELS) {
      try {
        // Get channel info
        const channelInfoResponse = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=${channel}`,
          { method: 'GET' }
        );

        if (!channelInfoResponse.ok) {
          logger.warn('telegram_channel_access_failed', { channel });
          continue;
        }

        const channelInfo = await channelInfoResponse.json();
        const channelName = channelInfo.result?.title || channel;

        // Get recent messages from channel
        // Note: Bot must be added to channel as admin to read messages
        const messagesResponse = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?allowed_updates=["channel_post"]&limit=100`,
          { method: 'GET' }
        );

        if (!messagesResponse.ok) {
          logger.warn('telegram_messages_fetch_failed', { channel });
          continue;
        }

        const messagesData = await messagesResponse.json();
        const messages = messagesData.result || [];

        // Filter messages from the last 24 hours
        const oneDayAgo = Date.now() / 1000 - 86400;

        for (const update of messages) {
          const message = update.channel_post;

          if (!message || !message.text || message.date < oneDayAgo) {
            continue;
          }

          // Check if message is from this channel
          if (message.chat.username !== channel.replace('@', '')) {
            continue;
          }

          const text = message.text;
          const topics = classifyTelegramTopics(text);
          const title = extractTitle(text);

          // Build message URL
          const messageUrl = `https://t.me/${message.chat.username}/${message.message_id}`;

          // Extract image if available
          let imageUrl: string | undefined;
          if (message.photo && message.photo.length > 0) {
            const photo = message.photo[message.photo.length - 1]; // Get largest photo
            const fileResponse = await fetch(
              `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${photo.file_id}`
            );
            if (fileResponse.ok) {
              const fileData = await fileResponse.json();
              imageUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
            }
          }

          articles.push({
            id: `telegram-${message.message_id}`,
            title,
            summary: text.length > 300 ? text.substring(0, 297) + '...' : text,
            content: text,
            url: messageUrl,
            publishedAt: new Date(message.date * 1000).toISOString(),
            topics,
            source: 'telegram',
            author: message.author_signature,
            channelName,
            imageUrl,
          });
        }
      } catch (error) {
        logger.error('telegram_channel_error', {
          channel,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        continue;
      }
    }

    // Sort by date (newest first) and limit to 20 most recent
    articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    const recentArticles = articles.slice(0, 20);

    logger.info('telegram_fetch_completed', { count: recentArticles.length });
    return recentArticles;

  } catch (error) {
    logger.error('telegram_fetch_error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
}

/**
 * Mock Telegram data for testing without Bot Token
 */
export function getMockTelegramArticles(): TelegramArticle[] {
  return [
    {
      id: 'telegram-mock-1',
      title: '🔴 BREAKING: Heavy security presence reported in central Tehran',
      summary: '🔴 BREAKING: Heavy security presence reported in central Tehran tonight as students gather near university campuses. Internet disruptions confirmed in multiple districts. #MahsaAmini',
      content: '🔴 BREAKING: Heavy security presence reported in central Tehran tonight as students gather near university campuses. Internet disruptions confirmed in multiple districts. #MahsaAmini',
      url: 'https://t.me/iranintl/12345',
      publishedAt: new Date(Date.now() - 1200000).toISOString(), // 20 min ago
      topics: ['iran.now', 'top.breaking_global'],
      source: 'telegram',
      channelName: 'Iran International',
    },
    {
      id: 'telegram-mock-2',
      title: 'Reza Pahlavi: "The people of Iran have shown extraordinary courage"',
      summary: 'Reza Pahlavi: "The people of Iran have shown extraordinary courage in their fight for freedom. The world must not look away." Full statement now available on our channel.',
      content: 'Crown Prince Reza Pahlavi issued a statement today praising the courage of Iranian protesters: "The people of Iran have shown extraordinary courage in their fight for freedom. The world must not look away. Democratic nations must stand with Iran." Full statement now available on our channel.',
      url: 'https://t.me/rezapahlavi/6789',
      publishedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      topics: ['entity.reza_pahlavi', 'iran.statements_opposition'],
      source: 'telegram',
      channelName: 'Reza Pahlavi',
    },
    {
      id: 'telegram-mock-3',
      title: 'BBC Persian: UN Human Rights Council to hold emergency session on Iran',
      summary: 'BBC Persian: UN Human Rights Council to hold emergency session on Iran protests. Over 50 countries co-sponsor resolution condemning violence against protesters.',
      content: 'The UN Human Rights Council will convene an emergency session next week to address the situation in Iran. More than 50 countries have co-sponsored a resolution condemning the use of violence against peaceful protesters. The session comes amid international pressure on Tehran.',
      url: 'https://t.me/bbc_persian/23456',
      publishedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      topics: ['leaders.world_statements', 'iran.now'],
      source: 'telegram',
      channelName: 'BBC Persian',
    },
    {
      id: 'telegram-mock-4',
      title: 'Masih Alinejad: Solidarity protests in Berlin draw thousands',
      summary: 'Amazing turnout in Berlin today! Thousands gathered in solidarity with Iranian protesters. Photos and videos from the demonstration. #WomanLifeFreedom',
      content: 'Amazing turnout in Berlin today! Thousands gathered in solidarity with Iranian protesters, chanting "Woman, Life, Freedom" in both German and Farsi. Photos and videos from the demonstration show a diverse crowd including Iranian diaspora and German supporters. #WomanLifeFreedom',
      url: 'https://t.me/alinejadmasih/34567',
      publishedAt: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
      topics: ['protests.solidarity_global'],
      source: 'telegram',
      channelName: 'Masih Alinejad',
    },
  ];
}
