# Dashboard Redesign — Agent Prompt

## Context

CambioCromos is a Next.js 16 / React 19 / Supabase app for trading sports stickers (cromos). The UI uses Tailwind CSS 4, shadcn/ui components, and Lucide icons. The app is in Spanish.

The main authenticated dashboard lives at:
- **Component:** `src/components/dashboard/UserDashboard.tsx` (client component, `'use client'`)
- **Rendered by:** `src/app/page.tsx` — when the user is authenticated, it renders `<UserDashboard />`

The current dashboard is a static "my account summary" page. It shows:
1. Profile header (avatar, name, email, location, rating, admin badge, edit profile button)
2. "Mis Álbumes" — user's template copies with progress bars
3. Badges (via `<ProfileBadgesSimple>`)
4. Stats cards (3-col grid: active listings count, favorites count, ratings count)
5. Active listings grid (conditional)
6. Ratings summary with distribution bars (conditional)

**The problem:** This dashboard does not drive engagement. It feels like a settings/profile page, not a home screen. Users log in and see a summary of themselves with no call to action, no reason to explore, and no sense of community activity. Stats showing "0" everywhere are discouraging for new users.

---

## Goal

Restructure `UserDashboard.tsx` into an **engaging home screen** that drives users toward the core loop: browse marketplace → trade cromos → complete albums. The dashboard should feel alive, actionable, and personalized.

---

## Design Requirements

### 1. Compact Profile Header
Shrink the profile section. The user doesn't need to see their own email, full location, and rating breakdown every time they visit. Keep it to:
- Avatar (smaller, ~64px) + nickname + rating stars inline
- "Editar Perfil" link (text link, not a big button)
- Admin badge if applicable
- Remove email, postcode, and detailed location from the dashboard header — that belongs in the settings/profile page

### 2. Quick Actions Bar (NEW — right below profile)
A horizontal row of 3-4 action cards that drive the core loop:
- **"Explorar Marketplace"** → `/marketplace` — icon: Store/ShoppingBag
- **"Publicar Anuncio"** → `/marketplace/create` — icon: PlusCircle
- **"Descubrir Colecciones"** → `/templates` — icon: LayoutGrid
- **"Mis Chats"** → `/chats` — icon: MessageCircle

Style: compact cards with icon + label, using the brand yellow (#FFC000) accent on hover. These should feel like primary navigation shortcuts.

### 3. "Complete Your Collection" CTA Banner (NEW — prominent)
For each incomplete album the user has, show a **contextual CTA** that bridges the gap between "here's my progress" and "here's what to do." For the user's most incomplete album (or the one most recently accessed), show a banner like:

> **Te faltan 477 cromos** de ADRENALYN XL 25-26
> [Buscar en el Marketplace →]

Link the button to `/marketplace` (in the future this could be filtered by collection, but for now just link to marketplace root).

If the user has no albums, show a "start your first collection" CTA instead → `/templates`.

Only show ONE banner (for the album with the most missing cromos), not one per album.

### 4. Albums Section (Keep but streamline)
Keep the "Mis Álbumes" grid as-is — the album cards with progress bars are good. But move it below the CTA banner. The section already handles empty state well.

### 5. Recent Marketplace Listings (NEW)
Add a new section: **"Últimos anuncios"** showing the 4-6 most recent active listings from the marketplace. This makes the dashboard feel alive and gives users something to browse immediately.

Fetch these with a new client-side query:
```typescript
const { data } = await supabase
  .from('listings')
  .select('*')
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(6);
```

Use the existing `<ListingCard>` component (`src/components/marketplace/ListingCard.tsx`) to render them in a responsive grid. Add a "Ver más en el Marketplace →" link at the bottom.

If there are no listings, don't show this section at all.

### 6. Stats Cards → Action-Oriented Cards (Redesign)
Replace the current static stats cards (that show "0" for new users) with action-oriented cards that adapt based on state:

- **If user has 0 active listings:** Show "Publica tu primer anuncio" with a subtle illustration/icon and link to `/marketplace/create`
- **If user has active listings:** Show current behavior — count + "Anuncios activos" linking to `/marketplace/my-listings`
- Same pattern for favorites:
  - 0 favorites → "Guarda tus favoritos" → `/marketplace` (encourage browsing)
  - Has favorites → current count display → `/favorites`
- Ratings: keep as-is (count display, no empty-state CTA needed)

### 7. Badges (Keep as-is)
The `<ProfileBadgesSimple>` component is fine where it is. Keep it after the albums section.

### 8. Remove from Dashboard
- **Active Listings grid** — this duplicates what's in `/marketplace/my-listings`. The stats card already links there. Remove the full listings grid from the dashboard.
- **Ratings distribution section** — this is profile-page content, not dashboard content. Remove it. The rating is already visible in the compact profile header.

### 9. Section Order (Top to Bottom)
1. Compact profile header
2. Quick actions bar
3. "Complete your collection" CTA banner
4. Mis Álbumes (album progress grid)
5. Badges
6. Últimos anuncios (recent marketplace listings)
7. Stats/action cards

---

## Technical Notes

### Existing hooks and components to reuse:
- `useUser()` and `useSupabaseClient()` from `@/components/providers/SupabaseProvider`
- `useUserProfile(userId)` from `@/hooks/social/useUserProfile` — already fetches profile + listings
- `ProfileBadgesSimple` from `@/components/badges/ProfileBadgesSimple`
- `ListingCard` from `@/components/marketplace/ListingCard`
- `resolveAvatarUrl()` from `@/lib/profile/resolveAvatarUrl`
- `Button`, `Badge` from `@/components/ui/*`
- Icons from `lucide-react`

### Data already fetched (keep):
- Profile data via `useUserProfile`
- Template copies via `supabase.rpc('get_my_template_copies')`
- Badges via `ProfileBadgesSimple` (self-contained)

### Data to add:
- Recent marketplace listings: simple query on `listings` table (see above)

### Data to remove:
- Rating summary (`get_user_rating_summary` RPC) — no longer needed on dashboard
- Individual ratings (`get_user_ratings` RPC) — no longer needed on dashboard
- Remove the `ratingSummary`, `ratings`, `loadingRatings` state and the `fetchRatings` useEffect entirely

### Progressive loading:
The performance was just fixed — sections already load independently with skeleton placeholders. Maintain this pattern. The new "recent listings" section should show its own skeleton while loading.

### Styling conventions:
- Brand yellow: `#FFC000` (hover/accent) and `#FFD700` (hover state)
- Rounded cards: `rounded-xl` or `rounded-2xl`
- Borders: `border border-gray-200 dark:border-gray-700`
- Background: `bg-white dark:bg-gray-800` for cards, `bg-gray-50 dark:bg-gray-900` for page
- Font weights: `font-black` for headings, `font-bold` for labels
- Dark mode support: always include `dark:` variants

### Files to modify:
- `src/components/dashboard/UserDashboard.tsx` — main restructure (this is the only file that needs significant changes)

### Listing type reference:
The `Listing` type is at `src/types/v1.6.0.ts`. The `ListingCard` component accepts `{ listing: Listing }` as props.

---

## What NOT to do
- Don't create new files unless absolutely necessary — work within `UserDashboard.tsx`
- Don't change the routing in `page.tsx`
- Don't modify `useUserProfile` hook
- Don't add new npm dependencies
- Don't over-engineer — no new hooks for simple one-off queries
- Don't add English text — everything user-facing must be in Spanish
- Run `npm run build` when done to verify no errors
