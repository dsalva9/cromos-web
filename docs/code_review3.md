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
| **`console.log` calls** | 15 files | ✅ Resolved | ✅ **Resolved** — all 16 replaced with `logger.debug` |
| **`console.error` calls (bypassing logger)** | Not tracked | Not tracked | ✅ **Resolved** — all 68+ replaced with `logger.error`/`logger.warn` |
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
- ~~**Logger Bypass**: 68+ `console.error` calls across `lib/supabase/` and `hooks/` bypass the centralized logger. These won't send errors to Sentry.~~ ✅ **Resolved** — all `console.error`/`console.warn` replaced with `logger.error`/`logger.warn`. ESLint `no-console` rule tightened to `'error'`.
- ~~**Incomplete Previous Resolutions**: Several issues marked "✅ Resolved" in the last review still show up in code (`console.log` in 7+ files, `as any` in OneSignal).~~ Partially resolved — `console.log` and `console.error` are now fixed. `as any` in OneSignal remains open (L4).
- **Low Test Coverage**: Only 8 Playwright spec files, no unit tests, no component tests.
- **Migration Debt**: 4 TODO markers for v1.6.0 migration remain open.

---

## New Issues Found

### N1. `console.error` calls bypass centralized logger (68+ occurrences) ✅ Resolved

**Severity**: Medium-High  

**Resolution**: All 68+ `console.error` → `logger.error` and all `console.warn` → `logger.warn` replacements completed across 47+ files. ESLint `no-console` rule tightened from `['warn', { allow: ['warn', 'error'] }]` to `'error'` (line 28 of `eslint.config.mjs`). Only `src/lib/logger.ts` retains `console.*` calls (has `'no-console': 'off'` override). Verified: zero `no-console` ESLint violations, build succeeds.

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

### M2. `console.log` usage ✅ Resolved

**Resolution**: All 16 `console.log` calls replaced with `logger.debug` across 7 files:
- `hooks/badges/useUserBadges.ts`, `hooks/badges/useBadgeProgress.ts`
- `hooks/admin/useResolveReport.ts`
- `components/providers/DeepLinkHandler.tsx`
- `app/profile/reset-password/page.tsx`
- `components/home/MarketplaceShowcase.tsx`
- `app/login/page.tsx`

Added `import { logger } from '@/lib/logger'` where missing. Also replaced 3 `console.error` calls in the same files with `logger.error`. Verified: zero `no-console` ESLint violations.

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
| 3 | ~~**M2**. Replace 16 `console.log` → `logger.debug`~~ | ✅ Done | |
| 4 | **N2**. Fix `publicar/[slotId]/page.tsx` | ~30min | Single file: fix `as any`, wrong router import. `console.error` already fixed. |
| 5 | ~~**N1**. Replace 68+ `console.error` → `logger.error` + tighten ESLint~~ | ✅ Done | |
| 6 | **L4**. Create `onesignal.d.ts` types | ~1h | New type file + update `OneSignalProvider.tsx`. Removes 4 `as any` + 3 `eslint-disable`. |
| 7 | **H1**. React Query migration (5 hooks) | ~1-2 days | Most complex — requires understanding each hook's data flow, adding query keys, and preserving public APIs. Do one hook at a time, verify between each. |

> [!TIP]
> Items 1-4 can be done in a single session (~1h total). Item 5 is best done right after since it uses the same pattern. Items 6 and 7 are independent and can be scheduled separately.

---

## Prioritized Action Items

| Priority | Item | Effort | Impact |
|---|---|---|---|
| ✅ Done | N1. Replace 68+ `console.error` with `logger.error` + tighten ESLint rule | — | All errors now visible in Sentry |
| 🔴 High | H1. Continue React Query migration (top 5 hooks: `useProposals`, `useTemplates`, `useNotifications`, `useTradeChat`, `useUserCollections`) | 1-2d | Caching, dedup, no loading spinners on re-mount |
| ✅ Done | M2 fix. Replace 16 remaining `console.log` with `logger.debug` | — | Clean ESLint output |
| 🟡 Medium | N2. Fix `publicar/[slotId]/page.tsx` — `as any`, wrong router import | 30min | Type safety |
| 🟡 Medium | L4 fix. Create `onesignal.d.ts` types for `OneSignalProvider` | 1h | Remove 4 `as any` + 3 `eslint-disable` |
| 🟢 Low | N3-N5. Audit remaining `eslint-disable exhaustive-deps` (3 files) | 30min | Prevent stale closure bugs |
| 🟢 Low | N7. Extract `composeProviders` utility for layout.tsx | 15min | Readability |
| ⚪ Deferred | H6. Complete v1.6.0 migration TODOs | 2-4h | Remove `legacy-tables.ts` entirely |
| ⚪ Deferred | L5. Add unit + component tests | 1-2 weeks | Real coverage |

---

## Summary

The codebase is in **good shape architecturally** — the separation of concerns, auth security model, and error handling infrastructure are all solid. The previous review round made real progress on the `as any` and deprecated type issues. ~~The main gap is **operational observability**: 68+ error paths bypass Sentry because they use `console.error` directly.~~ **N1 and M2 are now resolved** — all `console.*` calls use the centralized `logger`, ESLint `no-console` is set to `'error'`, and all errors are now routed to Sentry. The biggest remaining gap is the **React Query migration** (1/40 hooks) — continuing this for the top 5 hooks would eliminate the performance and UX issues caused by missing caching and deduplication.
