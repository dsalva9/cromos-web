# Code Review Pass 3 — cromos-web

**Date**: 2026-02-11  
**Version**: 1.6.0  
**Stack**: Next.js 16 · React 19 · Supabase · Capacitor · TypeScript 5 · Tailwind 4

---

## Overall Assessment

The codebase has **improved substantially** since the first review. The previous pass resolved the most acute issues: the 886-line god hook was split into focused modules, `as any` was reduced from 40+ to 7, deprecated types were removed, `eslint-disable` dropped from 25+ to 16, and React Query infrastructure was established with a working pilot. The ESLint config now enforces `no-explicit-any`, `exhaustive-deps`, and `no-unused-vars` as errors. The middleware/proxy security layer is clean and well-structured.

**However**, several previous resolutions were **overstated**, and one systematic issue was missed entirely:

| Metric | Pass 1 | Pass 2 (Claimed) | Pass 3 (Actual) |
|---|---|---|---|
| **`as any` casts** | 40+ | ~2 (in `legacy-tables.ts`) | **7** (2 legacy-tables + 4 OneSignal + 1 publicar page) |
| **`eslint-disable` comments** | 25+ | ~2 | **16** |
| **`console.log` calls** | 15 files | ✅ Resolved | **16 calls still present** |
| **`console.error` calls (bypassing logger)** | Not tracked | Not tracked | **68+ calls** |
| **Hooks using React Query** | 0/40 | 1/40 (pilot) | **1/40** |
| **Migration TODOs** | 4 | ~2 remaining | **4 remaining** |
| **Test spec files** | 13 | 13 | **8 spec files** (5 are PDFs/images/assets) |

---

## Rating: **6.5 / 10**

### Strengths (+)
- **Architecture**: Clear separation — `app/`, `components/`, `hooks/`, `lib/`, `types/`. Easy to navigate.
- **Auth & Security**: Middleware-based route protection with proper Supabase SSR session refresh. Protected API routes return 401 JSON. Cookie handling follows the official pattern to the letter.
- **Error Handling**: `ErrorBoundary` + `error.tsx` + `global-error.tsx` + Sentry integration via centralized `logger`. Production console stripping via `next.config.ts` compiler option.
- **Type Safety Progress**: `legacy-tables.ts` consolidating all `as any` into two helper functions is a good pattern. Deprecated types removed. ESLint rules enforcing strictness.
- **React Query Foundation**: `QueryProvider` and `queryKeys.ts` are properly set up. The `useListings` pilot proves the pattern works.
- **UI/UX**: Accessible skip-to-content link, proper ARIA roles, dark mode support, responsive design.
- **Capacitor Integration**: Clean platform detection, OneSignal initialization for both web and native.

### Weaknesses (-)
- **Stalled React Query Migration**: 39/40 hooks still use manual `useState`/`useEffect`/`useCallback`. This is the single biggest quality issue — no caching, no deduplication, loading spinners on every navigation.
- **Logger Bypass**: 68+ `console.error` calls across `lib/supabase/` and `hooks/` bypass the centralized logger. These won't send errors to Sentry.
- **Incomplete Previous Resolutions**: Several issues marked "✅ Resolved" in the last review still show up in code (`console.log` in 7+ files, `as any` in OneSignal).
- **Low Test Coverage**: Only 8 Playwright spec files, no unit tests, no component tests.
- **Migration Debt**: 4 TODO markers for v1.6.0 migration remain open.

---

## New Issues Found

### N1. `console.error` calls bypass centralized logger (68+ occurrences)

**Severity**: Medium-High  
**Impact**: Errors logged with `console.error` in production are NOT stripped (the `removeConsole` config intentionally keeps `console.error`), but they also don't go through the `logger` which integrates with Sentry. This means **production errors in these 68+ locations are visible in the browser console but invisible in Sentry**.

**Key Affected Files**:
| File | Count |
|---|---|
| `lib/supabase/badges.ts` | 7 |
| `lib/supabase/notifications.ts` | 6 |
| `lib/supabase/listings/transactions.ts` | 5 |
| `lib/supabase/listings/chat.ts` | 4 |
| `lib/supabase/notification-preferences.ts` | 3 |
| `hooks/admin/useEmailForwarding.ts` | 4 |
| `hooks/admin/useAdminPermanentDelete.ts` | 3 |
| `hooks/social/useIgnore.ts` | 5 |
| ... and 30+ more files | |

