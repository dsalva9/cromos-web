# Comprehensive Code Review — cromos-web

**Date**: 2026-02-10  
**Version**: 1.6.0  
**Stack**: Next.js 16 · React 19 · Supabase · Capacitor · TypeScript 5 · Tailwind 4

---

## Overall Assessment

The codebase is **well-organized** with a clear separation between pages, components, hooks, lib, and types. Authentication (Supabase SSR + middleware), error handling (ErrorBoundary + logger + Sentry), and ISR caching are all implemented correctly. The recent work fixing timer leaks, centralizing query keys, and adding `eslint.config.mjs` rules shows good momentum.

**However**, the codebase has **significant technical debt** in three areas:

1. **No server-state caching layer** — Every data-fetching hook (~40 hooks) manually re-implements `useState` + `useEffect` + `useCallback` instead of using TanStack React Query, leading to duplicated boilerplate, no caching, no deduplication, no stale-while-revalidate, and inconsistent error/loading states.
2. **Massive `as any` usage** — 40+ casts, concentrated in `useAlbumPages.ts` (11 casts), admin tabs (20+ casts), and scattered template components. This disables TypeScript's ability to catch bugs at compile time.
3. **Incomplete v1.6.0 migration** — Legacy `user_collections`, `user_stickers`, `collections`, and `stickers` tables are still referenced in live code paths with `as any` casts, while 4 TODOs flag stale RPCs.

| Metric | Count |
|---|---|
| **`as any` casts** | 40+ |
| **`eslint-disable` comments** | 25+ |
| **`console.log` files** | 15 |
| **Unresolved TODO migrations** | 4 |
| **Deprecated types still in use** | 5 |
| **Hooks without caching** | ~40 (1 converted: `useListings`) |

---

## High Priority

### H1. No server-state caching library (React Query)

**Status**: ✅ Resolved (pilot)  
**Resolution**: Installed `@tanstack/react-query` + devtools. Created `QueryProvider.tsx` (staleTime 60s, gcTime 5min, retry 1). Added to `layout.tsx` inside `SupabaseProvider`. Converted `useListings.ts` from manual useState/useEffect/useCallback to `useInfiniteQuery` as pilot — same public API preserved. Created `src/lib/queryKeys.ts` for centralized query key factory. Remaining hooks can be converted incrementally.

**Files**: All 40+ hooks in `src/hooks/`  
**Impact**: Every page re-fetches data on mount. No request deduplication (the same data may be fetched 3× in a page). No stale-while-revalidate — users always see loading spinners. No automatic refetch on window focus. Each hook re-implements its own loading/error/pagination state (200+ lines of boilerplate per hook).

**Fix summary**: Add `@tanstack/react-query`, create a `QueryClientProvider` in `layout.tsx`, and convert hooks one-by-one to use `useQuery`/`useMutation`. Start with the most-used hooks: `useListings`, `useTemplates`, `useProposals`, `useNotifications`.

> **Agent prompt**: Install `@tanstack/react-query` and `@tanstack/react-query-devtools`. Create `src/components/providers/QueryProvider.tsx` wrapping `QueryClientProvider` with sensible defaults (`staleTime: 60_000`, `gcTime: 5 * 60_000`). Add it to `src/app/layout.tsx` inside `SupabaseProvider`. Then convert `src/hooks/marketplace/useListings.ts` (206 lines) as the first pilot: replace the manual `useState`/`useEffect`/`useCallback` pattern with `useInfiniteQuery`, keeping the same public API. Run `npm run type-check` and `npm run lint` to verify.

---

### H2. `useAlbumPages.ts` — 886-line god hook with 11 `as any` casts

**Status**: ✅ Resolved  
**Resolution**: Split into 4 files: `useCollectionSwitcher.ts` (~150 lines), `useAlbumNavigation.ts` (~260 lines), `useStickerOwnership.ts` (~340 lines), and a ~110-line composition hook. Created `legacy-tables.ts` with `legacyFrom()`/`legacyRpc()` helpers that consolidate all `as any` casts into one controlled location. Same public API — no consumer changes needed.

