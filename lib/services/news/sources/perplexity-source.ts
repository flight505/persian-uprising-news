import { INewsSource, Article } from './i-news-source';
import { fetchPerplexityNews, PerplexityArticle } from '@/lib/perplexity';

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
      console.error(`[${this.name}] Fetch failed:`, error);
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
