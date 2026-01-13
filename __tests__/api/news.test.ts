/**
 * Test suite for /api/news endpoint
 * Verifies URL mapping from sourceUrl to url for client compatibility
 */

import { GET } from '@/app/api/news/route';
import { NextRequest } from 'next/server';

// Mock Firestore
jest.mock('@/lib/firestore', () => ({
  isFirestoreAvailable: jest.fn(() => true),
  getArticles: jest.fn(async () => [
    {
      id: 'telegram-1',
      title: 'Test Telegram Article',
      summary: 'Test summary',
      content: 'Test content',
      source: 'telegram',
      sourceUrl: 'https://t.me/test_channel/123',
      publishedAt: Date.now(),
      topics: ['iran.now'],
      contentHash: 'hash1',
      minHash: [],
      createdAt: Date.now(),
    },
    {
      id: 'twitter-1',
      title: 'Test Twitter Article',
      summary: 'Test summary',
      content: 'Test content',
      source: 'twitter',
      sourceUrl: 'https://x.com/test/status/123',
      publishedAt: Date.now(),
      topics: ['iran.now'],
      contentHash: 'hash2',
      minHash: [],
      createdAt: Date.now(),
    },
    {
      id: 'perplexity-1',
      title: 'Test Perplexity Article',
      summary: 'Test summary',
      content: 'Test content',
      source: 'perplexity',
      sourceUrl: 'https://example.com/article',
      publishedAt: Date.now(),
      topics: ['iran.now'],
      contentHash: 'hash3',
      minHash: [],
      createdAt: Date.now(),
    },
  ]),
}));

// Mock ServiceContainer
jest.mock('@/lib/services/container', () => ({
  ServiceContainer: {
    getNewsService: jest.fn(() => ({
      refresh: jest.fn(async () => ({
        articlesAdded: 0,
        articlesTotal: 3,
        incidentsExtracted: 0,
        timestamp: Date.now(),
      })),
    })),
  },
}));

describe('/api/news - URL Mapping', () => {
  it('should map sourceUrl to url for all articles', async () => {
    const request = new NextRequest('http://localhost:3000/api/news');
    const response = await GET(request);
    const data = await response.json();

    expect(data.articles).toBeDefined();
    expect(data.articles.length).toBeGreaterThan(0);

    // Every article should have a url field
    data.articles.forEach((article: any) => {
      expect(article.url).toBeDefined();
      expect(article.url).not.toBeNull();
      expect(typeof article.url).toBe('string');
      expect(article.url.length).toBeGreaterThan(0);
    });
  });

  it('should preserve sourceUrl field', async () => {
    const request = new NextRequest('http://localhost:3000/api/news');
    const response = await GET(request);
    const data = await response.json();

    // sourceUrl should still exist
    data.articles.forEach((article: any) => {
      expect(article.sourceUrl).toBeDefined();
    });
  });

  it('should map Telegram sourceUrl correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/news');
    const response = await GET(request);
    const data = await response.json();

    const telegramArticle = data.articles.find((a: any) => a.source === 'telegram');
    expect(telegramArticle).toBeDefined();
    expect(telegramArticle.url).toBe('https://t.me/test_channel/123');
    expect(telegramArticle.url).toBe(telegramArticle.sourceUrl);
  });

  it('should map Twitter sourceUrl correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/news');
    const response = await GET(request);
    const data = await response.json();

    const twitterArticle = data.articles.find((a: any) => a.source === 'twitter');
    expect(twitterArticle).toBeDefined();
    expect(twitterArticle.url).toBe('https://x.com/test/status/123');
    expect(twitterArticle.url).toBe(twitterArticle.sourceUrl);
  });

  it('should handle pagination with URL mapping', async () => {
    const request = new NextRequest('http://localhost:3000/api/news?page=0&limit=2');
    const response = await GET(request);
    const data = await response.json();

    expect(data.articles.length).toBeLessThanOrEqual(2);
    data.articles.forEach((article: any) => {
      expect(article.url).toBeDefined();
      expect(article.url).not.toBeNull();
    });
  });

  it('should return empty string if both sourceUrl and url are missing', async () => {
    // Mock article without sourceUrl or url
    const { getArticles } = require('@/lib/firestore');
    getArticles.mockResolvedValueOnce([
      {
        id: 'test-1',
        title: 'Article without URL',
        summary: 'Test',
        content: 'Test',
        source: 'test',
        publishedAt: Date.now(),
        topics: [],
        contentHash: 'hash',
        minHash: [],
        createdAt: Date.now(),
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/news');
    const response = await GET(request);
    const data = await response.json();

    expect(data.articles[0].url).toBe('');
  });

  it('should include all required fields in response', async () => {
    const request = new NextRequest('http://localhost:3000/api/news');
    const response = await GET(request);
    const data = await response.json();

    expect(data).toHaveProperty('articles');
    expect(data).toHaveProperty('pagination');
    expect(data).toHaveProperty('lastUpdated');

    expect(data.pagination).toHaveProperty('page');
    expect(data.pagination).toHaveProperty('limit');
    expect(data.pagination).toHaveProperty('total');
    expect(data.pagination).toHaveProperty('hasMore');
  });
});