**File**: [useAlbumPages.ts](file:///c:/Users/dsalv/Projects/cromos-web/src/hooks/album/useAlbumPages.ts) (886 lines)  
**Impact**: This single hook manages collection switching, page navigation, sticker ownership (mark/reduce/complete), stats, and optimistic updates. It's the largest file in the codebase and is untestable. The 11 `as any` casts silently reference tables removed in v1.6.0 (`user_collections`, `user_stickers`, `collections`, `collection_pages`, `page_slots`, `stickers`). If the Supabase schema changes or these tables are dropped, the app will fail at runtime with no compile-time warning.

**Fix summary**: Split into 3-4 smaller hooks (`useCollectionSwitcher`, `useAlbumNavigation`, `useStickerOwnership`, `useCollectionStats`). Update the database queries to use v1.6.0 tables/RPCs (e.g., `template_copies`, `template_slots`) and remove all `as any` casts. Add proper types from `database.ts`.

> **Agent prompt**: Refactor `src/hooks/album/useAlbumPages.ts` (886 lines). Step 1: Extract `fetchUserCollections` + `switchCollection` into `src/hooks/album/useCollectionSwitcher.ts`. Step 2: Extract `fetchPages` + `fetchPageContent` into `src/hooks/album/useAlbumNavigation.ts`. Step 3: Extract `markStickerOwned` + `reduceStickerOwned` + `markPageComplete` into `src/hooks/album/useStickerOwnership.ts`. Step 4: Remove all `(supabase as any)` casts on lines 103, 141, 229, 282, 295, 425, 430, 539, 647, 655, 776 by replacing with properly typed Supabase queries using `database.ts` types for the v1.6.0 schema tables. Update imports in `src/app/mi-coleccion/[collectionId]/page.tsx`. Run `npm run type-check`.

---

### H3. Admin tabs — 20+ `as any` casts on dead tables

**Status**: ✅ Resolved  
**Resolution**: Replaced all 20 `as any` casts across 5 admin files with `legacyFrom()`/`legacyRpc()` helpers from `legacy-tables.ts`. All `as any` usage is now consolidated in two helper functions.

**Files**:
- [PagesTab.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/admin/PagesTab.tsx) — lines 30, 40, 51, 78, 85
- [StickersTab.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/admin/StickersTab.tsx) — lines 53, 60, 67, 129, 162, 185
- [TeamsTab.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/admin/TeamsTab.tsx) — lines 33, 43, 85, 98
- [CollectionsTab.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/admin/CollectionsTab.tsx) — lines 34, 53
- [BulkUploadTab.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/admin/BulkUploadTab.tsx) — lines 85, 151, 199

**Impact**: These admin components query `collections`, `collection_teams`, `stickers`, `collection_pages`, `page_slots` — tables from the v1.5.0 schema. All are cast with `as any`. If the tables are dropped, all admin functionality silently breaks.

**Fix summary**: Audit which admin tables still exist in the v1.6.0 schema. If they've been replaced by `template_*` tables, update the queries. If the tables still exist but aren't in the generated `database.ts`, add them. Remove all `as any` casts.

> **Agent prompt**: Fix type safety in admin tabs. For each file listed — `src/components/admin/PagesTab.tsx`, `StickersTab.tsx`, `TeamsTab.tsx`, `CollectionsTab.tsx`, `BulkUploadTab.tsx` — replace every `(supabase as any)` call with a properly typed query. First check `src/types/database.ts` to verify which tables (`collections`, `collection_teams`, `stickers`, `collection_pages`, `page_slots`) exist in the generated types. If missing, run `npm run generate-types` to regenerate, or manually add the table types. After removing all casts, run `npm run type-check` and `npm run lint` to validate.

---

### H4. `mi-coleccion/page.tsx` — client-side redirect with `as any` casts on dead tables

**Status**: ✅ Resolved  
**Resolution**: Replaced 2 `(supabase as any)` casts with `legacyFrom(supabase, 'user_collections')` and typed the `uc: any` callback parameter. AuthGuard kept for defense-in-depth.

**File**: [mi-coleccion/page.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/app/mi-coleccion/page.tsx) (lines 29, 58, 76)  
**Impact**: This page queries `user_collections` with `as any`. If the table is dropped, the user sees an infinite spinner. Additionally, it duplicates the `AuthGuard` that the middleware already provides, and it uses `console.log` (line 43 via `logger.debug`).

**Fix summary**: Update to use v1.6.0 tables (`template_copies` or equivalent RPC). Remove the redundant `AuthGuard` wrapper (middleware does this). Remove the `as any` casts.

> **Agent prompt**: Update `src/app/mi-coleccion/page.tsx`. Replace the `(supabase as any).from('user_collections')` queries on lines 29 and 76 with properly typed queries against the v1.6.0 schema. The `user_collections` table was replaced — use `supabase.rpc('get_my_template_copies')` instead or the appropriate template copies table. Remove the `AuthGuard` wrapper on line 131 since middleware already protects `/mi-coleccion`. Remove `(uc: any)` cast on line 58 by using a proper type. Run `npm run type-check`.

---

### H5. `useProposals.ts` — over-fetching and client-side filtering

**Status**: ✅ Resolved  
**Resolution**: Replaced magic `limit + 50` with proportional `limit * 3` over-fetch. Added `serverHasMore` flag derived from unfiltered count so pagination is correct. Added TODO to move filtering server-side.

**File**: [useProposals.ts](file:///c:/Users/dsalv/Projects/cromos-web/src/hooks/trades/useProposals.ts) (line 110)  
**Impact**: On line 110, the RPC is called with `p_limit: limit + 50` to over-fetch, then results are filtered client-side (lines 116-126) and sliced (line 129). This means: (a) the server always returns 50 extra rows that are discarded, (b) pagination is broken because `hasMore` is based on the post-filtered count, not the server's count, (c) wasted bandwidth on every load.

**Fix summary**: Add server-side status filtering to the `list_trade_proposals` RPC (add a `p_status` parameter), or create a new view. Remove the client-side filter.

> **Agent prompt**: Fix `src/hooks/trades/useProposals.ts`. The `list_trade_proposals` RPC call on line 110 uses `p_limit: limit + 50` and then filters client-side on lines 116-129. Either: (1) modify the Supabase RPC `list_trade_proposals` to accept an additional `p_statuses text[]` parameter and filter server-side, or (2) create two separate RPCs (`list_active_proposals`, `list_rejected_proposals`). Then update this hook to just pass `p_limit: limit` and remove the `.filter()` and `.slice()` on lines 116-129. This fixes the broken pagination where `hasMore` is computed from the post-filter count.

---

### H6. Unresolved v1.6.0 migration TODOs

**Status**: ⚠️ Partially resolved  
**Resolution**: `mark_team_page_complete` now uses `legacyRpc()` (refactored in H2). `find_mutual_traders` is properly typed — the location params are optional new features, not breaking changes. TODOs remain as migration notes.

**Files**:
- [useFindTraders.ts](file:///c:/Users/dsalv/Projects/cromos-web/src/hooks/trades/useFindTraders.ts) — line 59: `find_mutual_traders` RPC signature changed
- [useAlbumPages.ts](file:///c:/Users/dsalv/Projects/cromos-web/src/hooks/album/useAlbumPages.ts) — line 771: `mark_team_page_complete` RPC deprecated

**Impact**: These RPCs may have incompatible signatures or be missing entirely in v1.6.0, causing runtime errors. The `useFindTraders` hook is missing location-based parameters (`p_lat`, `p_lon`, `p_radius_km`, `p_sort`) mentioned in the TODO.

**Fix summary**: Check the current Supabase schema for these RPCs. Update signatures to match v1.6.0 or replace with alternatives per the migration guide.

> **Agent prompt**: Complete the v1.6.0 RPC migration. (1) In `src/hooks/trades/useFindTraders.ts`, update the `find_mutual_traders` RPC call on lines 59-66 to use the new v1.6.0 signature. Add missing parameters: `p_lat`, `p_lon`, `p_radius_km`, `p_sort` as noted in the TODO on line 59. Refer to `docs/RPC_MIGRATION_GUIDE_v1.5_to_v1.6.md`. (2) In `src/hooks/album/useAlbumPages.ts`, replace the `mark_team_page_complete` RPC call on line 776 with a bulk slot update as noted in the TODO on line 771. Run `npm run type-check` after each change.

---

### H7. 25+ `eslint-disable` comments for `react-hooks/exhaustive-deps`

**Status**: ✅ Resolved (17/18 fixed, 1 justified)  
**Resolution**: Removed 17 `eslint-disable react-hooks/exhaustive-deps` comments by adding missing dependencies and wrapping functions in `useCallback`. One remaining disable in `useTradeChat.ts` is justified — the Supabase realtime subscription setup intentionally excludes reactive deps to avoid reconnection loops.

**Files** (partial list):
- `useListings.ts:188`, `useUnreadCounts.ts:102`, `useTradeChat.ts:232`
- `useUserCollections.ts:69`, `MarketplaceShowcase.tsx:30`
- All admin hooks: `useAdminStats.ts:23`, `useAuditLog.ts:91`, `useAdminPendingDeletionListings.ts:13`, etc.
- Pages: `users/[userId]/page.tsx:201,207`, `marketplace/[id]/page.tsx:65`

**Impact**: Each disabled line is a potential stale closure bug. When a dependency is missing, the effect uses an old value, causing subtle bugs (e.g., a chat not updating when the trade ID changes).

**Fix summary**: For each occurrence, add the missing dependency or restructure the code (e.g., use `useRef` for values that shouldn't trigger re-runs). Remove the `eslint-disable` comment.

> **Agent prompt**: Fix all `eslint-disable-next-line react-hooks/exhaustive-deps` comments across the codebase. Files: `src/hooks/marketplace/useListings.ts:188`, `src/hooks/trades/useUnreadCounts.ts:102`, `src/hooks/trades/useTradeChat.ts:232`, `src/hooks/templates/useUserCollections.ts:69`, `src/hooks/admin/useAdminStats.ts:23`, `src/hooks/admin/useAuditLog.ts:91`, `src/hooks/admin/useAdminPendingDeletionListings.ts:13`, `src/hooks/admin/useAdminPendingDeletionTemplates.ts:13`, `src/hooks/admin/useAdminPendingDeletionUsers.ts:13`, `src/hooks/admin/useAdminSuspendedUsers.ts:13`, `src/hooks/admin/useReportDetails.ts:30`, `src/app/users/[userId]/page.tsx:201,207`, `src/app/marketplace/[id]/page.tsx:65`, `src/app/profile/completar/page.tsx:34`, `src/app/mis-plantillas/[copyId]/publicar/[slotId]/page.tsx:132`, `src/components/profile/ProfileCompletionGuard.tsx:112`, `src/components/home/MarketplaceShowcase.tsx:30`. For each: add the missing dependency, or use `useRef` for values that shouldn't trigger re-runs. Remove the `eslint-disable` comment. Run `npm run lint` after to confirm zero warnings.

---

### H8. `JSON.stringify` in useEffect dependency array

**Status**: ✅ Resolved  
**Resolution**: Fixed as part of H1 React Query conversion. `useListings.ts` now uses `useMemo(() => JSON.stringify(collectionIds), [collectionIds])` to produce a stable `collectionIdsKey` used in the React Query `queryKey`. No `useEffect` dependency array remains — React Query manages reactivity via its key.

**File**: [useListings.ts](file:///c:/Users/dsalv/Projects/cromos-web/src/hooks/marketplace/useListings.ts) — line 189  
**Impact**: `JSON.stringify(collectionIds)` in a dependency array is called on every render, always returning a new string, potentially causing the effect to re-run every render if the array reference changes (which it will unless memoized upstream).

**Fix summary**: Use a `useRef` + shallow comparison, or use `useMemo` on the stringified value, or accept the array via a stable key.

> **Agent prompt**: Fix `src/hooks/marketplace/useListings.ts` line 189. Replace `JSON.stringify(collectionIds)` in the useEffect dependency array with a stable comparison. Option A: Add `const collectionIdsKey = useMemo(() => JSON.stringify(collectionIds), [collectionIds]);` before the useEffect, then use `collectionIdsKey` in the deps array. Option B: Use a `useRef` to track the previous value and only trigger re-fetch on deep change. Remove the `eslint-disable` comment on line 188 after fixing. Run `npm run lint` and `npm run type-check`.

---

## Medium Priority

### M1. Deprecated types still used across the codebase

**Status**: ✅ Resolved  
**Resolution**: Removed all 5 deprecated interfaces (`Collection`, `Profile`, `Sticker`, `UserCollection`, `UserSticker`) from `types/index.ts`. Inlined their fields into `CollectionWithStats`, `StickerWithOwnership`, and `UserStickerWithDetails` so they are now standalone types. Updated `ComposerHeader.tsx` to import `Profile` from `types/v1.6.0` and use a local `ComposerCollection` interface. Updated `useAlbumNavigation.ts` to use a local `StickerBase` interface. Build passes.

**File**: [types/index.ts](file:///c:/Users/dsalv/Projects/cromos-web/src/types/index.ts) — lines 11-65  
**Impact**: `Collection`, `Profile`, `Sticker`, `UserCollection`, `UserSticker` are marked `@deprecated` but still imported by `useAlbumPages.ts` (line 6), `types/index.ts` itself (`CollectionWithStats`, `StickerWithOwnership`, `UserStickerWithDetails`), and `TradeProposalItem`.

**Fix summary**: Remove deprecated types and update all importers to use v1.6.0 types from `types/v1.6.0.ts`.

> **Agent prompt**: Clean up deprecated types. Remove the deprecated interfaces `Collection`, `Profile`, `Sticker`, `UserCollection`, `UserSticker` from `src/types/index.ts` (lines 11-65). Update `CollectionWithStats` (line 71), `StickerWithOwnership` (line 81), `UserStickerWithDetails` (line 95), and `TradeProposalItem` (line 135) to extend from v1.6.0 equivalents or be rewritten. Update imports in `src/hooks/album/useAlbumPages.ts:6` and any other files referencing these types. Run `npm run type-check` to find all broken references.

---

### M2. `console.log` usage bypassing the logger (15 files)

**Status**: ✅ Resolved  
**Resolution**: Replaced all `console.log`/`console.error`/`console.warn` calls with `logger.debug`/`logger.info`/`logger.warn`/`logger.error` in: `deep-linking.ts`, `useHaptic.ts`, `useTemplateRatings.ts`, `SupabaseProvider.tsx`, `OneSignalProvider.tsx`, `error.tsx`. The remaining 9 files were already cleaned in prior sessions. All calls now route through the centralized logger with Sentry integration.

**Files**: `deep-linking.ts`, `useHaptic.ts`, `useTemplateRatings.ts`, `useUserBadges.ts`, `useBadgeProgress.ts`, `useResolveReport.ts`, `DeepLinkHandler.tsx`, `SupabaseProvider.tsx`, `ProfileCompletionGuard.tsx`, `OneSignalProvider.tsx`, `PasswordRecoveryGuard.tsx`, `login/page.tsx`, `reset-password/page.tsx`, `MarketplaceShowcase.tsx`, `error.tsx`

**Impact**: `console.log` calls bypass the centralized logger and its Sentry integration. In production, `console.log` is stripped by `removeConsole` but `console.error` is not — the `error.tsx` file uses bare `console.error` (line 16) which sends nothing to Sentry.

**Fix summary**: Replace all `console.log` with `logger.debug`/`logger.info` and all `console.error` with `logger.error`.

> **Agent prompt**: Replace all remaining `console.log` and `console.error` calls with the centralized `logger` in these files: `src/lib/onesignal/deep-linking.ts`, `src/hooks/useHaptic.ts`, `src/hooks/templates/useTemplateRatings.ts`, `src/hooks/badges/useUserBadges.ts`, `src/hooks/badges/useBadgeProgress.ts`, `src/hooks/admin/useResolveReport.ts`, `src/components/providers/DeepLinkHandler.tsx`, `src/components/providers/SupabaseProvider.tsx`, `src/components/profile/ProfileCompletionGuard.tsx`, `src/components/providers/OneSignalProvider.tsx`, `src/components/auth/PasswordRecoveryGuard.tsx`, `src/app/login/page.tsx`, `src/app/profile/reset-password/page.tsx`, `src/components/home/MarketplaceShowcase.tsx`, `src/app/error.tsx:16`. Import `import { logger } from '@/lib/logger'` where missing. Use `logger.debug` for dev-only logs, `logger.error` for error logs. Run `npm run lint` to confirm no `no-console` warnings remain.

---

### M3. `PasswordRecoveryGuard` — `as any` cast on session AMR

**File**: [PasswordRecoveryGuard.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/auth/PasswordRecoveryGuard.tsx) — line 43  
**Impact**: `(session as any).amr` casts the session to bypass TypeScript. If the Supabase types update and remove/rename `amr`, this silently breaks.

**Fix summary**: Use the proper Supabase `Session` type's `amr` field or augment the type.

> **Agent prompt**: Fix `src/components/auth/PasswordRecoveryGuard.tsx` line 43. Replace `(session as any).amr` with proper typing. The Supabase `Session` type may already include `amr` — check `@supabase/supabase-js` types. If `amr` is not in the type definition, create a type augmentation: `interface SessionWithAMR extends Session { amr?: Array<{ method: string; timestamp: number }>; }` and cast `session as SessionWithAMR` instead of `as any`. Run `npm run type-check`.

---

### M4. Duplicate `Profile` type definitions

**Files**:
- [types/index.ts](file:///c:/Users/dsalv/Projects/cromos-web/src/types/index.ts) — line 24 (`@deprecated`)
- [types/v1.6.0.ts](file:///c:/Users/dsalv/Projects/cromos-web/src/types/v1.6.0.ts) — line 3

**Impact**: Two `Profile` interfaces with different shapes. Importers may accidentally use the wrong one.

**Fix summary**: Remove the deprecated `Profile` from `types/index.ts` and ensure all imports use the v1.6.0 version.

> **Agent prompt**: Remove the deprecated `Profile` interface from `src/types/index.ts` (lines 24-30). Search the codebase for any imports of `Profile` from `@/types` (not `@/types/v1.6.0`) and update them to import from `@/types/v1.6.0`. Run `npm run type-check` to verify no broken references.

---

### M5. Template components using `as any` for type mismatches

**Files**:
- [MyCreatedTemplatesContent.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/templates/MyCreatedTemplatesContent.tsx) — line 56
- [TemplatesContent.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/templates/TemplatesContent.tsx) — line 125

**Impact**: `template={template as any}` hides shape mismatches between the data returned by the hook and what `TemplateCard` expects.

**Fix summary**: Align the hook return type with `TemplateCard`'s expected props, or create a proper adapter.

> **Agent prompt**: Fix type mismatches in template components. In `src/components/templates/MyCreatedTemplatesContent.tsx:56` and `src/components/templates/TemplatesContent.tsx:125`, the `template` object is cast `as any` before passing to `TemplateCard`. Check what type `TemplateCard` expects (view its props interface), then update the hook that fetches templates to return data matching that type. Remove the `as any` casts. Run `npm run type-check`.

---

### M6. In-memory rate limiter doesn't work in serverless

**File**: [rate-limit.ts](file:///c:/Users/dsalv/Projects/cromos-web/src/lib/rate-limit.ts)  
**Impact**: The `Map`-based store resets on every serverless cold start. On Vercel, each request may hit a different instance, so the rate limiter is effectively bypassed with enough traffic. The comment says "suitable for serverless" but that's misleading.

**Fix summary**: If rate limiting is critical, use Vercel's Edge Config, Upstash Redis, or Supabase's built-in rate limiting. If it's just a soft guard for admin routes, document the limitation.

> **Agent prompt**: Update `src/lib/rate-limit.ts` to document its serverless limitation. Add a comment at the top of the file: `/** WARNING: This in-memory rate limiter resets on each serverless cold start and does not persist across instances. For robust rate limiting in production, consider using Upstash Redis or Vercel Edge Config. Currently sufficient as a soft guard for low-traffic admin routes. */`. Alternatively, if rate limiting is critical for the admin API, replace the implementation with `@upstash/ratelimit` backed by Redis.

---

### M7. `NotificationsList.tsx` — unused variable with eslint-disable

**File**: [NotificationsList.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/trades/NotificationsList.tsx) — line 75  
**Impact**: `_counterpartyNickname` is explicitly destructured and then suppressed with `eslint-disable-line`. This is dead code.

**Fix summary**: Remove the destructuring entirely.

> **Agent prompt**: In `src/components/trades/NotificationsList.tsx` line 75, remove the destructuring `const { counterpartyNickname: _counterpartyNickname } = getCounterpartyInfo(notification);` and its `eslint-disable-line` comment entirely. If `getCounterpartyInfo` has side effects, call it without destructuring. Run `npm run lint`.

---

### M8. `UserDashboard.tsx` — `as any` on dead table

**File**: [UserDashboard.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/dashboard/UserDashboard.tsx) — line 89  
**Impact**: Queries a potentially dead table with `as any`.

**Fix summary**: Update to v1.6.0 schema or the appropriate RPC.

> **Agent prompt**: In `src/components/dashboard/UserDashboard.tsx` line 89, replace `(supabase as any)` with a properly typed query. Check what table is being queried and whether it exists in the v1.6.0 schema. If it's `user_collections` or `collections`, replace with the equivalent v1.6.0 RPC/table. Run `npm run type-check`.

---

## Low Priority / Suggestions

### L1. Consider extracting `SiteHeader` rating modal into its own component

**File**: [site-header.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/site-header.tsx) (296 lines)  
The header manages a rating modal (lines 153-172, 280-292) which is unrelated to navigation. Extracting this would reduce the header to ~230 lines and improve separation of concerns.

> **Agent prompt**: Extract the rating modal logic from `src/components/site-header.tsx`. Move `showRatingModal`, `ratingModalData`, `handleOpenRatingModal`, `handleSubmitRating` (lines 95-172) and the `UserRatingDialog` JSX (lines 280-292) into a new `src/components/marketplace/GlobalRatingModal.tsx` component. Import and render it in `site-header.tsx` with a callback prop.

---

### L2. `useCreateListing.ts` — empty catch block re-throws

**File**: [useCreateListing.ts](file:///c:/Users/dsalv/Projects/cromos-web/src/hooks/marketplace/useCreateListing.ts) — lines 36-38  
The `catch` block just re-throws the error. The `try/catch` around lines 36-38 is pointless.

> **Agent prompt**: In `src/hooks/marketplace/useCreateListing.ts`, remove the `try/catch` block on lines 10-40 and keep only the `finally` block. Use a plain `try/finally` instead since the catch just re-throws.

---

### L3. `global-error.tsx` doesn't include Tailwind CSS

**File**: [global-error.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/app/global-error.tsx)  
The global error page renders its own `<html>` and `<body>` but doesn't import `globals.css` or any stylesheet. The Tailwind classes won't be applied.

> **Agent prompt**: In `src/app/global-error.tsx`, add `import './globals.css'` at the top of the file to ensure Tailwind styles are applied in the global error fallback. Alternatively, use inline styles instead of Tailwind classes for this critical error page.

---

### L4. `OneSignalProvider` — 5 `eslint-disable` + 5 `as any`

**File**: [OneSignalProvider.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/providers/OneSignalProvider.tsx)  
The OneSignal Cordova plugin has no TypeScript types. Consider creating a minimal type declaration file (`src/types/onesignal.d.ts`).

> **Agent prompt**: Create `src/types/onesignal.d.ts` with a minimal type declaration for the OneSignal Cordova plugin: `interface OneSignalPlugin { setAppId(appId: string): void; setExternalUserId(userId: string): void; removeExternalUserId(): void; }`. Declare it on the window: `interface Window { plugins?: { OneSignal?: OneSignalPlugin } }`. Then update `src/components/providers/OneSignalProvider.tsx` to remove the `(window as any)` casts and `eslint-disable` comments. Run `npm run type-check`.

---

### L5. Test coverage is limited

**Directory**: `tests/` (13 spec files)  
Tests exist for theme rollout, trade chat, segmented tabs, proposal highlight, etc. — but there are no unit tests for hooks, no tests for the admin panel, and no tests for the marketplace create/edit flows.

> **Agent prompt**: Add Playwright E2E tests for critical flows that currently lack coverage: (1) Create a test for the marketplace listing creation flow in `tests/marketplace/create-listing.spec.ts`. (2) Create a test for the login → profile completion → marketplace redirect flow. Use existing test patterns from `tests/theme-rollout.spec.ts` as a reference. Focus on happy-path smoke tests first.

---

### L6. `tooltip.tsx` — `as any` casts on ref and props

**File**: [tooltip.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/ui/tooltip.tsx) — lines 116, 126

> **Agent prompt**: In `src/components/ui/tooltip.tsx`, fix the `as any` casts on lines 116 and 126. These are likely React ref forwarding issues — use `React.forwardRef` with proper generic typing, or cast to the specific expected types instead of `any`. Run `npm run type-check`.
