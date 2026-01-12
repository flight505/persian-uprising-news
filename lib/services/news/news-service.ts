import { INewsSource } from './sources/i-news-source';
import { IDeduplicator } from './deduplication/i-deduplicator';
import { IArticleRepository } from './repositories/i-article-repository';
import { INotificationService } from '../notifications/i-notification-service';
import { IIncidentExtractor } from '../incidents/i-incident-extractor';

export interface RefreshResult {
  articlesAdded: number;
  articlesTotal: number;
  incidentsExtracted: number;
  timestamp: number;
}

export class NewsService {
  constructor(
    private sources: INewsSource[],
    private deduplicator: IDeduplicator,
    private repository: IArticleRepository,
    private notificationService: INotificationService,
    private incidentExtractor: IIncidentExtractor
  ) {
    if (!sources || sources.length === 0) {
      throw new Error('At least one news source is required');
    }
  }

  async refresh(): Promise<RefreshResult> {
    console.log('🔄 Starting news refresh...');

    const articles = await this.fetchFromAllSources();
    console.log(`📥 Fetched ${articles.length} articles from ${this.sources.length} sources`);

    if (articles.length === 0) {
      console.log('⚠️ No new articles returned from any source');
      return {
        articlesAdded: 0,
        articlesTotal: 0,
        incidentsExtracted: 0,
        timestamp: Date.now(),
      };
    }

    const recentArticles = await this.repository.getRecent(24);
    console.log(`📚 Found ${recentArticles.length} recent articles for deduplication`);

    const deduplicated = await this.deduplicator.process(articles, recentArticles);

    const saved = await this.repository.saveMany(deduplicated);
    console.log(`💾 Saved ${saved.length} new articles`);

    if (saved.length > 0) {
      this.notificationService.notifyNewArticles(saved).catch(err =>
        console.error('Failed to send push notification:', err)
      );
    }

    const incidents = await this.incidentExtractor.extractFromArticles(saved);
    console.log(`🚨 Extracted ${incidents.length} incidents`);

    return {
      articlesAdded: saved.length,
      articlesTotal: recentArticles.length + saved.length,
      incidentsExtracted: incidents.length,
      timestamp: Date.now(),
    };
  }

  private async fetchFromAllSources() {
    const results = await Promise.allSettled(
      this.sources.map(source => {
        console.log(`📡 Fetching from ${source.name}...`);
        return source.fetch();
      })
    );

    const articles = results
      .filter((result): result is PromiseFulfilledResult<any[]> =>
        result.status === 'fulfilled'
      )
      .flatMap((result, index) => {
        const sourceName = this.sources[index].name;
        console.log(`✅ ${sourceName}: ${result.value.length} articles`);
        return result.value;
      });

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const sourceName = this.sources[index].name;
        console.error(`❌ ${sourceName} failed:`, result.reason);
      }
    });

    return articles;
  }
}
