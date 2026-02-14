/**
 * Logger utility that respects production environment
 * 
 * In production, only errors and warnings are logged.
 * In development, all logs are shown.
 * 
 * @example
 * import { logger } from '@/lib/logger';
 * 
 * logger.info('User logged in', { userId: '123' });
 * logger.warn('Rate limit approaching');
 * logger.error('Failed to fetch data', error);
 * logger.debug('Cache hit', { key: 'user-123' });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
}

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// In production, only show warnings and errors
// In test, show nothing
// In development, show everything
const shouldLog = (level: LogLevel): boolean => {
  if (isTest) return false;
  if (isProduction) return level === 'warn' || level === 'error';
  return true;
};

class Logger {
  private prefix: string;
  private enabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || '';
    this.enabled = options.enabled ?? true;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = this.prefix ? `[${this.prefix}] ` : '';
    return `${timestamp} ${level.toUpperCase()} ${prefix}${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.enabled && shouldLog('debug')) {
      console.log(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.enabled && shouldLog('info')) {
      console.log(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.enabled && shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.enabled && shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args);
    }
  }

  // Create a child logger with a specific prefix
  child(prefix: string): Logger {
    const combinedPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    return new Logger({ prefix: combinedPrefix, enabled: this.enabled });
  }
}

// Default logger instance
export const logger = new Logger();

// Named loggers for specific areas
export const authLogger = new Logger({ prefix: 'auth' });
export const apiLogger = new Logger({ prefix: 'api' });
export const subscriptionLogger = new Logger({ prefix: 'subscription' });
export const youtubeLogger = new Logger({ prefix: 'youtube' });

// Factory function for creating custom loggers
export const createLogger = (prefix: string): Logger => new Logger({ prefix });

export default logger;
