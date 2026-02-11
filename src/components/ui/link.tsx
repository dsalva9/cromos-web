'use client';

import NextLink from 'next/link';
import { forwardRef, useCallback, MouseEvent } from 'react';
import { useUser } from '@/components/providers/SupabaseProvider';

type NextLinkProps = React.ComponentProps<typeof NextLink>;

/**
 * Custom Link component — drop-in replacement for next/link.
 *
 * Workaround for Next.js 16 / React 19 transition bug where client-side
 * navigation silently hangs for authenticated users. When the user is
 * logged in, clicks are intercepted and routed through `window.location.href`
 * (hard navigation) instead of React's client-side router.
 *
 * For unauthenticated users, standard SPA navigation is preserved.
 */
const Link = forwardRef<HTMLAnchorElement, NextLinkProps>(function Link(
    { onClick, href, ...rest },
    ref
) {
    const { user } = useUser();

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
                // Resolve href to string
                const url = typeof href === 'string' ? href : href?.pathname ?? '/';
                window.location.href = url;
            }
        },
        [onClick, user, href]
    );

    return <NextLink ref={ref} href={href} onClick={handleClick} prefetch={user ? false : undefined} {...rest} />;
});

export default Link;
