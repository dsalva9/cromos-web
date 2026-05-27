# Implementation Prompt: Proactive Trading Network

## Context

We are wiring the Proactive Trading Network for **cromos-web** — a Next.js 16, React 19, Supabase, Tailwind v4, and Capacitor-ready sticker-trading application.

The database, React hooks, and UI components for direct user-to-user trading are **fully built but unmounted** — zero trade-related pages exist in the App Router. The task is to create the pages, wire the pre-built components, integrate navigation, and deliver a premium responsive trading experience.

**Tech stack reference:** Next.js 16 (App Router), React 19, Supabase (RPCs + Realtime), TanStack React Query v5, Tailwind CSS v4, shadcn/ui + Radix UI, Framer Motion, next-intl (es/en/pt), Vaul (drawers), Sonner (toasts), Capacitor 7.

---

## Pre-Existing Codebase Inventory (MUST Utilize — Do NOT Recreate)

### Database Layer (all production-deployed)

| Asset | Purpose |
|---|---|
| `find_mutual_traders` RPC | Geographic mutual match search with haversine distance, weighted scoring, pagination. Params: `p_user_id`, `p_collection_id`, `p_lat`, `p_lon`, `p_radius_km`, `p_sort` ('distance'/'overlap'/'mixed'), filters. |
| `create_trade_proposal` RPC | Creates proposal + items atomically. Params: `p_collection_id`, `p_to_user`, `p_offer_items`, `p_request_items`, `p_message`. |
| `list_trade_proposals` RPC | Fetches inbox/outbox proposals for a user. |
| `get_trade_proposal_detail` RPC | Full proposal detail with items and users. |
| `respond_to_trade_proposal` RPC | Accept/reject/cancel proposals. |
| `request_trade_finalization` / `reject_trade_finalization` RPCs | Trade completion confirmation flow. |
| `mark_trade_read` RPC | Marks trade chat messages as read. |
| `get_unread_counts` RPC | Returns unread message counts per trade. |
| `trade_proposals` table | `from_user`, `to_user`, `collection_id`, `status` (pending/accepted/rejected/cancelled/expired). |
| `trade_proposal_items` table | `proposal_id`, `sticker_id`, `direction` (offer/request), `quantity`. |
| `trade_chats` table | Dual-purpose chat with constraint `trade_chats_either_trade_or_listing` — supports `trade_id` OR `listing_id`. Has `is_read`, `is_system`, `image_url`, `thumbnail_url`. |
| `postal_codes` table | Public reference data with `postcode`, `lat`, `lon`, `municipio`, `provincia`. |
| `profiles` table | `nickname`, `avatar_url`, `postcode`, `rating_avg`, `rating_count`, `trade_reputation_tier`, `xp_total`, `level`. Location resolved via JOIN to `postal_codes`. |

### React Hooks — `src/hooks/trades/` (11 files, all functional)

| Hook | Size | Purpose |
|---|---|---|
| `useFindTraders.ts` | 3.8KB | Triggers `find_mutual_traders` RPC with geo/filter params. Returns `TradeMatch[]`. |
| `useProposals.ts` | 4.8KB | Fetches proposals via `list_trade_proposals`. Supports inbox/outbox/history with active/rejected filtering. |
| `useCreateProposal.ts` | 1.9KB | Mutation hook calling `create_trade_proposal` RPC. |
| `useProposalDetail.ts` | 1.5KB | Fetches single proposal detail. |
| `useRespondToProposal.ts` | 1.6KB | Accept/reject/cancel mutation. |
| `useTradeChat.ts` | 10.9KB | Full real-time chat: Supabase Realtime subscription, optimistic send, cursor pagination, `markAsRead` (debounced), 500-char limit. |
| `useTradeFinalization.ts` | 3.4KB | Request/reject trade finalization mutations with toast notifications. |
| `useTradeHistory.ts` | 3.9KB | Completed/cancelled trade history queries. |
| `useUnreadCounts.ts` | 5.5KB | Per-trade and total unread counts with Realtime subscription. |
| `useNotifications.ts` | 6.3KB | Trade notifications with real-time updates, mark-as-read. |
| `index.ts` | Barrel | Exports all hooks and types. |

### React Components — `src/components/trades/` (12 files, all functional)

