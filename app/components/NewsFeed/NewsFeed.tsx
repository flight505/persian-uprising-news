'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';
import NewsCard from './NewsCard';
import NotificationButton from '../Shared/NotificationButton';
import SearchBar from '../Search/SearchBar';
import Filters, { FilterState } from '../Search/Filters';
import SuggestChannelModal from './SuggestChannelModal';
import { offlineDB, isOnline } from '@/lib/offline-db';
import { logger } from '@/lib/logger';

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

interface NewsFeedProps {
  externalTopicQuery?: string;
}

export default function NewsFeed({ externalTopicQuery }: NewsFeedProps) {
  const [page, setPage] = useState(0);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isLoadingOffline, setIsLoadingOffline] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    topics: [],
    dateRange: {},
  });
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);

  // Effect to update filters when externalTopicQuery changes
  useEffect(() => {
    if (externalTopicQuery !== undefined) {
      // If query is empty, clear topics. If not, split by space and set as topics.
      const newTopics = externalTopicQuery ? externalTopicQuery.split(" ") : [];
      setFilters(prev => ({ ...prev, topics: newTopics }));
      // Optional: Reset page to 0 when topic changes
      setPage(0);
      setAllArticles([]); // Clear articles to trigger fresh fetch
    }
  }, [externalTopicQuery]);

  // Construct query string with filters
  const buildQueryUrl = () => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', '20');
    params.set('v', '2');

    if (filters.topics && filters.topics.length > 0) {
      params.set('topics', filters.topics.join(','));
    }

    // Add other filters here if needed

    return `/api/news?${params.toString()}`;
  };

  const { data, error, isLoading, mutate } = useSWR<NewsResponse>(
    buildQueryUrl(),
    fetcher,
    {
      refreshInterval: 600000,
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      keepPreviousData: true,
    }
  );

  useEffect(() => {
    offlineDB.init().catch(err =>
      logger.error('indexeddb_init_failed', {
        component: 'NewsFeed',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );

    const handleOnlineStatus = () => {
      setIsOffline(!navigator.onLine);

      if (navigator.onLine && isOffline) {
        logger.debug('online_status_restored', { component: 'NewsFeed' });
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

  useEffect(() => {
    if (data?.articles) {
      // Check if articles have url field (migration check)
      const hasValidUrls = data.articles.every(a => a.url && a.url.length > 0);

      if (!hasValidUrls) {
        logger.warn('articles_missing_url_field', {
          component: 'NewsFeed',
          articlesCount: data.articles.length,
        });
        mutate();
        return;
      }

      if (page === 0) {
        setAllArticles(data.articles);
      } else {
        // Dedup logic could be added here
        setAllArticles(prev => {
          const newIds = new Set(data.articles.map(a => a.id));
          return [...prev.filter(a => !newIds.has(a.id)), ...data.articles];
        });
      }

      if (isOnline()) {
        offlineDB.cacheArticles(data.articles).catch(err =>
          logger.error('article_cache_failed', {
            component: 'NewsFeed',
            error: err instanceof Error ? err.message : 'Unknown error',
          })
        );
      }
    }
  }, [data, page, mutate]);

  useEffect(() => {
    if (isOffline && allArticles.length === 0 && !isLoadingOffline) {
      setIsLoadingOffline(true);
      offlineDB.getAllArticles()
        .then(cachedArticles => {
          logger.debug('offline_articles_loaded', {
            component: 'NewsFeed',
            articlesCount: cachedArticles.length,
          });
          setAllArticles(cachedArticles);
        })
        .catch(err =>
          logger.error('offline_articles_load_failed', {
            component: 'NewsFeed',
            error: err instanceof Error ? err.message : 'Unknown error',
          })
        )
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
      logger.error('news_refresh_failed', {
        component: 'NewsFeed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6">
          <h3 className="text-destructive font-bold mb-2">Error Loading News</h3>
          <p className="text-destructive/80 mb-4">
            {error.message || 'Failed to load news. Please try again later.'}
          </p>
          <Button onClick={() => mutate()} variant="destructive">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Offline Banner */}
      {isOffline && (
        <div className={cn(
          "mb-6 p-4 rounded-lg border-l-4",
          "bg-yellow-50 dark:bg-yellow-900/20",
          "border-yellow-400 dark:border-yellow-600"
        )}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📡</span>
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-headline text-foreground mb-2">
              Persian Uprising News
            </h1>
            <p className="text-sm text-muted-foreground">
              Real-time news aggregation and incident mapping
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SearchBar />
            <NotificationButton />
            <Button asChild variant="secondary">
              <Link href="/map">
                🗺️ Map
              </Link>
            </Button>
            <Button
              onClick={() => setIsSuggestModalOpen(true)}
              variant="outline"
              title="Suggest a news source to track"
            >
              📡 Suggest Source
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing || isOffline}
              variant="default"
              title={isOffline ? 'Cannot refresh while offline' : 'Refresh news'}
            >
              {isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
            </Button>
          </div>
        </div>

        {data?.lastUpdated && (
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6">
        <Filters
          filters={filters}
          onChange={setFilters}
          onReset={() => {
            setFilters({ topics: [], dateRange: {} });
            setIsSearchMode(false);
          }}
        />
      </div>

      {/* Loading State */}
      {(isLoading || isLoadingOffline) && allArticles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">
            {isLoadingOffline ? 'Loading offline articles...' : 'Loading news...'}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && allArticles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-xl text-muted-foreground mb-4">
            No news articles available yet.
          </p>
          <Button onClick={handleRefresh} size="lg">
            Fetch News
          </Button>
        </div>
      )}

      {/* Articles Grid */}
      <div className="space-y-6">
        {allArticles.map((article) => (
          <NewsCard
            key={article.id}
            id={article.id}
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
          <Button
            onClick={handleLoadMore}
            disabled={isLoading}
            variant="outline"
            size="lg"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}

      {/* Stats */}
      {allArticles.length > 0 && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Showing {allArticles.length} of {data?.pagination.total || allArticles.length} articles
        </div>
      )}

      {/* Suggest Channel Modal */}
      <SuggestChannelModal
        isOpen={isSuggestModalOpen}
        onClose={() => setIsSuggestModalOpen(false)}
      />
    </div>
  );
}
