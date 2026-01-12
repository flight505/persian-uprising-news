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

export class FirestoreArticleRepository implements IArticleRepository {
  async getRecent(hoursBack: number = 24): Promise<ArticleWithHash[]> {
    if (!isFirestoreAvailable()) {
      console.warn('⚠️ Firestore not available, returning empty array');
      return [];
    }

    try {
      const articles = await getRecentArticles(hoursBack);
      return articles as ArticleWithHash[];
    } catch (error) {
      console.error('Error fetching recent articles:', error);
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
    console.log(`💾 Saved ${firestoreArticles.length} articles to Firestore`);

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