| Component | Size | Purpose |
|---|---|---|
| `FindTradersFilters.tsx` | 14.4KB | Collection selector, player search, advanced filters (rarity, team, min overlap). Debounced 500ms. |
| `MatchCard.tsx` | 4.5KB | Match display card with overlap stats. Currently links to `/trades/compose?userId=...&collectionId=...`. |
| `MatchDetail.tsx` | 4.9KB | Two-column sticker comparison list with rarity badges. |
| `ProposalList.tsx` | 4.5KB | Grid of ProposalCards with unread badges. Opens ProposalDetailModal on click. |
| `ProposalCard.tsx` | 4.9KB | Proposal summary: counterparty, status badge, offer/request counts, unread badge (capped 9+). |
| `ProposalDetailModal.tsx` | 17.4KB | Full proposal modal with tabs (Resumen/Mensajes). Integrates TradeChatPanel. Accept/reject/cancel + finalization actions. |
| `TradeChatPanel.tsx` | 12KB | Real-time chat panel: gold sender bubbles, auto-scroll, "new messages" pill, load-more, char counter, disclaimer banner. |
| `ComposerHeader.tsx` | 3.5KB | Trade composer header showing both users' avatars/nicknames + collection name. |
| `ProposalSummary.tsx` | 3.3KB | Composed proposal summary: offer/request counts, message textarea (500 chars), submit button. |
| `StickerGrid.tsx` | 4.8KB | Responsive selectable sticker grid with images, rarity, quantity stepper. Selected items get gold border. |
| `StickerSelector.tsx` | 4.1KB | Dual-tab component (Ofrecer/Pedir) wrapping two StickerGrids. Filters: offer = user's duplicates, request = other user's stickers user is missing. |
| `NotificationsList.tsx` | 12.4KB | Notification list with unread/read separation. Navigates to `/trades/proposals?tradeId=...`. |

### Existing Infrastructure to Integrate With

| Asset | Path | Relevance |
|---|---|---|
| Public user profile page | `src/app/[locale]/users/[userId]/page.tsx` (42KB) | **Enhance this** with mutual matching block. Do NOT create a separate `/usuarios/` route. |
| MobileBottomNav | `src/components/layout/MobileBottomNav.tsx` | Needs "Intercambios" tab added. |
| SiteHeader | `src/components/layout/SiteHeader.tsx` | Needs "Intercambios" nav link. |
| Deep linking handler | `src/lib/onesignal/deep-linking.ts` | Has TODO for trade routes. Must be wired. |
| Notification formatter | `src/lib/notifications/formatter.ts` | Generates `/trades/${tradeId}` hrefs. Must be updated to `/intercambios/`. |
| Notification types config | `src/lib/notifications/config.ts` | Trade notification kinds already defined. |
| Design tokens | `src/styles/theme.css` | Use existing `--gold: #FFC000`, `--gold-light`, `--gold-dark`. Do NOT introduce new gold values. |
| Page patterns | See marketplace/dashboard pages | Follow: Server Component wrapper → client component, `generateMetadata()`, `loading.tsx`, `error.tsx`, `EmptyState`. |
| Drawer component | `src/components/ui/drawer.tsx` (Vaul) | Use for mobile match detail. |
| Dialog component | `src/components/ui/dialog.tsx` (Radix) | Use for desktop modals. |

---

## ⚠️ Locale-Aware Navigation — MANDATORY Rules

The app uses `next-intl` with `localePrefix: 'always'` — every route MUST be prefixed with `/es/`, `/en/`, or `/pt/`. The codebase has locale-aware wrappers. **You MUST use them for ALL navigation. Never use raw paths with `window.location.href` or `<a href>`.**

### Which API to use where:

| Context | API to use | Import |
|---|---|---|
| `<Link>` in JSX | Custom `Link` component | `import Link from '@/components/ui/link'` |
| `router.push()` / `router.replace()` | Custom `useRouter` hook | `import { useRouter } from '@/hooks/use-router'` |
| Server-side redirect | `intlRedirect` | `import { intlRedirect } from '@/i18n/navigation'` |
| Building href strings for non-JSX (formatters, configs) | Build WITHOUT locale prefix — the consumer component will add it | N/A |

### Pre-existing bug to fix: `src/lib/onesignal/deep-linking.ts`

The deep linking handler uses `window.location.href = deepLinkPath` with raw paths (no locale). This is **already broken** for all existing routes (`/chats`, `/marketplace/${id}`, `/profile`). Since `localePrefix: 'always'`, these navigate to paths without locale and rely on a redirect.

**Fix during Phase 1C:** Update `handleNotificationClick()` to detect the current locale (from `document.documentElement.lang` or `window.location.pathname`) and prefix all paths:

```typescript
function handleNotificationClick(data: NotificationData): void {
  const deepLinkPath = generateDeepLinkPath(data);
  
  // Detect current locale from URL
  const localeMatch = window.location.pathname.match(/^\/(es|en|pt)\//);
  const locale = localeMatch?.[1] || 'es';
  const localizedPath = `/${locale}${deepLinkPath}`;
  
  window.location.href = localizedPath;
}
```

### Per-component checklist:

- [ ] `MatchCard.tsx` — uses custom `Link` ✅ (already locale-aware)
- [ ] `NotificationsList.tsx` — uses custom `useRouter` ✅ (already locale-aware)
- [ ] `deep-linking.ts` — uses `window.location.href` ❌ → **FIX: add locale prefix**
- [ ] `formatter.ts` — generates raw hrefs, consumed by components that add locale ✅ (leave as-is)
- [ ] New trade composer redirect after submit — **MUST use** `import { useRouter } from '@/hooks/use-router'`
- [ ] New dashboard widget links — **MUST use** `import Link from '@/components/ui/link'`
- [ ] New empty state CTAs — **MUST use** `import Link from '@/components/ui/link'`

---

## Phase 1: Enhance User Profile + Wire Navigation

### 1A. Mutual Matching Block on `/users/[userId]`

