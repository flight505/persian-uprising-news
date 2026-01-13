/**
 * Structured Logging Utility
 *
 * Provides environment-aware, structured logging with support for:
 * - Multiple log levels (debug, info, warn, error)
 * - Context metadata
 * - Error tracking integration (Sentry)
 * - Performance tracking
 * - JSON output in production
 * - Pretty output in development
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * logger.info('user_login', { userId: '123', method: 'oauth' });
 * logger.error('api_request_failed', { endpoint: '/api/news', error: err });
 * logger.debug('cache_hit', { key: 'articles', ttl: 300 });
 * ```
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  environment: string;
  service: string;
  trace_id?: string;
}

class Logger {
  private minLevel: LogLevel;
  private service: string;
  private environment: string;

  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.service = 'rise-up-news';

    // Set minimum log level based on environment
    if (this.environment === 'production') {
      this.minLevel = LogLevel.INFO;
    } else if (this.environment === 'test') {
      this.minLevel = LogLevel.ERROR;
    } else {
      this.minLevel = LogLevel.DEBUG;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatLogEntry(
    level: string,
    message: string,
    context?: LogContext
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.sanitizeContext(context),
      environment: this.environment,
      service: this.service,
      trace_id: this.getTraceId(),
    };
  }

  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;

    // Remove sensitive data
    const sanitized = { ...context };
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private getTraceId(): string | undefined {
    // In production, you'd extract this from request headers or async context
    if (typeof window !== 'undefined' && (window as any).__TRACE_ID__) {
      return (window as any).__TRACE_ID__;
    }
    return undefined;
  }

  private formatForConsole(entry: LogEntry): string {
    const { timestamp, level, message, context } = entry;
    const time = new Date(timestamp).toLocaleTimeString();

    // Add color based on level (development only)
    const colors = {
      DEBUG: '\x1b[36m', // Cyan
      INFO: '\x1b[32m',  // Green
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';

    const color = colors[level as keyof typeof colors] || reset;
    const levelPadded = level.padEnd(5);

    let output = `${color}[${time}] ${levelPadded}${reset} ${message}`;

    if (context && Object.keys(context).length > 0) {
      output += `\n  ${JSON.stringify(context, null, 2)}`;
    }

    return output;
  }

  private write(level: LogLevel, levelName: string, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) return;

    const entry = this.formatLogEntry(levelName, message, context);

    // Production: JSON output for log aggregation
    if (this.environment === 'production') {
      const jsonLog = JSON.stringify(entry);

      if (level >= LogLevel.ERROR) {
        console.error(jsonLog);
        this.sendToErrorTracking(entry);
      } else if (level >= LogLevel.WARN) {
        console.warn(jsonLog);
      } else {
        console.log(jsonLog);
      }
    } else {
      // Development: Pretty formatted output
      const formatted = this.formatForConsole(entry);

      if (level >= LogLevel.ERROR) {
        console.error(formatted);
      } else if (level >= LogLevel.WARN) {
        console.warn(formatted);
      } else {
        console.log(formatted);
      }
    }
  }

  private sendToErrorTracking(entry: LogEntry) {
    // TODO: Integrate with Sentry, DataDog, or other error tracking
    // Example Sentry integration:
    /*
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(new Error(entry.message), {
        level: entry.level.toLowerCase(),
        extra: entry.context,
      });
    }
    */
  }

  /**
   * Debug level logging
   * Use for detailed diagnostic information
   * Only logs in development
   */
  debug(message: string, context?: LogContext) {
    this.write(LogLevel.DEBUG, 'DEBUG', message, context);
  }

  /**
   * Info level logging
   * Use for general informational messages
   * Logs in development and production
   */
  info(message: string, context?: LogContext) {
    this.write(LogLevel.INFO, 'INFO', message, context);
  }

  /**
   * Warning level logging
   * Use for potentially harmful situations
   * Logs in all environments
   */
  warn(message: string, context?: LogContext) {
    this.write(LogLevel.WARN, 'WARN', message, context);
  }

  /**
   * Error level logging
   * Use for error events
   * Logs in all environments and sends to error tracking
   */
  error(message: string, context?: LogContext) {
    this.write(LogLevel.ERROR, 'ERROR', message, context);
  }

  /**
   * Performance timing utility
   * Returns a function to mark the end of the operation
   */
  time(operation: string, context?: LogContext): () => void {
    const start = Date.now();

    this.debug(`${operation}_started`, context);

    return () => {
      const duration = Date.now() - start;
      this.info(`${operation}_completed`, {
        ...context,
        duration_ms: duration,
      });
    };
  }

  /**
   * HTTP request logging
   */
  http(method: string, path: string, statusCode: number, duration: number, context?: LogContext) {
    const level = statusCode >= 500 ? LogLevel.ERROR :
                  statusCode >= 400 ? LogLevel.WARN :
                  LogLevel.INFO;

    const levelName = statusCode >= 500 ? 'ERROR' :
                      statusCode >= 400 ? 'WARN' :
                      'INFO';

    this.write(level, levelName, 'http_request', {
      method,
      path,
      status_code: statusCode,
      duration_ms: duration,
      ...context,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions for backward compatibility
export const log = {
  debug: (msg: string, ctx?: LogContext) => logger.debug(msg, ctx),
  info: (msg: string, ctx?: LogContext) => logger.info(msg, ctx),
  warn: (msg: string, ctx?: LogContext) => logger.warn(msg, ctx),
  error: (msg: string, ctx?: LogContext) => logger.error(msg, ctx),
};
