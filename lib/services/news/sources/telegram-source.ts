import { INewsSource, Article } from './i-news-source';
import {
  initTelegramClient,
  fetchRecentMessages,
  TelegramArticle as UserAPIArticle,
} from '@/lib/telegram-user-api';
import { scrapeTelegram, ScrapedTelegramArticle } from '@/lib/telegram-scraper';
import { getMockTelegramArticles, TelegramArticle } from '@/lib/telegram';
import { logger } from '@/lib/logger';

export class TelegramNewsSource implements INewsSource {
  readonly name = 'telegram';

  constructor(
    private sessionString?: string,
    private apiId?: string,
    private apiHash?: string,
    private botToken?: string
  ) {}

  async fetch(_query?: string): Promise<Article[]> {
    try {
      const useUserAPI = !!(this.sessionString && this.apiId && this.apiHash);
      const useBotAPI = !!this.botToken;

      if (useUserAPI) {
        return await this.fetchUserAPI();
      } else if (useBotAPI) {
        return await this.fetchBotAPI();
      } else {
        return await this.fetchMock();
      }
    } catch (error) {
      logger.error('telegram_fetch_failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return [];
    }
  }

  private async fetchUserAPI(): Promise<Article[]> {
    try {
      const client = await initTelegramClient();
      const articles = await fetchRecentMessages(client, 24);
      await client.disconnect();
      return this.normalizeUserAPI(articles);
    } catch (error) {
      logger.warn('telegram_user_api_failed_fallback', {
        error: error instanceof Error ? error.message : String(error),
        has_bot_token: !!this.botToken,
      });
      if (this.botToken) {
        return await this.fetchBotAPI();
      }
      return await this.fetchMock();
    }
  }

  private async fetchBotAPI(): Promise<Article[]> {
    try {
      const articles = await scrapeTelegram(20);
      return this.normalizeBotAPI(articles);
    } catch (error) {
      logger.warn('telegram_bot_api_failed_using_mock', {
        error: error instanceof Error ? error.message : String(error),
      });
      return await this.fetchMock();
    }
  }

  private async fetchMock(): Promise<Article[]> {
    const articles = getMockTelegramArticles();
    return this.normalizeMock(articles);
  }

  private normalizeUserAPI(data: UserAPIArticle[]): Article[] {
    return data.map(item => ({
      id: crypto.randomUUID(),
      title: item.title,
      summary: item.summary,
      content: item.content,
      source: 'telegram',
      sourceUrl: item.sourceUrl,
      publishedAt: item.publishedAt,
      topics: (item as any).topics || [],
      channelName: item.channelName,
      channelUsername: item.channelUsername,
    }));
  }

  private normalizeBotAPI(data: ScrapedTelegramArticle[]): Article[] {
    return data.map(item => ({
      id: crypto.randomUUID(),
      title: item.title,
      summary: item.summary,
      content: item.content,
      source: 'telegram',
      sourceUrl: item.sourceUrl,
      publishedAt: item.publishedAt,
      topics: ('tags' in item ? (item as any).tags : (item as any).topics) || [],
      channelName: item.channelName,
      channelUsername: item.channelUsername,
    }));
  }

  private normalizeMock(data: TelegramArticle[]): Article[] {
    return data.map(item => ({
      id: crypto.randomUUID(),
      title: item.title,
      summary: item.summary,
      content: item.content,
      source: 'telegram',
      sourceUrl: (item as any).sourceUrl || '',
      publishedAt: item.publishedAt,
      topics: ('tags' in item ? (item as any).tags : (item as any).topics) || [],
      channelName: item.channelName,
      channelUsername: (item as any).channelUsername,
    }));
  }
}
