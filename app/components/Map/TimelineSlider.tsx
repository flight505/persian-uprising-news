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
  const [isDragging, setIsDragging] = useState(false);

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

  const getIncidentCount = (daysFromStart: number): number => {
    const date = new Date(daysAgo30.getTime() + daysFromStart * 24 * 60 * 60 * 1000);
    const dateKey = date.toISOString().split('T')[0];
    return incidentCountByDay[dateKey] || 0;
  };

  // Calculate max count for bar scaling
  const maxCount = Math.max(...Object.values(incidentCountByDay), 1);

  // Reset to show all
  const handleReset = () => {
    setStartValue(0);
    setEndValue(30);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Timeline Filter
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatDate(startValue)} - {formatDate(endValue)}
          </p>
        </div>
        <button
          onClick={handleReset}
          className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition"
        >
          Reset
        </button>
      </div>

      {/* Bar Chart */}
      <div className="mb-4 h-12 flex items-end gap-[2px]">
        {Array.from({ length: totalDays + 1 }).map((_, index) => {
          const count = getIncidentCount(index);
          const height = count > 0 ? (count / maxCount) * 100 : 0;
          const isInRange = index >= startValue && index <= endValue;

          return (
            <div
              key={index}
              className="flex-1 flex flex-col justify-end"
              title={`${formatDate(index)}: ${count} incidents`}
            >
              <div
                className={`w-full rounded-t transition-all ${
                  isInRange
                    ? 'bg-blue-500 dark:bg-blue-400'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
                style={{ height: `${height}%`, minHeight: count > 0 ? '2px' : '0px' }}
              />
            </div>
          );
        })}
      </div>

      {/* Dual Range Slider */}
      <div className="relative h-10 mb-2">
        {/* Track */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />

        {/* Active Track */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-blue-500 dark:bg-blue-400 rounded-full"
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
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="absolute top-0 w-full h-10 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:bg-blue-700 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer hover:[&::-moz-range-thumb]:bg-blue-700"
          style={{ zIndex: startValue > endValue - 5 ? 5 : 3 }}
        />

        {/* End Slider */}
        <input
          type="range"
          min="0"
          max={totalDays}
          value={endValue}
          onChange={handleEndChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="absolute top-0 w-full h-10 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:bg-blue-700 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer hover:[&::-moz-range-thumb]:bg-blue-700"
          style={{ zIndex: 4 }}
        />
      </div>

      {/* Date Labels */}
      <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400">
        <span>{formatDate(0)}</span>
        <span>{formatDate(Math.floor(totalDays / 2))}</span>
        <span>{formatDate(totalDays)}</span>
      </div>

      {/* Stats */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 dark:text-gray-400">Incidents in range:</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {Object.entries(incidentCountByDay)
              .filter(([dateKey]) => {
                const date = new Date(dateKey);
                const startDate = new Date(daysAgo30.getTime() + startValue * 24 * 60 * 60 * 1000);
                const endDate = new Date(daysAgo30.getTime() + endValue * 24 * 60 * 60 * 1000);
                return date >= startDate && date <= endDate;
              })
              .reduce((sum, [, count]) => sum + count, 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
