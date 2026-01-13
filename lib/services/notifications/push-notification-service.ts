import { INotificationService, NotificationResult } from './i-notification-service';
import { ArticleWithHash } from '../news/deduplication/i-deduplicator';
import { sendPushNotification } from '@/lib/push-notifications';
import { logger } from '@/lib/logger';

export class PushNotificationService implements INotificationService {
  async notifyNewArticles(articles: ArticleWithHash[]): Promise<NotificationResult> {
    if (articles.length === 0) {
      return { success: true, sent: 0 };
    }

    try {
      const title = articles.length === 1
        ? '📰 New Article'
        : `📰 ${articles.length} New Articles`;

      const message = articles.length === 1
        ? articles[0].title
        : `${articles[0].title} and ${articles.length - 1} more`;

      const result = await sendPushNotification(title, message, '/');

      if (result.sent > 0) {
        logger.info('push_notification_sent', {
          subscribers: result.sent,
          articles_count: articles.length,
        });
      }

      return {
        success: result.success,
        sent: result.sent,
        error: result.error,
      };
    } catch (error) {
      logger.error('push_notification_failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        articles_count: articles.length,
      });
      return {
        success: false,
        sent: 0,
        error,
      };
    }
  }
}
