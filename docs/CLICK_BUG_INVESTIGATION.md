# Click Bug Investigation

## Problem Statement

**Critical bug**: After logging in and landing on the dashboard, all navigation via Next.js `<Link>` components stops working. Clicks are registered by the browser, but the router does not navigate.

**User Impact**: Users cannot navigate the application normally and must right-click links to open them in new tabs.

## Symptoms

1. **Pattern**: Landing page → Login → Dashboard → **ALL NAVIGATION BREAKS**
2. Clicks are detected by browser (console shows click events)
3. `router.push()` is **NOT being called** by Next.js Link components
4. Router push counter stays at `1` (from the initial login→dashboard navigation)
5. Also breaks when:
   - Staying on marketplace page for a while
   - Marking stickers in mis-plantillas (any mutation)
   - Any React state update after initial dashboard load

## Root Cause Analysis

### Confirmed via Debugger

Enhanced click debugger in `layout.tsx` proves:
- ✅ Clicks reach anchor elements correctly
- ✅ No overlaying elements blocking clicks
- ✅ `defaultPrevented: false` in capture phase (expected)
- ❌ **`router.push()` is NOT being called** when links are clicked
- ❌ `totalRouterPushCalls` counter stays at `1`

This proves: **Next.js App Router is stuck in a pending transition state**, preventing Link components from calling `router.push()`.

### Hypothesis

The router's internal state machine thinks a transition is still pending from the login→dashboard navigation. When a transition is pending, Next.js Link components refuse to start new navigations to prevent concurrent transitions.

## Attempted Fixes (All Failed)

### ❌ Attempt 1: ProfileCompletionGuard Refactor
- **What**: Modified ProfileCompletionGuard to never unmount children
- **Rationale**: Unmounting during transitions could corrupt router state
- **Result**: No effect - navigation still broken

### ❌ Attempt 2: Remove loading.tsx Files
- **What**: Deleted 4 `loading.tsx` files (known Next.js 15 bug)
- **Rationale**: Loading states can interfere with router transitions
- **Result**: No effect - navigation still broken

### ❌ Attempt 3: Fix Supabase Table Reference
- **What**: Changed `UserDashboard.tsx` from `.from('listings')` to `.from('trade_listings')`
- **Rationale**: 404 errors from non-existent table could corrupt RSC payloads
- **Result**: Fixed the 404 error, but navigation still broken

### ❌ Attempt 4: Remove Redundant Suspense Wrapper
- **What**: Removed `<Suspense>` wrapper around `UserDashboard` (already wrapped in `dynamic()`)
- **Rationale**: Nested loading states could confuse router transition tracking
- **Result**: No effect - navigation still broken

### ❌ Attempt 5: Fix Router Dependencies in useEffect
- **What**: Removed `router` from useEffect dependencies in 3 components:
  - `NativeRedirectHandler` (lines 27, 51)
  - `DeepLinkHandler` (line 47)
  - `ProfileCompletionGuard` (line 110)
- **Rationale**: Router in deps causes infinite re-runs when router object changes, triggering repeated `router.push()` calls
- **Result**: No effect - navigation still broken

## Current State

**Commits**:
- `a76cc55`: Fix trade_listings table reference
- `cd6d4ee`: Enhanced router debugger
- `cd9b30e`: Remove redundant Suspense wrapper
- `01b7aaa`: Fix NativeRedirectHandler router deps
- `eea8922`: Fix DeepLinkHandler and ProfileCompletionGuard router deps

**Debugger Active**: Yes - comprehensive error logging and click tracking in `layout.tsx`

**Status**: ❌ **UNRESOLVED** - Router still stuck after dashboard loads

## Next Steps to Investigate

1. **Check for React errors during dashboard render**
   - Look for unhandled errors or Promise rejections in console
   - Check if any component is throwing during render

2. **Inspect Next.js App Router internals**
   - The router for App Router is stored in React Fiber, not `window.next.router`
   - May need to use React DevTools to inspect router state

3. **Check for startTransition issues**
   - App Router uses React 18's `startTransition` for navigation
   - If a transition never completes, router gets stuck

4. **Investigate React Query mutations**
   - User reports bug also happens after marking stickers (mutations)
   - Could be related to React Query's `onSuccess` or cache updates

5. **Check for middleware or interceptors**
   - Look for any code that might be intercepting navigation
   - Check for custom router wrappers or navigation guards

6. **Verify Next.js version compatibility**
   - Check if there are known issues with current Next.js version
   - Consider upgrading/downgrading if version-specific bug

## Debug Output Example

```
[DEBUG] Router debugger initializing...
[DEBUG] Router debugger initialized
[ROUTER-DEBUG] Checking for App Router...
[ROUTER-DEBUG] Found Pages Router on window.next.router
[CLICK-DEBUG] Anchor clicked: {href: '/login', ...}
[ROUTER-DEBUG] Pages Router push() called: / total: 1
[CLICK-DEBUG] Anchor clicked: {href: '/marketplace', ...}  // ← No router.push() call!
[CLICK-DEBUG] Anchor clicked: {href: '/marketplace', ...}  // ← Still no router.push()!
```

**Key observation**: After the initial `router.push('/')` from login, NO subsequent `router.push()` calls are made, even though clicks are being detected.

## Related Issues

- Next.js 15 loading.tsx bug (addressed but didn't fix this)
- React 18 transition state management
- App Router vs Pages Router differences (app uses App Router but debugger finds Pages Router?)