**Fix**: Replace all `console.error(...)` with `logger.error(...)`. Update the ESLint `no-console` rule to disallow `console.error` as well:

```diff
-'no-console': ['warn', { allow: ['warn', 'error'] }],
+'no-console': ['error'],
```

Then fix all resulting lint errors by migrating to `logger.*`. The `logger.ts` already wraps `console.error` internally.

> **Agent prompt**: Migrate all `console.error` calls to the centralized `logger.error` from `@/lib/logger`. This is a systematic find-and-replace across the entire `src/` directory.
>
> **Step 1** — Tighten ESLint: In `eslint.config.mjs` (root), change the `no-console` rule on line 28 from `['warn', { allow: ['warn', 'error'] }]` to `['error']`. This will make ALL `console.*` calls (including `console.error` and `console.warn`) a lint error, except in `src/lib/logger.ts` which already has `'no-console': 'off'`.
>
> **Step 2** — Run `npm run lint` to see every violation. There will be 68+ `console.error` hits and some `console.warn` hits.
>
> **Step 3** — For each file, add `import { logger } from '@/lib/logger';` if not already imported, then replace:
> - `console.error('...',` → `logger.error('...',`
> - `console.warn('...',` → `logger.warn('...',`
> - `console.log('...',` → `logger.debug('...',` (or `logger.info` for important informational messages)
>
> Key files (in priority order, by count):
> - `src/lib/supabase/badges.ts` (7 `console.error`)
> - `src/lib/supabase/notifications.ts` (6 `console.error`)
> - `src/lib/supabase/listings/transactions.ts` (5 `console.error`)
> - `src/lib/supabase/listings/chat.ts` (4 `console.error`)
> - `src/hooks/social/useIgnore.ts` (5 `console.error`)
> - `src/hooks/admin/useEmailForwarding.ts` (4 `console.error`)
> - `src/hooks/admin/useAdminPermanentDelete.ts` (3 `console.error`)
> - `src/lib/supabase/notification-preferences.ts` (3 `console.error`)
> - `src/hooks/admin/useSuspendUser.ts` (2 `console.error`)
> - `src/hooks/admin/useResolveReport.ts` (2 `console.error` + 2 `console.log`)
> - `src/hooks/admin/useAdminTemplates.ts`, `useAdminSuspendedUsers.ts`, `useAdminPendingDeletionUsers.ts`, `useAdminPendingDeletionTemplates.ts`, `useAdminPendingDeletionListings.ts` (1 each)
> - `src/hooks/templates/useRestoreTemplate.ts`, `useSlotListings.ts` (1 each)
> - `src/hooks/social/useCurrentUserProfile.ts` (1)
> - `src/components/native/NativeRedirectHandler.tsx` line 65
> - `src/app/mis-plantillas/[copyId]/publicar/[slotId]/page.tsx` lines 57, 78, 92, 122
> - Plus ~20 more files in `src/lib/supabase/`, `src/hooks/`, and `src/components/`
>
> **Do NOT modify** `src/lib/logger.ts` — it legitimately uses `console.error` / `console.warn` / `console.debug` / `console.info` internally and has `'no-console': 'off'` in the ESLint config.
>
> **Step 4** — Run `npm run lint` and confirm zero `no-console` violations remain.
> **Step 5** — Run `npm run type-check` to confirm no TypeScript errors.
> **Step 6** — Run `npm run build` as a final sanity check.

---

### N2. `publicar/[slotId]/page.tsx` — `as any`, `console.error`, missing logger, implicit `any` on callback

**Severity**: Medium  
**File**: [page.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/app/mis-plantillas/%5BcopyId%5D/publicar/%5BslotId%5D/page.tsx)

**Issues**:
- Line 83: `(templateDetails as any)?.template?.item_schema` — unchecked `as any` cast
- Line 97: `(s: any)` — implicit any on callback parameter
- Lines 57, 78, 92, 122: `console.error` calls (not using logger)
- Line 3: Imports `useRouter` from `next/navigation` instead of `@/hooks/use-router` (the codebase has a custom router wrapper to handle Next.js 16 transition bugs)

