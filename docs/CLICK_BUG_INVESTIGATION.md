# Desktop Click Blocking Bug — Investigation Handoff

## Bug Description

After logging in, **ALL Next.js `<Link>` components stop working** across the entire app. Clicking on links does nothing — no navigation occurs. This affects desktop, mobile web, and Capacitor.

## Key Behavioral Clues

| Scenario | Works? |
|----------|--------|
| Buttons (filters, search) | ✅ Yes |
| Inputs (search bar, text fields) | ✅ Yes |
| `<Link>` (navbar, listing cards, any page link) | ❌ No |
| Logo `<Link href="/">` on navbar | ✅ Yes (might be same-page no-op) |
| Right-click → "Open in new tab" on any link | ✅ Yes (fresh page load) |
| Pages opened in a new tab/window | ✅ All links work on fresh page load |
| After login → dashboard loads → all links blocked | ❌ Breaks from this point |
| Fresh tab to marketplace → click "Cargar más" → all links freeze | ❌ Same freeze! |

### CRITICAL Reproduction Path (easiest to test)

1. Right-click any link → "Open in new tab" to marketplace
2. **Everything works** on that fresh page
3. Click **"Cargar más"** (Load More) button at the bottom of listings
4. **ALL links freeze** — same behavior as the dashboard-after-login freeze

This proves the issue is NOT specific to the login flow or `ProfileCompletionGuard`. The "Cargar más" button calls `fetchNextPage()` from React Query's `useInfiniteQuery` in `src/hooks/marketplace/useListings.ts`. When React re-renders the listing grid with new data, it triggers whatever breaks the router.

### Key Insight

A fresh full-page load works perfectly. But **any significant React state update** (dashboard rendering after login, OR `fetchNextPage()` loading more listings) causes ALL `<Link>` components to stop navigating.

## Diagnostic Evidence

A click event listener added via DevTools console confirmed:

```
CLICK HIT: A block px-4 py-2 rounded-md font-bold uppercase text-sm...
z-index: auto, pointer-events: auto
```

- ✅ Clicks reach the correct `<a>` element
- ✅ No invisible overlay or CSS `pointer-events` issue
- ✅ No z-index layering problem
- ❌ The Next.js `<Link>` internal click handler silently fails to navigate

## Root Cause Hypothesis

**The Next.js client-side router enters a "stuck" state after certain React re-renders.** In React 19 / Next.js 16, `router.push()` starts a React transition. If a re-render causes a React error that gets suppressed (e.g. hydration mismatch, error boundary catch, or unhandled rejection), the router's internal transition state may become corrupted. Since `<Link>` components call `e.preventDefault()` before `router.push()`, the browser's default navigation is blocked, but `router.push()` never executes.

**The fact that "Cargar más" triggers the same freeze as the dashboard load tells us this is likely a React rendering bug triggered by state updates**, NOT a specific `router.replace()` poisoning issue. Something in the component tree throws or mismatches during re-render, and this corrupts Next.js's router.

### Suspect 1: `useListings` + `useInfiniteQuery` (H1 React Query conversion)

**File**: `src/hooks/marketplace/useListings.ts`

The "Cargar más" button calls `fetchNextPage()`. When new data arrives, React Query updates its internal cache, causing a re-render of `MarketplaceContent`. If this re-render triggers an error (e.g. in `ListingCard`, in a Suspense boundary, or in the `ErrorBoundary`), it could break the router.

The `useListings` hook was recently converted from a custom implementation to React Query as part of the H1 fix. **This conversion may have introduced the bug.**

### Suspect 2: `ProfileCompletionGuard` (`router.replace` side effect)

**File**: `src/components/profile/ProfileCompletionGuard.tsx`

This guard component runs a `useEffect` that calls `router.replace('/profile/completar')` when it detects an incomplete profile. If this transition conflicts with a re-render, it could compound the problem.

### Suspect 3: `ErrorBoundary` swallowing errors

**File**: `src/components/ErrorBoundary.tsx`

The `ErrorBoundary` wraps the entire layout (line 92 of `layout.tsx`). If a render error occurs during a state update, the boundary catches it and shows fallback UI. But if the error happens during a React transition (which `router.push` uses), the error boundary might catch the error without properly resetting the router's transition state.

### Secondary Culprit: `handleProtectedNavigation` in SiteHeader

**File**: `src/components/site-header.tsx` (line 133-155)

This handler is attached to all 4 navbar links (Marketplace, Mis Álbumes, Chats, Favoritos). **Already partially fixed** — changed `(!isComplete || profileLoading)` to `(!profileLoading && !isComplete)`, but this alone didn't solve the issue because listing cards (which have NO onClick handler) also don't work.

**Same pattern exists in**: `src/components/profile/UserAvatarDropdown.tsx` (line 56-70) — also already fixed.

### Third Possibility: `PasswordRecoveryGuard`

**File**: `src/components/auth/PasswordRecoveryGuard.tsx`

This guard also calls `router.replace()` based on auth state. If it fires a redirect that conflicts with the `ProfileCompletionGuard`'s redirect, two competing `router.replace()` calls could deadlock the router's transition queue.

## Tech Stack

- **Next.js**: 16.0.7 (App Router)
- **React**: 19.2.1
- **Supabase Auth** for authentication
- **Capacitor** for mobile apps (also affected)

## Architecture (relevant to bug)

### Layout (`src/app/layout.tsx`)

