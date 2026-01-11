/**
 * Telegram scraper using Bot API
 * Monitors public channels for Persian uprising news
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Public Telegram channels to monitor (add bot as admin to these channels)
const MONITORED_CHANNELS = [
  '@BBCPersian',
  '@manoto_tv',
  '@IranIntlTV',
  '@RadioFarda',
  '@VOAFarsi',
];

interface TelegramMessage {
  message_id: number;
  date: number;
  chat: {
    id: number;
    title?: string;
    username?: string;
    type: string;
  };
  text?: string;
  caption?: string;
  photo?: Array<{
    file_id: string;
    file_size: number;
    width: number;
    height: number;
  }>;
  video?: {
    file_id: string;
    thumbnail?: {
      file_id: string;
    };
  };
  from?: {
    id: number;
    username?: string;
    first_name: string;
  };
  forward_from_chat?: {
    id: number;
    title: string;
    username?: string;
  };
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
}

export interface ScrapedTelegramArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl?: string;
  source: 'telegram';
  sourceUrl: string;
  publishedAt: number;
  tags: string[];
  createdAt: number;
  channelName?: string;
  channelUsername?: string;
}

let lastUpdateId = 0;

/**
 * Scrape recent messages from Telegram channels
 * @param limit - Maximum number of messages to fetch (default: 20)
 */
export async function scrapeTelegram(limit: number = 20): Promise<ScrapedTelegramArticle[]> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not configured');
    return [];
  }

  try {
    console.log('📱 Starting Telegram scrape...');

    // Get updates from Telegram Bot API
    const updates = await getUpdates();

    if (updates.length === 0) {
      console.log('📱 No new Telegram updates');
      return [];
    }

    console.log(`📱 Received ${updates.length} Telegram updates`);

    // Transform messages to articles
    const articles: ScrapedTelegramArticle[] = [];

    for (const update of updates) {
      const message = update.channel_post || update.message;
      if (!message) continue;

      // Only process channel posts or forwarded messages
      if (message.chat.type !== 'channel' && !message.forward_from_chat) {
        continue;
      }

      const article = await transformMessageToArticle(message);
      if (article) {
        articles.push(article);
      }

      // Update last processed update ID
      if (update.update_id > lastUpdateId) {
        lastUpdateId = update.update_id;
      }
    }

    console.log(`✅ Scraped ${articles.length} articles from Telegram`);
    return articles.slice(0, limit);

  } catch (error) {
    console.error('❌ Error scraping Telegram:', error);
    return [];
  }
}

/**
 * Get updates from Telegram Bot API
 */
async function getUpdates(): Promise<TelegramUpdate[]> {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`;
    const params = new URLSearchParams({
      offset: (lastUpdateId + 1).toString(),
      limit: '100',
      timeout: '30',
      allowed_updates: JSON.stringify(['message', 'channel_post']),
    });

    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Telegram API error:', error);
      return [];
    }

    const data = await response.json();

    if (!data.ok) {
      console.error('❌ Telegram API returned error:', data.description);
      return [];
    }

    return data.result as TelegramUpdate[];

  } catch (error) {
    console.error('❌ Error fetching Telegram updates:', error);
    return [];
  }
}

/**
 * Transform Telegram message to article format
 */
async function transformMessageToArticle(
  message: TelegramMessage
): Promise<ScrapedTelegramArticle | null> {
  try {
    // Get message text (from text or caption)
    const content = message.text || message.caption || '';

    if (!content || content.length < 20) {
      // Skip messages that are too short or empty
      return null;
    }

    // Filter for relevant content (Persian uprising keywords)
    const keywords = [
      'mahsa', 'amini', 'iran', 'protest', 'tehran', 'hijab',
      'mahsa amini', 'woman life freedom', 'زن', 'زندگی', 'آزادی',
      'مهسا', 'امینی', 'اعتراض', 'تهران'
    ];

    const contentLower = content.toLowerCase();
    const isRelevant = keywords.some(keyword => contentLower.includes(keyword.toLowerCase()));

    if (!isRelevant) {
      // Skip irrelevant messages
      return null;
    }

    // Get channel info
    const channelName = message.chat.title || message.forward_from_chat?.title || 'Unknown Channel';
    const channelUsername = message.chat.username || message.forward_from_chat?.username;

    // Build message URL
    const sourceUrl = channelUsername
      ? `https://t.me/${channelUsername}/${message.message_id}`
      : `https://t.me/c/${Math.abs(message.chat.id)}/${message.message_id}`;

    // Extract image URL if available
    let imageUrl: string | undefined;
    if (message.photo && message.photo.length > 0) {
      // Get largest photo
      const largestPhoto = message.photo[message.photo.length - 1];
      imageUrl = await getFileUrl(largestPhoto.file_id);
    } else if (message.video?.thumbnail) {
      imageUrl = await getFileUrl(message.video.thumbnail.file_id);
    }

    // Create title from first 100 chars
    const title = content.length > 100
      ? content.substring(0, 97) + '...'
      : content;

    // Extract hashtags
    const hashtags = content.match(/#\w+/g) || [];

    return {
      id: `telegram-${message.chat.id}-${message.message_id}`,
      title,
      summary: title,
      content,
      imageUrl,
      source: 'telegram',
      sourceUrl,
      publishedAt: message.date * 1000, // Convert to milliseconds
      tags: [...hashtags, 'telegram', channelName.toLowerCase().replace(/\s+/g, '-')],
      createdAt: Date.now(),
      channelName,
      channelUsername,
    };

  } catch (error) {
    console.error('❌ Error transforming Telegram message:', error);
    return null;
  }
}

/**
 * Get file URL from Telegram
 */
async function getFileUrl(fileId: string): Promise<string | undefined> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
    );

    const data = await response.json();

    if (!data.ok) {
      return undefined;
    }

    const filePath = data.result.file_path;
    return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

  } catch (error) {
    console.error('❌ Error getting file URL:', error);
    return undefined;
  }
}

/**
 * Get bot info (for testing connection)
 */
export async function getBotInfo() {
  if (!TELEGRAM_BOT_TOKEN) {
    return { error: 'Bot token not configured' };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`
    );

    const data = await response.json();

    if (!data.ok) {
      return { error: data.description };
    }

    return {
      success: true,
      bot: data.result,
    };

  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Set webhook for receiving updates (alternative to polling)
 */
export async function setWebhook(webhookUrl: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    return { error: 'Bot token not configured' };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'channel_post'],
        }),
      }
    );

    const data = await response.json();

    return {
      success: data.ok,
      description: data.description,
    };

  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete webhook (use polling instead)
 */
export async function deleteWebhook() {
  if (!TELEGRAM_BOT_TOKEN) {
    return { error: 'Bot token not configured' };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`
    );

    const data = await response.json();

    return {
      success: data.ok,
      description: data.description,
    };

  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
