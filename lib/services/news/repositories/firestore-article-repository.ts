import { IArticleRepository } from './i-article-repository';
import { ArticleWithHash } from '../deduplication/i-deduplicator';
import {
  saveArticles,
  getRecentArticles,
  getArticleById,
  getArticleByContentHash,
  isFirestoreAvailable,
  Article as FirestoreArticle,
} from '@/lib/firestore';
import { logger } from '@/lib/logger';

export class FirestoreArticleRepository implements IArticleRepository {
  async getRecent(hoursBack: number = 24): Promise<ArticleWithHash[]> {
    if (!isFirestoreAvailable()) {
      logger.warn('firestore_unavailable_get_recent', { hours_back: hoursBack });
      return [];
    }

    try {
      const articles = await getRecentArticles(hoursBack);
      return articles as ArticleWithHash[];
    } catch (error) {
      logger.error('fetch_recent_articles_failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        hours_back: hoursBack,
      });
      return [];
    }
  }

  async saveMany(articles: ArticleWithHash[]): Promise<ArticleWithHash[]> {
    if (!isFirestoreAvailable()) {
      throw new Error('Firestore not available');
    }

    if (articles.length === 0) {
      return [];
    }

    const firestoreArticles = articles.map(article => ({
      ...article,
      publishedAt: typeof article.publishedAt === 'string'
        ? new Date(article.publishedAt).getTime()
        : article.publishedAt,
    })) as FirestoreArticle[];

    await saveArticles(firestoreArticles);
    logger.info('articles_saved_to_firestore', {
      articles_count: firestoreArticles.length,
    });

    return articles;
  }

  async getById(id: string): Promise<ArticleWithHash | null> {
    if (!isFirestoreAvailable()) {
      return null;
    }

    const article = await getArticleById(id);
    return article as ArticleWithHash | null;
  }

  async getByContentHash(hash: string): Promise<ArticleWithHash | null> {
    if (!isFirestoreAvailable()) {
      return null;
    }

    const article = await getArticleByContentHash(hash);
    return article as ArticleWithHash | null;
  }
}