**⚠️ CRITICAL:** The profile page is already 1,021 lines / 42KB. Do NOT add the matching block inline. Instead:
1. Create `src/components/trades/UserTradeMatchSection.tsx` as a standalone component that receives `userId` as a prop.
2. The component internally handles overlap calculation and renders the "⚡ Coincidencias" block.
3. In `users/[userId]/page.tsx`, add a single import and mount: `<UserTradeMatchSection userId={userId} />`

**Behavior:**
- When a logged-in User A visits User B's profile, and both users collect the same album, run a client-side comparison (or call `find_mutual_traders` scoped to these two users) to calculate overlap.
- If mutual overlap exists, render a highlighted match card below the user's album list:

```
⚡ ¡Tienes coincidencias con {Nickname}!

Cromos que tiene {Nickname} y a ti te faltan: [#12, #44, #108]  (interactive chips)
Cromos que tienes tú y a {Nickname} le faltan: [#5, #19, #99]

[Iniciar Propuesta de Intercambio →]  (prominent CTA)
```

- Render sticker numbers as interactive chips (tappable, show sticker name/image on hover/tap).
- Use a standout visual treatment: subtle glassmorphism (`backdrop-blur-sm`), gold accent border (`border-gold/30`), gradient background. This should be the most visually striking element on the profile page.
- If no overlap exists, show nothing (not an empty state — just omit the block).
- If User A is not logged in, don't show the block.

### 1B. Navigation Integration

**MobileBottomNav** (located at `src/components/navigation/MobileBottomNav.tsx`, NOT `layout/`):
- Currently has 5 tabs: Marketplace, Mis Álbumes, Chats, Favoritos, Menú.
- **Replace the "Favoritos" tab** with "Intercambios" (swap/arrows icon). Move Favoritos into the hamburger Drawer where My Listings, Templates, etc. already live. This avoids 6-tab overflow on 320px screens.
- **⚠️ Do NOT mount `useUnreadCounts` in the nav bar** — it has an always-on WebSocket + per-message DB queries that would run on every page. Instead, create a lightweight `useGlobalUnreadBadge` hook:
  ```typescript
  // Lightweight polling hook for nav badge — no Realtime WebSocket
  function useGlobalUnreadBadge() {
    return useQuery({
      queryKey: ['globalUnreadBadge'],
      queryFn: () => supabase.rpc('get_unread_counts', { p_box: 'inbox' }),
      refetchInterval: 30_000, // poll every 30s
      staleTime: 10_000,
      enabled: !!userId,
    });
  }
  ```
  The full `useUnreadCounts` with Realtime is used only on the `/intercambios` page itself.

**SiteHeader:** Add "Intercambios" to the desktop navigation menu.

**Dashboard widgets:** Defer to Phase 4E (dashboard widgets). Don't bloat Phase 1.

### 1C. Deep Linking & Notification Routing Fixes

**⚠️ Regression risk:** The notification formatter handles ALL notification types (trade + marketplace). When updating, ONLY modify `trade_*` notification kinds. Do NOT touch `listing_chat`, `listing_reserved`, `listing_completed` routing.

**Before making changes, run:** `grep -rn '/trades/' src/ --include='*.tsx' --include='*.ts'` to find all old route references.

**Update `src/lib/onesignal/deep-linking.ts`:**
- Route trade notification types to `/intercambios/` routes instead of falling back to `/chats`.
- `trade_confirmation_request` → `/intercambios?tradeId={id}`
- `trade_confirmed` → `/intercambios?tradeId={id}`

**Update `src/lib/notifications/formatter.ts`:**
- Change href generation from `/trades/${tradeId}` to `/intercambios?tradeId={id}&tab=inbox` (or outbox based on direction).
- Use explicit `switch/case` on notification kind, NOT pattern matching on `tradeId` presence.

**Update `src/components/trades/NotificationsList.tsx`:**
- Change navigation paths from `/trades/proposals?tradeId=...` to `/intercambios?tradeId=...`.

**Update `src/components/trades/MatchCard.tsx`:**
- Change link from `/trades/compose?userId=...&collectionId=...` to `/intercambios/componer?userId=...&collectionId=...`.

### Phase 1 Validation

**🤖 Automated (run in terminal):**
- `npm run build` — zero type errors in new/modified files
- `npm run lint` — no new warnings
- `grep -rn '/trades/' src/ --include='*.tsx' --include='*.ts'` — zero results (all old refs updated)
- Verify i18n keys: parse all three locale files and confirm new `intercambios.*` keys exist in es/en/pt
- Verify notification formatter: `grep -n 'listing_chat\|listing_reserved\|listing_completed' src/lib/notifications/formatter.ts` — marketplace routing unchanged

**🖥️ Agent Browser (localhost):**
- At 375px viewport: MobileBottomNav shows "Intercambios" tab, no overflow, icon renders, tap navigates to /intercambios
- At 1440px: SiteHeader shows "Intercambios" nav link
- Log in as test user, visit another user's profile who shares a collection → matching block appears with correct sticker data
- Visit user who collects different albums → no matching block (not empty state, just absent)
- Visit profile logged out → no matching block
- Toggle dark mode → all new elements render correctly, gold accents visible
- Navigate to /intercambios?tradeId=123 → page loads (no redirect to /chats)

