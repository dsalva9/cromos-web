'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

/**
 * React Query provider with sensible defaults for the app.
 *
 * - staleTime: 60s — data is considered fresh for 1 minute, avoiding unnecessary refetches.
 * - gcTime: 5 min — unused cache entries are garbage-collected after 5 minutes.
 * - retry: 1 — retry failed queries once before surfacing the error.
 * - refetchOnWindowFocus: false — avoids unexpected refetches when the user tabs back.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60_000,
                        gcTime: 5 * 60_000,
                        retry: 1,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
