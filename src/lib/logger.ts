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
   * These ARE sent to Sentry — use warnLocal() for expected conditions
   */
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn('[WARN]', ...args);
    }

    // Send warnings to Sentry in production
    if (isSentryEnabled) {
      Sentry.captureMessage(String(args[0]), 'warning');
    }
  },

  /**
   * Local-only warning (development console only, never Sentry)
   * Use for expected-but-notable conditions:
   * - User denied permissions
   * - Transient network errors with retry logic
   * - Non-critical failures that self-heal
   */
  warnLocal: (...args: unknown[]) => {
    if (isDev) {
      console.warn('[WARN-LOCAL]', ...args);
    }
  },

  /**
   * Error-level logging (always logs)
   * Use for errors and exceptions
   * Automatically sends to Sentry in production
   */
  error: (...args: unknown[]) => {
    // Check if this is a transient network error or validation error (not a real application error)
    const IGNORED_PATTERNS = [
      'failed to fetch',
      'fetch failed',
      'aborterror',
      'load failed',
      'chunkloaderror',
      'failed to load chunk',
      'socket hang up',
      'econnreset',
      'etimedout',
      'the user aborted a request',
      'signal is aborted',
      'networkerror',
      'network error',
      'excede el límite',
      'no se pudo cargar la imagen',
      'la imagen está vacía',
      'no se pudo crear el contexto del canvas',
      'no se pudo convertir el canvas',
      'no se pudo generar el thumbnail',
      'no se pudo cargar la imagen para el thumbnail',
      'listing not found',
      'not authenticated',
      'jwt expired',
      'bad_code_verifier',
      'code challenge does not match',
      'pkce_code_verifier_not_found',
    ];
    const shouldIgnore = args.some((arg) => {
      if (typeof arg === 'string') {
        const lowerArg = arg.toLowerCase();
        return IGNORED_PATTERNS.some((p) => lowerArg.includes(p));
      }
      if (arg && typeof arg === 'object') {
        const obj = arg as Record<string, unknown>;
        const details = String(obj.details || '').toLowerCase();
        const message = String(obj.message || '').toLowerCase();
        const name = String(obj.name || '').toLowerCase();
        const code = String(obj.code || '').toLowerCase();
        return IGNORED_PATTERNS.some((p) => 
          details.includes(p) || 
          message.includes(p) || 
          name.includes(p) || 
          code.includes(p)
        );
      }
      return false;
    });

    // Only log to console in development — production errors go to Sentry
    if (isDev) {
      console.error('[ERROR]', ...args);
    }

    // Skip Sentry for transient network errors or validation errors
    if (shouldIgnore) return;

    // Send errors to Sentry in production
    if (isSentryEnabled) {
      const firstArg = args[0];
      const errorArg = args.find(
        (arg) =>
          arg instanceof Error ||
          (arg && typeof arg === 'object' && ('stack' in arg || 'message' in arg || 'code' in arg))
      );

      if (errorArg) {
        const exceptionToCapture = errorArg instanceof Error
          ? errorArg
          : new Error((errorArg as Record<string, unknown>).message as string || String(errorArg));

        Sentry.captureException(exceptionToCapture, {
          tags: {
            logger_message: typeof firstArg === 'string' ? firstArg : undefined,
            error_code: (errorArg as Record<string, unknown>).code as string || undefined,
            error_details: (errorArg as Record<string, unknown>).details as string || undefined,
          },
        });
      } else if (firstArg instanceof Error) {
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