> **Agent prompt**: Fix type safety and logging in `src/app/mis-plantillas/[copyId]/publicar/[slotId]/page.tsx`.
>
> 1. **Line 3**: Change `import { useParams, useRouter } from 'next/navigation';` to `import { useParams } from 'next/navigation';` and add `import { useRouter } from '@/hooks/use-router';`. The custom `use-router` hook handles Next.js 16 transition bugs that cause click blocking.
> 2. **Line 83**: `(templateDetails as any)?.template?.item_schema` — The `get_template_details` RPC returns a structured object. Create a local interface for the RPC response shape: `interface TemplateDetailsResponse { template?: { item_schema?: Array<{ name: string; type: string; label: string; required: boolean; }> } }`. Then cast: `(templateDetails as TemplateDetailsResponse)?.template?.item_schema || []`. Remove the `as any`.
> 3. **Line 97**: `(s: any)` — Replace with a typed parameter. The `get_template_progress` RPC returns `SlotData`-shaped rows. Use: `(s: { slot_id: string | number })` or define a type alias for the RPC response row.
> 4. **Lines 57, 78, 92, 122**: Replace all `console.error(...)` with `logger.error(...)`. Add `import { logger } from '@/lib/logger';` at the top.
> 5. Run `npm run type-check` and `npm run lint` to verify.

---

### N3. `NativeRedirectHandler.tsx` — 2 unjustified `eslint-disable` for `exhaustive-deps` ✅ Resolved

**Severity**: Low-Medium  
**File**: [NativeRedirectHandler.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/native/NativeRedirectHandler.tsx)

**Resolution**: Added justification comments to both `eslint-disable` directives explaining the Next.js 16 router transition bug. Added `isAuthenticated` to the second useEffect's dependency array so redirect logic re-runs on auth state changes. Replaced `console.error` on line 65 with `logger.error` and added `import { logger } from '@/lib/logger'`.

---

### N4. `ProfileCompletionGuard.tsx` — unjustified `eslint-disable` for `exhaustive-deps` ✅ Resolved

**Severity**: Low-Medium  
**File**: [ProfileCompletionGuard.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/profile/ProfileCompletionGuard.tsx)

**Resolution**: Removed the unused `router` variable and `use-router` import entirely — the component uses `window.location.href` for redirects, so `router` was dead code. This eliminated the need for the `eslint-disable` directive. Added an explanatory comment about the Next.js 16 transition bug workaround.

---

### N5. `PasswordRecoveryGuard.tsx` — unjustified `eslint-disable` for `exhaustive-deps` ✅ Resolved

**Severity**: Low  
**File**: [PasswordRecoveryGuard.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/auth/PasswordRecoveryGuard.tsx)

**Resolution**: Removed the unused `router` variable and `use-router` import entirely — the component uses `window.location.href` for redirects, so `router` was dead code. This eliminated the need for the `eslint-disable` directive.

---

### N6. `AuthGuard.tsx` — `eslint-disable` with partial justification, `window.location.href` for redirect ✅ Resolved

**Severity**: Low  
**File**: [AuthGuard.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/AuthGuard.tsx)

**Resolution**: Removed the unused `router` variable and `use-router` import entirely — the component uses `window.location.href` for redirects, so `router` was dead code. This eliminated the need for the `eslint-disable` directive. Added a `TODO` comment to track removing the `window.location.href` workaround when Next.js fixes the transition state bug.

---

### N7. Provider nesting depth in `layout.tsx` — 8 levels deep ✅ Resolved

**Severity**: Low (cosmetic / maintainability)  
**File**: [layout.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/app/layout.tsx)

**Resolution**: Created `src/lib/composeProviders.tsx` utility that accepts an array of `[Provider, props?]` tuples and composes them via `reduceRight`. Refactored `layout.tsx` to use `const Providers = composeProviders([...])` replacing 7-level deep nesting with a flat, readable array. Also removed unused `next/script` import. No behavior changes — readability improvement only.

---

## Previously Reported Issues — Status Corrections

### M2. `console.log` usage — Marked ✅ but NOT fully resolved

**Actual state**: 16 `console.log` calls remain in:
- `hooks/badges/useUserBadges.ts` (line 59)
- `hooks/badges/useBadgeProgress.ts` (line 59)
- `hooks/admin/useResolveReport.ts` (lines 22, 39)
- `components/providers/DeepLinkHandler.tsx` (lines 20, 33)
- `app/profile/reset-password/page.tsx` (lines 34, 49, 61)
- `components/home/MarketplaceShowcase.tsx` (lines 17, 26)
- `app/login/page.tsx` (lines 64, 68, 77, 86, 132)

