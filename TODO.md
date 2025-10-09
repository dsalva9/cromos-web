# Project Roadmap & TODO

## 🚀 Current Sprint: v1.5.0 – MVP & Quality Baseline

### 🔴 Critical Fixes (Pre-Implementation) ✅ **COMPLETE**

- [x] Remove duplicate Supabase client instance (`src/lib/supabase/client.ts`) – **DONE**: Deleted unused file
- [x] Add batch RPC `get_multiple_user_collection_stats` (used in useProfileData) – **DONE**: Implemented and integrated
- [x] Add ErrorBoundary component to layout.tsx – **DONE**: Spanish fallback UI with retry button
- [x] Add `logger.ts` utility and replace all `console.log` calls – **DONE**: 67 statements replaced across 19 files
- [x] Update ESLint rules (strict typing, no-unused-vars, no-console) – **DONE**: Errors: 0, Warnings: 8 (test files only)
- [x] Verify performance: Profile load <1s with 5 collections – **DONE**: Batch RPC eliminates N+1 queries

**Acceptance**: ✅ All requirements met. Zero ESLint errors; single Supabase client; logger replaces all console calls; ErrorBoundary catches errors gracefully; batch RPC deployed.

**Actual Time**: 1 session (Session 1 of v1.5.0)

---

### 🧩 MVP Features (Implementation Order)

#### 1. Admin Backoffice (MVP)

- [ ] Add profiles.is_admin boolean + RLS/guard note
- [ ] SECURITY DEFINER admin RPCs for CRUD: collections/pages/stickers
- [ ] Bulk upload (CSV/XLSX) preview → apply + image uploader (client → WebP + 100px thumb)
- [ ] UI at /admin: tabs → Collections | Pages | Stickers | Bulk Upload | Audit
- [ ] Publish/draft toggle for collections
- [ ] Append-only audit log of admin actions

**Acceptance**: Non-admins blocked; admin can create/edit/publish collections and add/upload stickers via forms or bulk flow; audit entries recorded.

#### 2. Badges UI (Read-Only)

- [ ] Hook useUserBadges() (read)
- [ ] BadgeCard grid in /profile + empty state + Retro-Comic styling

**Acceptance**: Existing badges render correctly; responsive; a11y labels present.

#### 3. Quick Entry ("Abrir un sobre")

- [ ] Route /mi-coleccion/[id]/pack (auth)
- [ ] 5 numeric inputs (paste CSV/space/semicolon → auto-split; dedupe; auto-advance)
- [ ] Call bulk_add_stickers_by_numbers and show summary (añadidos, repes, inválidos)
- [ ] Optimistic progress update + clear/"Abrir otro sobre" flow

**Acceptance**: Enter 1–5 numbers and add in one action; invalids flagged; repes increase correctly; mobile keyboard OK.

#### 4. Location-Based Matching (Centroid + Haversine) ✅ **NEW**

**Database**:
- [ ] Add `postcode` TEXT NULL to profiles table
- [ ] Create `postal_codes` table with (country, postcode PK, lat, lon)
- [ ] Populate postal_codes with centroid data for ES postcodes
- [ ] Add index on postal_codes(postcode)

**Backend**:
- [ ] Extend `find_mutual_traders` RPC with optional params: p_lat, p_lon, p_radius_km, p_sort
- [ ] Implement Haversine distance formula in RPC
- [ ] Support sort modes: "distance" | "overlap" | "mixed" (0.6 overlap + 0.4 distance_decay)
- [ ] Filter matches by radius (10–100 km)

**Frontend**:
- [ ] Add postcode input to ProfilePage (optional field)
- [ ] Add LocationSettings component with privacy note
- [ ] Add TraderListSortControls (dropdown for sort mode + radius slider)
- [ ] Display distance in match cards (~12 km)
- [ ] Add toggle: "Sort by proximity" / "Prioritize nearby traders"

**Acceptance**: Users with postcodes see matches ordered by distance + overlap; privacy preserved (no exact address shown); radius filter works; mixed scoring balances proximity and trade value.

