import { Article } from '../sources/i-news-source';

export interface ArticleWithHash extends Article {
  contentHash: string;
  minHash: number[];
  createdAt: number;
}

export interface IDeduplicator {
  process(articles: Article[], recentArticles: ArticleWithHash[]): Promise<ArticleWithHash[]>;
  computeHash(content: string): Promise<string>;
}
