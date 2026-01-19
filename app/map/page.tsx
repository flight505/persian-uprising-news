'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import TimelineSlider from '../components/Map/TimelineSlider';
import { logger } from '@/lib/logger';

// Dynamic import for Leaflet to avoid SSR issues
const IncidentMap = dynamic(
  () => import('../components/Map/IncidentMap'),
  { ssr: false }
);

interface Incident {
  id: string;
  type: 'protest' | 'arrest' | 'injury' | 'death' | 'other';
  title: string;
  description: string;
  location: {
    lat: number;
    lon: number;
    address?: string;
  };
  images?: string[];
  verified: boolean;
  reportedBy: 'crowdsource' | 'official';
  timestamp: number;
  upvotes: number;
  createdAt: number;
  relatedArticles?: Array<{
    title: string;
    url: string;
    source: string;
  }>;
}

export default function MapPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | undefined>(undefined);
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/incidents');
      if (!response.ok) throw new Error('Failed to fetch incidents');

      const data = await response.json();
      setIncidents(data.incidents || []);
      setError(null);
    } catch (err) {
      logger.error('incidents_fetch_failed', {
        component: 'MapPage',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError('Failed to load incidents. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const getIncidentCounts = () => {
    // Filter by date range if set
    const visibleIncidents = dateRange
      ? incidents.filter(inc => {
        const incDate = new Date(inc.timestamp);
        return incDate >= dateRange.start && incDate <= dateRange.end;
      })
      : incidents;

    const counts: Record<string, number> = {
      all: visibleIncidents.length,
      protest: 0,
      arrest: 0,
      injury: 0,
      death: 0,
      other: 0,
    };

    visibleIncidents.forEach(incident => {
      counts[incident.type] = (counts[incident.type] || 0) + 1;
    });

    return counts;
  };

  const getIncidentCountByDay = () => {
    const countByDay: Record<string, number> = {};

    incidents.forEach(incident => {
      const date = new Date(incident.timestamp);
      const dateKey = date.toISOString().split('T')[0];
      countByDay[dateKey] = (countByDay[dateKey] || 0) + 1;
    });

    return countByDay;
  };

  // Ensure min/max date logic handles sparse data gracefully
  const [timelineStart, setTimelineStart] = useState<Date>(new Date());
  const [timelineEnd, setTimelineEnd] = useState<Date>(new Date());

  useEffect(() => {
    if (incidents.length > 0) {
      const timestamps = incidents.map(i => i.timestamp);
      const min = new Date(Math.min(...timestamps));
      const max = new Date(Math.max(...timestamps));

      // If range is too small (e.g. same day), expand it for visual timeline appeal
      if (max.getTime() - min.getTime() < 86400000 * 2) {
        // Expand to 1 week before and 1 day after
        min.setDate(min.getDate() - 7);
        max.setDate(max.getDate() + 1);
      }

      setTimelineStart(min);
      setTimelineEnd(max);
    }
  }, [incidents]);

  // Memoize the date range change handler to prevent infinite re-renders
  const handleDateRangeChange = useCallback((start: Date, end: Date) => {
    setDateRange({ start, end });
  }, []);

  // Clear timeline filter to show all incidents
  const handleClearFilter = useCallback(() => {
    setDateRange(undefined);
  }, []);

  const counts = getIncidentCounts();
  const incidentCountByDay = getIncidentCountByDay();

  const filterButtons = [
    { type: '', label: 'All Incidents', count: counts.all, color: 'bg-gray-600' },
    { type: 'protest', label: 'Protests', count: counts.protest, color: 'bg-red-500' },
    { type: 'arrest', label: 'Arrests', count: counts.arrest, color: 'bg-amber-500' },
    { type: 'injury', label: 'Injuries', count: counts.injury, color: 'bg-orange-500' },
    { type: 'death', label: 'Casualties', count: counts.death, color: 'bg-red-600' },
    { type: 'other', label: 'Other', count: counts.other, color: 'bg-indigo-500' },
  ];

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 dark:text-red-200 font-bold mb-2">Error Loading Map</h3>
          <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
          <button
            onClick={fetchIncidents}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden relative">
      {/* Search/Header Bar - Floating Glass */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 pointer-events-auto">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-full glass-dark border border-white/10 hover:bg-white/5 transition group"
            >
              <span className="text-white group-hover:-translate-x-1 transition-transform">←</span>
              <span className="text-sm font-medium text-white">Back to News</span>
            </Link>

            <div className="flex gap-3">
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition backdrop-blur-md border ${showHeatmap
                    ? 'bg-expression-red/20 text-expression-red border-expression-red/30'
                    : 'bg-black/40 text-white/70 border-white/10 hover:bg-black/60'
                  }`}
              >
                🔥 Heatmap
              </button>

              <Link
                href="/report"
                className="px-4 py-2 bg-expression-green/90 text-black font-semibold rounded-full hover:bg-expression-green shadow-lg shadow-expression-green/20 transition text-sm flex items-center gap-2"
              >
                <span>📍</span>
                <span>Report</span>
              </Link>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-2">
            {filterButtons.map(button => (
              <button
                key={button.type}
                onClick={() => setSelectedType(button.type)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition backdrop-blur-md border ${selectedType === button.type
                    ? `${button.color} text-white border-transparent shadow-lg`
                    : 'bg-black/40 text-white/70 border-white/10 hover:bg-white/10'
                  }`}
              >
                {button.label} <span className="opacity-60 ml-1 text-xs">{button.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="absolute inset-0 z-0">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-expression-green mb-4 mx-auto"></div>
              <p className="text-zinc-400 animate-pulse">Establishing Secure Uplink...</p>
            </div>
          </div>
        ) : (
          <>
            <IncidentMap
              incidents={incidents}
              selectedType={selectedType}
              dateRange={dateRange}
              showHeatmap={showHeatmap}
            />

            {/* Floating Timeline Slider */}
            {incidents.length > 0 && (
              <div className="absolute bottom-24 md:bottom-8 left-0 right-0 z-[1000] px-4 md:px-0 flex justify-center pointer-events-none">
                <TimelineSlider
                  minDate={timelineStart}
                  maxDate={timelineEnd}
                  onDateRangeChange={handleDateRangeChange}
                  onClearFilter={handleClearFilter}
                  incidentCountByDay={incidentCountByDay}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-10">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">Legend:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Protest</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span>Arrest</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>Injury</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-600"></div>
              <span>Casualty</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <span>Other</span>
            </div>
            <span className="ml-auto">● Solid = Verified • ◐ Faded = Unverified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
