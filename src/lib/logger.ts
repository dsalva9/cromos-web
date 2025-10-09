/**
 * Logger utility for production-safe logging
 *
 * Usage:
 * - logger.debug(...) - Development only, for verbose debugging
 * - logger.info(...) - Development only, for informational messages
 * - logger.warn(...) - Always logs, for warnings
 * - logger.error(...) - Always logs, for errors (TODO: send to error tracking service)
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Debug-level logging (development only)
   * Use for verbose debugging information
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug('[DEBUG]', ...args);
    }
  },

  /**
   * Info-level logging (development only)
   * Use for informational messages
   */
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Warning-level logging (always logs)
   * Use for recoverable issues and deprecation warnings
   */
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error-level logging (always logs)
   * Use for errors and exceptions
   * TODO v1.5.1: Send to error tracking service (Sentry, etc.)
   */
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
    // TODO v1.5.1: Send to error tracking service
  },
};
