import { INewsSource, Article } from './i-news-source';
import { fetchPerplexityNews, PerplexityArticle } from '@/lib/perplexity';
import { logger } from '@/lib/logger';

export class PerplexityNewsSource implements INewsSource {
  readonly name = 'perplexity';

  constructor(private apiKey: string) {
    if (!apiKey) {
      throw new Error('Perplexity API key is required');
    }
  }

  async fetch(_query?: string): Promise<Article[]> {
    try {
      const result = await fetchPerplexityNews();
      return this.normalize(result);
    } catch (error) {
      logger.error('perplexity_fetch_failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return [];
    }
  }

  private normalize(data: PerplexityArticle[]): Article[] {
    return data.map(item => ({
      id: crypto.randomUUID(),
      title: item.title,
      summary: item.summary || item.content?.substring(0, 300) || '',
      content: item.content || item.summary,
      source: 'perplexity',
      sourceUrl: item.url,
      publishedAt: item.publishedAt || new Date().toISOString(),
      topics: item.topics || [],
    }));
  }
}
