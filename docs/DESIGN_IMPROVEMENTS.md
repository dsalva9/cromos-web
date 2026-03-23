# Design Improvements Plan

> A prioritized list of visual and UX improvements for CambioCromos, based on a comprehensive frontend design audit.
> Each task is self-contained with enough context for an agent to implement it independently.
>
> **Workflow:** Pick a task → implement → verify → mark `[x]` → commit.

---

## Tech Stack Context

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4 + CSS variables in `src/styles/theme.css`
- **UI Components:** shadcn/ui (Radix primitives) in `src/components/ui/`
- **Animation:** Framer Motion (`framer-motion` v12) already installed
- **Icons:** Lucide React
- **Brand colors:** Primary `#FFC000` (golden yellow), text `#1a1a2e` (near-black), background `#F3F4F6`
- **Tailwind config:** `tailwind.config.ts` — defines brand colors, fonts (Geist Sans/Mono), custom animations
- **Font:** Currently uses `var(--font-geist-sans)` set in `src/app/layout.tsx`

---

## Tasks

### 1. [x] Fix Image Handling in Marketplace Cards

**Priority:** Critical — Trust  
**Impact:** The single most impactful visual fix. Rotated, oddly-cropped, and inconsistent-aspect-ratio user photos make the marketplace grid look broken.

**Problem:**
- User-uploaded photos display at their native aspect ratio, causing jagged grid layouts
- Some images appear rotated (EXIF orientation not corrected)
- No fallback for unusually sized or failed images

**Files to modify:**
- `src/components/marketplace/ListingCard.tsx` — main marketplace card component
- `src/components/home/LeanListingCard.tsx` — landing page card variant
- `src/lib/images/processImageBeforeUpload.ts` — image processing pipeline (check EXIF handling)

**Implementation:**
1. In `ListingCard.tsx` and `LeanListingCard.tsx`, wrap listing images in a fixed-aspect-ratio container:
   ```tsx
   <div className="aspect-[4/3] w-full overflow-hidden rounded-t-lg bg-gray-100">
     <img src={...} className="h-full w-full object-cover" alt={...} />
   </div>
   ```
2. Add an error/fallback state for images that fail to load (placeholder with a card icon)
3. In `processImageBeforeUpload.ts`, ensure EXIF orientation is being read and the image is rotated correctly before upload. The `sharp` library (already in devDependencies) or the canvas API should handle EXIF auto-rotation
4. Ensure the same aspect-ratio container treatment is applied to the landing page marketplace section in `src/components/home/LandingPage.tsx`

**Verification:**
- Browse `/mercado` — all cards should have uniform height in the grid
- Upload a photo taken in portrait mode from a phone — it should display correctly oriented
- View the landing page — marketplace preview cards should have consistent sizes

---

### 2. [x] Tame the OneSignal Notification Popup

**Priority:** Critical — UX  
**Impact:** The popup covers ~40% of mobile viewport on first visit, feels aggressive and unstyled.

**Problem:**
- OneSignal's default "Subscribe to notifications" popup appears immediately on page load
- It's completely unstyled relative to the brand (default blue button, white card)
- On mobile, it blocks most of the viewport making the first impression hostile

**Files to modify:**
- `src/components/providers/OneSignalProvider.tsx` — OneSignal initialization logic
- `src/lib/onesignal/` — OneSignal configuration directory

**Implementation:**
1. Delay the prompt appearance by 30–60 seconds after first page load, or until the user has completed a meaningful action (e.g., viewed 3 listings, completed a trade)
2. Option A (recommended): Disable OneSignal's native prompt entirely and create a custom in-app banner matching the brand aesthetic (yellow/black, bold border, brand typography). Show it as a small dismissible banner at the top or bottom of the page
3. Option B (simpler): Configure OneSignal's slidedown prompt to appear delayed and use the "bell" widget instead of the full-page modal. Style it via OneSignal's dashboard theme settings to use `#FFC000` as the action button color
4. Remember the user's dismissal in localStorage so it doesn't reappear on every session

**Verification:**
- Load the site fresh in an incognito window — popup should NOT appear immediately
- On mobile (390×844 viewport), the notification request should not block more than 15% of the viewport
- The prompt style should use brand colors (yellow/black)

---

### 3. [ ] Typography Upgrade — Display Font for Headings

**Priority:** High — Brand Identity  
**Impact:** Instantly differentiates from generic SaaS. Currently uses Geist Sans for everything.

