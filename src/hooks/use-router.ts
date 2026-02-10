'use client';

import { useRouter as useNextRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useUser } from '@/components/providers/SupabaseProvider';

/**
 * Custom useRouter hook — drop-in replacement for next/navigation's useRouter.
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

    return useMemo(() => {
        if (!user) return router;

        return {
            ...router,
            push: (href: string) => {
                window.location.href = href;
            },
            replace: (href: string) => {
                window.location.replace(href);
            },
        };
    }, [router, user]);
}
