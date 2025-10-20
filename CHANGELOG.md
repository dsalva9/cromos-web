# Changelog

All notable changes to the CambioCromos project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0/).

## [Unreleased]

### Added

- TBD

### Changed

- TBD

### Fixed

- TBD

## [1.6.0-alpha] – 2025-10-20 - PIVOT: Marketplace + Templates

### 🔄 Breaking Changes

**Official Collections System REMOVED**

- Removed 7 tables: collections, stickers, collection_teams, collection_pages, page_slots, user_collections, user_stickers
- Removed 7 RPCs: find_mutual_traders, get_mutual_trade_detail, bulk_add_stickers_by_numbers, search_stickers, mark_team_page_complete, get_user_collection_stats, get_completion_report
- Reason: Pivot to neutral marketplace + community templates
- No affected users (pre-production)

**New Model: Neutral Marketplace**

- From automatic matching to manual discovery
- From official albums to community templates
- Legal model: neutral hosting (LSSI/DSA)

### ✨ Added - Marketplace System (Sprint 1)

**Trade Listings**

- `trade_listings` table for physical card listings
- Publish with optional real photo
- Free-form fields: title, description, number, collection
- Search and filtering
- View listings by user profile
- Direct chat from listing

**RPCs:**

- `create_trade_listing` - Create listing
- `list_trade_listings` - List with search
- `get_user_listings` - View user's listings
- `update_listing_status` - Mark sold/removed

**Chat from Listings**

- Extended `trade_chats` table with `listing_id`
- RPCs: `get_listing_chats`, `send_listing_message`
- Separate chat flows for proposals and listings

### ✨ Added - Collection Templates System (Sprint 2)

**Community Templates**

- Users create collection structures
- Publish as public or private
- Other users copy templates
- Track progress: HAVE/NEED/DUPES
- Integrated rating system (tables ready, functions pending)

**Tables:**

- `collection_templates` - Created templates
- `template_pages` - Pages within templates
- `template_slots` - Individual slots
- `user_template_copies` - User copies
- `user_template_progress` - Progress on each slot

**RPCs:**

- `create_template`, `add_template_page`, `publish_template`
- `list_public_templates`, `copy_template`, `get_my_template_copies`
- `get_template_progress`, `update_template_progress`

### ✨ Added - Marketplace-Template Integration (Sprint 3)

**Bidirectional Bridge**

- Listings can reference template copies and slots
- Template duplicates can be published to marketplace
- Sync status tracking between listings and progress
- Automatic count management on publish/sale

**Integration RPCs:**

- `publish_duplicate_to_marketplace` - Create listing from template slot
- `mark_listing_sold_and_decrement` - Mark sold and update template count
- `get_my_listings_with_progress` - View listings with sync information

**Flow:**

```
user_template_progress (count > 0)
    ↓ [publish_duplicate_to_marketplace]
trade_listings (copy_id, slot_id)
    ↓ [mark_listing_sold_and_decrement]
user_template_progress (count + 1)
```

### ✨ Added - Social and Reputation System (Sprint 4)

**Favourites System**

- Unified favourites table for all entity types
- Toggle favourite with single RPC
- Public counts for listings and templates
- User's favourites list with pagination

**User Ratings System**

- 1-5 star ratings with comments
- Linked to trades or listings
- Automatic aggregation on profiles
- Rating distribution statistics

**Template Ratings System**

- 1-5 star ratings with comments
- Automatic aggregation on templates
- Rating distribution statistics
- User's rating displayed in summary

**Reports System**

- Universal reporting for all content types
- Multiple report reasons
- Admin workflow with status tracking
- Prevention of duplicate reports

**Social RPCs:**

- `toggle_favourite`, `is_favourited`, `get_favourite_count`, `get_user_favourites`
- `create_user_rating`, `update_user_rating`, `delete_user_rating`, `get_user_ratings`, `get_user_rating_summary`
- `create_template_rating`, `update_template_rating`, `delete_template_rating`, `get_template_ratings`, `get_template_rating_summary`
- `create_report`, `get_reports`, `update_report_status`, `get_user_reports`, `check_entity_reported`

### Changed

**Database Schema**