These are `console.log` calls, not `logger.debug`. The ESLint `no-console` rule is set to `warn` and allows `error`/`warn`, so these produce warnings but don't block builds.

> **Agent prompt**: Replace all remaining `console.log` calls with `logger.debug` or `logger.info` from `@/lib/logger`. There are 16 occurrences across 7 files:
>
> 1. `src/hooks/badges/useUserBadges.ts` line 59: `console.log('New badge earned:', payload)` → `logger.debug('New badge earned:', payload)`. Add `import { logger } from '@/lib/logger';`.
> 2. `src/hooks/badges/useBadgeProgress.ts` line 59: `console.log('Badge progress updated:', payload)` → `logger.debug('Badge progress updated:', payload)`. Add `import { logger } from '@/lib/logger';`.
> 3. `src/hooks/admin/useResolveReport.ts` lines 22 and 39: Replace both `console.log` calls with `logger.debug`. Check if logger is already imported.
> 4. `src/components/providers/DeepLinkHandler.tsx` lines 20 and 33: `console.log('Deep link received:', ...)` and `console.log('Navigating to:', ...)` → `logger.debug(...)`. Add `import { logger } from '@/lib/logger';`.
> 5. `src/app/profile/reset-password/page.tsx` lines 34, 49, 61: Three `console.log` calls with `[ResetPassword]` prefix → `logger.debug(...)`. Add `import { logger } from '@/lib/logger';`.
> 6. `src/components/home/MarketplaceShowcase.tsx` lines 17 and 26: Two `console.log` calls → `logger.debug(...)`. Check if logger is already imported.
> 7. `src/app/login/page.tsx` lines 64, 68, 77, 86, 132: Five `console.log` calls related to login flow → `logger.debug(...)`. Add `import { logger } from '@/lib/logger';`.
>
> After all changes, run `npm run lint` — there should be zero `no-console` warnings for `console.log`. Run `npm run type-check` to confirm.

---

### L4. `OneSignalProvider` — Marked ✅ but still has 4 `as any` + 3 `eslint-disable`

**Actual state**:
- Lines 51, 52, 56, 60: `(window as any).plugins` — 4 casts remain
- Lines 14, 16, 55: `eslint-disable @typescript-eslint/no-explicit-any` — 3 disables remain
- The global type declarations on lines 14-17 use `any` for both `OneSignalDeferred` and `plugins`

The previous review's recommended fix (create `src/types/onesignal.d.ts`) was never implemented.

> **Agent prompt**: Create proper type declarations for the OneSignal Cordova plugin to eliminate all `as any` casts and `eslint-disable` comments from `src/components/providers/OneSignalProvider.tsx`.
>
> **Step 1**: Create `src/types/onesignal.d.ts` with the following content:
> ```typescript
> /**
>  * Type declarations for OneSignal Cordova/Capacitor plugin.
>  * Used by OneSignalProvider.tsx for native (Capacitor) integration.
>  */
>
> interface OneSignalPushSubscription {
>   id: string | null;
>   getIdAsync: (callback: (id: string | null) => void) => void;
>   addEventListener: (event: 'change', callback: (change: { current: { id: string } }) => void) => void;
> }
>
> interface OneSignalNotifications {
>   addEventListener: (event: 'click', callback: (event: { notification: { additionalData?: unknown } }) => void) => void;
>   requestPermission: (fallbackToSettings: boolean) => Promise<boolean>;
> }
>
> interface OneSignalUser {
>   pushSubscription: OneSignalPushSubscription;
>   PushSubscription: {
>     id: string | null;
>     addEventListener: (event: string, callback: (change: { current: { id: string } }) => void) => void;
>   };
> }
>
> interface OneSignalPlugin {
>   initialize: (appId: string) => void;
>   login: (userId: string) => void;
>   User: OneSignalUser;
>   Notifications: OneSignalNotifications;
> }
>
> interface OneSignalWebSDK {
>   init: (config: unknown) => Promise<void>;
>   login: (userId: string) => Promise<void>;
>   User: OneSignalUser;
>   Notifications: {
>     addEventListener: (event: string, callback: (event: { data?: unknown }) => void) => void;
>   };
> }
>
> interface OneSignalPlugins {
>   OneSignal?: OneSignalPlugin;
>   [key: string]: unknown;
> }
>
> declare global {
>   interface Window {
>     OneSignalDeferred?: Array<(oneSignal: OneSignalWebSDK) => Promise<void>>;
>     plugins?: OneSignalPlugins;
>   }
> }
>
> export {};
> ```
>
> **Step 2**: In `src/components/providers/OneSignalProvider.tsx`:
> - Remove the `declare global` block (lines 12-19) — it's now in `onesignal.d.ts`.
> - Remove the 3 `eslint-disable-next-line @typescript-eslint/no-explicit-any` comments (lines 14, 16, 55).
> - Replace all 4 `(window as any).plugins` casts (lines 51, 52, 56, 60) with just `window.plugins`. TypeScript will now know the shape.
> - Update line 56: `const OneSignal = window.plugins?.OneSignal;` (no cast needed).
> - Update the `initializeWeb` function's inline type annotation for `OneSignalDeferred.push(async (OneSignal: {...})` (lines 190-202) — simplify to `async (OneSignal: OneSignalWebSDK)` since the type is now declared globally.
>
> **Step 3**: Add `"src/types/onesignal.d.ts"` to the `include` array in `tsconfig.json` if `src/types` is not already covered by a glob.
>
> Run `npm run type-check` and `npm run lint` to verify all `as any` and `eslint-disable` are gone.

