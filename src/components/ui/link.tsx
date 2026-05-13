'use client';

import { IntlLink } from '@/i18n/navigation';
import { forwardRef, useCallback, MouseEvent } from 'react';
import { useUser } from '@/components/providers/SupabaseProvider';
import { useLocale } from 'next-intl';

type IntlLinkProps = React.ComponentProps<typeof IntlLink>;

/**
 * Custom Link component — drop-in replacement for next/link.
 *
 * Uses next-intl's Link under the hood for automatic locale prefixing.
 *
 * Workaround for Next.js 16 / React 19 transition bug where client-side
 * navigation silently hangs for authenticated users. When the user is
 * logged in, clicks are intercepted and routed through `window.location.href`
 * (hard navigation) instead of React's client-side router.
 *
 * For unauthenticated users, standard SPA navigation is preserved.
 */
const Link = forwardRef<HTMLAnchorElement, IntlLinkProps>(function Link(
    { onClick, href, ...rest },
    ref
) {
    const { user } = useUser();
    const locale = useLocale();

    const handleClick = useCallback(
        (e: MouseEvent<HTMLAnchorElement>) => {
            // Call the original onClick if provided
            if (onClick) {
                (onClick as (e: MouseEvent<HTMLAnchorElement>) => void)(e);
                // If parent already handled it (e.g. called preventDefault), bail
                if (e.defaultPrevented) return;
            }

            // Workaround: hard nav for authenticated users
            if (user) {
                e.preventDefault();
                // Resolve href to string, then prefix with locale
                const path = typeof href === 'string' ? href : href?.pathname ?? '/';
                // If path already has a locale prefix, use as-is; otherwise prefix it
                const localeRegex = /^\/(es|en|pt)(\/|$)/;
                const url = localeRegex.test(path) ? path : `/${locale}${path.startsWith('/') ? '' : '/'}${path}`;
                window.location.href = url;
            }
        },
        [onClick, user, href, locale]
    );

    return <IntlLink ref={ref} href={href} onClick={handleClick} prefetch={user ? false : undefined} {...rest} />;
});

export default Link;
