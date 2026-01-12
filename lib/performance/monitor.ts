/**
 * Performance Monitor
 * Tracks operation timing and logs slow operations
 */

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
      console.warn(`⚠️  No timer started for: ${label}`);
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
      console.warn(`🐌 Slow operation: ${label} took ${duration}ms`);
    } else {
      console.log(`⚡ ${label}: ${duration}ms`);
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
      console.log('📊 No performance measurements recorded');
      return;
    }

    console.log('\n📊 Performance Summary:');
    console.log('━'.repeat(80));

    labels.forEach(label => {
      const stat = stats[label];
      if (stat) {
        console.log(
          `${label.padEnd(40)} | ` +
          `Count: ${stat.count.toString().padStart(3)} | ` +
          `Avg: ${stat.avg.toString().padStart(4)}ms | ` +
          `Min: ${stat.min.toString().padStart(4)}ms | ` +
          `Max: ${stat.max.toString().padStart(4)}ms`
        );
      }
    });

    console.log('━'.repeat(80) + '\n');
  }
}

// Export singleton instance
export const perfMonitor = new PerformanceMonitor(1000);
