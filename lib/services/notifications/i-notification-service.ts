import { ArticleWithHash } from '../news/deduplication/i-deduplicator';

export interface INotificationService {
  notifyNewArticles(articles: ArticleWithHash[]): Promise<NotificationResult>;
}

export interface NotificationResult {
  success: boolean;
  sent: number;
  error?: any;
}