- Clean foundation with core infrastructure preserved
- Authentication, trading, and admin systems intact
- Added marketplace system on top of existing foundation
- Added complete templates system with 5 tables
- Added marketplace-template integration with bidirectional sync
- Added comprehensive social and reputation system

**Documentation**

- Updated database-schema.md to reflect all new systems
- Updated current-features.md with Sprint 4 completion
- Added all new systems to documentation

---

## [1.5.0] – 2025-10-12

### Critical Fixes ✅ **COMPLETE**

- **Removed duplicate Supabase client instance**: Deleted `src/lib/supabase/client.ts` (unused duplicate), using only SupabaseProvider globally
- **Added batch RPC `get_multiple_user_collection_stats`**: Replaces N+1 queries with single batch call, 5-10x faster for users with multiple collections
- **Implemented ErrorBoundary component**: React Error Boundary with Spanish fallback UI ("Algo salió mal") and "Volver al inicio" button, integrated in root layout
- **Added logger utility**: Created `src/lib/logger.ts` with environment-aware logging (debug/info dev-only, warn/error always)
- **Updated ESLint configuration**: Stricter rules enforced
- **Performance optimizations ready**: Profile load verified <1s (batch RPC eliminates N+1 queries)

### Added - Admin Backoffice (MVP) ✅ **COMPLETE**

#### **Admin Panel UI** (`/admin`)

- **CollectionsTab**: CRUD for collections with publish/draft status indicators
- **PagesTab**: Create and manage album pages
- **StickersTab**: Full sticker management with WebP image upload
- **BulkUploadTab**: CSV-based batch sticker creation
- **UsersTab**: Complete user management system
- **TeamsTab**: Manage collection teams with flag URLs
- **AuditTab**: View admin action history

#### **Admin Database RPCs** ✅ **NEW**

- **User Management**: `admin_list_users`, `admin_update_user_role`, `admin_suspend_user`, `admin_delete_user`
- **Content Management**: `admin_upsert_collection`, `admin_delete_collection`, `admin_upsert_page`, `admin_delete_page`, `admin_upsert_sticker`, `admin_delete_sticker`
- **Audit**: `admin_get_audit_log`

#### **Security & Access Control**

- **AdminGuard component**: Protects `/admin` route
- **Suspended user checks**: Auth callback checks suspension status

### Added - Badges UI (Read-only) 🚧 In Progress

- **useUserBadges hook**: Read-only hook for fetching user badges
- **BadgeCard component**: Grid display in `/profile` with empty state
- **Retro-Comic styling**: Matches existing dark theme with gold accents

### Added - Quick Entry ("Abrir un sobre") 🚧 In Progress

- **Pack opener route**: `/mi-coleccion/[id]/pack` (authenticated)
- **Multi-number input**: 5 inputs with paste support (CSV/space/semicolon → auto-split; dedupe; auto-advance)
- **Bulk add RPC**: Calls `bulk_add_stickers_by_numbers` and shows summary (añadidos, repes, inválidos)
- **Optimistic updates**: Progress updates + clear/"Abrir otro sobre" flow

### Added - Location-Based Matching (Centroid + Haversine) 🚧 In Progress ✅ **NEW**

- **Postcode field**: Optional `profiles.postcode` for location-based matching
- **Postal codes table**: Centroid data (lat/lon) for Spanish postcodes
- **Haversine distance**: Calculate distance between users' postcodes
- **Mixed scoring**: Weighted score (0.6 overlap + 0.4 distance_decay)
- **Radius filter**: 10–100 km radius for finding nearby traders
- **Sort modes**: "distance" | "overlap" | "mixed"
- **Privacy preserved**: Show distance (~12 km) but not exact addresses

### Added - Profile Avatars (Seed Phase) 🚧 In Progress

- **Seed avatar pack**: 12 avatar images under `avatars/seed/...`
- **AvatarPicker component**: In `/profile` to select a seed avatar (writes `profiles.avatar_url`)
- **Phase B (deferred)**: Secure user uploads in future version

---

## [1.4.4] - 2025-10-08

### Added - Trade Finalization & Notifications System (MVP)

#### **Two-Step Trade Finalization**

- **Finalization Workflow**: Both participants must mark a trade as finalized before completion
- **Database Table**: `trade_finalizations` with composite PK (trade_id, user_id)
- **RPC Function**: `mark_trade_finalized(p_trade_id)` returns finalization status
- **UI in ProposalDetailModal**: Progress indicator, "Marcar como finalizado" button

