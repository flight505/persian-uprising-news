'use client';

import { useState, useEffect } from 'react';

interface TimelineSliderProps {
  minDate: Date;
  maxDate: Date;
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
  incidentCountByDay: Record<string, number>; // ISO date string -> count
}

export default function TimelineSlider({
  minDate,
  maxDate,
  onDateRangeChange,
  incidentCountByDay,
}: TimelineSliderProps) {
  const [startValue, setStartValue] = useState(0);
  const [endValue, setEndValue] = useState(30);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Calculate date range (last 30 days by default)
  const totalDays = 30;
  const today = new Date();
  const daysAgo30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  useEffect(() => {
    // Update date range when slider values change
    const startDate = new Date(daysAgo30.getTime() + startValue * 24 * 60 * 60 * 1000);
    const endDate = new Date(daysAgo30.getTime() + endValue * 24 * 60 * 60 * 1000);
    onDateRangeChange(startDate, endDate);
  }, [startValue, endValue, onDateRangeChange]);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value <= endValue - 1) {
      setStartValue(value);
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value >= startValue + 1) {
      setEndValue(value);
    }
  };

  const formatDate = (daysFromStart: number): string => {
    const date = new Date(daysAgo30.getTime() + daysFromStart * 24 * 60 * 60 * 1000);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getIncidentCount = (): number => {
    return Object.entries(incidentCountByDay)
      .filter(([dateKey]) => {
        const date = new Date(dateKey);
        const startDate = new Date(daysAgo30.getTime() + startValue * 24 * 60 * 60 * 1000);
        const endDate = new Date(daysAgo30.getTime() + endValue * 24 * 60 * 60 * 1000);
        return date >= startDate && date <= endDate;
      })
      .reduce((sum, [, count]) => sum + count, 0);
  };

  // Reset to show all
  const handleReset = () => {
    setStartValue(0);
    setEndValue(30);
  };

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="flex items-center gap-2 px-3 py-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition pointer-events-auto"
        title="Expand timeline"
      >
        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {formatDate(startValue)} - {formatDate(endValue)}
        </span>
      </button>
    );
  }

  return (
    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 pointer-events-auto">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {formatDate(startValue)} - {formatDate(endValue)}
          </span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            ({getIncidentCount()} incidents)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleReset}
            className="px-2 py-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition"
            title="Reset to all dates"
          >
            Reset
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
            title="Minimize timeline"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Compact Dual Range Slider */}
      <div className="relative h-6">
        {/* Track */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-0.5 bg-gray-300 dark:bg-gray-600 rounded-full" />

        {/* Active Track */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-blue-500 dark:bg-blue-400 rounded-full"
          style={{
            left: `${(startValue / totalDays) * 100}%`,
            width: `${((endValue - startValue) / totalDays) * 100}%`,
          }}
        />

        {/* Start Slider */}
        <input
          type="range"
          min="0"
          max={totalDays}
          value={startValue}
          onChange={handleStartChange}
          className="absolute top-0 w-full h-6 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:bg-blue-700 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer hover:[&::-moz-range-thumb]:bg-blue-700"
          style={{ zIndex: startValue > endValue - 5 ? 5 : 3 }}
        />

        {/* End Slider */}
        <input
          type="range"
          min="0"
          max={totalDays}
          value={endValue}
          onChange={handleEndChange}
          className="absolute top-0 w-full h-6 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:bg-blue-700 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer hover:[&::-moz-range-thumb]:bg-blue-700"
          style={{ zIndex: 4 }}
        />
      </div>
    </div>
  );
}