**Problem:**
- All text uses Geist Sans (a clean but generic system-like font)
- Headers, page titles, and CTAs feel interchangeable with any SaaS product
- The bold "sports/collectibles" personality of the brand isn't reflected in typography

**Files to modify:**
- `src/app/layout.tsx` — font loading (next/font)
- `tailwind.config.ts` — font family definitions
- `src/styles/theme.css` — CSS variable definitions
- Possibly `src/components/home/LandingPage.tsx` for landing-specific typography

**Implementation:**
1. Choose a characterful display font that evokes sports/collectibles energy. Recommended options (pick ONE):
   - **Bebas Neue** — ultra-condensed, athletic feel, great for uppercase headings
   - **Archivo Black** — dense and punchy, works at all sizes
   - **Barlow Condensed (Bold/ExtraBold)** — versatile condensed sans-serif with a sporty feel
2. Load the chosen font using `next/font/google` in `layout.tsx` alongside Geist Sans
3. Add a `font-display` CSS variable and class in `tailwind.config.ts`:
   ```ts
   fontFamily: {
     sans: ['var(--font-geist-sans)', ...defaultTheme.fontFamily.sans],
     display: ['var(--font-display)', ...defaultTheme.fontFamily.sans],
   },
   ```
4. Apply `font-display` to:
   - All `<h1>` and `<h2>` elements (page titles, section headers)
   - Navigation links in `src/components/site-header.tsx`
   - CTA buttons on the landing page
   - Marketplace card titles
5. Keep Geist Sans for body text, descriptions, and UI labels

**Verification:**
- All page titles (MARKETPLACE, MIS ÁLBUMES, CHATS, etc.) should use the display font
- Body text, form labels, and small UI text should still use Geist Sans
- The visual difference should be immediately noticeable — headings should have more "personality"

---

### 4. [x] Add Motion & Animations

**Priority:** High — Premium Feel  
**Impact:** The site feels completely static. Adding staggered reveals and micro-interactions elevates perceived quality dramatically.

**Problem:**
- Zero page transitions, card reveals, or hover feedback
- Tailwind config already defines `fadeIn` and `slideUp` keyframes but they're barely used
- Framer Motion is installed but underutilized

**Files to modify:**
- `src/components/marketplace/ListingCard.tsx` — card hover + entrance
- `src/components/home/LeanListingCard.tsx` — landing page cards
- `src/components/templates/SlotTile.tsx` — collection slot cards
- `src/components/ui/progress.tsx` — progress bar animation
- `src/components/templates/TemplateProgressGrid.tsx` — collection progress
- Create: `src/components/ui/animated-list.tsx` — reusable staggered list wrapper

**Implementation:**
1. **Create a reusable `AnimatedList` wrapper** using Framer Motion for staggered reveals:
   ```tsx
   // src/components/ui/animated-list.tsx
   import { motion } from 'framer-motion';

   const container = {
     hidden: { opacity: 0 },
     show: {
       opacity: 1,
       transition: { staggerChildren: 0.05 }
     }
   };

   const item = {
     hidden: { opacity: 0, y: 12 },
     show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
   };
   ```
2. **Card hover effects** — add to `ListingCard.tsx` and `LeanListingCard.tsx`:
   - `hover:translateY(-2px)` + increased shadow on hover
   - Smooth transition: `transition-all duration-200`
3. **Progress bar fill animation** — in `progress.tsx`, animate the indicator width from 0 to the actual value on mount using Framer Motion's `initial`/`animate` or CSS `transition`
4. **Button press feedback** — add `active:scale-[0.98]` to primary CTA buttons globally
5. Wrap marketplace grid, favorites grid, and collection grids with the `AnimatedList` component

**Verification:**
- Navigate to `/mercado` — cards should fade-in with a slight stagger (not all at once)
- Hover over a listing card — it should lift slightly with a shadow increase
- View a collection progress bar — it should animate from 0% to the actual value
- Click a CTA button — it should show a subtle scale-down

---

### 5. [x] Add Background Textures & Depth

**Priority:** Medium — Visual Depth  
**Impact:** Removes the flat "template" feel. Adds atmosphere to the collectibles theme.

**Problem:**
- All backgrounds are flat `#F3F4F6` (light gray) or white
- No visual texture, grain, or patterns anywhere
- The site feels 2D and lacks atmosphere

