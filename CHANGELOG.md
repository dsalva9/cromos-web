# Changelog

All notable changes to the CambioCromos project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- TBD

### Changed

- TBD

### Fixed

- TBD

## [1.4.4] - 2025-10-08

### Added - Trade Finalization & Notifications System (MVP)

#### **Trade Finalization Workflow**
- **Two-step finalization handshake**: Both participants must mark a trade as finalized before it moves to completed status
- **New database table**: `trade_finalizations` tracks which users have finalized each trade
- **RPC function**: `mark_trade_finalized(p_trade_id)` handles finalization logic with proper auth guards
- **Finalization UI in ProposalDetailModal**:
  - Shows finalization progress (0/2 → 1/2 → 2/2 Finalizado)
  - "Marcar como finalizado" button for accepted trades
  - Status indicators showing who has marked as finalized
  - Auto-closes modal when both parties finalize
- **Historial tab**: New third tab in `/trades/proposals` showing completed/cancelled trades
- **Ver rechazadas button**: Toggle to view rejected proposals in inbox/outbox tabs (read-only)

#### **Notifications System (MVP)**
- **New database table**: `notifications` with support for 4 notification types:
  - `chat_unread`: New messages in pending/accepted trades (coalesced per-trade)
  - `proposal_accepted`: Proposal status change to accepted
  - `proposal_rejected`: Proposal status change to rejected
  - `finalization_requested`: One user has marked trade as finalized
- **Database triggers**: Automatic notification creation on:
  - Chat message insert (upserts unread notification)
  - Proposal status change (accepted/rejected)
  - Finalization insert (notifies counterparty)
- **RPC functions**:
  - `get_notifications()`: Returns all notifications with enriched trade data
  - `mark_all_notifications_read()`: Marks all unread as read
  - `get_notification_count()`: Returns count of unread notifications
- **Notifications page** (`/trades/notifications`):
  - Lists all notifications sorted by unread first, then newest
  - Groups into "Nuevas" and "Anteriores" sections
  - Clickable notifications route to proposal detail
  - "Marcar todo como leído" button
- **Clickable notification badge in navbar**:
  - Bell icon with unread count next to "Mis Propuestas"
  - Separate clickable target routes to `/trades/notifications`
  - Badge-click routes to notification list, label-click routes to proposals

#### **Hook Updates**
- **New hooks**:
  - `useTradeHistory`: Fetches completed/cancelled trades from `trades_history`
  - `useNotifications`: Manages notifications with count + mark read
  - `useTradeFinalization`: Handles trade finalization RPC calls
- **Extended hooks**:
  - `useProposals`: Now supports `box: 'inbox'|'outbox'|'history'` and `view: 'active'|'rejected'`

#### **UI Enhancements**
- **ProposalsDashboard** (`/trades/proposals`):
  - Added third tab: "Historial" for completed/cancelled trades
  - Added "Ver rechazadas" toggle for inbox/outbox (shows rejected proposals)
  - Updated to 3-tab SegmentedTabs with equal-width layout
- **ProposalDetailModal**:
  - Finalization status section in Resumen tab (only for accepted proposals)
  - "Marcar como finalizado" primary button (green)
  - Progress indicator (X/2 marcados)
  - Disabled chat/actions when trade is completed
- **SiteHeader**:
  - Notification bell badge with unread count
  - Separate clickable badge routes to `/trades/notifications`
  - Badge updates in real-time via `useNotifications` hook

### Changed

- **ProposalList component**: Now supports `box`, `view`, and `readOnly` props for flexible filtering
- **Navbar notification strategy**: Switched from chat unread counts to comprehensive notifications count

### Database

- **New Tables**:
  - `trade_finalizations` (trade_id, user_id, finalized_at)
  - `notifications` (id, user_id, kind, trade_id, created_at, read_at, metadata)
- **New RPCs**:
  - `mark_trade_finalized(p_trade_id BIGINT) RETURNS JSONB`
  - `get_notifications() RETURNS TABLE`
  - `mark_all_notifications_read() RETURNS VOID`
  - `get_notification_count() RETURNS INTEGER`
- **New Triggers**:
  - `notify_chat_message()`: Creates/updates chat_unread notifications
  - `notify_proposal_status_change()`: Creates accepted/rejected notifications
  - `notify_finalization_requested()`: Creates finalization_requested notifications

### Fixed

- **Database trigger ON CONFLICT errors**:
  - Fixed `notify_chat_message()` trigger using ON CONFLICT with partial unique index (replaced with IF/ELSE logic)
  - Fixed `create_trade_proposal` RPC removing invalid ON CONFLICT clause from chat message insert
  - Fixed column name from 'count' to 'quantity' in `trade_proposal_items` inserts
  - Fixed RLS policies for `trade_chats` table to allow participants to insert messages
