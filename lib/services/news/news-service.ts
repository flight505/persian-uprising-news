import { INewsSource } from './sources/i-news-source';
import { IDeduplicator } from './deduplication/i-deduplicator';
import { IArticleRepository } from './repositories/i-article-repository';
import { INotificationService } from '../notifications/i-notification-service';
import { IIncidentExtractor } from '../incidents/i-incident-extractor';
import { logger } from '@/lib/logger';

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
    const endTimer = logger.time('news_refresh');

    logger.info('news_refresh_started', {
      sources_count: this.sources.length,
    });

    const articles = await this.fetchFromAllSources();
    logger.info('articles_fetched', {
      count: articles.length,
      sources: this.sources.length,
    });

    if (articles.length === 0) {
      logger.warn('no_articles_fetched', {
        sources: this.sources.map(s => s.name),
      });
      endTimer();
      return {
        articlesAdded: 0,
        articlesTotal: 0,
        incidentsExtracted: 0,
        timestamp: Date.now(),
      };
    }

    const recentArticles = await this.repository.getRecent(24);
    logger.debug('recent_articles_loaded', {
      count: recentArticles.length,
      hours: 24,
    });

    const deduplicated = await this.deduplicator.process(articles, recentArticles);

    const saved = await this.repository.saveMany(deduplicated);
    logger.info('articles_saved', {
      count: saved.length,
      duplicates_removed: articles.length - saved.length,
    });

    if (saved.length > 0) {
      this.notificationService.notifyNewArticles(saved).catch(err =>
        logger.error('push_notification_failed', {
          error: err.message,
          articles_count: saved.length,
        })
      );
    }

    const incidents = await this.incidentExtractor.extractFromArticles(saved);
    logger.info('incidents_extracted', {
      count: incidents.length,
      from_articles: saved.length,
    });

    endTimer();

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
        logger.debug('source_fetch_started', { source: source.name });
        return source.fetch();
      })
    );

    const articles = results
      .filter((result): result is PromiseFulfilledResult<any[]> =>
        result.status === 'fulfilled'
      )
      .flatMap((result, index) => {
        const sourceName = this.sources[index].name;
        logger.info('source_fetch_completed', {
          source: sourceName,
          articles_count: result.value.length,
        });
        return result.value;
      });

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const sourceName = this.sources[index].name;
        logger.error('source_fetch_failed', {
          source: sourceName,
          error: result.reason?.message || String(result.reason),
        });
      }
    });

    return articles;
  }
}
