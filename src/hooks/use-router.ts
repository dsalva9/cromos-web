'use client';

import { useRouter as useNextRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useUser } from '@/components/providers/SupabaseProvider';
import { useLocale } from 'next-intl';

/**
 * Custom useRouter hook — drop-in replacement for next/navigation's useRouter.
 *
 * Automatically prefixes locale on push/replace for locale-aware navigation.
 *
 * Workaround for Next.js 16 / React 19 transition bug where client-side
 * navigation silently hangs for authenticated users. When the user is
 * logged in, `push` and `replace` use `window.location.href` (hard navigation)
 * instead of React's client-side router.
 *
 * For unauthenticated users, standard SPA navigation is preserved.
 */
export function useRouter() {
    const router = useNextRouter();
    const { user } = useUser();
    const locale = useLocale();

    return useMemo(() => {
        /**
         * Prefix a path with the current locale if it doesn't already have one.
         */
        const withLocale = (href: string): string => {
            const localeRegex = /^\/(es|en|pt)(\/|$)/;
            if (localeRegex.test(href)) return href;
            return `/${locale}${href.startsWith('/') ? '' : '/'}${href}`;
        };

        if (!user) {
            return {
                ...router,
                push: (href: string) => router.push(withLocale(href)),
                replace: (href: string) => router.replace(withLocale(href)),
            };
        }

        return {
            ...router,
            push: (href: string) => {
                window.location.href = withLocale(href);
            },
            replace: (href: string) => {
                window.location.replace(withLocale(href));
            },
        };
    }, [router, user, locale]);
}