- **Rejected proposals not showing**:
  - Fixed `useProposals` hook to include 'cancelled' status in rejected view filter
  - Now shows both rejected (receiver) and cancelled (sender) proposals when "Ver rechazadas" is active
- **Missing dependency**: Added `date-fns` package for relative timestamp formatting in notifications

### Migration Files

- `supabase/migrations/20251008_trade_finalizations.sql`
- `supabase/migrations/20251008_notifications.sql`
- `supabase/migrations/20251008_fix_create_trade_proposal.sql` (hotfix)
- `supabase/migrations/20251008_fix_trade_chats_rls.sql` (hotfix)
- `supabase/migrations/20251008_fix_notify_chat_trigger.sql` (hotfix)

## [1.4.3] - 2025-10-08

### Fixed - SegmentedTabs Equal-Width Alignment

- **SegmentedTabs component perfected** across all three trading UI locations:
  - **Equal-width alignment**: CSS Grid with `grid-template-columns: repeat(N, 1fr)` ensures perfect width equality
  - **Flush seams**: Single-pixel dividers via `::before` pseudo-element (no double borders or gaps)
  - **Outer border only**: Container has `border-2 border-black`, tabs have no individual borders
  - **Rounded outer corners only**: Container uses `rounded-md overflow-hidden`, inner corners remain square
  - **No layout shift**: Focus ring uses `ring-inset`, active state changes only background/text color
  - **Enhanced keyboard navigation**: Added Home/End keys to jump to first/last tab
  - **Truncation support**: Long labels truncate with ellipsis, `title` attribute provides full text
  - **Test IDs added**: `data-testid="segmented-tabs"` and `data-testid="segmented-tab-{value}"` for automation

- **Updated all three consumers**:
  - `/trades/proposals`: RECIBIDAS | ENVIADAS tabs
  - `ProposalDetailModal`: RESUMEN | MENSAJES tabs
  - `StickerSelector` (`/trades/compose`): OFRECER | PEDIR tabs (replaced shadcn Tabs)

