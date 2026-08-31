import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 0.1,

    // Note: if you want to override the automatic release value, do not set a
    // `release` value here - use the environment variable `SENTRY_RELEASE`, so
    // that it will also get attached to your source maps
    debug: false,
    ignoreErrors: [
      // Vercel serverless platform internal IPC bridge socket disconnects on container teardown/freeze
      'connect ECONNREFUSED /opt/vercel/ipc.sock',
      'ECONNREFUSED /opt/vercel/ipc.sock',
      /ECONNREFUSED.*ipc\.sock/,
    ],
    beforeSend(event) {
      const message = event.exception?.values?.[0]?.value || '';
      if (
        message.includes('/opt/vercel/ipc.sock') ||
        message.includes('ECONNREFUSED /opt/vercel/ipc.sock')
      ) {
        return null;
      }
      return event;
    },
  });
}
