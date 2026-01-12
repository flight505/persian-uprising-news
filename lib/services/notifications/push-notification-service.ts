import { INotificationService, NotificationResult } from './i-notification-service';
import { ArticleWithHash } from '../news/deduplication/i-deduplicator';
import { sendPushNotification } from '@/lib/push-notifications';

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
        console.log(`📬 Sent push notification to ${result.sent} subscriber(s)`);
      }

      return {
        success: result.success,
        sent: result.sent,
        error: result.error,
      };
    } catch (error) {
      console.error('Error sending new article notification:', error);
      return {
        success: false,
        sent: 0,
        error,
      };
    }
  }
}