#### 5. Profile Avatars (Seed Pack)

- [ ] Seed 12 avatar images under avatars/seed/…
- [ ] AvatarPicker in /profile selects a seed avatar (writes profiles.avatar_url)
- [ ] (Phase B, flagged) later allow secure uploads

**Acceptance**: Selection persists; a11y/keyboard navigation OK.

---

### 🟡 High Priority (During v1.5.0)

- [ ] Refactor useAlbumPages into smaller hooks (split 876-line hook)
- [ ] Integrate TanStack Query for caching and request deduplication
- [ ] Add Zod input validation for all forms
- [ ] Add CSRF protection to Admin RPCs

**Acceptance**: Hooks < 200 lines each; TanStack Query DevTools visible; Zod schemas validate all inputs; CSRF tokens required for admin actions.

---

### 🟢 Medium & Low Priority (Post-MVP v1.5.1–1.5.2)

**Performance & Optimization**:
- [ ] Code splitting (Next.js dynamic imports for heavy components)
- [ ] Image optimization with Next/Image loader (WebP/AVIF)
- [ ] Add loading skeletons to key pages (replace "Cargando..." text)
- [ ] Add SWR or cache pattern for album pages
- [ ] Add performance monitoring (Vercel Speed Insights or GA4 Web Vitals)

**Code Quality**:
- [ ] Generate DB types via Supabase CLI (`npm run types:generate`)
- [ ] Standardize error handling across hooks (consistent pattern)
- [ ] Clean unused imports/dead code (ESLint auto-fix)
- [ ] Normalize naming conventions (components = PascalCase, hooks = camelCase)

**Security & Infrastructure**:
- [ ] Add rate limiting (Supabase Edge Functions)
- [ ] Add input sanitization middleware
- [ ] Add RBAC audit logging for all admin actions

**Testing & Documentation**:
- [ ] Add unit tests for complex hooks (vitest)
- [ ] Re-enable Playwright E2E tests (v1.5.2)
- [ ] Add architecture diagram (Mermaid)
- [ ] Add JSDoc documentation for key hooks

---

### 📊 Milestone Closure Criteria

- [ ] All Critical + MVP features implemented and verified
- [ ] Performance targets met:
  - Profile load < 800ms (5 collections)
  - Album page load < 500ms
  - Initial bundle < 500KB
- [ ] QA smoke tests pass on Vercel staging
- [ ] Location matching verified with real postcode data
- [ ] Admin backoffice tested with bulk upload (50+ stickers)

---

### Deferred to v1.5.2+

- [ ] Playwright test refactor & CI re-enable
- [ ] Profile avatar uploads (Phase B - secure user uploads)
- [ ] Realtime notifications (Supabase Realtime subscriptions)
- [ ] Feature-based folder structure refactor

**Note**: Update CHANGELOG on completion of each workstream.

---

## ✅ Previous Sprint: v1.4.4 - Trade Finalization & Notifications Complete

### v1.4.4 Feature Status

**Trade Finalization ✅ | Notifications MVP ✅ | Historial Tab ✅ | All Documentation Complete ✅**

- [x] **Trade Finalization System**
  - [x] Database: `trade_finalizations` table with composite PK
  - [x] RPC: `mark_trade_finalized(p_trade_id)` returns both_finalized status
  - [x] Hook: `useTradeFinalization` with optimistic updates and toasts
  - [x] UI: Finalization button in ProposalDetailModal for accepted trades
  - [x] UI: Progress indicator showing X/2 participants finalized
  - [x] Auto-close modal when both parties confirm finalization
- [x] **Notifications System (MVP)**
  - [x] Database: `notifications` table with 4 kinds (chat_unread, proposal_accepted, proposal_rejected, finalization_requested)
  - [x] Triggers: Auto-create notifications on chat messages, status changes, finalizations
  - [x] RPCs: `get_notifications()`, `mark_all_notifications_read()`, `get_notification_count()`
  - [x] Hook: `useNotifications` with fetch, markAllAsRead, fetchUnreadCount
  - [x] UI: Clickable notification badge in SiteHeader navbar
  - [x] UI: Full notifications page at `/trades/notifications`
  - [x] Component: `NotificationsList` with "Nuevas" and "Anteriores" sections
  - [x] Fixed: ON CONFLICT trigger issues with partial unique indexes