**👤 User Manual (deployed):**
- Open on real phone → Intercambios tab visible, haptic works, no tab overflow
- Trigger a trade push notification → tapping opens /intercambios (not /chats)
- Visit a real user's profile → matching block shows with production overlap data
- Switch locale to en/pt → all new text translated (no raw keys)

---

## Phase 2: Trade Hub (`/intercambios/`)

### 2A. Proposals Inbox/Outbox — `/intercambios/page.tsx`

**File to create:** `src/app/[locale]/intercambios/page.tsx`

**Layout:**
- Page title: "Mis Intercambios"
- Tab bar with two tabs: **"Recibidas"** (inbox) and **"Enviadas"** (outbox)
- Each tab renders `ProposalList.tsx` with the corresponding `ProposalBox` value.
- Support URL query params: `?tab=inbox|outbox` and `?tradeId={id}` (auto-opens ProposalDetailModal for that trade).
- Show total unread badge on the "Recibidas" tab.
- Empty state per tab: "No tienes propuestas {recibidas/enviadas} todavía" with CTA to `/intercambios/buscar`.

**Also create:**
- `src/app/[locale]/intercambios/loading.tsx` — Skeleton grid of proposal cards.
- `src/app/[locale]/intercambios/error.tsx` — Follow existing error.tsx pattern.
- `src/app/[locale]/intercambios/layout.tsx` — If shared layout is needed (breadcrumb, sub-nav).

**This page is trades-only. Do NOT merge marketplace listing chats here.** Listing chats remain at `/chats`.

**⚠️ Date locale fix:** `ProposalCard.tsx` line 113 has dates hard-coded to `'es-ES'` locale. Fix to use `next-intl`'s `useLocale()` for locale-appropriate date formatting.

### 2B. Trade Composer — `/intercambios/componer/page.tsx`

**File to create:** `src/app/[locale]/intercambios/componer/page.tsx`

**Entry points:**
- "Iniciar Propuesta de Intercambio" CTA on user profiles
- "Proponer intercambio" CTA on MatchCards
- URL format: `/intercambios/componer?userId={uuid}&collectionId={id}`

**Layout (full-page, not modal):**

1. **`ComposerHeader.tsx`** at top — shows both users' avatars, nicknames, collection name.
2. **`StickerSelector.tsx`** in the center — dual tabs (Ofrecer/Pedir) with `StickerGrid.tsx` instances.
3. **`ProposalSummary.tsx`** at bottom — shows selected counts, message input, submit CTA.

**Pre-fill behavior (critical UX):**
- If arriving from a profile match or MatchCard, **pre-select** the overlapping stickers in both grids (offer and request).
- The composer MUST fetch **fresh** sticker data on mount — do NOT carry over cached match data. Between viewing the match and opening the composer, stickers may have been traded away.
- If a pre-filled sticker is no longer available (count changed), show it grayed out with tooltip: "Este cromo ya no está disponible".
- The user can **add, remove, or adjust quantities** before submitting — never auto-submit.
- Pre-filled items should have a subtle visual indicator (e.g., "Sugerido" chip) so users understand these were auto-selected.

**Submit flow:**
1. Call `useCreateProposal` with selected offer/request items and optional message.
2. On success, redirect to `/intercambios?tab=outbox&tradeId={newId}` so the user sees their sent proposal and can start chatting.
3. Show success toast: "Propuesta enviada a {Nickname}".
4. After success, invalidate React Query caches: `queryKeys.proposalsAll()`, `['globalUnreadBadge']`.

**Validation:**
- At least 1 offer item and 1 request item required.
- Message optional but encouraged (placeholder: "Añade un mensaje para {Nickname}...").

**Duplicate proposal prevention:**
- Before rendering the composer, check if the user already has a pending proposal to this user for this collection.
- If yes, show: "Ya tienes una propuesta pendiente con {Nickname} para este álbum" with a link to view it.
- Also add a server-side check in the `create_trade_proposal` RPC (see Mitigations below).

**State loss prevention:**
- Add `beforeunload` listener when the composer has unsaved selections.
- On navigation attempts, show confirmation: "¿Salir sin enviar? Perderás los cromos seleccionados."

**Rate limiting (basic):**
- Add a rate limit check to the `create_trade_proposal` RPC before Phase 5's full UI:
  ```sql
  IF (SELECT COUNT(*) FROM trade_proposals
      WHERE from_user = v_from_user AND created_at > now() - interval '1 day') >= 10
  THEN RAISE EXCEPTION 'DAILY_LIMIT_REACHED';
  END IF;
  ```
- Client-side: catch `DAILY_LIMIT_REACHED` and show: "Has alcanzado el límite diario de 10 propuestas."

### Phase 2 Validation

**🤖 Automated (run in terminal):**
- `npm run build` — zero errors, new route pages in build output
- Verify files exist: `page.tsx`, `loading.tsx`, `error.tsx` for both `/intercambios/` and `/intercambios/componer/`
- RLS constraint test: insert `trade_chats` with `trade_id` set + `listing_id` NULL → succeeds; both set → fails; neither set → fails
- Duplicate proposal test: call `create_trade_proposal` twice with same params → second call raises error
- Rate limit test: call RPC 11 times as same user → 11th fails
- Query key check: `grep -n 'queryKey' src/hooks/trades/*.ts` — no duplicate patterns

