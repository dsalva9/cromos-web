import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,

        // Capture 10% of transactions for performance monitoring
        tracesSampleRate: 0.1,

        // Session replays disabled to optimize bundle size and performance
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,

        debug: false,

        integrations: [],

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
            // PKCE / OAuth verifier mismatch errors
            'code challenge does not match previously saved code verifier',
            'bad_code_verifier',
            'pkce_code_verifier_not_found',
            // WebKit/Safari IndexedDB bug: attempt to use transaction without an active one.
            'Attempt to get a record from database without an in-progress transaction',
            // OneSignal/external IndexedDB issue: transaction requested while DB connection is closing.
            "Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.",
            // WebKit/Safari IndexedDB internal database server crashes / process terminations
            'An internal error was encountered in the Indexed Database server',
            'Connection to Indexed Database server lost',
            // Chrome extension/port error injected into the page.
            'A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received',
            // DuckDuckGo / iOS WKWebView internal script injection postMessage timeout error.
            'WKWebView API client did not respond to this postMessage',
        ],

        beforeSend(event, hint) {
            const exception = event.exception?.values?.[0];
            const message = exception?.value || '';
            const type = exception?.type || '';

            // Drop PKCE/code verifier errors
            if (
                message.includes('code challenge does not match') ||
                message.includes('bad_code_verifier') ||
                message.includes('pkce_code_verifier_not_found')
            ) {
                return null;
            }

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

            // Drop Safari/WebKit IndexedDB internal database server crashes and lost connections
            if (
                message.includes('Indexed Database server') ||
                message.includes('Indexed Database') ||
                message.includes('IndexedDB') ||
                message.includes('Connection to Indexed Database server lost')
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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