**Files to modify:**
- `src/styles/theme.css` — global background styles
- `src/app/layout.tsx` — body class modifications
- Possibly create: `public/textures/noise.svg` — inline SVG noise pattern

**Implementation:**
1. Create a subtle noise/grain SVG texture that can be applied as a `:after` pseudo-element or background-image on the body. Example:
   ```css
   body::after {
     content: '';
     position: fixed;
     inset: 0;
     background-image: url('/textures/noise.svg');
     opacity: 0.03;
     pointer-events: none;
     z-index: 9999;
   }
   ```
2. Alternatively, use a CSS-only noise effect via a repeating radial gradient
3. Apply a subtle gradient to section backgrounds on the landing page (`LandingPage.tsx`) to create visual separation between sections
4. Consider adding a very subtle dot-grid or mesh pattern to card backgrounds in the collection detail view to evoke a "card stock" feel

**Verification:**
- View any page — there should be a very subtle texture visible on the background (nearly imperceptible but adding warmth)
- The texture should NOT reduce readability or affect performance
- Landing page sections should have subtle gradient transitions between them

---

### 6. [ ] Harmonize the Badge & Color System

**Priority:** Medium — Visual Consistency  
**Impact:** Currently ~5 different badge styles with inconsistent colors. A unified system would improve coherence.

**Problem:**
- "DISPONIBLE" = green, "CROMO INDIVIDUAL" = dark, "INTERCAMBIO" = blue, "EN MARKETPLACE" = pink/red, "VENDIDO" = gray, "PACK" = separate style
- "REPE" badge is yellow, "FALTA" badge is gray — different from all others
- No single source of truth for badge variants

**Files to modify:**
- `src/components/ui/badge.tsx` — base badge component (shadcn)
- `src/components/marketplace/ListingTransactionBadge.tsx` — listing status badges
- `src/components/templates/SlotTile.tsx` — cromo slot badges (REPE, FALTA, EN MARKETPLACE)

**Implementation:**
1. Define a strict badge color system as Tailwind variants or in the base badge component:
   - **`success`** (green) — for positive states: Available, Have (TENGO), Completed
   - **`warning`** (amber/yellow) — for attention states: Duplicate (REPE), Featured
   - **`destructive`** (red/pink) — for negative states: Missing (FALTA), Unavailable
   - **`info`** (brand blue) — for informational states: In Marketplace, Trade type
   - **`neutral`** (gray) — for inactive states: Sold (VENDIDO), Disabled
   - **`brand`** (yellow/black) — for primary CTAs and brand elements
2. Update `badge.tsx` to include these new variant options
3. Audit and update all badge usages across the codebase to use the correct semantic variant
4. Ensure badge sizing is consistent (same padding, font-size, border-radius everywhere)

**Verification:**
- Browse through marketplace, collection detail, favorites, and profile pages
- All badges should use a consistent sizing and one of the defined semantic colors
- No "orphan" colors that appear only in one place

---

### 7. [ ] Make Collection Cards Feel Physical

**Priority:** Medium — Delight  
**Impact:** The cromo slot cards feel like spreadsheet cells. Making them feel like physical cards adds thematic delight.

**Problem:**
- Cromo slots in collection detail are flat bordered rectangles with text
- No hover interaction, no depth, no tactile feedback
- The "REPE" +/- counter uses browser-default-looking controls

**Files to modify:**
- `src/components/templates/SlotTile.tsx` — main cromo slot component
- Possibly `src/styles/theme.css` — add custom card styles

**Implementation:**
1. Add subtle box shadows to cromo slot cards: `shadow-sm hover:shadow-md transition-shadow`
2. On hover, add a slight perspective tilt or scale effect:
   ```css
   .slot-tile:hover {
     transform: translateY(-2px) scale(1.02);
     box-shadow: 0 4px 12px rgba(0,0,0,0.1);
   }
   ```
3. Style the REPE +/- controls with custom buttons (rounded, brand-colored) instead of default-looking inputs
4. For "FALTA" state, use a subtle diagonal stripe or watermark pattern instead of just gray text
5. For "TENGO" state, consider a subtle green border or checkmark overlay
6. "CREAR ANUNCIO" button inside the tile should use a distinct style (brand yellow, bold)

**Verification:**
- Navigate to a collection detail page — slots should have visible shadows
- Hover over a slot — should feel interactive (lift + shadow change)
- The +/- controls for REPE should look custom-styled, not browser-default
- Visual distinction between FALTA, TENGO, and REPE states should be clearer

