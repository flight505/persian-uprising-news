import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { SWRConfig } from 'swr';

// Mock SWR provider with no cache
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
};

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

// Mock data factories
export function createMockArticle(overrides = {}) {
  return {
    id: 'test-article-1',
    title: 'Test Article Title',
    summary: 'Test summary content for the article',
    content: 'Full test content for the article with more details',
    url: 'https://example.com/article-1',
    publishedAt: Date.now(),
    topics: ['protest'],
    source: 'perplexity' as const,
    contentHash: 'mock-hash-123',
    minHash: Array(128).fill(1),
    ...overrides,
  };
}

export function createMockIncident(overrides = {}) {
  return {
    id: 'test-incident-1',
    type: 'protest' as const,
    title: 'Test Incident Title',
    description: 'Test description for incident with sufficient detail',
    location: {
      lat: 35.6892,
      lon: 51.3890,
      address: 'Tehran, Iran',
    },
    timestamp: Date.now(),
    verified: false,
    reportedBy: 'official' as const,
    upvotes: 0,
    createdAt: Date.now(),
    ...overrides,
  };
}

export function createMockTranslation(overrides = {}) {
  return {
    originalText: 'Test text',
    translatedText: 'متن تست',
    sourceLang: 'en',
    targetLang: 'fa',
    timestamp: Date.now(),
    ...overrides,
  };
}

// Mock fetch helper
export function mockFetchSuccess(data: any) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => data,
  });
}

export function mockFetchError(status = 500, message = 'Server error') {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ error: message }),
  });
}

// Wait for async updates
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Prevent Jest from treating this as a test file
export {};
describe('test-utils', () => {
  it('exports helper functions', () => {
    expect(createMockArticle).toBeDefined();
    expect(createMockIncident).toBeDefined();
    expect(renderWithProviders).toBeDefined();
  });
});