```
<SupabaseProvider>
  <QueryProvider>
    <ThemeProvider>
      <OneSignalProvider>
        <DeepLinkHandler>
          <ProfileCompletionProvider>
            <ErrorBoundary>
              <SiteHeader />
              <AccountDeletionBanner />
              <main>
                <PasswordRecoveryGuard>
                  <ProfileCompletionGuard>
                    {children}
                  </ProfileCompletionGuard>
                </PasswordRecoveryGuard>
              </main>
              <MobileBottomNav />
              <FloatingActionBtn />
              <SiteFooter />
              <CookieConsentBanner />
            </ErrorBoundary>
            <Toaster />
          </ProfileCompletionProvider>
        </DeepLinkHandler>
      </OneSignalProvider>
    </ThemeProvider>
  </QueryProvider>
</SupabaseProvider>
```

### Dashboard page (`src/app/page.tsx`)

```typescript
export default async function Home() {
  const { isAuthenticated } = await getSession();
  return isAuthenticated
    ? <Suspense fallback={...}><UserDashboard /></Suspense>
    : <LandingPage />;
}
```

- `UserDashboard` is loaded with `dynamic()` (React.lazy)
- `page.tsx` is an **async Server Component** using `getSession()`

## Files Investigated (all cleared as NOT the cause)

| File | Finding |
|------|---------|
| `nav-link.tsx` | Simple wrapper around `<Link>`, passes onClick through |
| `ListingCard.tsx` | Uses `<Link absolute inset-0 z-10>` for card overlay — no onClick handler |
| `MarketplaceContent.tsx` | Standard grid rendering, no click interceptors |
| `MobileBottomNav.tsx` | `md:hidden` — not visible on desktop. Uses a `Drawer` from `vaul` which portals its overlay, but only when open |
| `FloatingActionBtn.tsx` | `md:hidden` — mobile only |
| `ContextualTip.tsx` | Dismissible tip, no click blocking |
| `CookieConsentBanner.tsx` | Bottom-positioned banner, no overlay |
| `ErrorBoundary.tsx` | Standard error boundary, shows fallback UI on error |
| `SupabaseProvider.tsx` | Auth state management, sets user immediately |
| `OneSignalProvider.tsx` | Loads SDK + service worker, no click interference |
| `DeepLinkHandler.tsx` | Only runs on native platform (`Capacitor.isNativePlatform()`) |
| `ThemeProvider.tsx` | Simple theme context, no click effects |
| `AccountDeletionBanner.tsx` | Returns null when no deletion scheduled |
| `next.config.ts` | Clean config, only legacy PHP redirects |
| Middleware | **Does not exist** — no middleware.ts |

## What Has Been Changed So Far

1. **`site-header.tsx`**: Changed `(!isComplete || profileLoading)` to `(!profileLoading && !isComplete)` in `handleProtectedNavigation`
2. **`UserAvatarDropdown.tsx`**: Same fix for `handleProtectedClick`
3. Both changes committed and pushed as `43ad0de`

**These fixes were NOT sufficient** — the problem persists.

## Recommended Next Steps for Investigation

> **HIGHEST PRIORITY**: The "Cargar más" reproduction path proves the bug is triggered by a React state update. The `useListings` hook was converted to React Query `useInfiniteQuery` as part of H1. This is the #1 suspect.

0. **Revert the `useListings` hook to its pre-React-Query implementation** (or `git stash` the H1 changes) and test. If "Cargar más" no longer freezes links, the React Query `useInfiniteQuery` integration is the culprit. The original implementation used `useState` + manual fetch — find the pre-H1 version with `git log --oneline -- src/hooks/marketplace/useListings.ts`.

1. **Check the browser console immediately after clicking "Cargar más"** — look for React errors, hydration mismatches, or unhandled promise rejections

2. **Add `console.log` inside `ProfileCompletionGuard`'s `useEffect`** to see if:
   - It fires `router.replace('/profile/completar')` 
   - How many times the effect runs
   - Whether there's a stuck transition

3. **Monkey-patch `router.push` in DevTools** to see if Link is even calling it:
   ```javascript
   // Paste in DevTools console:
   const origPush = window.next.router.push;
   window.next.router.push = (...args) => {
     console.log('router.push called:', args);
     return origPush.apply(window.next.router, args);
   };
   ```

4. **Test with `ProfileCompletionGuard` temporarily removed** from `layout.tsx`

5. **Test with `PasswordRecoveryGuard` temporarily removed** from `layout.tsx`

6. **Test with `ErrorBoundary` temporarily removed** — if the boundary is swallowing render errors during transitions, removing it would surface them

## Diagnostic Script (for browser console)

```javascript
// 1. Find overlays (already confirmed: none)
document.querySelectorAll('*').forEach(el => {
  const s = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  if ((s.position === 'fixed' || s.position === 'absolute') && 
      r.width > 500 && r.height > 400 && 
      s.display !== 'none' && s.visibility !== 'hidden') {
    console.log('OVERLAY:', el.tagName, el.id, 
      el.className?.substring(0,80), 'z:', s.zIndex, 
      'pointer-events:', s.pointerEvents);
  }
});

// 2. Track what's happening on click
document.addEventListener('click', function(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  console.log('CLICK HIT:', el?.tagName, 
    el?.className?.substring(0, 100), 
    'defaultPrevented:', e.defaultPrevented);
}, true);

// 3. Track router calls (Next.js internals)
document.addEventListener('click', function(e) {
  setTimeout(() => {
    console.log('After click - defaultPrevented:', e.defaultPrevented);
  }, 0);
}, false);
```
