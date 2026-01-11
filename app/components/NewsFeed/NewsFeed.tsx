'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import NewsCard from './NewsCard';
import NotificationButton from '../Shared/NotificationButton';
import { offlineDB, isOnline } from '@/lib/offline-db';

interface Article {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  topics: string[];
  source?: 'perplexity' | 'twitter' | 'telegram';
  author?: string;
  channelName?: string;
}

interface NewsResponse {
  articles: Article[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  lastUpdated: number;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function NewsFeed() {
  const [page, setPage] = useState(0);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isLoadingOffline, setIsLoadingOffline] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<NewsResponse>(
    `/api/news?page=${page}&limit=20`,
    fetcher,
    {
      refreshInterval: 600000, // Refresh every 10 minutes (matches server cache)
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Dedupe requests within 1 minute
      keepPreviousData: true, // Keep showing old data while fetching new
    }
  );

  // Initialize IndexedDB and monitor online status
  useEffect(() => {
    offlineDB.init().catch(err => console.error('Failed to init IndexedDB:', err));

    const handleOnlineStatus = () => {
      setIsOffline(!navigator.onLine);

      // If coming back online, refresh data
      if (navigator.onLine && isOffline) {
        console.log('📡 Back online, refreshing data...');
        mutate();
      }
    };

    handleOnlineStatus();
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [isOffline, mutate]);

  // Update articles when data changes and cache them
  useEffect(() => {
    if (data?.articles) {
      if (page === 0) {
        setAllArticles(data.articles);
      } else {
        setAllArticles(prev => [...prev, ...data.articles]);
      }

      // Cache articles for offline access
      if (isOnline()) {
        offlineDB.cacheArticles(data.articles).catch(err =>
          console.error('Failed to cache articles:', err)
        );
      }
    }
  }, [data, page]);

  // Load from cache if offline and no data
  useEffect(() => {
    if (isOffline && allArticles.length === 0 && !isLoadingOffline) {
      setIsLoadingOffline(true);
      offlineDB.getAllArticles()
        .then(cachedArticles => {
          console.log(`📦 Loaded ${cachedArticles.length} articles from offline cache`);
          setAllArticles(cachedArticles);
        })
        .catch(err => console.error('Failed to load offline articles:', err))
        .finally(() => setIsLoadingOffline(false));
    }
  }, [isOffline, allArticles.length, isLoadingOffline]);

  const handleLoadMore = () => {
    if (data?.pagination.hasMore) {
      setPage(p => p + 1);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/news/refresh', { method: 'POST' });
      if (response.ok) {
        setPage(0);
        mutate();
      }
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
          <h3 className="text-red-800 dark:text-red-200 font-bold mb-2">Error Loading News</h3>
          <p className="text-red-600 dark:text-red-300">
            {error.message || 'Failed to load news. Please try again later.'}
          </p>
          <button
            onClick={() => mutate()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Offline Banner */}
      {isOffline && (
        <div className="mb-4 bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex items-center">
            <span className="text-2xl mr-3">📡</span>
            <div>
              <p className="font-bold text-yellow-800 dark:text-yellow-200">You're Offline</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Showing cached articles. New content will load when you're back online.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Persian Uprising News
          </h1>
          <div className="flex gap-2">
            <NotificationButton />
            <Link
              href="/map"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              🗺️ Map
            </Link>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isOffline}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              title={isOffline ? 'Cannot refresh while offline' : 'Refresh news'}
            >
              {isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        </div>

        {data?.lastUpdated && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Loading State */}
      {(isLoading || isLoadingOffline) && allArticles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {isLoadingOffline ? 'Loading offline articles...' : 'Loading news...'}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && allArticles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
            No news articles available yet.
          </p>
          <button
            onClick={handleRefresh}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Fetch News
          </button>
        </div>
      )}

      {/* Articles Grid */}
      <div className="space-y-6">
        {allArticles.map((article) => (
          <NewsCard
            key={article.id}
            title={article.title}
            summary={article.summary}
            url={article.url}
            publishedAt={article.publishedAt}
            topics={article.topics}
            source={article.source}
            author={article.author}
            channelName={article.channelName}
          />
        ))}
      </div>

      {/* Load More Button */}
      {data?.pagination.hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* Stats */}
      {allArticles.length > 0 && (
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Showing {allArticles.length} of {data?.pagination.total || allArticles.length} articles
        </div>
      )}
    </div>
  );
}
