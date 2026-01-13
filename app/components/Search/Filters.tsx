'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

export interface FilterState {
  source?: string;
  topics: string[];
  channelName?: string;
  dateRange: {
    preset?: '24h' | '7d' | '30d' | 'custom';
    from?: number;
    to?: number;
  };
}

interface FiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
}

interface Facets {
  sources: string[];
  topics: string[];
  channels: string[];
}

export default function Filters({ filters, onChange, onReset }: FiltersProps) {
  const [facets, setFacets] = useState<Facets>({ sources: [], topics: [], channels: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Load available facets
  useEffect(() => {
    fetch('/api/search/facets')
      .then(res => res.json())
      .then(data => {
        setFacets(data.facets);
        setIsLoading(false);
      })
      .catch(err => {
        logger.error('facets_load_failed', {
          component: 'Filters',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        setIsLoading(false);
      });
  }, []);

  const handleSourceChange = (source: string) => {
    onChange({
      ...filters,
      source: filters.source === source ? undefined : source,
    });
  };

  const handleTopicToggle = (topic: string) => {
    const topics = filters.topics.includes(topic)
      ? filters.topics.filter(t => t !== topic)
      : [...filters.topics, topic];

    onChange({ ...filters, topics });
  };

  const handleChannelChange = (channel: string) => {
    onChange({
      ...filters,
      channelName: filters.channelName === channel ? undefined : channel,
    });
  };

  const handleDatePresetChange = (preset: '24h' | '7d' | '30d') => {
    const now = Date.now();
    const ranges = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    onChange({
      ...filters,
      dateRange: {
        preset,
        from: now - ranges[preset],
        to: now,
      },
    });
  };

  const handleCustomDateApply = () => {
    if (!customDateFrom || !customDateTo) return;

    onChange({
      ...filters,
      dateRange: {
        preset: 'custom',
        from: new Date(customDateFrom).getTime(),
        to: new Date(customDateTo).getTime(),
      },
    });
  };

  const activeFilterCount =
    (filters.source ? 1 : 0) +
    filters.topics.length +
    (filters.channelName ? 1 : 0) +
    (filters.dateRange.preset ? 1 : 0);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <div className="animate-pulse flex items-center justify-center py-4">
          <div className="text-gray-400">Loading filters...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🎛️</span>
          <span className="font-semibold text-gray-900 dark:text-white">Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              className="text-sm text-red-500 hover:text-red-600 mr-2"
            >
              Clear
            </button>
          )}
          <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Filter Options */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-6">
          {/* Source Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Source
            </label>
            <div className="flex flex-wrap gap-2">
              {facets.sources.map(source => (
                <button
                  key={source}
                  onClick={() => handleSourceChange(source)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    filters.source === source
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {source}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date Range
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {['24h', '7d', '30d'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleDatePresetChange(preset as any)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    filters.dateRange.preset === preset
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Last {preset === '24h' ? '24 hours' : preset === '7d' ? '7 days' : '30 days'}
                </button>
              ))}
            </div>

            {/* Custom Date Range */}
            <details className="mt-2">
              <summary className="text-sm text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                Custom date range
              </summary>
              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                  <span className="self-center text-gray-500">to</span>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <button
                  onClick={handleCustomDateApply}
                  disabled={!customDateFrom || !customDateTo}
                  className="w-full px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </details>
          </div>

          {/* Topics Filter */}
          {facets.topics.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Topics ({filters.topics.length} selected)
              </label>
              <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-200 dark:border-gray-700 rounded p-2">
                {facets.topics.map(topic => (
                  <label
                    key={topic}
                    className="flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.topics.includes(topic)}
                      onChange={() => handleTopicToggle(topic)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{topic}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Channel Filter */}
          {facets.channels.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Telegram Channel
              </label>
              <select
                value={filters.channelName || ''}
                onChange={(e) => handleChannelChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All channels</option>
                {facets.channels.map(channel => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