- [x] **Historial Tab & Rejected View**
  - [x] Added "Historial" (3rd tab) to proposals dashboard
  - [x] Added "Ver rechazadas" toggle for Recibidas/Enviadas tabs
  - [x] Hook: Extended `useProposals` to support box: 'history' and view: 'rejected'
  - [x] Query: Historial fetches from `trades_history` table
  - [x] UI: Read-only cards for completed/cancelled trades
- [x] **Bug Fixes**
  - [x] Fixed create_trade_proposal ON CONFLICT error
  - [x] Fixed column name 'count' → 'quantity' in trade_proposal_items
  - [x] Fixed RLS policies for trade_chats insert
  - [x] Fixed notify_chat_message trigger ON CONFLICT with partial index
  - [x] Added date-fns dependency for relative timestamps
  - [x] Fixed rejected proposals filter to include 'cancelled' status
- [x] **Documentation**
  - [x] CHANGELOG.md updated with comprehensive v1.4.4 entry
  - [x] TODO.md updated with sprint completion
  - [x] database-schema.md updated with new tables (notifications, trade_finalizations)

### v1.4.3 Feature Status

**Trade UX Polishes ✅ | SegmentedTabs Component ✅ | Tests Complete ✅**

- [x] **Task A: Streamline "Intercambios" (Find) and move advanced controls**
  - [x] Simplified `/trades/find` to show matches for active collection only
  - [x] Removed collection dropdown, player search, and advanced filters from /trades/find
  - [x] Added "Búsqueda avanzada" button routing to `/trades/search`
  - [x] Created new `/trades/search` page with full filter experience
  - [x] Added "Volver a Intercambios" link in /trades/search
- [x] **Task B: Post-create redirect with one-time highlight**
  - [x] Updated `useCreateProposal` to return proposalId
  - [x] Modified composer to redirect to `/trades/proposals?tab=sent&highlight=<id>`
  - [x] Added query param handling in proposals page for tab selection
  - [x] Implemented one-time border pulse animation on newly created card
  - [x] Created highlight-animation.css with pulse-border keyframes
  - [x] Auto-clear highlight after 2 seconds
- [x] **Task C: Create SegmentedTabs and unify paired tabs**
  - [x] Created reusable `SegmentedTabs` component with equal-width grid layout
  - [x] Applied to Recibidas|Enviadas in `/trades/proposals`
  - [x] Applied to Resumen|Mensajes in `ProposalDetailModal`
  - [x] Updated Ofrecer|Pedir tabs in `StickerSelector` for consistency
  - [x] Full keyboard navigation (Arrow keys, Home, End) and ARIA support
  - [x] Gold active state, outer border only, flush seams with single-pixel dividers
  - [x] No layout shift on focus/active (ring-inset implementation)
  - [x] Truncation support with title tooltips
  - [x] Test IDs for automation (`data-testid="segmented-tabs"`, `data-testid="segmented-tab-{value}"`)
- [x] **Documentation & Tests**
  - [x] Update components-guide.md with SegmentedTabs implementation details
  - [x] Update current-features.md with v1.4.3 changes
  - [x] Update TODO.md completion status
  - [x] Update CHANGELOG.md
  - [x] Playwright tests: trades-find-vs-search.spec.ts
  - [x] Playwright tests: proposal-highlight.spec.ts
  - [x] Playwright tests: segmented-tabs.spec.ts (enhanced with new tests)

### v1.4.2 Feature Status

**Trade Composer UX ✅ | Trade Matching Logic ✅ | Documentation Complete ✅**

- [x] **Trade Composer UX Improvements**
  - [x] Fixed tab button alignment across all trade screens
  - [x] Team names display instead of sticker codes
  - [x] Validation requires both offer AND request items
  - [x] Fixed UTF-8 encoding for Spanish characters
  - [x] Proposal messages now appear as first chat message