- **Comprehensive E2E tests** (`tests/segmented-tabs.spec.ts`):
  - Equal width verification (±0.5px tolerance)
  - Container border thickness (2px on all sides)
  - Internal dividers (1px, no double borders)
  - Rounded corners (container level only)
  - No layout shift on focus/click
  - Keyboard navigation (Arrow keys, Home, End)
  - Text truncation with ellipsis
  - Gold active state (#FFC000)
  - Test ID presence for automation

### Changed - Streamlined Trade Flow

- **Removed intermediate trade detail page**: Users now go directly from match card to proposal composer
  - Deleted `/trades/find/[userId]` route entirely
  - Updated `MatchCard` to link directly to `/trades/compose?userId=...&collectionId=...`
  - Improved user flow: Find match → Create proposal (single click, no intermediate step)

## [1.4.2] - 2025-10-07

### Fixed - Trade Composer UX & Matching Logic

- **Tab Button Alignment**: Fixed positioning of OFRECER/PEDIR, RECIBIDAS/ENVIADAS, and RESUMEN/MENSAJES tabs
  - Changed base `TabsList` component from `inline-flex` to `flex`
  - Applied `max-w-[400px]` constraint for consistent sizing across screens
- **Team Name Display**: Trade composer now shows team names instead of sticker codes
  - Added `collection_teams` to sticker query in `useProposalComposerData`
  - Updated `StickerDetailsLite` type to include team information
  - Modified `StickerGrid` to display team name with code fallback
- **Proposal Validation**: Now requires both offer AND request items (not just one)
  - Changed validation logic from OR to AND in composer
  - Prevents incomplete one-sided proposals
- **UTF-8 Encoding**: Fixed Spanish character display (Tú, Colección)
  - Resolved encoding issues in `ComposerHeader` and `compose/page`
- **Trade Matching Logic**: Updated SQL functions to work without 'wanted' flag
  - `find_mutual_traders`: Now uses count-based logic (missing=0, duplicates>1)
  - `get_mutual_trade_detail`: Same count-based logic applied
  - Fixed incorrect match counts in intercambios screen
- **Proposal Message Flow**: Messages now appear as first chat message
  - Updated `create_trade_proposal` to store message in `trade_chats` table
  - Proposal `message` field always NULL (messages in chat only)
  - Migration: `20251007100000_fix_trade_matching_and_chat.sql`

### Added - Trade Chat UI + Unread Message Badges

- **Real-time Trade Chat System**:
  - Pre-populated chat context: Opening a proposal loads the last 50 messages automatically
  - Trade-scoped messaging: Composer bound to current trade ID, no manual trade selection needed
  - Counterparty nickname in placeholder: "Mensaje para {nickname}…"
  - Empty state message: "Aún no hay mensajes en esta propuesta. ¡Sé el primero en saludar!"
  - Realtime message updates via Supabase subscriptions (no refresh required)
  - Message bubbles: right-aligned for sender, left-aligned for counterparty
  - Timestamps in HH:mm format for each message
  - Auto-scroll to newest on open and on new message (unless user scrolled up)
  - "Nuevos mensajes" jump pill when new messages arrive while scrolled up
  - Composer features:
    - Enter=send, Shift+Enter=newline
    - 500 character limit with live counter
    - Disabled state for cancelled/rejected proposals
  - Pagination: "Ver mensajes anteriores" button for loading older messages (50 at a time)
  - Permissions: RLS enforces proposal participants only; 401/403 errors disable composer with toast

- **Unread Message Badges**:
  - Per-card badges: Show unread count on each ProposalCard (cap at "9+")
  - Tab aggregate badges: Total unread counts on "Recibidas" and "Enviadas" tabs
  - Mensajes tab badge: Subtle badge on "Mensajes" tab when unseen messages exist
  - Mark as read: Automatically marks trade as read when chat panel is opened/focused
  - Realtime badge updates: Counts increment live when new messages arrive
  - Performance: Efficient queries avoid N+1 lookups; supports paginated lists

- **Backend Infrastructure**:
  - New table: `trade_reads` (user_id, trade_id, last_read_at) with PK (user_id, trade_id)
  - RPC: `mark_trade_read(p_trade_id BIGINT)` → upserts last_read_at = now() for auth.uid()
  - RPC: `get_unread_counts(p_box TEXT, p_trade_ids INT8[])` → returns per-trade unread_count
    - Filters by auth.uid() automatically (SECURITY DEFINER)
    - Accepts optional p_trade_ids array for efficient pagination
  - Indexes: idx_trade_reads_user_id, idx_trade_reads_trade_id
  - RLS policies: Owner-only access (user_id = auth.uid()) for all verbs
  - Migration file: `database/migrations/20251007000000_trade_chat_unread_badges.sql`

- **Frontend Components & Hooks**:
  - `useTradeChat(tradeId)` hook:
    - State: messages, loading, error, hasMore
    - Actions: sendMessage(text), loadMore(), markAsRead()
    - Initial fetch (50 messages), pagination (older 50), realtime subscribe/unsubscribe
  - `useUnreadCounts()` hook:
    - Fetches per-trade unread counts for current box (inbox/outbox)
    - Exposes aggregate counts for tabs
    - Realtime updates on INSERT to trade_chats
  - `TradeChatPanel` component:
    - Message list with scroll management and auto-scroll logic
    - Composer with character counter and disabled states
    - "Load older" affordance and "new messages" pill
    - Retro-Comic theme: dark cards, gold accents, thick black borders
  - `ProposalCard` updates:
    - New `unreadCount` prop displays badge (top-right corner, red with "9+" cap)
  - `ProposalList` updates:
    - Integrated useUnreadCounts hook, passes counts to cards
    - Notifies parent of total unread via onUnreadCountChange callback
  - `ProposalDetailModal` updates:
    - New "Mensajes" tab with TradeChatPanel
    - Tab state preservation: keyed by proposalId, defaults to "Resumen"
    - Unread badge on "Mensajes" tab when unseen messages exist
    - Calls markAsRead() when "Mensajes" tab becomes active
  - Proposals page (`/trades/proposals`):
    - Aggregate unread badges on "Recibidas" and "Enviadas" tabs
    - Real-time updates via child ProposalList components

- **E2E Testing**:
  - New test file: `tests/trade-chat-unread-badges.spec.ts`
  - Test coverage:
    - Chat basics: load 50, scroll to bottom, send message, see it immediately
    - Realtime: second session inserts message → first session sees it without refresh
    - Unread counts:
      - Badge increments when counterparty message arrives (chat closed)
      - Badge clears after opening Mensajes tab
      - Cap at "9+" verified
    - Tab aggregates: verify badges on Recibidas/Enviadas tabs
    - States: composer disabled for cancelled/rejected proposals
    - Pagination: "Ver mensajes anteriores" prepends older messages, preserves scroll
    - A11y: labels on inputs/buttons, focus order, screen-reader text for badges
  - Helper functions: login(), navigateToProposals(), openFirstProposal()
  - Multi-user tests using Playwright contexts for realtime scenarios

### Changed

- **ProposalCard**: Now accepts `unreadCount` prop and displays badge when > 0
- **ProposalList**: Accepts `onUnreadCountChange` callback to notify parent of total unread
- **ProposalDetailModal**: Converted from single-view to tabbed interface (Resumen + Mensajes)
- **Proposals Page**: Added state for inbox/outbox unread counts, displays on tabs

### Documentation

- **database-schema.md**: Added trade_reads table, mark_trade_read RPC, get_unread_counts RPC
- **api-endpoints.md**: Added RPC function signatures, parameters, return types, examples
- **components-guide.md**: Added TradeChatPanel, useTradeChat, useUnreadCounts, badge behavior
- **current-features.md**: Moved Trade Chat UI to ✅, added Unread Badges under Trading UI
- **TODO.md**: Ticked "Trade Chat UI" and "Message notifications/badges" for v1.4.2

### Technical

- Realtime subscriptions cleaned up properly on unmount
- Debounced mark-as-read calls (400ms) to avoid redundant RPC calls
- Efficient query patterns: single call per box for counts, no per-card queries
- Batch updates from realtime to avoid re-render storms
- Zero TypeScript errors across all new components
- All builds successful with no warnings
- Maintained accessibility standards (a11y verified in E2E tests)

## [1.4.1] - 2025-10-07

### Added - Complete Retro-Comic Theme Rollout

- **Theme Consistency Pass**: Applied Retro-Comic design system across all remaining pages and components
  - **Authentication Pages**:
    - Login page (`/login`) with dark cards, gold logo, and themed inputs
    - Signup page (`/signup`) with matching theme in form and success states
    - Consistent gold submit buttons with thick borders (`border-2 border-black`)
    - Dark inputs with gold focus rings (`focus:ring-[#FFC000]`)
  - **Navigation Components**:
    - `SiteHeader`: Dark theme with gold active nav states
    - `SiteFooter`: Consistent link styling with thick borders
    - Escape key handler for mobile menu with proper focus trap
    - Updated navigation links: `/trades/inbox` → `/trades/proposals`
  - **Trading Pages**:
    - `/trades/find`: Dark background with themed filters and gold accents
    - `/trades/find/[userId]`: Themed detail view with gold "Crear Propuesta" button
    - `/trades/proposals`: Gold tabs with thick borders, dark proposal cards
    - `/trades/compose`: Dark wrapper with themed summary sidebar
    - `FindTradersFilters`: Dark cards with gold hover states and active min-overlap buttons
    - `MatchCard`: Full-card clickable links with gold hover borders
    - All modal and dialog components themed consistently
  - **Album View**:
    - `AlbumSummaryHeader`: Dark background with `font-black` stats and gold values
    - `AlbumPager`: Gold active tabs with `border-2 border-black` and `uppercase` text
    - `PageHeader`: Gold progress indicator for improved visibility
    - `StickerTile`: Thick borders and consistent dark theme
    - Desktop "Marcar equipo completo" button with gold styling
  - **Profile Page**:
    - Comprehensive theme update with dark cards
    - Gold "Guardar" and "Hacer Activa" buttons
    - Red "Eliminar" buttons for destructive actions
    - "Activa" badges with gold background and thick borders
  - **Shared Components**:
    - `EmptyCollectionState`: Dark theme with gold trophy icon and CTA button
    - `Skeleton`: Already dark-themed (verified)
    - Toast notifications: Verified shared Sonner wrapper usage
    - Image alt-text: Verified deterministic policy implementation

- **E2E Testing Infrastructure**:
  - New test file: `tests/theme-rollout.spec.ts` with comprehensive visual verification
  - Helper functions for theme validation:
    - `verifyThickBorders()`: Checks for `border-2` (2px borders)
    - `verifyGoldAccent()`: Validates `#FFC000` (rgb(255, 192, 0))
    - `verifyDarkBackground()`: Ensures dark gray backgrounds
  - Test coverage:
    - Authentication pages (login/signup)
    - Navigation (header/footer/mobile menu)
    - Trading pages (find/proposals/detail)
    - Album pages (pager/header/tiles)
    - Profile page
    - Accessibility (keyboard navigation, contrast, Escape key)
  - All tests validate thick borders, gold accents, and dark backgrounds

### Changed

- **Progress Bar Visibility**: Changed `PageHeader` progress indicator to use gold (`bg-[#FFC000]`) instead of default gray for better visibility on dark backgrounds
- **Navigation Links**: Updated header and footer to route to `/trades/proposals` instead of deprecated `/trades/inbox`
- **Page Backgrounds**: All page-level components now use solid `bg-[#1F2937]` instead of gradients
- **Typography**: Consistently applied `font-black` for major headings and `uppercase` for labels
- **Border Rounding**: Reduced from `rounded-lg` to `rounded-md` throughout for blockier aesthetic

### Documentation

- **components-guide.md**: Updated with v1.4.1 complete theme rollout status
- **current-features.md**: Enhanced section 6 with complete theme details and E2E test coverage
- **TODO.md**: Added v1.4.1 sprint section with complete task breakdown
- **CHANGELOG.md**: Comprehensive documentation of theme rollout changes

### Technical

- Zero TypeScript errors across all updated components
- All builds successful with no warnings
- Maintained accessibility standards (Lighthouse a11y ≥ 95)
- Consistent component patterns across theme updates
- Proper focus management and ARIA labels maintained

## [1.4.0] - 2025-10-06

### Added

- **Mark Team Page Complete Feature**: Bulk-complete all missing stickers on team pages with one action
  - New RPC function: `mark_team_page_complete(p_user_id, p_collection_id, p_page_id)`
    - Validates team pages only (20 slots: badge + manager + 18 players)
    - Only affects missing stickers (count=0), preserves singles and duplicates
    - Returns `{added_count, affected_sticker_ids}` with idempotent behavior
    - SECURITY DEFINER with auth.uid() validation
  - **Desktop UI (≥ md breakpoint)**:
    - "Marcar equipo completo" button in PageHeader
    - Confirmation dialog before completing
    - Green button styling for positive action
  - **Mobile UI (< md breakpoint)**:
    - Long-press on team title (600ms) opens ActionSheet
    - Overflow menu button (⋯) for discoverability
    - Bottom sheet with "Marcar todo el equipo como completado" action
    - Visual feedback during long-press (opacity change)
  - **Accessibility**:
    - Keyboard navigation support (Enter/Space keys)
    - Proper ARIA labels for screen readers
    - Focus management in dialogs
    - Disabled states when page is complete
  - **Optimistic Updates**:
    - Instant UI feedback before RPC completes
    - Automatic rollback on error with toast notification
    - Stats reconciliation after success
  - **Performance Indexes**:
    - `idx_page_slots_page_id` - Fast page→stickers lookup
    - `idx_page_slots_page_sticker` - Composite index for joins
    - `idx_user_stickers_user_collection_sticker` - User inventory lookups
    - `idx_collection_pages_page_collection` - Page validation
  - **Comprehensive Testing**:
    - Playwright E2E test suite with 4 test cases
    - Desktop button flow test
    - Mobile long-press test
    - Mobile overflow menu test
    - Idempotency and persistence tests

- **Mobile UI Optimization (Album View)**: Reworked the `StickerTile` component for a cleaner mobile experience.
  - The entire sticker is now tappable to add it.
  - Action buttons below the sticker are hidden on mobile.
  - A dynamic badge (`+n` or a checkmark) on the sticker now opens duplicate-management actions (e.g., Quitar uno) without a separate want state.
  - Unowned stickers are now grayscale to improve visual distinction.

### Changed

- **Trading RPCs**: Phase 4 cleanup removes `user_stickers.wanted`, drops the legacy `idx_user_stickers_trading` index, and updates `get_user_collection_stats` to return only the count-derived `missing` metric.
- Removed explicit want list; app now treats any missing sticker as "wanted" implicitly.
- **Album & Collection UI**: Simplified controls to focus on owned/duplicate states, derive Faltan from owned counts, and limit mobile dropdowns to duplicate management.
- **Desktop UI Refinement (Album View)**:
  - Added a green checkmark badge for owned stickers.
  - Simplified the duplicate badge to `+n` (e.g., `+1`) and styled it green for consistency with the owned checkmark.
- **Album Layout**: Moved the team page progress bar (`PageHeader`) to be a sticky footer to optimize vertical space, especially on mobile.
- **UI Text**: Updated labels in collection summary headers for clarity. "Me Falta" is now "Faltan", and the progress percentage is now labeled "Total".
- **PageHeader Component**: Enhanced with completion actions for both desktop and mobile
  - Props: Added `onMarkPageComplete` callback
  - State management: Long-press detection, ActionSheet control
  - Responsive behavior: Different UX patterns for mobile vs desktop

### Fixed

- **Desktop `REPE` Button Logic**: Corrected an off-by-one error where the `REPE (+n)` button text did not accurately reflect the state after the next click.
- **Mobile Sticker Actions**: Fixed a bug where tapping an action in the mobile dropdown menu would also trigger the sticker's main "add" action.
- **Robust Sticky Headers**: Fixed persistent positioning issues with the three sticky headers in the album view (`AlbumSummaryHeader`, `AlbumPager`, `PageHeader`). Implemented a dynamic height calculation using `ResizeObserver` to ensure headers stack correctly and remain sticky on all screen sizes, even when content wrapping changes their height.
- **Toast Library**: Corrected imports from `react-hot-toast` to `@/lib/toast` (sonner wrapper) throughout codebase
- **SQL Function**: Fixed `mark_team_page_complete` to properly join through `stickers` table since `user_stickers` doesn't have `collection_id` column

### Documentation

- **database-schema.md**: Added `mark_team_page_complete` RPC with full SQL implementation and corrected joins
- **api-endpoints.md**: Documented error handling patterns and usage examples for team page completion
- **components-guide.md**: Comprehensive PageHeader documentation with desktop/mobile behavior
- **components-guide-new.md**: Updated with same PageHeader enhancements
- **current-features.md**: Added v1.4.0 feature to Sticker Collection Management section
- **TODO.md**: Created v1.4.0 sprint section with completed checklist

### Technical

- Extended `useAlbumPages` hook with `markPageComplete(pageId)` action
  - Optimistic state snapshots for rollback
  - Error handling with dynamic toast imports
  - Stats reconciliation after RPC success
- RPC function count: 14 → 15 functions
- Build system: Resolved module resolution issues

## [1.3.0] - 2025-01-XX

### Added - Complete Album Pages System

**Database Infrastructure (Deployed):**

- `collection_pages` table - Album page definitions for team rosters and special sections
- `page_slots` table - Sticker-to-slot mapping with 20-slot team pages
- Complete migration for Collection 24 (Panini La Liga 2025-26)
  - 20 team pages × 20 slots (badge + coach + 18 players)
  - 7 special pages (SuperKids, Extra Gold, Fichajes, Mister Cero, etc.)
  - 1 alternates page for backup/substitute players (67 stickers)
  - All 577 stickers mapped to appropriate pages

**UI Components (Complete):**

- `AlbumPager` - Page navigation with team/special grouping and team crests
- `PageHeader` - Page title with completion progress bars
- `AlbumPageGrid` - Responsive grid with 20-slot team pages and variable special pages
- `StickerTile` - Individual sticker display with ownership controls and image fallback
- `AlbumSummaryHeader` - Collection switcher with live stats pills
- `useAlbumPages` - Comprehensive hook managing all album state and data fetching

**Features:**

- Navigate album pages like a real sticker album
- Team pages display 20 fixed slots (badge at position 0, coach at position 1, players 2-19)
- Special pages display variable slots based on content
- Optimistic updates for TENGO/REPE controls
- Page-level completion tracking
- Deep-linking with `?page=` query parameter
- Collection switching from album view
- Graceful image fallback chain prevents layout shifts

### Changed

- Sticker data model enhanced with sequential numbering for album ordering
- Album view replaces grid-based collection page as primary navigation
- Collection stats now reflect album-based completion

### Technical

- Sticker number backfill: All stickers assigned sequential numbers within collections
- Page generation scripts for automated album structure creation
- Slot mapping logic handles team pages (20 fixed) vs special pages (variable)
- Code-based sticker assignment parsing team prefixes and slot numbers

- **Database Schema Complete**: All v1.3.0 tables deployed to production
  - `collection_pages`: Album page definitions (team rosters, special sections)
  - `page_slots`: Sticker-to-slot mapping with 20-slot team pages
  - `user_badges`: Achievement tracking system
  - `trade_chats`: Infrastructure for trade messaging
  - `trades_history`: Terminal state tracking for completed/cancelled trades

- **Enhanced Sticker Images**: WebP optimization system
  - `stickers.sticker_number`: Unique sequential numbering within collections
  - `stickers.image_path_webp_300`: Full-size 300px WebP images
  - `stickers.thumb_path_webp_100`: Optimized 100px thumbnails
  - Supabase Storage buckets: `sticker-images`, `avatars`

- **Image Management System**:
  - **Automated Backfill Script**: Added `npm run backfill:stickers` CLI script for processing local images into WebP format (300px and 100px) and uploading them to Supabase Storage.
  - **UI Image Integration**: Implemented image rendering in components with a graceful fallback chain to prevent layout shifts and ensure a robust user experience.

- **Album Pages UI - Complete Implementation**:
  - `AlbumPager`: Navigation component with team/special page grouping.
  - `PageHeader`: Page title display with completion progress bars.
  - `AlbumPageGrid`: Responsive grid with 20-slot team pages and variable special pages.
  - `StickerTile`: Individual sticker component with ownership controls and image fallback logic.
  - `useAlbumPages`: Comprehensive hook managing all album state and data fetching.
  - Full integration with `?page=` query parameter for deep-linking.
  - Smart image loading with `priority` for above-the-fold content.

- **Image Display & Performance**:
  - **Graceful Image Fallback Chain**: Prevents layout shifts
    1. `thumb_public_url` (100px WebP thumbnail)
    2. `image_public_url` (300px WebP full-size)
    3. `image_url` (original external URL)
    4. Role-appropriate placeholder (badge/manager/player icons)
  - **Next.js Image Optimization**:
    - `priority` prop for above-the-fold images
    - `sizes` prop for responsive image selection
    - Consistent ALT text policy for accessibility

- **New RPC Functions**:
  - `bulk_add_stickers_by_numbers`: Batch sticker addition by number
  - `get_completion_report`: Per-page completion analysis with missing/duplicate tracking
  - `search_stickers`: Advanced sticker search with filters (owned, missing, repes, kind)
  - `complete_trade`: Mark trades as completed with history tracking
  - `cancel_trade`: Cancel trades with proper state management

### Changed

- **Collection Page Route**: Now uses album page system with `?page=` query parameter
- **Sticker Data Model**: Enhanced with album page support and optimized images
- **Performance**: New indexes for album page navigation and slot lookups
- **RLS Policies**: Extended security model for new tables (pages, slots, badges, chat, history)

### Technical

- Complete database migration to v1.3.0 schema
- All 13 tables documented and indexed
- All 14 RPC functions deployed and tested
- Storage bucket policies configured for public images
- TypeScript interfaces for all album components
- Comprehensive error handling in album navigation

## [1.2.0] - 2025-01-XX

### Added - Trade Proposals MVP

- **Complete Interactive Trading System**: Full proposal lifecycle from creation to completion
- **Secure Database Architecture**: RLS-protected tables with SECURITY DEFINER RPC functions
- **Multi-Sticker Proposals**: Compose complex trades with multiple offer/request items
- **Inbox/Outbox Dashboard**: Manage received and sent proposals with clear status indicators
- **Proposal Response System**: Accept, reject, or cancel proposals with immediate feedback
- **Rich User Interface**: Modal-based detail views with comprehensive sticker information
- **Composer Integration**: Seamless flow from find traders to proposal creation
- **Enhanced Type Safety**: Complete TypeScript interfaces for all trading operations
- **QuantityStepper Component**: Reusable +/- control with duplicate-aware clamping

### Changed

- **Navigation**: Added "Buzón Intercambios" CTA and `/trades/inbox` alias route
- **Match Cards**: Full-card clickable links with accessible focus states (removed redundant button)
- **Branding**: Updated to "CambioCromos" across all interfaces

### Technical

- Database tables: `trade_proposals`, `trade_proposal_items`
- RPC functions: `create_trade_proposal`, `respond_to_trade_proposal`, `list_trade_proposals`, `get_trade_proposal_detail`
- Comprehensive RLS policies for secure proposal access
- Sonner-based toast notification system

## [1.1.0] - 2025-01-XX

### Added - Find Traders Feature

- **RPC-Based Matching Engine**: `find_mutual_traders` and `get_mutual_trade_detail` functions
- **Advanced Search & Filtering**: Rarity, team, player name, minimum overlap controls
- **Mutual Benefit Visualization**: Clear display of bidirectional trading opportunities
- **Performance Optimized**: Custom indexes for efficient filtering on large datasets

### Changed

- **Active Collection Warning System**: Orange alert when no active collection selected
- **Streamlined Profile Navigation**: Removed redundant buttons - entire collection card is clickable
- **Enhanced User Feedback**: Improved toast messaging for active collection scenarios

### Fixed

- **True Zero-Reload Experience**: Eliminated all remaining page refreshes from collection operations
- **Active Collection State Management**: Better handling when removing active collection

### Technical

- New indexes: `idx_user_stickers_trading`, `idx_stickers_collection_filters`, `idx_collection_teams_name`
- Trading hooks: `useFindTraders`, `useMatchDetail`
- Trading components: `FindTradersFilters`, `MatchCard`, `MatchDetail`

## [1.0.0] - 2025-01-XX

### Added - Complete Profile Management

- **Zero-Reload Profile Actions**: Optimistic updates with automatic rollback
- **Enhanced Collection Navigation**: Clickable cards, deep-linking with `/mi-coleccion/[id]` URLs
- **Active-First Routing**: Navbar "Mi Colección" redirects to active collection
- **Collections Dropdown**: Easy switching between owned collections with visual indicators
- **Modern Card-Based Design**: Gradient headers, hover effects, animated progress bars
- **Confirmation Modals**: Safe destructive actions with cascade delete warnings

### Changed

- **Profile Page Complete Refactor**: Two-section layout (owned vs available collections)
- **Collection Management**: Add, remove, activate with per-action loading states
- **Optimistic State Management**: Snapshot-based cache with rollback on errors

### Technical

- Hooks: `useProfileData`, `useCollectionActions`
- Components: `CollectionsDropdown`, `EmptyCollectionState`, `ConfirmModal`
- Enhanced TypeScript interfaces for collection management

## [0.9.0] - 2024-12-XX

### Added

- **Active-first Collection Navigation**: Navbar link redirects to user's active collection
- **Dynamic Routing**: `/mi-coleccion/[id]` for canonical collection URLs
- **Collection Switcher**: Dropdown with active/inactive status indicators
- **Empty State**: Elegant handling for users without collections

### Technical

- New routing structure and navigation patterns
- Enhanced `CollectionPage` component with fallback logic

## [0.8.0] - 2024-12-XX

### Added

- **Modern Card-Based Profile Design**: Gradient headers, large avatars, status indicators
- **Inline Nickname Editing**: Stylish pencil icon button with keyboard shortcuts
- **Animated Progress Bars**: Visual completion indicators with gradients
- **Color-Coded Action Buttons**: Pill-style buttons with consistent styling

### Changed

- **Profile Page Visual Overhaul**: Transformed to modern card-based design
- **Collection Card Layout**: Gradient headers, improved stats display
- **Button Design System**: Unified pill-style buttons throughout

## [0.7.0] - 2024-12-XX

### Added

- **Profile Collection Management Refactor**: Two-section layout (owned vs available)
- **Add/Remove Collections**: One-click actions with confirmation modals
- **Active Collection System**: Exclusive activation with auto-activation for first collection
- **Cascade Delete**: Safe cleanup of user data when removing collections

### Technical

- Enhanced database schema with proper cascade behavior
- Granular action loading states
- Comprehensive empty states

## [0.2.0] - 2024-12-XX

### Added

- Complete user authentication system with Supabase
- User profile management with collection statistics
- Collection joining and switching functionality
- Comprehensive sticker inventory system ("TENGO"/"REPES"/"FALTAN")
- Collection progress tracking with completion percentages
- Modern gradient UI with responsive design
- Protected routes with AuthGuard component
- Real-time sticker ownership updates

### Infrastructure

- Supabase RLS policies implementation
- Database functions for collection statistics
- Optimistic UI updates
- Error handling and loading states

## [0.1.0] - 2024-XX-XX

### Added

- Initial project setup with Next.js 15 and App Router
- TypeScript configuration
- Tailwind CSS v4 integration
- shadcn/ui component library setup
- Basic UI components
- Supabase integration preparation
- Development workflow documentation

---

## 🎉 Major Milestones

### Phase 2.5 Complete (v1.4.1)

- **Complete UI/UX Redesign** ✅ **100% ROLLOUT**
- Modern, high-contrast "Retro-Comic" theme fully implemented
- Consistent styling across **all** pages and components
- Comprehensive E2E testing for visual verification
- Zero TypeScript errors, maintained accessibility standards

### Phase 1 Complete (v1.0.0)

- Zero-reload profile management
- Seamless collection navigation
- Modern responsive design
- Complete sticker inventory system

### Phase 2 Core Features Complete (v1.2.0)

- **Interactive Trading System with Proposals MVP**
- RPC-based secure trading architecture
- Advanced search and filtering for trading partners
- Complete proposal lifecycle management

### Phase 2 Complete (v1.3.0)

- **Album Pages System Fully Implemented**
- Complete UI for page-based navigation
- Automated image processing and upload
- Enhanced sticker management with WebP optimization
- Trade history and chat infrastructure ready

**Current Status**: Database at v1.3.0 ✅ | Frontend at v1.3.0 ✅ (Album Pages)
**Next Focus**: Trade Chat UI and History Dashboard.

---

## How to Update This File\_

When making changes:

1. **Add entries under [Unreleased]** as you develop
2. **Use categories**: Added, Changed, Deprecated, Removed, Fixed, Security, Technical
3. **When releasing**: Move unreleased items to new version section with date
4. **Commit format**: `git commit -m "docs: update changelog for vX.X.X"`

---

**Phase 2 Status**: Album Pages complete ✅ | Trade Chat & History pending 🚧  
**Ready for**: Phase 2 completion (chat UI, history dashboard)
