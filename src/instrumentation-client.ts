import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,

        // Capture 10% of transactions for performance monitoring
        tracesSampleRate: 0.1,

        // Capture Replay for 10% of all sessions,
        // plus for 100% of sessions with an error
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,

        debug: false,

        integrations: [
            Sentry.replayIntegration({
                maskAllText: true,
                blockAllMedia: true,
            }),
        ],

        // Filter out noise from aborted fetches during navigation
        beforeSend(event) {
            const exception = event.exception?.values?.[0];
            const message = exception?.value || '';
            const type = exception?.type || '';
            if (
                message.includes('Failed to fetch') ||
                message.includes('AbortError') ||
                message.includes('signal is aborted') ||
                type === 'AbortError'
            ) {
                return null; // Drop the event
            }
            return event;
        },
    });
}
