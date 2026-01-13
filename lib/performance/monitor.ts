/**
 * Performance Monitor
 * Tracks operation timing and logs slow operations
 */

import { logger } from '@/lib/logger';

export class PerformanceMonitor {
  private timers = new Map<string, number>();
  private measurements = new Map<string, number[]>();
  private slowThreshold: number = 1000; // 1 second

  constructor(slowThreshold: number = 1000) {
    this.slowThreshold = slowThreshold;
  }

  /**
   * Start a timer
   */
  start(label: string) {
    this.timers.set(label, Date.now());
  }

  /**
   * End a timer and log the duration
   */
  end(label: string): number {
    const start = this.timers.get(label);
    if (!start) {
      logger.warn('timer_not_started', { label });
      return 0;
    }

    const duration = Date.now() - start;
    this.timers.delete(label);

    // Store measurement for statistics
    const measurements = this.measurements.get(label) || [];
    measurements.push(duration);
    this.measurements.set(label, measurements);

    // Log based on duration
    if (duration > this.slowThreshold) {
      logger.warn('slow_operation', { label, duration_ms: duration });
    } else {
      logger.debug('operation_completed', { label, duration_ms: duration });
    }

    return duration;
  }

  /**
   * Measure an async operation
   */
  async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      return await fn();
    } finally {
      this.end(label);
    }
  }

  /**
   * Measure a sync operation
   */
  measureSync<T>(label: string, fn: () => T): T {
    this.start(label);
    try {
      return fn();
    } finally {
      this.end(label);
    }
  }

  /**
   * Get statistics for a specific label
   */
  getStats(label: string): {
    count: number;
    total: number;
    avg: number;
    min: number;
    max: number;
  } | null {
    const measurements = this.measurements.get(label);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const total = measurements.reduce((sum, val) => sum + val, 0);
    const avg = total / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);

    return {
      count: measurements.length,
      total,
      avg: Math.round(avg),
      min,
      max,
    };
  }

  /**
   * Get all statistics
   */
  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {};
    for (const label of this.measurements.keys()) {
      stats[label] = this.getStats(label);
    }
    return stats;
  }

  /**
   * Clear all measurements
   */
  clearStats() {
    this.measurements.clear();
  }

  /**
   * Print summary of all operations
   */
  printSummary() {
    const stats = this.getAllStats();
    const labels = Object.keys(stats);

    if (labels.length === 0) {
      logger.info('performance_summary_empty');
      return;
    }

    logger.info('performance_summary', { stats });
  }
}

// Export singleton instance
export const perfMonitor = new PerformanceMonitor(1000);
