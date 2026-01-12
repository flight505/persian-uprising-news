/**
 * Redis Caching Layer with Upstash
 * Provides fast caching for articles, search results, and geocoding
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client (lazy)
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('⚠️ Upstash Redis credentials missing, caching disabled');
    return null;
  }

  try {
    redis = new Redis({
      url,
      token,
    });
    console.log('✅ Redis client initialized');
    return redis;
  } catch (error) {
    console.error('❌ Failed to initialize Redis:', error);
    return null;
  }
}

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  ARTICLES: 10 * 60, // 10 minutes
  SEARCH_RESULTS: 5 * 60, // 5 minutes
  FACETS: 15 * 60, // 15 minutes
  GEOCODING: 30 * 24 * 60 * 60, // 30 days
  TRANSLATION: 30 * 24 * 60 * 60, // 30 days
} as const;

/**
 * Get cached value by key
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const value = await client.get<T>(key);
    if (value) {
      console.log(`✅ Cache hit: ${key}`);
    }
    return value;
  } catch (error) {
    console.error(`❌ Cache read error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set cached value with TTL
 */
export async function setCache<T>(key: string, value: T, ttl: number): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  try {
    await client.setex(key, ttl, JSON.stringify(value));
    console.log(`✅ Cache set: ${key} (TTL: ${ttl}s)`);
    return true;
  } catch (error) {
    console.error(`❌ Cache write error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete cached value
 */
export async function deleteCache(key: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  try {
    await client.del(key);
    console.log(`✅ Cache deleted: ${key}`);
    return true;
  } catch (error) {
    console.error(`❌ Cache delete error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete multiple keys matching a pattern
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  const client = getRedis();
  if (!client) return 0;

  try {
    // Upstash Redis doesn't support SCAN, so we need to maintain a set of keys
    // For now, we'll just delete individual keys as needed
    console.warn('⚠️ Pattern deletion not supported in Upstash Redis');
    return 0;
  } catch (error) {
    console.error(`❌ Cache pattern delete error for ${pattern}:`, error);
    return 0;
  }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return getRedis() !== null;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  available: boolean;
  size?: number;
  keys?: number;
}> {
  const client = getRedis();
  if (!client) {
    return { available: false };
  }

  try {
    // Upstash doesn't support DBSIZE directly
    // We'll just return that it's available
    return {
      available: true,
    };
  } catch (error) {
    console.error('❌ Error fetching cache stats:', error);
    return { available: false };
  }
}

//=============================================================================
// SPECIALIZED CACHE FUNCTIONS
//=============================================================================

/**
 * Cache articles list
 */
export async function cacheArticles(articles: any[], page: number = 0): Promise<boolean> {
  const key = `articles:page:${page}`;
  return setCache(key, articles, CacheTTL.ARTICLES);
}

/**
 * Get cached articles list
 */
export async function getCachedArticles(page: number = 0): Promise<any[] | null> {
  const key = `articles:page:${page}`;
  return getCache<any[]>(key);
}

/**
 * Cache search results
 */
export async function cacheSearchResults(
  query: string,
  filters: any,
  results: any
): Promise<boolean> {
  const filterHash = JSON.stringify(filters);
  const key = `search:${query}:${filterHash}`;
  return setCache(key, results, CacheTTL.SEARCH_RESULTS);
}

/**
 * Get cached search results
 */
export async function getCachedSearchResults(
  query: string,
  filters: any
): Promise<any | null> {
  const filterHash = JSON.stringify(filters);
  const key = `search:${query}:${filterHash}`;
  return getCache<any>(key);
}

/**
 * Cache facets (available filter values)
 */
export async function cacheFacets(facets: any): Promise<boolean> {
  const key = 'facets:all';
  return setCache(key, facets, CacheTTL.FACETS);
}

/**
 * Get cached facets
 */
export async function getCachedFacets(): Promise<any | null> {
  const key = 'facets:all';
  return getCache<any>(key);
}

/**
 * Cache geocoding result
 */
export async function cacheGeocoding(address: string, location: { lat: number; lon: number }): Promise<boolean> {
  const key = `geocode:${address.toLowerCase().trim()}`;
  return setCache(key, location, CacheTTL.GEOCODING);
}

/**
 * Get cached geocoding result
 */
export async function getCachedGeocoding(address: string): Promise<{ lat: number; lon: number } | null> {
  const key = `geocode:${address.toLowerCase().trim()}`;
  return getCache<{ lat: number; lon: number }>(key);
}

/**
 * Cache translation result
 */
export async function cacheTranslation(
  text: string,
  translatedText: string,
  sourceLang: string,
  targetLang: string
): Promise<boolean> {
  const key = `translate:${sourceLang}:${targetLang}:${text.substring(0, 100)}`;
  return setCache(key, { translatedText, sourceLang, targetLang }, CacheTTL.TRANSLATION);
}

/**
 * Get cached translation result
 */
export async function getCachedTranslation(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<{ translatedText: string; sourceLang: string; targetLang: string } | null> {
  const key = `translate:${sourceLang}:${targetLang}:${text.substring(0, 100)}`;
  return getCache<{ translatedText: string; sourceLang: string; targetLang: string }>(key);
}

/**
 * Invalidate all article caches (on new article publish)
 */
export async function invalidateArticleCache(): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    // Delete first few pages
    for (let i = 0; i < 10; i++) {
      await deleteCache(`articles:page:${i}`);
    }
    console.log('✅ Article cache invalidated');
  } catch (error) {
    console.error('❌ Error invalidating article cache:', error);
  }
}