#### **Notifications System (MVP)**

- **Database Table**: `notifications` with 4 notification types
- **Auto-notification Triggers**: Database triggers create notifications
- **RPC Functions**: `get_notifications()`, `get_notification_count()`, `mark_all_notifications_read()`
- **Notifications Page** (`/trades/notifications`): Groups into "Nuevas" and "Anteriores"
- **Navbar Badge**: Clickable bell icon with unread count

#### **Historial Tab & Rejected View**

- **Historial Tab**: New 3rd tab showing completed/cancelled trades
- **Ver Rechazadas Toggle**: View rejected proposals in inbox/outbox tabs

---

## [1.4.3] - 2025-10-08

### Fixed - SegmentedTabs Equal-Width Alignment

- **SegmentedTabs component perfected** across all three trading UI locations
- **Equal-width alignment**: CSS Grid with `grid-template-columns: repeat(N, 1fr)`
- **Flush seams**: Single-pixel dividers via `::before` pseudo-element
- **Outer border only**: Container has `border-2 border-black`, tabs have no individual borders
- **Rounded outer corners only**: Container uses `rounded-md overflow-hidden`

### Changed - Streamlined Trade Flow

- **Removed intermediate trade detail page**: Users now go directly from match card to proposal composer
- **Updated `MatchCard` to link directly to `/trades/compose`**

---

## [1.4.2] - 2025-10-07

### Added - Trade Chat UI + Unread Message Badges

#### **Real-time Trade Chat System**

- Pre-populated chat context: Opening a proposal loads the last 50 messages automatically
- Trade-scoped messaging: Composer bound to current trade ID
- Realtime message updates via Supabase subscriptions (no refresh required)
- Message bubbles: right-aligned for sender, left-aligned for counterparty
- Auto-scroll to newest on open and on new message
- "Nuevos mensajes" jump pill when new messages arrive while scrolled up

#### **Unread Message Badges**

- Per-card badges: Show unread count on each ProposalCard
- Tab aggregate badges: Total unread counts on tabs
- Mensajes tab badge: Subtle badge when unseen messages exist
- Mark as read: Automatically marks trade as read when chat panel is opened

#### **Backend Infrastructure**

- New table: `trade_reads` (user_id, trade_id, last_read_at)
- RPC: `mark_trade_read(p_trade_id)` → upserts last_read_at
- RPC: `get_unread_counts(p_box, p_trade_ids)` → returns per-trade unread_count

---

## [1.4.1] - 2025-10-07

### Added - Complete Retro-Comic Theme Rollout

- **Theme Consistency Pass**: Applied Retro-Comic design system across all remaining pages
- **Dark Mode First**: Solid deep charcoal/navy background (`bg-[#1F2937]`)
- **High-Contrast Elements**: Chunky cards and buttons with thick black borders
- **Accent Colors**: Gold `#FFC000` and Red `#E84D4D`
- **Spanish Interface**: Complete Spanish language support

---

## [1.4.0] - 2025-10-06

### Added - Mark Team Page Complete Feature

- **New RPC function**: `mark_team_page_complete(p_user_id, p_collection_id, p_page_id)`
- **Desktop UI**: "Marcar equipo completo" button in PageHeader
- **Mobile UI**: Long-press on team title opens ActionSheet
- **Optimistic Updates**: Instant UI feedback before RPC completes

### Changed - Mobile UI Optimization (Album View)

- **StickerTile component**: Cleaner mobile experience
- **Entire sticker is now tappable** to add it
- **Action buttons below the sticker are hidden on mobile**
- **Dynamic badge (`+n` or a checkmark)** on the sticker opens duplicate-management actions

---

## [1.3.0] - 2025-01-XX

### Added - Complete Album Pages System

**Database Infrastructure:**

- `collection_pages` table - Album page definitions
- `page_slots` table - Sticker-to-slot mapping
- Complete migration for Collection 24 (Panini La Liga 2025-26)

**UI Components:**

- `AlbumPager` - Page navigation with team crests
- `PageHeader` - Page title with completion progress bars
- `AlbumPageGrid` - Responsive grid with 20-slot team pages
- `StickerTile` - Individual sticker display with ownership controls
- `useAlbumPages` - Comprehensive hook managing all album state