- [x] **Trade Matching Logic Updates**
  - [x] Updated `find_mutual_traders` to use count-based logic
  - [x] Updated `get_mutual_trade_detail` with same logic
  - [x] Fixed incorrect match counts in intercambios screen
  - [x] Removed dependency on 'wanted' flag
- [x] **Database Updates**
  - [x] Migration: `20251007100000_fix_trade_matching_and_chat.sql`
  - [x] Updated `create_trade_proposal` RPC
  - [x] Fixed `find_mutual_traders` and `get_mutual_trade_detail` functions
- [x] **Documentation**
  - [x] Updated database-schema.md with correct RPC signatures
  - [x] Updated current-features.md with v1.4.2 changes
  - [x] Updated CHANGELOG.md with detailed fixes

### v1.4.1 Feature Status

**Theme Rollout Complete ✅ | QA Complete ✅ | Documentation Complete ✅**

- [x] **Complete Retro-Comic Theme Rollout**
  - [x] Task 1: Home page theme pass (already complete)
  - [x] Task 2: Navigation (header/footer)
    - [x] SiteHeader: Dark theme, gold active states, Escape key handler
    - [x] SiteFooter: Consistent link styling with thick borders
    - [x] NavLink: Updated route handling for /trades/proposals
  - [x] Task 3: Trades visual consistency
    - [x] FindTradersFilters: Dark cards with gold accents
    - [x] MatchCard: Full-card clickable with hover states
    - [x] Page layouts: Solid dark backgrounds, themed headers
    - [x] All trading components themed (via Task agent)
  - [x] Task 4: Album view
    - [x] AlbumSummaryHeader: Dark theme with font-black stats
    - [x] AlbumPager: Gold active tabs with thick borders
    - [x] PageHeader: Gold complete button, improved progress bar
    - [x] All album components themed (via Task agent)
  - [x] Task 5: Shared primitives
    - [x] Skeleton: Already dark-themed
    - [x] EmptyCollectionState: Updated with dark theme
    - [x] Toast system: Verified shared wrapper usage
    - [x] Image alt-text: Verified policy implementation
  - [x] Additional updates (user-requested)
    - [x] Profile page: Comprehensive theme update
    - [x] Trades proposals page: Dark theme with gold tabs
    - [x] Trades compose page: Dark background wrapper
    - [x] Progress bar visibility: Changed to gold indicator
    - [x] Authentication pages: Login and signup fully themed
  - [x] Task 6: QA & E2E testing
    - [x] Created theme-rollout.spec.ts with comprehensive tests
    - [x] Visual verification helpers for borders/colors/backgrounds
    - [x] Authentication pages testing
    - [x] Navigation testing (header/footer/mobile menu)
    - [x] Trading pages testing (find/proposals)
    - [x] Album pages testing (pager/header/tiles)
    - [x] Profile page testing
    - [x] Accessibility testing (contrast/keyboard navigation)
  - [x] Task 7: Documentation
    - [x] Updated components-guide.md with theme completion
    - [x] Updated current-features.md with v1.4.1 details
    - [x] Updated TODO.md with sprint completion
    - [x] Updated CHANGELOG.md with theme rollout entry

### v1.4.0 Feature Status

**Backend Complete ✅ | Frontend Complete ✅ | Documentation Complete ✅ | Tests Complete ✅**

- [x] **Mark Team Page Complete Feature**
  - [x] `mark_team_page_complete` RPC function with validation
  - [x] Desktop: "Marcar equipo completo" button with confirmation dialog
  - [x] Mobile: Long-press (600ms) + overflow menu (⋯) with ActionSheet
  - [x] Optimistic UI updates in `useAlbumPages` hook
  - [x] Success/error toast notifications
  - [x] Idempotent behavior (preserves singles and duplicates)
  - [x] Accessibility: keyboard navigation, ARIA labels
  - [x] Performance indexes for fast queries
  - [x] Comprehensive documentation in all guides
  - [x] Playwright E2E tests (4 test cases)

