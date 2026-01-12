import { ArticleWithHash } from '../deduplication/i-deduplicator';

export interface IArticleRepository {
  getRecent(hoursBack: number): Promise<ArticleWithHash[]>;
  saveMany(articles: ArticleWithHash[]): Promise<ArticleWithHash[]>;
  getById(id: string): Promise<ArticleWithHash | null>;
  getByContentHash(hash: string): Promise<ArticleWithHash | null>;
}
