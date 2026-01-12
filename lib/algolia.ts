/**
 * Algolia Search Integration
 * Provides full-text search with Persian language support
 * Falls back to Fuse.js if Algolia credentials are missing
 */

import algoliasearch, { SearchClient, SearchIndex } from 'algoliasearch';
import Fuse from 'fuse.js';
import { Article } from './firestore';

// Algolia client (initialized lazily)
let algoliaClient: SearchClient | null = null;
let algoliaIndex: SearchIndex | null = null;

// Fuse.js instance for fallback
let fuseInstance: Fuse<Article> | null = null;
let fuseArticles: Article[] = [];

// Search mode
type SearchMode = 'algolia' | 'fuse' | 'disabled';
let currentMode: SearchMode = 'disabled';

/**
 * Initialize Algolia client
 */
export function initAlgolia(): boolean {
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;

  if (!appId || !searchKey) {
    console.warn('⚠️ Algolia credentials missing, falling back to Fuse.js');
    currentMode = 'fuse';
    return false;
  }

  try {
    algoliaClient = algoliasearch(appId, searchKey);
    algoliaIndex = algoliaClient.initIndex('articles');
    currentMode = 'algolia';
    console.log('✅ Algolia initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Algolia:', error);
    currentMode = 'fuse';
    return false;
  }
}

/**
 * Initialize Fuse.js with articles data
 */
export function initFuse(articles: Article[]): void {
  fuseArticles = articles;
  fuseInstance = new Fuse(articles, {
    keys: [
      { name: 'title', weight: 0.4 },
      { name: 'summary', weight: 0.3 },
      { name: 'content', weight: 0.2 },
      { name: 'topics', weight: 0.1 },
    ],
    threshold: 0.3, // 70% similarity required
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2,
    ignoreLocation: true, // Search entire document
  });

  if (currentMode === 'disabled') {
    currentMode = 'fuse';
  }
  console.log(`✅ Fuse.js initialized with ${articles.length} articles`);
}

/**
 * Get current search mode
 */
export function getSearchMode(): SearchMode {
  return currentMode;
}

/**
 * Index articles to Algolia (admin only)
 */
export async function indexArticles(articles: Article[]): Promise<void> {
  const adminKey = process.env.ALGOLIA_ADMIN_KEY;
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;

  if (!adminKey || !appId) {
    throw new Error('Algolia admin credentials missing');
  }

  const adminClient = algoliasearch(appId, adminKey);
  const adminIndex = adminClient.initIndex('articles');

  // Transform articles for Algolia
  const algoliaObjects = articles.map((article) => ({
    objectID: article.id,
    title: article.title,
    summary: article.summary,
    content: article.content,
    source: article.source,
    publishedAt: article.publishedAt,
    topics: article.topics || [],
    channelName: article.channelName,
    author: article.author,
    imageUrl: article.imageUrl,
    sourceUrl: article.sourceUrl,
    createdAt: article.createdAt,
  }));

  await adminIndex.saveObjects(algoliaObjects);
  console.log(`✅ Indexed ${articles.length} articles to Algolia`);
}

/**
 * Configure Algolia index settings (admin only)
 */
export async function configureAlgoliaIndex(): Promise<void> {
  const adminKey = process.env.ALGOLIA_ADMIN_KEY;
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;

  if (!adminKey || !appId) {
    throw new Error('Algolia admin credentials missing');
  }

  const adminClient = algoliasearch(appId, adminKey);
  const adminIndex = adminClient.initIndex('articles');

  await adminIndex.setSettings({
    searchableAttributes: [
      'title',
      'summary',
      'content',
      'topics',
      'channelName',
      'author.name',
      'author.username',
    ],
    attributesForFaceting: [
      'source',
      'topics',
      'channelName',
    ],
    customRanking: ['desc(publishedAt)', 'desc(createdAt)'],
    highlightPreTag: '<mark>',
    highlightPostTag: '</mark>',
    attributesToHighlight: ['title', 'summary'],
    attributesToRetrieve: [
      'objectID',
      'title',
      'summary',
      'source',
      'publishedAt',
      'topics',
      'channelName',
      'author',
      'imageUrl',
      'sourceUrl',
    ],
    hitsPerPage: 20,
    maxValuesPerFacet: 100,
  });

  console.log('✅ Algolia index configured');
}

/**
 * Search articles using Algolia or Fuse.js
 */
export interface SearchOptions {
  query: string;
  filters?: {
    source?: string;
    topics?: string[];
    dateRange?: {
      from?: number;
      to?: number;
    };
    channelName?: string;
  };
  page?: number;
  hitsPerPage?: number;
}

