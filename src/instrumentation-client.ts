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

        // Third-party / environment errors that are not actionable
        ignoreErrors: [
            // iOS Safari/Chrome cancels RSC prefetch fetches mid-flight when
            // the user navigates — surfaces as a generic "Load failed" TypeError.
            'Load failed',
            // MetaMask browser extension injecting itself into every page.
            'Failed to connect to MetaMask',
            // OneSignal SW timing race: notification shown before SW is active.
            'Registration does not have an active worker',
        ],

        beforeSend(event, hint) {
            const exception = event.exception?.values?.[0];
            const message = exception?.value || '';
            const type = exception?.type || '';

            // Drop standard aborted-fetch errors
            if (
                message.includes('Failed to fetch') ||
                message.includes('AbortError') ||
                message.includes('signal is aborted') ||
                type === 'AbortError'
            ) {
                return null;
            }

            // Drop Facebook in-app browser autofill bridge errors —
            // originates from app://autofill_test_android, not our code.
            const frames = event.exception?.values?.flatMap(
                (v) => v.stacktrace?.frames ?? [],
            ) ?? [];
            const hasFbAutofill = frames.some((f) =>
                f.filename?.includes('autofill_test_android'),
            );
            if (hasFbAutofill) return null;

            return event;
        },
    });
}