### v1.3.0 Feature Status

**Backend Complete ✅ | Frontend Code Complete ✅ | Data Migration Needed 🚧**

- [x] **Database Schema v1.3.0** - All tables, indexes, and RLS policies deployed
  - [x] `collection_pages` table with team/special page definitions
  - [x] `page_slots` table with sticker-to-slot mapping
  - [x] `trade_chats` table for trade messaging
  - [x] `trades_history` table for completion tracking
  - [x] `user_badges` table for achievements
  - [x] Enhanced `stickers` table with image paths and numbers
- [x] **RPC Functions v1.4.0** - All database functions operational (15 total)
  - [x] `bulk_add_stickers_by_numbers` - Batch sticker addition
  - [x] `get_completion_report` - Per-page completion analysis
  - [x] `search_stickers` - Advanced sticker search with filters
  - [x] `complete_trade` - Mark trades as completed
  - [x] `cancel_trade` - Cancel trades with history
  - [x] `mark_team_page_complete` - Bulk mark team pages ✅ **v1.4.0**

- [x] **Album Pages UI - Code Complete**
  - [x] Implement `useAlbumPages` hook with production RPCs
  - [x] Implement `AlbumPager` component for page navigation
  - [x] Implement `AlbumPageGrid` with 20-slot team pages
  - [x] Implement `StickerTile` component with image support and fallback logic
  - [x] Implement album summary header with live stats from `get_completion_report`
  - [x] Full UI integration complete

- [x] **UI/UX Redesign - Complete**
  - [x] Implemented new "Retro-Comic" dark theme across all pages.
  - [x] Updated all major components (`ModernCard`, `StickerTile`, headers, buttons) to new style.

### Data Migration Sprint - IN PROGRESS 🔥

- [ ] **Sticker Number Backfill**
  - [ ] Generate sequential numbers for all existing stickers
  - [ ] Update `stickers.sticker_number` column
  - [ ] Verify uniqueness within collections

- [ ] **Collection Pages & Slots Seeding**
  - [ ] Create `collection_pages` for all active collections
  - [ ] Generate team pages (20 slots: badge, manager, 18 players)
  - [ ] Generate special pages (variable slots)
  - [ ] Set proper `order_index` for navigation
  - [ ] Map stickers to page slots
  - [ ] Validate slot assignments
  - [ ] Test page completion calculations

- [ ] **Sticker Image Backfill**
  - [x] Implement `npm run backfill:stickers` CLI script for automated processing and upload
  - [ ] **Run script** for all collections to populate Supabase Storage and update `stickers` table
  - [ ] Verify `image_path_webp_300` and `thumb_path_webp_100` are correctly updated

## ✅ Phase 2: Core Features - COMPLETE

### Trading System (Backend ✅ | Frontend Proposals ✅ | Chat/History 🚧)

**Trade Discovery & Proposals - COMPLETE ✅**

- [x] Find Traders Feature with RPC-based matching
- [x] Trade Proposals MVP (create, respond, inbox/outbox)
- [x] Proposal detail modal and response system
- [x] Advanced filtering and search

**Album Pages System - COMPLETE ✅**

- [x] `collection_pages` & `page_slots` tables (deployed)
- [x] `get_completion_report` & `search_stickers` RPC functions (deployed)
- [x] Performance indexes for navigation (deployed)
- [x] Frontend album navigation UI ✅
- [x] Page grid rendering ✅
- [x] Sticker tile components ✅
- [x] Data migration for Collection 24 ✅
  - [x] Sticker number backfill (577 stickers numbered)
  - [x] Collection pages created (28 pages total)
  - [x] Page slots mapped (577 stickers mapped)

**Trade Chat - BACKEND READY 🚧**

- [x] Database schema (`trade_chats` table)
- [x] RLS policies for secure messaging
- [x] Indexes for chronological loading
- [ ] Frontend chat interface ⬅️ **NEEDS IMPLEMENTATION**
- [ ] Supabase Realtime integration ⬅️ **NEEDS IMPLEMENTATION**
- [ ] Message notifications ⬅️ **NEEDS IMPLEMENTATION**

