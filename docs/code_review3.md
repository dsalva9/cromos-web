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
| **`as any` casts** | 40+ | ~2 (in `legacy-tables.ts`) | **2** (only in `legacy-tables.ts`) |
| **`eslint-disable` comments** | 25+ | ~2 | **13** |
| **`console.log` calls** | 15 files | ✅ Resolved | ✅ **Resolved** — all 16 replaced with `logger.debug` |
| **`console.error` calls (bypassing logger)** | Not tracked | Not tracked | ✅ **Resolved** — all 68+ replaced with `logger.error`/`logger.warn` |
| **Hooks using React Query** | 0/40 | 1/40 (pilot) | **6/40** |
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
- ~~**Stalled React Query Migration**: 39/40 hooks still use manual `useState`/`useEffect`/`useCallback`.~~ **Partially resolved** — the top 5 most impactful hooks (`useUserCollections`, `useTemplates`, `useProposals`, `useNotifications`, `useTradeChat`) have been converted to React Query, bringing the total to 6/40. The remaining 34 hooks are lower-priority.
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

### N2. `publicar/[slotId]/page.tsx` — `as any`, `console.error`, missing logger, implicit `any` on callback ✅ Resolved

**Severity**: Medium  
**File**: [page.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/app/mis-plantillas/%5BcopyId%5D/publicar/%5BslotId%5D/page.tsx)

**Resolution**:
- Changed `useRouter` import from `next/navigation` to `@/hooks/use-router` (custom wrapper handling Next.js 16 transition bugs).
- Replaced `(templateDetails as any)?.template?.item_schema` with a properly typed intermediate variable: `const details = templateDetails as { template?: { item_schema?: TemplateInfo['item_schema'] } } | null`.
- Replaced `(s: any)` callback parameter with `(s: { slot_id: string | number })`.
- `console.error` calls were already replaced with `logger.error` in a previous pass.
- Verified: `tsc --noEmit` (exit 0), ESLint (clean), `next build` (exit 0).

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

### L4. `OneSignalProvider` — Marked ✅ but still has 4 `as any` + 3 `eslint-disable` ✅ Resolved

**Resolution**:
- Created `src/types/onesignal.d.ts` with proper type declarations for `OneSignalPlugin`, `OneSignalWebSDK`, `OneSignalUser`, `OneSignalNotifications`, `OneSignalPushSubscription`, and `OneSignalPlugins`.
- Augmented the global `Window` interface in the `.d.ts` file to type `OneSignalDeferred` and `plugins`.
- Removed the inline `declare global` block from `OneSignalProvider.tsx`.
- Removed all 3 `eslint-disable-next-line @typescript-eslint/no-explicit-any` comments.
- Replaced all 4 `(window as any).plugins` casts with typed `window.plugins`.
- Simplified the Web SDK inline type annotation from a 13-line inline object type to `OneSignalWebSDK`.
- Verified: `tsc --noEmit` (exit 0), ESLint (clean on affected files), `next build` (exit 0).

---

### H1. React Query migration — 1/40 hooks complete (correctly reported but no further progress) ✅ Resolved

**Resolution**: Converted the top 5 most impactful hooks from manual `useState`/`useEffect` to React Query, bringing the total to **6/40**:

| Hook | Strategy | Key features |
|---|---|---|
| `useUserCollections` | `useQuery` | Simplest hook — 5 min staleTime, `queryClient.invalidateQueries` for refetch |
| `useTemplates` | `useInfiniteQuery` | 250ms debounced search, SSR `initialData` support, cursor pagination |
| `useProposals` | `useQuery` | **Breaking API change**: imperative `fetchProposals()` → declarative `useProposals({ box, view })`. Consumer `ProposalList.tsx` updated. |
| `useNotifications` | `useQuery` × 2 | Separate queries for data + preferences. Optimistic `setQueryData` for mutations. Realtime subscription invalidates cache. |
| `useTradeChat` | `useQuery` | Realtime subscription appends via `setQueryData`. Optimistic send with rollback. Cursor-based load-more prepends to cache. |

All 11 query key factories added to `queryKeys.ts`. Verified: `tsc --noEmit` (exit 0), ESLint (clean), browser manual validation (templates, marketplace, notifications, chats all working).

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
| 4 | ~~**N2**. Fix `publicar/[slotId]/page.tsx`~~ | ✅ Done | |
| 5 | ~~**N1**. Replace 68+ `console.error` → `logger.error` + tighten ESLint~~ | ✅ Done | |
| 6 | ~~**L4**. Create `onesignal.d.ts` types~~ | ✅ Done | |
| 7 | ~~**H1**. React Query migration (5 hooks)~~ | ✅ Done | |

> [!TIP]
> Items 1-4 can be done in a single session (~1h total). Item 5 is best done right after since it uses the same pattern. Items 6 and 7 are independent and can be scheduled separately.

---

## Prioritized Action Items

| Priority | Item | Effort | Impact |
|---|---|---|---|
| ✅ Done | N1. Replace 68+ `console.error` with `logger.error` + tighten ESLint rule | — | All errors now visible in Sentry |
| ✅ Done | H1. React Query migration (top 5 hooks) | — | Caching, dedup, no loading spinners on re-mount |
| ✅ Done | M2 fix. Replace 16 remaining `console.log` with `logger.debug` | — | Clean ESLint output |
| ✅ Done | N2. Fix `publicar/[slotId]/page.tsx` — `as any`, wrong router import | — | Type safety |
| ✅ Done | L4 fix. Create `onesignal.d.ts` types for `OneSignalProvider` | — | Removed 4 `as any` + 3 `eslint-disable` |
| 🟢 Low | N3-N5. Audit remaining `eslint-disable exhaustive-deps` (3 files) | 30min | Prevent stale closure bugs |
| 🟢 Low | N7. Extract `composeProviders` utility for layout.tsx | 15min | Readability |
| ⚪ Deferred | H6. Complete v1.6.0 migration TODOs | 2-4h | Remove `legacy-tables.ts` entirely |
| ⚪ Deferred | L5. Add unit + component tests | 1-2 weeks | Real coverage |

---

## Summary

The codebase is in **good shape architecturally** — the separation of concerns, auth security model, and error handling infrastructure are all solid. The previous review round made real progress on the `as any` and deprecated type issues. ~~The main gap is **operational observability**: 68+ error paths bypass Sentry because they use `console.error` directly.~~ **N1 and M2 are now resolved** — all `console.*` calls use the centralized `logger`, ESLint `no-console` is set to `'error'`, and all errors are now routed to Sentry. ~~The biggest remaining gap is the **React Query migration** (1/40 hooks).~~ **H1 is now resolved** — the top 5 hooks have been converted to React Query (6/40 total), covering the most impactful data flows (templates, proposals, notifications, trade chat, user collections). The remaining 34 hooks are lower-traffic and can be migrated incrementally.
