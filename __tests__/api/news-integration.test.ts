/**
 * Integration test for /api/news endpoint
 * Verifies URL mapping from sourceUrl to url for client compatibility
 *
 * Run with: npm run test:integration
 * Or manually: npm test -- __tests__/api/news-integration.test.ts
 */

describe('/api/news - URL Mapping Integration Test', () => {
  const API_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002';

  it('should return articles with valid url fields', async () => {
    const response = await fetch(`${API_URL}/api/news`);
    expect(response.ok).toBe(true);

    const data = await response.json();

    expect(data.articles).toBeDefined();
    expect(Array.isArray(data.articles)).toBe(true);

    if (data.articles.length > 0) {
      // Every article must have a url field
      data.articles.forEach((article: any) => {
        expect(article).toHaveProperty('url');
        expect(article.url).not.toBeNull();
        expect(typeof article.url).toBe('string');

        // URL should be a valid link
        if (article.url) {
          expect(article.url.length).toBeGreaterThan(0);
          expect(article.url).toMatch(/^https?:\/\//);
        }
      });
    }
  });

  it('should map sourceUrl to url correctly', async () => {
    const response = await fetch(`${API_URL}/api/news`);
    const data = await response.json();

    if (data.articles.length > 0) {
      data.articles.forEach((article: any) => {
        // If sourceUrl exists, url should match it
        if (article.sourceUrl) {
          expect(article.url).toBe(article.sourceUrl);
        }
      });
    }
  });

  it('should handle Telegram URLs correctly', async () => {
    const response = await fetch(`${API_URL}/api/news`);
    const data = await response.json();

    const telegramArticles = data.articles.filter((a: any) => a.source === 'telegram');

    if (telegramArticles.length > 0) {
      telegramArticles.forEach((article: any) => {
        expect(article.url).toBeDefined();
        expect(article.url).toMatch(/^https:\/\/t\.me\//);
      });
    }
  });

  it('should handle Twitter/X URLs correctly', async () => {
    const response = await fetch(`${API_URL}/api/news`);
    const data = await response.json();

    const twitterArticles = data.articles.filter((a: any) => a.source === 'twitter');

    if (twitterArticles.length > 0) {
      twitterArticles.forEach((article: any) => {
        expect(article.url).toBeDefined();
        expect(article.url).toMatch(/^https:\/\/(x|twitter)\.com\//);
      });
    }
  });

  it('should preserve both url and sourceUrl fields', async () => {
    const response = await fetch(`${API_URL}/api/news`);
    const data = await response.json();

    if (data.articles.length > 0) {
      data.articles.forEach((article: any) => {
        // Both fields should exist (even if sourceUrl might be same as url)
        expect(article).toHaveProperty('url');
        expect(article).toHaveProperty('sourceUrl');
      });
    }
  });

  it('should return proper response structure', async () => {
    const response = await fetch(`${API_URL}/api/news`);
    const data = await response.json();

    // Check response structure
    expect(data).toHaveProperty('articles');
    expect(data).toHaveProperty('pagination');
    expect(data).toHaveProperty('lastUpdated');

    // Check pagination structure
    expect(data.pagination).toHaveProperty('page');
    expect(data.pagination).toHaveProperty('limit');
    expect(data.pagination).toHaveProperty('total');
    expect(data.pagination).toHaveProperty('hasMore');

    // Verify types
    expect(typeof data.pagination.page).toBe('number');
    expect(typeof data.pagination.limit).toBe('number');
    expect(typeof data.pagination.total).toBe('number');
    expect(typeof data.pagination.hasMore).toBe('boolean');
  });

  it('should handle pagination correctly', async () => {
    const response = await fetch(`${API_URL}/api/news?page=0&limit=5`);
    const data = await response.json();

    expect(data.articles.length).toBeLessThanOrEqual(5);
    expect(data.pagination.page).toBe(0);
    expect(data.pagination.limit).toBe(5);

    // All paginated articles should have url
    data.articles.forEach((article: any) => {
      expect(article.url).toBeDefined();
      expect(article.url).not.toBeNull();
    });
  });

  it('should handle topic filtering', async () => {
    const response = await fetch(`${API_URL}/api/news?topic=iran.now`);
    const data = await response.json();

    // All articles should have url field even with topic filter
    data.articles.forEach((article: any) => {
      expect(article.url).toBeDefined();
      expect(article.url).not.toBeNull();
    });
  });
});