**Trade History - BACKEND READY 🚧**

- [x] Database schema (`trades_history` table)
- [x] `complete_trade` RPC function
- [x] `cancel_trade` RPC function
- [x] History tracking with metadata
- [ ] Frontend history dashboard ⬅️ **NEEDS IMPLEMENTATION**
- [ ] Statistics and analytics UI ⬅️ **NEEDS IMPLEMENTATION**
- [ ] Trade rating system (future)

**Enhanced Sticker Images - COMPLETE ✅**

- [x] `sticker_number` column for sequential ordering
- [x] `image_path_webp_300` for full-size WebP images
- [x] `thumb_path_webp_100` for thumbnails
- [x] Supabase Storage buckets configured
- [x] `bulk_add_stickers_by_numbers` RPC function
- [x] Image upload and processing pipeline (via CLI script)
- [x] Frontend image display with WebP and graceful fallback
- [ ] Backfill existing stickers ⬅️ **DATA MIGRATION SPRINT**

## 📋 Phase 2.1: Next Sprint - READY TO START

- [x] **Implicit Missing UI Migration** (Phase 2)
  - [x] Replace `user_stickers.wanted` reads in `src/hooks/album/useAlbumPages.ts` with count-derived missing/duplicate logic.
  - [x] Update album components (`StickerTile`, `AlbumSummaryHeader`, `AlbumPageGrid`) to show missing badges using `count = 0`.
  - [x] Refactor collection grid toggles in `src/components/CollectionPage.tsx` to drop manual wanted upserts.
  - [x] Update profile stats (`src/hooks/profile/useProfileData.ts`, `ProfilePage`, `components/profile/OwnedCollectionCard.tsx`) to consume the new `missing` field.
  - [x] Retire `userWantsList` usage across trading docs and `src/app/trades/compose/page.tsx` in favor of missing-based selectors.
  - [x] QA trading flows to ensure compose/detail UI matches Phase 1 RPC semantics (duplicates > 1 vs missing).
- [ ] **Trade Chat UI** 🔥 HIGH PRIORITY
  - [ ] Build chat interface components
  - [ ] Integrate Supabase Realtime listeners
  - [ ] Add chat to proposal detail modal
  - [ ] Implement message notifications
  - [ ] Test real-time message delivery

- [ ] **Trade History Dashboard**
  - [ ] Create history viewing interface
  - [ ] Integrate `complete_trade` / `cancel_trade` actions
  - [ ] Display completed trade statistics
  - [ ] Add trade rating system (future)

### Enhanced User Experience 🔄 MEDIUM PRIORITY (Post Chat/History)

- [ ] **Public User Profiles**
  - [ ] Create public profile routes
  - [ ] Build public collection viewing interface
  - [ ] Add user search functionality
  - [ ] Implement privacy controls

- [ ] **User Directory**
  - [ ] Create user directory page
  - [ ] Add search and filtering options
  - [ ] Show user activity and stats
  - [ ] Add "follow" or "bookmark" users feature

- [ ] **Notification System**
  - [ ] Create notifications database schema
  - [ ] Build notification center interface
  - [ ] Add real-time notifications with Supabase Realtime
  - [ ] Implement email notification preferences
  - [ ] Integrate with trade proposal workflow

- [ ] **Collection Completion Celebrations**
  - [ ] Design achievement system (uses existing `user_badges` table)
  - [ ] Create celebration animations
  - [ ] Add progress milestones
  - [ ] Build achievement showcase

### Current Feature Enhancements 🔧 LOW PRIORITY

- [ ] **Collection Management Improvements**
  - [ ] Add search and filtering for stickers (use `search_stickers` RPC)
  - [x] Implement sticker image upload/management system ✅ Backend ready
  - [ ] Add bulk sticker operations (use `bulk_add_stickers_by_numbers`)
  - [ ] Create collection export/import functionality

