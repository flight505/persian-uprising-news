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
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                ← News Feed
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Incident Map
              </h1>
            </div>

            <Link
              href="/report"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              📍 Report Incident
            </Link>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {filterButtons.map(button => (
              <button
                key={button.type}
                onClick={() => setSelectedType(button.type)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  selectedType === button.type
                    ? `${button.color} text-white`
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {button.label} ({button.count})
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
            <span>
              ✓ {incidents.filter(i => i.verified).length} Verified
            </span>
            <span>
              👤 {incidents.filter(i => i.reportedBy === 'crowdsource').length} Crowdsourced
            </span>
            <span>
              🔵 {incidents.filter(i => i.reportedBy === 'official').length} Official
            </span>
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-2 py-1 rounded text-xs font-medium transition ${
                showHeatmap
                  ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              🔥 {showHeatmap ? 'Hide' : 'Show'} Heatmap
            </button>
            <button
              onClick={fetchIncidents}
              className="ml-auto text-blue-600 dark:text-blue-400 hover:underline"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-800">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
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
              <div className="absolute bottom-6 md:bottom-8 left-0 right-0 z-[1000] px-4 md:px-0 flex justify-center">
                <TimelineSlider
                  minDate={new Date(Math.min(...incidents.map(i => i.timestamp)))}
                  maxDate={new Date(Math.max(...incidents.map(i => i.timestamp)))}
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
