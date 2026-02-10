/**
 * Centralized query key factory for React Query.
 *
 * All query keys used by `useQuery` / `useInfiniteQuery` across the app
 * should be defined here so that invalidation, prefetching, and cache
 * management are consistent.
 *
 * Convention: each domain has a root key (e.g. `['listings']`) and
 * factory functions that append filter parameters.
 */
export const QUERY_KEYS = {
    /* ─── marketplace ─── */
    listings: (
        search: string,
        sortByDistance: boolean,
        viewerPostcode: string | null,
        collectionIdsKey: string
    ) =>
        ['listings', { search, sortByDistance, viewerPostcode, collectionIdsKey }] as const,

    listingsAll: () => ['listings'] as const,
} as const;