- [ ] **Navigation & UX Polish**
  - [ ] Add breadcrumb navigation for deep-linked collections
  - [ ] Improve back navigation flow
  - [ ] Add keyboard shortcuts for common actions
  - [ ] Create onboarding tour for new users

- [ ] **Mobile & Responsive**
  - [ ] Optimize mobile collection grid layout
  - [ ] Improve mobile navigation patterns
  - [ ] Add mobile-specific gestures and interactions
  - [ ] Test and improve tablet experience

## 🔮 Phase 3: Advanced Features

### Community Features

- [ ] User ratings and reviews for trades
- [ ] Community forums/discussions
- [ ] Featured collections showcase
- [ ] Trading groups/communities
- [ ] Collection sharing and social features

### Analytics & Insights

- [ ] Collection value tracking
- [ ] Market trend analysis for popular cards
- [ ] Trade success metrics
- [ ] Personal collection insights and recommendations

### Integration & API

- [ ] External card database integration (Panini API if available)
- [ ] Price tracking APIs integration
- [ ] Social media sharing features
- [ ] Advanced export/import with other platforms

## 🔧 Technical Debt & Improvements

### Code Quality & Testing

- [ ] Add comprehensive test suite (Jest + React Testing Library)
- [ ] Set up Storybook for component documentation
- [ ] Implement proper error handling patterns throughout
- [ ] Add TypeScript strict mode gradually
- [ ] Create component documentation

### Performance & Optimization

- [x] Implement image optimization (`sizes`, `priority`) and lazy loading ✅
- [ ] Add caching strategies (React Query migration?)
- [ ] Optimize bundle size and code splitting
- [ ] Set up monitoring and analytics (Vercel Analytics)
- [ ] Implement service worker for offline capabilities

### DevOps & Infrastructure

- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Add automated testing in CI
- [ ] Set up staging environment
- [ ] Database backup and migration strategies
- [ ] Add error tracking (Sentry)

## 🛡️ Known Issues & Tech Debt

### Minor Issues

- [ ] Consider adding confirmation for other destructive actions
- [ ] Toast notifications could use better positioning on mobile
- [ ] Proposal composer could benefit from auto-save functionality

### Optimization Opportunities

- [ ] Profile data could use React Query for better caching
- [ ] Collection dropdown could be optimized for large numbers of collections
- [ ] Consider virtualizing sticker grids for very large collections
- [ ] Trade proposal queries could benefit from additional indexes

---

## 🏆 Major Milestones Achieved

### Phase 1 Complete! 🎉 (v1.0.0)

- Zero-reload profile management
- Seamless collection navigation
- Modern responsive design
- Complete sticker inventory system

### Phase 2 Complete! 🚀 (v1.3.0)

- **Complete Trading Infrastructure**
  - Discovery, proposals, chat tables, history
  - All RPC functions operational
  - Security and performance optimized

- **Album Pages System**
  - Page and slot structure defined
  - Completion tracking ready
  - Search and bulk operations ready

- **Enhanced Sticker Management**
  - WebP image optimization ready
  - Sequential numbering system
  - Storage buckets configured

**Current Status**: Backend at v1.3.0 ✅ | Frontend code at v1.3.0 ✅  
**Next Milestone**: Complete v1.3.0 Data Migration to go live.

---

## How to Use This File

1. **Check off completed items** and update CHANGELOG.md with proper versioning
2. **Add new items** as they come up in development
3. **Update priorities** based on user feedback and business needs
4. **Review weekly** to adjust sprint planning
5. **Update current-features.md** when features are completed

---

**Last Updated**: 2025-10-10 (v1.5.0 - Critical Fixes + MVP Features + Location Matching)
**Current Focus**:
1. Critical fixes (batch RPC, ErrorBoundary, logger) - 1 day
2. MVP features - Admin + Badges + Quick Entry + Location Matching + Avatars
3. High priority - TanStack Query, Zod, CSRF, hook refactoring

**Next Focus**: v1.5.2 - Testing re-enable, performance optimization, code splitting, Phase B avatar uploads


