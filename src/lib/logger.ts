/**
 * Logger utility for production-safe logging
 *
 * Usage:
 * - logger.debug(...) - Development only, for verbose debugging
 * - logger.info(...) - Development only, for informational messages
 * - logger.warn(...) - Always logs, for warnings
 * - logger.error(...) - Always logs, for errors (sends to Sentry in production)
 */

import * as Sentry from '@sentry/nextjs';

const isDev = process.env.NODE_ENV === 'development';
const isSentryEnabled = !isDev && !!process.env.NEXT_PUBLIC_SENTRY_DSN;

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

    // Send warnings to Sentry in production
    if (isSentryEnabled) {
      Sentry.captureMessage(String(args[0]), 'warning');
    }
  },

  /**
   * Error-level logging (always logs)
   * Use for errors and exceptions
   * Automatically sends to Sentry in production
   */
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);

    // Send errors to Sentry in production
    if (isSentryEnabled) {
      const firstArg = args[0];
      if (firstArg instanceof Error) {
        Sentry.captureException(firstArg);
      } else {
        Sentry.captureException(new Error(String(firstArg)));
      }

      // Add additional context if provided
      if (args.length > 1) {
        Sentry.setContext('additional_info', {
          details: args.slice(1),
        });
      }
    }
  },
};