---

### H1. React Query migration — 1/40 hooks complete (correctly reported but no further progress)

`useListings.ts` is the only hook using React Query. All other ~39 data-fetching hooks still use the manual `useState`/`useEffect`/`useCallback` pattern.

> **Agent prompt**: Continue the React Query migration by converting the 5 most impactful hooks. Use `src/hooks/marketplace/useListings.ts` as the reference implementation — it demonstrates the pattern: `useInfiniteQuery` with `QUERY_KEYS` from `src/lib/queryKeys.ts`, a `transformRow` function, memoized output, and the same public API surface.
>
> **General pattern** for each hook conversion:
> 1. Replace `useState` (for `data`, `loading`, `error`) + `useEffect` (for fetch) + `useCallback` (for refetch/loadMore) with `useQuery` (or `useInfiniteQuery` for paginated hooks).
> 2. Add a query key to `src/lib/queryKeys.ts` using the existing factory pattern.
> 3. Keep the same public API (return shape) so consumers don't need changes.
> 4. Use the Supabase client from `useSupabaseClient()` inside the `queryFn`.
> 5. Run `npm run type-check` after each hook.
>
> **Hook 1 — `src/hooks/trades/useProposals.ts`** (~150 lines):
> - Currently uses `useState` + `useEffect` + `useCallback` to fetch proposals via the `list_trade_proposals` RPC.
> - Convert to `useQuery` with key `QUERY_KEYS.proposals(status, limit)`. The RPC has `p_limit` and `p_offset` params.
> - Note: line 111 has a TODO about server-side filtering. Keep the client-side filter for now but use React Query's `select` option to do the filtering in a stable way.
> - Add key `proposals: (status: string, limit: number) => ['proposals', status, limit] as const` to `queryKeys.ts`.
>
> **Hook 2 — `src/hooks/templates/useTemplates.ts`**:
> - Fetches template listings. Convert to `useQuery` with key `QUERY_KEYS.templates(search, category)`.
> - Add key `templates: (...) => ['templates', ...] as const` to `queryKeys.ts`.
>
> **Hook 3 — `src/hooks/notifications/useNotifications.ts`**:
> - Fetches user notifications. Convert to `useQuery` with key `QUERY_KEYS.notifications(userId)`. Consider a shorter `staleTime` (30s) since notifications should feel fresh.
> - Add key to `queryKeys.ts`.
>
> **Hook 4 — `src/hooks/trades/useTradeChat.ts`**:
> - Fetches trade chat messages. This hook also sets up a Supabase realtime subscription. Convert the initial fetch to `useQuery` but keep the realtime subscription in a separate `useEffect` that calls `queryClient.setQueryData()` to optimistically append new messages.
> - Note: the `eslint-disable-next-line react-hooks/exhaustive-deps` on line 235 is justified for the realtime subscription setup — keep it.
> - Add key `tradeChat: (tradeId: string) => ['tradeChat', tradeId] as const` to `queryKeys.ts`.
>
> **Hook 5 — `src/hooks/templates/useUserCollections.ts`**:
> - Fetches user collections. Convert to `useQuery` with key `QUERY_KEYS.userCollections(userId)`.
> - Add key to `queryKeys.ts`.
>
> After converting all 5 hooks:
> - Run `npm run type-check` to verify TypeScript.
> - Run `npm run lint` to verify no new warnings.
> - Run `npm run build` as a final sanity check.
> - Update the count in any review documents: hooks using React Query should now be 6/40.