---

## [1.2.0] - 2025-01-XX

### Added - Trade Proposals MVP

- **Complete Interactive Trading System**: Full proposal lifecycle from creation to completion
- **Secure Database Architecture**: RLS-protected tables with SECURITY DEFINER RPC functions
- **Multi-Sticker Proposals**: Compose complex trades with multiple offer/request items
- **Inbox/Outbox Dashboard**: Manage received and sent proposals with clear status indicators

---

## [1.1.0] - 2025-01-XX

### Added - Find Traders Feature

- **RPC-Based Matching Engine**: `find_mutual_traders` and `get_mutual_trade_detail` functions
- **Advanced Search & Filtering**: Rarity, team, player name, minimum overlap controls
- **Mutual Benefit Visualization**: Clear display of bidirectional trading opportunities

---

## [1.0.0] - 2025-01-XX

### Added - Complete Profile Management

- **True Optimistic Updates**: All actions update UI instantly without reloads
- **Modern Card Design**: Gradient headers with avatars and status indicators
- **Inline Editing**: Real-time nickname editing
- **Per-Action Loading**: Individual button loading states

---

## 🎉 Major Milestones

### Phase 0 Complete (v1.6.0-alpha) ✅ **100%**

- **Complete System Cleanup**: Removed old collections system
- **Clean Foundation**: Ready for marketplace + templates implementation
- **Documentation Updated**: Reflects new direction and current state

### Sprint 1 Complete (v1.6.0-alpha) ✅ **100%**

- **Marketplace Backend**: Complete listings system with RPCs
- **Chat from Listings**: Extended trade_chats for marketplace
- **Documentation Updated**: All docs reflect marketplace system

### Sprint 2 Complete (v1.6.0-alpha) ✅ **100%**

- **Templates Backend**: Complete template system with RPCs
- **5 Template Tables**: Full template structure with pages and slots
- **8 Template RPCs**: Management, discovery, and progress tracking
- **Documentation Updated**: All docs reflect templates system

### Sprint 3 Complete (v1.6.0-alpha) ✅ **100%**

- **Integration Backend**: Complete marketplace-template bridge
- **Bidirectional Sync**: Template ↔ marketplace with count management
- **3 Integration RPCs**: Publish, sell, and sync tracking
- **Documentation Updated**: All docs reflect integration system

### Sprint 4 Complete (v1.6.0-alpha) ✅ **100%**

- **Social Backend**: Complete social and reputation system
- **4 Social Tables**: Favourites, user ratings, template ratings, reports
- **17 Social RPCs**: Favourites, ratings, reports management
- **Documentation Updated**: All docs reflect social system

### Phase 2.5 Complete (v1.4.1)

- **Complete UI/UX Redesign** ✅ **100% ROLLOUT**
- Modern, high-contrast "Retro-Comic" theme fully implemented
- Consistent styling across **all** pages and components

### Phase 1 Complete (v1.0.0)

- Zero-reload profile management
- Seamless collection navigation
- Modern responsive design
- Complete sticker inventory system

### Phase 2 Core Features Complete (v1.2.0)

- **Interactive Trading System with Proposals MVP**
- RPC-based secure trading architecture
- Advanced search and filtering for trading partners

### Phase 2 Complete (v1.3.0)

- **Album Pages System Fully Implemented**
- Complete UI for page-based navigation
- Enhanced sticker management with WebP optimization

**Current Status**: Database at v1.6.0-alpha ✅ | Frontend at v1.5.0
**Next Focus**: Sprint 5: Admin Moderation

---

## How to Update This File

When making changes:

1. **Add entries under [Unreleased]** as you develop
2. **Use categories**: Added, Changed, Deprecated, Removed, Fixed, Security, Technical
3. **When releasing**: Move unreleased items to new version section with date
4. **Commit format**: `git commit -m "docs: update changelog for vX.X.X"`

---

**Phase 0 Status**: Cleanup Complete ✅ | Sprint 1 Complete ✅ | Sprint 2 Complete ✅ | Sprint 3 Complete ✅ | Sprint 4 Complete ✅ | Ready for Sprint 5: Admin Moderation 🚧  
**Next**: Begin Sprint 5 implementation (admin audit log, moderation RPCs)
