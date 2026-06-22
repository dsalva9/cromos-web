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
            // iOS Safari unhandled promise rejection noise from extensions/analytics
            'Non-Error promise rejection captured with value: undefined',
            // Third-party scripts, Facebook WebView autofill, and extension TypeErrors
            "Cannot read properties of undefined (reading 'value')",
            // Third-party Monetag / ad network unhandled promise rejections
            /^he$/i,
            // Safari/WebKit throws SecurityError when storage/cookies are blocked
            // or when history API limits are exceeded by browser environment.
            'SecurityError: The operation is insecure.',
            'The operation is insecure.',
        ],

        beforeSend(event, hint) {
            const exception = event.exception?.values?.[0];
            const message = exception?.value || '';
            const type = exception?.type || '';

            // Drop Safari/WebKit SecurityError when storage/cookies are blocked or history limits hit
            if (
                message.includes('SecurityError: The operation is insecure') ||
                message.includes('The operation is insecure') ||
                type === 'SecurityError'
            ) {
                return null;
            }

            // Drop standard aborted-fetch errors
            if (
                message.includes('Failed to fetch') ||
                message.includes('AbortError') ||
                message.includes('signal is aborted') ||
                type === 'AbortError'
            ) {
                return null;
            }

            // Drop unhandled rejection "he" directly if it matches
            if (message === 'he' || message === 'Error: he') {
                return null;
            }

            const frames = event.exception?.values?.flatMap(
                (v) => v.stacktrace?.frames ?? [],
            ) ?? [];

            // Drop call stack size errors that do not originate from our codebase.
            // This filters out stack overflows caused by third-party ad networks (e.g. highperformanceformat.com).
            const isStackOverflow =
                message.toLowerCase().includes('maximum call stack size exceeded') ||
                message.toLowerCase().includes('too much recursion') ||
                message.toLowerCase().includes('stack size') ||
                type === 'RangeError';

            if (isStackOverflow) {
                const hasAppFrames = frames.some((f) => {
                    const file = f.filename || '';
                    return (
                        file.includes('_next/static') ||
                        file.includes('/src/') ||
                        file.includes('chunks/') ||
                        file.includes('cambiocromos.com')
                    );
                });
                if (!hasAppFrames) {
                    return null;
                }
            }

            // Drop Facebook in-app browser autofill bridge errors —
            // originates from app://autofill_test_android, not our code.
            const hasFbAutofill = frames.some((f) =>
                f.filename?.includes('autofill_test_android'),
            );
            if (hasFbAutofill) return null;

            return event;
        },
    });
}
