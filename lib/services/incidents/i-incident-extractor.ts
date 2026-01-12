import { ArticleWithHash } from '../news/deduplication/i-deduplicator';

export interface IIncidentExtractor {
  extractFromArticles(articles: ArticleWithHash[]): Promise<ExtractedIncident[]>;
}

export interface ExtractedIncident {
  type: 'protest' | 'arrest' | 'injury' | 'death' | 'other';
  title: string;
  description: string;
  location: string;
  confidence: number;
  extractedFrom: {
    articleId: string;
    articleTitle: string;
    articleUrl: string;
    source: string;
  };
  timestamp: number;
  keywords: string[];
}
