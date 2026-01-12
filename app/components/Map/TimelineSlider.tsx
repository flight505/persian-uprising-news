'use client';

import { useState, useEffect, useCallback } from 'react';

interface TimelineSliderProps {
  minDate: Date;
  maxDate: Date;
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
  onClearFilter?: () => void; // Callback to show all incidents
  incidentCountByDay: Record<string, number>;
}

export default function TimelineSlider({
  minDate,
  maxDate,
  onDateRangeChange,
  onClearFilter,
  incidentCountByDay,
}: TimelineSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTimelineActive, setIsTimelineActive] = useState(false); // Track if timeline is being used

  // Generate array of unique dates from min to max
  const generateDateRange = useCallback(() => {
    const dates: Date[] = [];
    const current = new Date(minDate);
    const end = new Date(maxDate);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }, [minDate, maxDate]);

  const uniqueDates = generateDateRange();

  // Update date range when slider changes (only if timeline is active)
  useEffect(() => {
    if (isTimelineActive && uniqueDates.length > 0) {
      const selectedDate = uniqueDates[currentIndex];
      // Show 24 hours from selected date
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      onDateRangeChange(startDate, endDate);
    }
  }, [isTimelineActive, currentIndex, uniqueDates, onDateRangeChange]);

  // Auto-play timeline
  useEffect(() => {
    if (isPlaying && currentIndex < uniqueDates.length - 1) {
      const timer = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isPlaying && currentIndex >= uniqueDates.length - 1) {
      setIsPlaying(false);
      setCurrentIndex(0);
    }
  }, [isPlaying, currentIndex, uniqueDates.length]);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateWithWeekday = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const currentDate = uniqueDates[currentIndex] || uniqueDates[0];
  const incidentCount = currentDate
    ? incidentCountByDay[currentDate.toISOString().split('T')[0]] || 0
    : 0;

  if (uniqueDates.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-xl backdrop-blur-xl shadow-2xl rounded-2xl p-3 md:p-4 border flex flex-col space-y-3 transition-colors duration-300 timeline-flag-glass pointer-events-auto">
      {/* Header */}
      <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wide opacity-90 text-gray-800 dark:text-gray-200">
        <span>Timeline</span>
        <span className="flex items-center gap-2">
          {isTimelineActive ? (
            <>
              {formatDateWithWeekday(currentDate)}
              <span className="text-[10px] font-normal opacity-70">
                ({incidentCount} incidents)
              </span>
            </>
          ) : (
            <span className="text-[10px] font-normal opacity-70">
              Showing All Incidents
            </span>
          )}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-3 md:space-x-4">
        {/* Play/Pause Button */}
        <button
          onClick={() => {
            setIsTimelineActive(true); // Activate timeline filtering
            setIsPlaying(!isPlaying);
          }}
          className={`p-2.5 rounded-full transition-colors active:scale-95 ${
            isPlaying
              ? 'bg-gray-700 text-white'
              : 'bg-gray-900 text-white hover:bg-gray-700'
          }`}
          title={isPlaying ? 'Pause' : 'Play Timeline'}
        >
          {isPlaying ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Slider Container */}
        <div className="flex-1 relative flex items-center h-8">
          <input
            type="range"
            min="0"
            max={uniqueDates.length - 1}
            value={currentIndex}
            onChange={(e) => {
              setIsTimelineActive(true); // Activate timeline filtering
              setIsPlaying(false);
              setCurrentIndex(parseInt(e.target.value));
            }}
            className="w-full h-8 bg-transparent rounded-lg appearance-none cursor-pointer z-10"
          />

          {/* Visual Track */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-gray-500/20 rounded-full pointer-events-none">
            <div
              className="h-full bg-blue-500/50 rounded-full transition-all duration-100"
              style={{
                width: `${(currentIndex / (uniqueDates.length - 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Show All Button */}
        <button
          onClick={() => {
            setIsPlaying(false);
            setIsTimelineActive(false); // Deactivate timeline filtering
            setCurrentIndex(0);
            onClearFilter?.(); // Notify parent to show all incidents
          }}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition active:scale-95 ${
            !isTimelineActive
              ? 'bg-gray-800 text-white border border-gray-800'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
          title="Show all incidents"
        >
          Show All
        </button>
      </div>

      {/* Date Range Labels */}
      <div className="flex justify-between text-[10px] text-gray-600 dark:text-gray-400 opacity-70">
        <span>{formatDate(uniqueDates[0])}</span>
        <span>{formatDate(uniqueDates[uniqueDates.length - 1])}</span>
      </div>
    </div>
  );
}
