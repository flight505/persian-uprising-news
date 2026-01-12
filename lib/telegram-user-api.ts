/**
 * Telegram User API integration for automatic channel monitoring
 *
 * Unlike Bot API, User API (MTProto) can read ANY public channel without admin access.
 * This is the proper solution for news aggregation from Telegram.
 *
 * Setup:
 * 1. Create Telegram app at https://my.telegram.org/apps
 * 2. Get API_ID and API_HASH
 * 3. Use a library like `telegram` (Node.js MTProto client)
 *
 * Why User API over Bot API:
 * - ✅ Read public channels without being admin
 * - ✅ Access message history
 * - ✅ Get channel metadata (subscribers, description)
 * - ✅ Receive updates in real-time
 * - ❌ Requires phone number authentication (one-time)
 * - ❌ Slightly more complex setup
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file for local development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(process.cwd(), '.env') });
}

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import { Api } from 'telegram/tl';

// Configuration
const API_ID = parseInt(process.env.TELEGRAM_API_ID || '0');
const API_HASH = process.env.TELEGRAM_API_HASH || '';
const SESSION_STRING = process.env.TELEGRAM_SESSION_STRING || '';

// Channels to monitor (public channels, no admin access needed!)
const MONITORED_CHANNELS = [
  '@BBCPersian',         // BBC Persian - verified working
  '@IranIntlTV',         // Iran International - verified working
  '@RadioFarda',         // Radio Farda - verified working
  // Note: Add more channels as needed. Verify usernames at t.me/username
];

// Keywords to filter for uprising-related content
const UPRISING_KEYWORDS = [
  'اعتراض',         // Protest (Farsi)
  'تظاهرات',        // Demonstration (Farsi)
  'مهسا امینی',      // Mahsa Amini (Farsi)
  'زن زندگی آزادی',  // Woman Life Freedom (Farsi)
  'protest',
  'demonstration',
  'uprising',
  'iran protests',
  'mahsa amini',
  'woman life freedom',
];

export interface TelegramArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl?: string;
  source: string;
  sourceUrl: string;
  publishedAt: number;
  channelName: string;
  channelUsername: string;
}

/**
 * Initialize Telegram User client
 */
export async function initTelegramClient(): Promise<TelegramClient> {
  const client = new TelegramClient(
    new StringSession(SESSION_STRING),
    API_ID,
    API_HASH,
    {
      connectionRetries: 5,
    }
  );

  await client.start({
    phoneNumber: async () => {
      throw new Error('Phone number required for first-time authentication');
    },
    password: async () => {
      throw new Error('Password required if 2FA enabled');
    },
    phoneCode: async () => {
      throw new Error('Phone code required for first-time authentication');
    },
    onError: (err) => console.error('Telegram auth error:', err),
  });

  console.log('✅ Connected to Telegram User API');
  return client;
}

/**
 * Fetch recent messages from monitored channels
 */
export async function fetchRecentMessages(
  client: TelegramClient,
  hoursAgo: number = 24
): Promise<TelegramArticle[]> {
  const articles: TelegramArticle[] = [];
  const cutoffTime = Date.now() - hoursAgo * 60 * 60 * 1000;

  for (const channelUsername of MONITORED_CHANNELS) {
    try {
      const channel = await client.getEntity(channelUsername);

      // Get last 50 messages
      const messages = await client.getMessages(channel, {
        limit: 50,
      });

      for (const message of messages) {
        if (!message.text) continue;

        // Filter by timestamp
        if (message.date * 1000 < cutoffTime) continue;

        // Filter by uprising keywords
        const containsKeyword = UPRISING_KEYWORDS.some(keyword =>
          message.text.toLowerCase().includes(keyword.toLowerCase())
        );

        if (!containsKeyword) continue;

        // Extract article data
        const article = await messageToArticle(message, channel, channelUsername);
        if (article) {
          articles.push(article);
        }
      }

      console.log(`✅ Fetched ${articles.length} messages from ${channelUsername}`);
    } catch (error) {
      console.error(`❌ Error fetching from ${channelUsername}:`, error);
    }
  }

  return articles;
}

/**
 * Convert Telegram message to article format
 */
async function messageToArticle(
  message: Api.Message,
  channel: any,
  channelUsername: string
): Promise<TelegramArticle | null> {
  if (!message.text) return null;

  // Extract first line as title
  const lines = message.text.split('\n').filter(line => line.trim());
  const title = lines[0]?.substring(0, 200) || 'Telegram Update';
  const summary = lines.slice(0, 3).join(' ').substring(0, 300);
  const content = message.text;

  // Extract image URL if exists
  let imageUrl: string | undefined;
  if (message.media) {
    // Handle different media types
    if (message.media instanceof Api.MessageMediaPhoto) {
      // Photo media - would need to download and upload to CDN
      // For now, we'll skip the image extraction
      imageUrl = undefined;
    }
  }

  // Get published timestamp
  const publishedAt = message.date * 1000;

  // Build source URL
  const messageId = message.id;
  const cleanUsername = channelUsername.replace('@', '');
  const sourceUrl = `https://t.me/${cleanUsername}/${messageId}`;

  return {
    id: `telegram-${cleanUsername}-${messageId}`,
    title,
    summary,
    content,
    imageUrl,
    source: 'Telegram',
    sourceUrl,
    publishedAt,
    channelName: channel.title || channelUsername,
    channelUsername,
  };
}

/**
 * Start real-time listener for new messages
 */
export async function startRealtimeListener(
  client: TelegramClient,
  onNewArticle: (article: TelegramArticle) => void
) {
  // Add event handler for new messages
  client.addEventHandler(async (event: NewMessageEvent) => {
    const message = event.message;
    if (!message.text) return;

    // Check if message is from monitored channel
    const chatId = event.chatId?.toString();
    if (!chatId) return;

    // Filter by uprising keywords
    const containsKeyword = UPRISING_KEYWORDS.some(keyword =>
      message.text.toLowerCase().includes(keyword.toLowerCase())
    );

    if (!containsKeyword) return;

    // Get channel info
    const channel = await event.getChat();
    const channelUsername = (channel as any)?.username ? `@${(channel as any).username}` : '';

    if (!MONITORED_CHANNELS.includes(channelUsername)) return;

    // Convert to article and callback
    const article = await messageToArticle(message, channel, channelUsername);
    if (article) {
      console.log(`📢 New article from ${channelUsername}: ${article.title}`);
      onNewArticle(article);
    }
  }, new NewMessage({}));

  console.log('👂 Listening for new messages in monitored channels...');
}

/**
 * Get session string for storage (after first authentication)
 */
export async function getSessionString(client: TelegramClient): Promise<string> {
  return client.session.save() as unknown as string;
}