**🖥️ Agent Browser (localhost):**
- Navigate /intercambios → tabs render, switching works, URL updates with ?tab param
- Empty state → CTA to /intercambios/buscar links correctly
- Create a test proposal via Supabase → appears in outbox, ProposalCard renders with correct info
- Click ProposalCard → ProposalDetailModal opens with Resumen + Mensajes tabs
- Navigate /intercambios?tradeId={id} → modal auto-opens for that trade
- Chat: send message from one user → appears instantly in other user's tab (Realtime)
- Composer: navigate to /intercambios/componer?userId=X&collectionId=Y → loads with correct header + stickers
- Pre-fill: arrive from profile CTA → stickers pre-selected, can deselect/adjust
- Submit: select items → submit → toast → redirect to outbox → proposal visible
- Validation: try submit with 0 offers → disabled/error
- State loss: select stickers → click back → confirmation dialog
- Duplicate: try to create same proposal twice → error message
- Loading: throttle network → skeleton renders (no blank page)
- Error: block API → error page with retry
- Mobile 375px: tabs full-width, cards stack vertically, modal full-screen
- Composer 375px: sticker grids scroll, submit button accessible
- Dark mode: all elements correct, gold chat bubbles visible

**👤 User Manual (deployed):**
- Real proposal flow from phone: visit user → CTA → compose → submit → appears in both inboxes
- Chat: send message, other user responds → real-time both sides
- Accept/reject: receiving user acts → status updates for both
- Push notification → tapping opens the proposal
- Duplicate prevention: try sending same proposal twice → clear error
- Capacitor: test swipe-to-go-back from composer → confirmation dialog if stickers selected

---

## Phase 3: Matching Discovery Hub — `/intercambios/buscar/`

**File to create:** `src/app/[locale]/intercambios/buscar/page.tsx`

### Layout

**Top section:** Collection selector — stylish dropdown allowing the user to select one of their active albums. Default to their most-populated collection.

**Filters bar:** Mount `FindTradersFilters.tsx` below the selector. Provides rarity, team, player search, min overlap controls.

**Sort controls:** Toggle between `distance`, `overlap`, and `mixed` (the weighted default). Surface as segmented control or dropdown.

### Distance Resolution

**Primary:** Use the user's postcode from their profile, resolved to lat/lon via `postal_codes` table join. This is the existing behavior.

**Enhancement (opt-in):** Offer a "📍 Usar mi ubicación exacta" button that requests browser geolocation via `navigator.geolocation.getCurrentPosition()`. If granted, pass lat/lon directly to `find_mutual_traders` for more precise distance. If denied or unavailable, silently continue with postcode. Store preference in localStorage.

**If user has no postcode:** Show a prompt to add one in profile settings, with a link to `/profile/completar`. Disable distance sort but still allow overlap-based matching.

**⚠️ Distance display — use bucketed ranges, not exact decimals:**
- `< 1 km`, `~2 km`, `~5 km`, `~10 km`, `~20 km`, `~50 km`, `> 50 km`
- This prevents location triangulation and feels more natural than "2.37 km"

### Matches Grid

**Desktop (≥768px):** Responsive grid (`grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6`) of `MatchCard.tsx` components. Clicking a card opens a **side drawer** (desktop) or **bottom sheet** (mobile) with `MatchDetail.tsx` showing exact sticker lists.

**Mobile (<768px):** Scrollable vertical feed. Full-width cards optimized for thumb interaction. Large tap targets on CTAs.

**Card enhancements:**
- Hover micro-animation: `whileHover={{ y: -4, scale: 1.01 }}` via Framer Motion (consistent with existing ListingCard pattern).
- Green-tinted border for high-overlap matches (≥10 mutual stickers).
- Gold-tinted border for the #1 best match.
- Show reputation tier badge and completed trades count on each card.

**⚠️ StickerGrid performance:** Some collections have 1,000+ stickers. If the grid has >100 items, consider:
- Virtual scrolling (`@tanstack/react-virtual`) or paginating with "Load More" inside the grid
- `loading="lazy"` on sticker images with placeholder shimmer

**Pagination:** "Load More" button (consistent with marketplace), calling `useFindTraders` with offset pagination.

**No-duplicates prompt:** If the logged-in user has 0 duplicates for the selected collection, show a prominent banner above the results:
```
ℹ️ No tienes repetidos registrados para este álbum.
Añade tus cromos repetidos para encontrar intercambios.
[Ir a Mi Colección →]
```
Still show matches below (viewing them motivates entering duplicates), but show "Puedes recibir X cromos · Puedes ofrecer 0 cromos" on each card and **disable** the "Proponer Intercambio" CTA until the user has ≥1 duplicate.

**Empty state:** If no matches found for the selected collection/filters:
- "No hemos encontrado coincidencias para este álbum todavía."
- Suggestions: "Intenta ampliar el radio de búsqueda" or "Añade más cromos a tu colección"
- Secondary CTA: "Publicar un anuncio en el Marketplace →"