---

## Deferred Issues (Acknowledged)

These were already flagged and the user has stated they will address them:

1. **H6. Migration TODOs** — 4 remaining (`mark_team_page_complete`, `find_mutual_traders`, `list_trade_proposals` server-side filtering, trade deep link route)
2. **L5. Test coverage** — 8 spec files, no unit tests, no component tests

---

## Suggested Execution Order (simplest → most complex)

| # | Issue | Effort | Why this order |
|---|---|---|---|
| 1 | **N3-N6**. Add justification comments to `eslint-disable` lines | ~10min | Documentation-only. No code changes, zero risk. Covers `NativeRedirectHandler.tsx`, `ProfileCompletionGuard.tsx`, `PasswordRecoveryGuard.tsx`, `AuthGuard.tsx`. |
| 2 | **N7**. Extract `composeProviders` for `layout.tsx` | ~15min | Single new utility file + one layout refactor. Readability win. |
| 3 | **M2**. Replace 16 `console.log` → `logger.debug` | ~20min | Mechanical find-and-replace across 7 files. No logic changes. |
| 4 | **N2**. Fix `publicar/[slotId]/page.tsx` | ~30min | Single file: fix `as any`, wrong router import, `console.error`. Self-contained. |
| 5 | **N1**. Replace 68+ `console.error` → `logger.error` + tighten ESLint | ~2-3h | Same pattern as M2 but larger scope. Do M2 first to practice the pattern. **Highest ROI fix** — all errors become visible in Sentry. |
| 6 | **L4**. Create `onesignal.d.ts` types | ~1h | New type file + update `OneSignalProvider.tsx`. Removes 4 `as any` + 3 `eslint-disable`. |
| 7 | **H1**. React Query migration (5 hooks) | ~1-2 days | Most complex — requires understanding each hook's data flow, adding query keys, and preserving public APIs. Do one hook at a time, verify between each. |

> [!TIP]
> Items 1-4 can be done in a single session (~1h total). Item 5 is best done right after since it uses the same pattern. Items 6 and 7 are independent and can be scheduled separately.

---

## Prioritized Action Items

| Priority | Item | Effort | Impact |
|---|---|---|---|
| 🔴 High | N1. Replace 68+ `console.error` with `logger.error` + tighten ESLint rule | 2-3h | Errors become visible in Sentry |
| 🔴 High | H1. Continue React Query migration (top 5 hooks: `useProposals`, `useTemplates`, `useNotifications`, `useTradeChat`, `useUserCollections`) | 1-2d | Caching, dedup, no loading spinners on re-mount |
| 🟡 Medium | M2 fix. Replace 16 remaining `console.log` with `logger.debug` | 30min | Clean ESLint output |
| 🟡 Medium | N2. Fix `publicar/[slotId]/page.tsx` — `as any`, wrong router import, `console.error` | 30min | Type safety + Sentry coverage |
| 🟡 Medium | L4 fix. Create `onesignal.d.ts` types for `OneSignalProvider` | 1h | Remove 4 `as any` + 3 `eslint-disable` |
| 🟢 Low | N3-N5. Audit remaining `eslint-disable exhaustive-deps` (3 files) | 30min | Prevent stale closure bugs |
| 🟢 Low | N7. Extract `composeProviders` utility for layout.tsx | 15min | Readability |
| ⚪ Deferred | H6. Complete v1.6.0 migration TODOs | 2-4h | Remove `legacy-tables.ts` entirely |
| ⚪ Deferred | L5. Add unit + component tests | 1-2 weeks | Real coverage |

---

## Summary

The codebase is in **good shape architecturally** — the separation of concerns, auth security model, and error handling infrastructure are all solid. The previous review round made real progress on the `as any` and deprecated type issues. The main gap is **operational observability**: 68+ error paths bypass Sentry because they use `console.error` directly. Fixing N1 is the single highest-ROI change right now — it's mechanical (find-and-replace) and immediately improves production debugging. After that, continuing the React Query migration for the top 5 most-used hooks would eliminate the biggest performance and UX issue in the app.
