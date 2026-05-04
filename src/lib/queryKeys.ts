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
        collectionIdsKey: string,
        limit: number = 20,
        countryCode?: string,
    ) =>
        ['listings', { search, sortByDistance, viewerPostcode, collectionIdsKey, limit, countryCode }] as const,

    listingsAll: () => ['listings'] as const,

    /* ─── templates ─── */
    templates: (search: string, sortBy: string, countryCode?: string) =>
        ['templates', { search, sortBy, countryCode }] as const,
    templatesAll: () => ['templates'] as const,

    /* ─── user collections ─── */
    userCollections: () => ['userCollections'] as const,

    /* ─── proposals ─── */
    proposals: (box: string, view: string) =>
        ['proposals', { box, view }] as const,
    proposalsAll: () => ['proposals'] as const,

    /* ─── notifications ─── */
    notifications: () => ['notifications'] as const,
    notificationPreferences: () => ['notificationPreferences'] as const,

    /* ─── trade chat ─── */
    tradeChat: (tradeId: number | null) => ['tradeChat', tradeId] as const,

    /* ─── marketplace availability (album ↔ marketplace bridge) ─── */
    marketplaceAvailability: () => ['marketplaceAvailability'] as const,
    marketplaceAvailabilitySlots: (copyId: number) =>
        ['marketplaceAvailability', 'slots', copyId] as const,
} as const;