export interface SearchResult {
  hits: Article[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  query: string;
  mode: SearchMode;
}

export async function searchArticles(options: SearchOptions): Promise<SearchResult> {
  const startTime = Date.now();

  // Determine which search engine to use
  if (currentMode === 'disabled') {
    // Try to initialize Algolia first
    if (!initAlgolia()) {
      currentMode = 'fuse';
    }
  }

  if (currentMode === 'algolia' && algoliaIndex) {
    return await searchWithAlgolia(options, startTime);
  } else if (currentMode === 'fuse' && fuseInstance) {
    return searchWithFuse(options, startTime);
  } else {
    throw new Error('Search not initialized. Call initAlgolia() or initFuse() first.');
  }
}

/**
 * Search using Algolia
 */
async function searchWithAlgolia(
  options: SearchOptions,
  startTime: number
): Promise<SearchResult> {
  if (!algoliaIndex) {
    throw new Error('Algolia not initialized');
  }

  const { query, filters, page = 0, hitsPerPage = 20 } = options;

  // Build filter string
  const filterParts: string[] = [];

  if (filters?.source) {
    filterParts.push(`source:"${filters.source}"`);
  }

  if (filters?.topics && filters.topics.length > 0) {
    const topicsFilter = filters.topics.map(t => `topics:"${t}"`).join(' OR ');
    filterParts.push(`(${topicsFilter})`);
  }

  if (filters?.channelName) {
    filterParts.push(`channelName:"${filters.channelName}"`);
  }

  if (filters?.dateRange) {
    if (filters.dateRange.from) {
      filterParts.push(`publishedAt >= ${filters.dateRange.from}`);
    }
    if (filters.dateRange.to) {
      filterParts.push(`publishedAt <= ${filters.dateRange.to}`);
    }
  }

  const filterString = filterParts.join(' AND ');

  // Execute search
  const response = await algoliaIndex.search(query, {
    filters: filterString || undefined,
    page,
    hitsPerPage,
    getRankingInfo: true,
  });

  const processingTimeMS = Date.now() - startTime;

  return {
    hits: response.hits.map(hit => ({
      id: hit.objectID as string,
      title: (hit as any).title,
      summary: (hit as any).summary,
      content: (hit as any).content || '',
      source: (hit as any).source,
      publishedAt: (hit as any).publishedAt,
      topics: (hit as any).topics || [],
      channelName: (hit as any).channelName,
      author: (hit as any).author,
      imageUrl: (hit as any).imageUrl,
      sourceUrl: (hit as any).sourceUrl,
      contentHash: '',
      minHash: [],
      createdAt: (hit as any).createdAt,
    })),
    nbHits: response.nbHits,
    page: response.page,
    nbPages: response.nbPages,
    hitsPerPage: response.hitsPerPage,
    processingTimeMS,
    query,
    mode: 'algolia',
  };
}

/**
 * Search using Fuse.js (fallback)
 */
function searchWithFuse(options: SearchOptions, startTime: number): SearchResult {
  if (!fuseInstance) {
    throw new Error('Fuse.js not initialized');
  }

  const { query, filters, page = 0, hitsPerPage = 20 } = options;

  // Execute Fuse.js search
  let results = fuseInstance.search(query);

  // Apply filters
  if (filters) {
    results = results.filter((result) => {
      const article = result.item;

      // Source filter
      if (filters.source && article.source !== filters.source) {
        return false;
      }

      // Topics filter
      if (filters.topics && filters.topics.length > 0) {
        const hasMatchingTopic = filters.topics.some(
          topic => article.topics?.includes(topic)
        );
        if (!hasMatchingTopic) {
          return false;
        }
      }

      // Channel name filter
      if (filters.channelName && article.channelName !== filters.channelName) {
        return false;
      }

      // Date range filter
      if (filters.dateRange) {
        const publishedAt = typeof article.publishedAt === 'string'
          ? new Date(article.publishedAt).getTime()
          : article.publishedAt;

        if (filters.dateRange.from && publishedAt < filters.dateRange.from) {
          return false;
        }
        if (filters.dateRange.to && publishedAt > filters.dateRange.to) {
          return false;
        }
      }

      return true;
    });
  }

  // Pagination
  const start = page * hitsPerPage;
  const end = start + hitsPerPage;
  const paginatedResults = results.slice(start, end);

  const processingTimeMS = Date.now() - startTime;

  return {
    hits: paginatedResults.map(r => r.item),
    nbHits: results.length,
    page,
    nbPages: Math.ceil(results.length / hitsPerPage),
    hitsPerPage,
    processingTimeMS,
    query,
    mode: 'fuse',
  };
}

/**
 * Get search suggestions (for autocomplete)
 */
export async function getSearchSuggestions(query: string): Promise<string[]> {
  if (currentMode === 'algolia' && algoliaIndex) {
    const response = await algoliaIndex.search(query, {
      hitsPerPage: 5,
      attributesToRetrieve: ['title'],
    });
    return response.hits.map(hit => (hit as any).title);
  } else if (currentMode === 'fuse' && fuseInstance) {
    const results = fuseInstance.search(query, { limit: 5 });
    return results.map(r => r.item.title);
  }
  return [];
}

/**
 * Get facets for filters (Algolia only)
 */
export async function getFacets(): Promise<{
  sources: string[];
  topics: string[];
  channels: string[];
}> {
  if (currentMode === 'algolia' && algoliaIndex) {
    const response = await algoliaIndex.search('', {
      hitsPerPage: 0,
      facets: ['source', 'topics', 'channelName'],
    });

    return {
      sources: Object.keys(response.facets?.source || {}),
      topics: Object.keys(response.facets?.topics || {}),
      channels: Object.keys(response.facets?.channelName || {}),
    };
  } else if (currentMode === 'fuse') {
    // Extract unique values from Fuse articles
    const sources = new Set<string>();
    const topics = new Set<string>();
    const channels = new Set<string>();

    fuseArticles.forEach(article => {
      sources.add(article.source);
      article.topics?.forEach(topic => topics.add(topic));
      if (article.channelName) {
        channels.add(article.channelName);
      }
    });

    return {
      sources: Array.from(sources),
      topics: Array.from(topics),
      channels: Array.from(channels),
    };
  }

  return { sources: [], topics: [], channels: [] };
}
