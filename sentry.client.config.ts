import * as Sentry from '@sentry/nextjs';

// NOTE: This file is DEPRECATED. Client-side Sentry init is now in src/instrumentation-client.ts
// Kept for reference only — @sentry/nextjs v8+ requires instrumentation-client.ts.
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    debug: false,

    integrations: [
      Sentry.replayIntegration({
        // Additional Replay configuration goes in here, for example:
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}