---

### 8. [ ] Fix Team Tabs Overflow in Collection Detail

**Priority:** Medium — Usability  
**Impact:** With 20+ teams, tabs wrap into 3 rows pushing content below the fold.

**Problem:**
- LaLiga collections have 20+ team tabs that wrap into multiple rows
- The tab block takes up ~200px of vertical space before any content appears
- No way to quickly find a specific team

**Files to modify:**
- `src/components/templates/TemplateProgressGrid.tsx` or the component that renders the team tab navigation
- Search for tab/section navigation in the collection detail page: `src/app/mis-plantillas/[id]/page.tsx` or similar

**Implementation:**
1. Replace the wrapping flex container with a horizontally scrollable single row:
   ```css
   .team-tabs {
     display: flex;
     overflow-x: auto;
     -webkit-overflow-scrolling: touch;
     scrollbar-width: none; /* hide scrollbar */
     gap: 0.5rem;
     padding-bottom: 0.5rem;
   }
   .team-tabs::-webkit-scrollbar { display: none; }
   ```
2. Each tab should have `flex-shrink: 0` to prevent compression
3. Add subtle edge fade gradients (left/right) to indicate scrollability
4. Optionally add a small search/filter input above the tabs for quick team lookup
5. Make the active tab auto-scroll into view when the page loads

**Verification:**
- Open a LaLiga collection detail page — team tabs should be on a single scrollable row
- Swipe/scroll horizontally to see all teams
- The active team tab should be visible on load
- Content (cromo grid) should be visible without excessive scrolling past navigation

---

### 9. [ ] Brand-Color All Interactive Elements

**Priority:** Low — Polish  
**Impact:** Blue toggles and focus rings break the yellow/black brand identity.

**Problem:**
- Toggle switches on the settings page (`/ajustes`) use default blue color instead of brand yellow
- Some focus rings and active states use browser default blue
- Creates a visual disconnect with the rest of the brand

**Files to modify:**
- `src/components/ui/switch.tsx` — the Radix UI Switch component (shadcn)
- `src/styles/theme.css` — global focus/ring styles
- `src/components/settings/NotificationTypeToggle.tsx` — notification toggle component

**Implementation:**
1. In `switch.tsx`, update the "checked" state color from the default blue to brand yellow:
   ```tsx
   // Change the Switch's thumb/track colors
   // Track: data-[state=checked]:bg-primary (which maps to #FFC000)
   // Thumb: stays white
   ```
2. In `theme.css`, ensure `--ring` CSS variable uses the brand color so all focus rings are yellow:
   ```css
   --ring: 45 100% 50%; /* HSL for #FFC000 */
   ```
3. Audit all Radix UI components for hardcoded blue states and update to use the `primary` color token

**Verification:**
- Navigate to `/ajustes` — all toggles should be yellow when "on", gray when "off"
- Tab through interactive elements on any page — focus rings should be yellow, not blue
- No blue accent colors should remain anywhere on the site

---

### 10. [ ] Break the Grid — Add Visual Surprise

**Priority:** Low — Differentiation  
**Impact:** The rigid, predictable grid layout makes every page feel interchangeable. Small layout surprises create memorability.

**Problem:**
- Every page follows the same pattern: title → even grid → repeat
- No overlapping elements, asymmetric layouts, or visual breaks
- The landing page feature section (3 icons in a row) is the most "template" layout possible

**Files to modify:**
- `src/components/home/LandingPage.tsx` — landing page layout
- `src/components/profile/ProfileHeaderCard.tsx` — profile header
- Marketplace pages for featured listings

**Implementation:**
1. **Landing page features section:** Replace the 3-column icon grid with a staggered/overlapping card layout, or a horizontal scroll with cards at varying heights
2. **Landing page hero:** Let the phone mockup slightly overlap the section below for visual continuity
3. **Profile page stats:** Use an asymmetric layout — e.g., the main stat (trades completed) is 2× larger than secondary stats, with them arranged in a masonry-like grid
4. **Marketplace:** Consider a "featured" listing card that spans full width or is doubled in size, breaking the regular grid pattern
5. **Collection cards:** The album cover could overflow its card container slightly (positioned with negative margin) to create a 3D-layered look

**Verification:**
- View the landing page — the features section should NOT be a plain 3-column grid
- The profile page should have at least one element with a non-standard size or position
- The overall impression should be that the site has deliberate design choices, not just "content in boxes"