### Also Create

- `src/app/[locale]/intercambios/buscar/loading.tsx` — Skeleton with filter bar placeholder + card grid skeleton.
- SEO: `generateMetadata()` with translated title/description for the matching hub.

### Phase 3 Validation

**🤖 Automated (run in terminal):**
- `npm run build` — `/intercambios/buscar` route compiles
- Verify `generateMetadata()` exists in `buscar/page.tsx` and returns locale-appropriate title/description
- Call `find_mutual_traders` RPC with valid params (no lat/lon) → returns results without error
- Call RPC with lat/lon/radius → returns distance-sorted results
- Call RPC for a collection with only 1 user → returns empty array

**🖥️ Agent Browser (localhost):**
- Collection selector renders with user's albums, defaults to most-populated
- Switching collection refreshes match list
- Filter bar: apply rarity/team/player filters → results change (debounced)
- Sort toggle: distance/overlap/mixed all reorder results correctly
- Distance sort disabled for user without postcode → prompt shown
- Desktop 1440px: 3-4 column grid, hover animation works, green/gold borders visible
- Mobile 375px: single column feed, full-width cards, large tap targets, no horizontal overflow
- Click match card → desktop: side drawer opens; mobile: bottom sheet opens
- MatchDetail shows two-column sticker comparison
- "Proponer Intercambio" CTA links to /intercambios/componer with correct query params
- Pagination: >20 matches → "Load More" button works, appends (doesn't replace)
- Empty state: select collection with no matches → friendly message + marketplace CTA
- No postcode: prompt shown with link to /profile/completar, overlap matching still works
- No duplicates: prominent banner shown, CTA disabled on match cards
- Geolocation opt-in: click "📍" → permission prompt → results re-sort with precise distance
- Geolocation denied → silent fallback, no error
- Skeleton loading: throttle network → filter placeholder + card skeleton renders
- Dark mode: all elements correct, card borders visible against dark background
- Full end-to-end: browse → match detail → "Proponer" → composer pre-fills → submit → outbox

**👤 User Manual (deployed):**
- Open /intercambios/buscar on real phone with real account → real matches load
- Distance values look plausible, displayed as bucketed ranges
- Overlap counts match expectations
- Match → trade full flow works with production data
- Performance: page loads <3 seconds, scrolling smooth, filter changes respond <1 second
- View page source: `<title>` and `<meta name="description">` present and correct per locale
- Copy URL and open in different account → shows THAT user's matches (not yours)

---

## Styling & UX Guidelines

### Design System Compliance

- **Use existing tokens exclusively:** `--gold` (`#FFC000`), `--gold-light`, `--gold-dark`, `--surface-*`, `--shadow-*` from `src/styles/theme.css`.
- **Use existing utility classes:** `card-theme`, `btn-surface`, `badge-*` variants from `globals.css`.
- **Dark mode:** All new UI must support `.dark` class. Test both modes.
- **Fonts:** Geist Sans (existing), no new font imports.

### Animations

- Match cards: `whileHover={{ y: -4 }}` via Framer Motion (matches ListingCard pattern).
- Page transitions: Fade-in on mount for card grids.
- Proposal status changes: Brief highlight animation (already exists in ProposalCard).
- **No gratuitous animation.** Keep it subtle and purposeful.

### Glassmorphism — Use Sparingly

Apply frosted glass treatment ONLY to:
- The mutual matching block on user profiles (the "⚡ Coincidencias" highlight card)
- The match finder page header/hero section

Everything else uses the standard `card-theme` treatment.

### Avatar Fallbacks

Check how `@radix-ui/react-avatar` `AvatarFallback` is currently rendered across the app. Enhance the fallback to show styled initials (first letter of nickname, colored background based on hash of user ID) if not already done. Do NOT build a separate SVG avatar generator.

### Capacitor / Mobile

- Respect safe area insets: `env(safe-area-inset-*)` (already in globals.css).
- Bottom sheet drawers for mobile detail views (use existing Vaul `Drawer` component).
- Touch-scroll: no horizontal overflow, no swipe traps.
- Bottom padding: `pb-20 md:pb-0` for mobile bottom nav (existing pattern).

---

## i18n Requirements

Add translation keys to all three locale files (`src/i18n/messages/es.json`, `en.json`, `pt.json`) for:

- Page titles and descriptions for all `/intercambios/` routes
- Tab labels ("Recibidas", "Enviadas")
- Empty states
- CTAs ("Iniciar Propuesta de Intercambio", "Proponer intercambio", "Buscar coincidencias")
- Matching block labels on profiles
- Filter labels and sort options
- Error messages
- Toast messages (proposal sent, accepted, rejected)
- SEO metadata (titles, descriptions)

Organize under a `trades` (or `intercambios`) key namespace, consistent with existing i18n patterns.

---

## Phase 4: Engagement Boosters

### 4A. Match Alert Notifications

**Goal:** Convert matching from pull (user must visit) to push (app reaches out).

When the system detects a new high-overlap match (e.g., a user near you just logged stickers that overlap with your collection), send a push notification:

> 🔔 ¡Nuevo match! Carlos (3.2km) tiene 9 cromos que te faltan del álbum Panini World Cup

**Implementation:**
- Create a Supabase Edge Function or database trigger that fires when `user_template_progress` is updated (a user enters new stickers).
- Check if the updated user now has new duplicates that match any nearby user's missing stickers (or vice versa).
- If overlap ≥ configurable threshold (default: 3 stickers), queue a notification via the existing `notifications` table.
- Respect notification preferences (`notification_preferences.push_enabled`).
- Debounce/batch: don't send more than 1 match alert per user per hour.

### 4B. "Trades to Complete Your Album" Gamification

**Location:** Collection page (`/mi-coleccion`) or dashboard widget.

Render a motivational widget:

```
📊 Te faltan 23 cromos del Panini World Cup.
   Con 3 intercambios podrías conseguir hasta 18 de ellos.
   [Ver coincidencias →]
```

**Implementation:**
- Calculate: for this user's missing stickers, how many could theoretically be obtained via matching? (Sum of overlap from all matches).
- Show a progress bar or visual indicator connecting collection completion to trade activity.
- Link directly to `/intercambios/buscar?collectionId={id}`.

### 4C. Save/Watchlist Matches

**Goal:** Let users bookmark matches they're interested in but not ready to trade with yet.

**Implementation:**
- Add a bookmark/save icon on `MatchCard.tsx`.
- Store saved matches in localStorage (MVP) or a new `saved_matches` table (if persistence across devices matters).
- Add a "Guardados" filter/tab on the matching hub to view saved matches.
- Show a subtle indicator on saved matches when their overlap changes: "⬆️ 2 nuevas coincidencias desde que lo guardaste".

### 4D. Trade Completion Celebration

**Goal:** Close the engagement loop with a shareable, rewarding moment.

When both parties confirm a trade (via `useTradeFinalization`):
1. Show a celebratory animation (confetti or sticker-themed particle effect).
2. Display a summary card:
   ```
   🎉 ¡Intercambio completado!
   +3 cromos añadidos a tu colección
   Panini World Cup: 415/600 → 418/600 (69.7%)
   ```
3. Prompt to rate the trader (wire existing `UserRatingDialog`).
4. Show a "Share" CTA (reuse the existing share infrastructure from marketplace listings).

### 4E. Dashboard Trading Widgets

**Location:** Dashboard page (`/dashboard`).

Add two widgets to the dashboard:

**Widget 1: "Tus Coincidencias"**
- "{X} coleccionistas cerca de ti tienen cromos que te faltan"
- Show top 3 matches as mini-cards (avatar + overlap count)
- "Ver todos →" links to `/intercambios/buscar`

**Widget 2: "Propuestas Pendientes"**
- "{Y} propuestas pendientes de respuesta"
- Quick-action badges for unread proposals
- Links to `/intercambios?tab=inbox`

### Phase 4 Validation

**🤖 Automated (run in terminal):**
- `npm run build` — dashboard still compiles with new trading widgets
- If Edge Function for match alerts: verify it deploys without error
- Test debounce: insert two sticker updates within 1 hour for same user → only 1 notification created

**🖥️ Agent Browser (localhost):**
- Dashboard: "Tus Coincidencias" widget renders with match count + mini-cards; links navigate correctly
- Dashboard: "Propuestas Pendientes" widget shows count with link to /intercambios?tab=inbox
- Trade completion: complete a test trade (both confirm) → celebration animation plays → summary card with correct sticker count and % → rating dialog appears
- Save/watchlist: bookmark a match → icon toggles → "Guardados" tab shows saved match → remove bookmark works
- Collection page: gamification widget shows "Te faltan X cromos" + progress → link to /intercambios/buscar works
- Dark mode: all widgets render correctly

**👤 User Manual (deployed):**
- Enter new stickers into your collection → wait → push notification arrives (if threshold met)
- Tap match alert notification → opens relevant match
- Dashboard widgets show relevant, actionable data for your account
- Complete a real trade → celebration feels rewarding, share CTA works

---

## Phase 5: Trust & Spam Mitigations

> **Note:** Basic rate limiting (10/day in the RPC) is already added in Phase 2. This phase adds the polished UI and additional trust features.

### 5A. Proposal Rate Limiting (UI Enhancement)

- Show remaining quota in the composer: "Te quedan {N} propuestas hoy".
- When limit reached, show: "Has alcanzado el límite diario. Vuelve mañana." with the exact reset time.
- Add a query to count today's proposals for the current user on composer mount.

### 5B. Response Rate Display

- Track and display response metrics on match cards:
  - "Suele responder" (responded to ≥70% of proposals in <24h) — green badge
  - "Responde a veces" (30-70%) — yellow badge
  - No badge if insufficient data (<3 proposals received)
- Calculate from `trade_proposals` where `to_user` = this user, comparing `created_at` vs first response.
- Consider creating a materialized view or caching this computation — don't recalculate per match card render.

### 5C. Availability Status

- Add a toggle in user settings: **"Disponible para intercambios"** (on/off).
- When off, the user doesn't appear in match results and receives no match alerts.
- Show status on profile page and match cards.
- Respect this in the `find_mutual_traders` RPC query (or filter client-side initially).
- Default: ON for all existing users.

### Phase 5 Validation

**🤖 Automated (run in terminal):**
- Rate limit enforcement: create 10 proposals as one user → 11th fails with `DAILY_LIMIT_REACHED`
- Availability: set user availability to off → `find_mutual_traders` excludes them from results
- Response rate calculation: insert test proposals with known response times → badge calculation is correct

**🖥️ Agent Browser (localhost):**
- Composer: "Te quedan {N} propuestas hoy" counter shows and decrements after each proposal
- At limit: submit button disabled, error message with reset time displayed
- Match cards: "Suele responder" green badge for test user with good response history
- No badge for users with insufficient data
- Settings: toggle "Disponible para intercambios" off → search from another account → you don't appear
- Toggle back on → you reappear in results
- Profile page: availability status shown correctly

**👤 User Manual (deployed):**
- Send several proposals in a day → rate limit message is clear, non-frustrating, reset time accurate
- Toggle availability off → verify no match alert notifications arrive
- Toggle back on → notifications resume
- Check response rate badges on real match cards → badges feel accurate and useful

---

## Data-Driven Configuration Defaults

Based on production database analysis (1,145 active users, 965 with postcodes):

| Config | Value | Rationale |
|---|---|---|
| Default search radius | **50km** | Covers urban metro areas. Madrid (190 users) and Barcelona (95 users) are concentrated enough. |
| Minimum overlap to show match | **1 sticker** | With 8,828 match pairs and avg 33 overlap for Panini, even a threshold of 1 yields quality results. |
| Match alert notification threshold | **3 stickers** | Avoids noise from marginal single-sticker overlaps. |
| Proposal daily limit | **10** | Prevents spam while allowing active traders to operate freely. |
| Default sort | **mixed** (weighted score) | Balances distance and overlap — best for first-time users. |
| For collections with <20 national users | Show all matches country-wide | Distance-based matching is less useful at low density. Hide distance sort. |
| "Enter your duplicates" prompt threshold | Show when user has 0 duplicates logged | Only 29-39% of users have entered duplicates. The prompt drives data entry which feeds the matching engine. |

---

## Global Acceptance Criteria (All Phases)

### Routing
- [ ] `/intercambios` renders proposals inbox/outbox with tab switching.
- [ ] `/intercambios/componer?userId=X&collectionId=Y` renders the composer with pre-filled stickers.
- [ ] `/intercambios/buscar` renders the matching hub with filters and results.
- [ ] All routes work with all three locales (`/es/intercambios`, `/en/intercambios`, `/pt/intercambios`).
- [ ] `?tradeId=X` query param on `/intercambios` auto-opens the correct proposal modal.

### Database Integration
- [ ] Creating a proposal via the composer inserts correct records in `trade_proposals` and `trade_proposal_items`.
- [ ] Duplicate proposal prevention: second identical proposal raises error.
- [ ] Rate limiting: 11th proposal in a day raises `DAILY_LIMIT_REACHED`.
- [ ] Chat messages sent from `ProposalDetailModal` create `trade_chats` records with `trade_id` set and `listing_id` NULL (no constraint violations).
- [ ] RLS permits participants to view/chat on their own proposals and blocks access to others'.
- [ ] Marketplace notification routing is UNCHANGED after deep linking updates.

### Navigation
- [ ] MobileBottomNav shows "Intercambios" tab (replacing Favoritos) with unread badge via lightweight polling.
- [ ] SiteHeader includes "Intercambios" nav link.
- [ ] Trade notifications navigate to correct `/intercambios/` URLs.
- [ ] Deep links from push notifications route correctly.
- [ ] No `useUnreadCounts` WebSocket mounted in always-visible nav components.

### Responsive
- [ ] Test at 375px (mobile), 768px (tablet), 1440px (desktop).
- [ ] Test at 320px minimum — MobileBottomNav doesn't overflow.
- [ ] Match grid collapses from multi-column to single-column on mobile.
- [ ] Composer is usable on mobile (sticker grids scroll, submit button accessible).
- [ ] ProposalDetailModal scrolls correctly with chat on all viewport sizes.

### Performance
- [ ] No always-on WebSocket connections from nav components.
- [ ] StickerGrid handles 200+ stickers without visible jank.
- [ ] `/intercambios/buscar` loads within 3 seconds with production data.

### UX
- [ ] Empty states show helpful messages and CTAs (never a blank page).
- [ ] Loading states show skeletons (never layout shift or blank flash).
- [ ] Dark mode works correctly across all new pages.
- [ ] No new gold color values — exclusively using `--gold` / `#FFC000`.
- [ ] Composer shows confirmation dialog on navigation with unsaved changes.
- [ ] Users with 0 duplicates see a prompt to enter duplicates.
- [ ] Distance values are rounded/bucketed (not exact to decimal).

### Code Quality
- [ ] Profile page modification is ≤5 lines (component import + mount). All matching logic is in `UserTradeMatchSection.tsx`.
- [ ] Zero references to old `/trades/` routes remain in codebase.
- [ ] All new i18n keys exist in es.json, en.json, and pt.json.
- [ ] Dates use locale-aware formatting (not hard-coded `'es-ES'`).
