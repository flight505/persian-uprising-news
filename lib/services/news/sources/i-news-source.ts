/**
 * Interface for news sources
 * All news providers (Perplexity, Telegram, Twitter) must implement this interface
 */

export interface INewsSource {
  readonly name: string;
  fetch(query?: string): Promise<Article[]>;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl?: string;
  source: string;
  sourceUrl?: string;
  publishedAt: number | string;
  topics?: string[];
  tags?: string[];
  author?: {
    username?: string;
    name?: string;
    verified?: boolean;
    followers?: number;
  };
  engagement?: {
    retweets?: number;
    replies?: number;
    likes?: number;
    quotes?: number;
  };
  channelName?: string;
  channelUsername?: string;
}
