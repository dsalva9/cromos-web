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

## [1.6.4] - 2025-01-22 - Performance & Documentation Enhancements

### Added

- **Form Validation**
  - Installed Zod 4.1 and @hookform/resolvers for runtime validation
  - Created `marketplace.schemas.ts` with listing validation schemas
  - Created `template.schemas.ts` with template validation schemas
  - Added TypeScript type inference from Zod schemas

- **Error Handling**
  - Created centralized error message constants in `src/lib/constants/errors.ts`
  - Added success message constants
  - Added helper functions for error message extraction
  - Consistent Spanish error messages across the application

- **Documentation**
  - Created `docs/PERFORMANCE.md` - Bundle analysis, database optimization, and performance monitoring guide
  - Created `docs/CONTRIBUTING.md` - Comprehensive contribution guidelines with code standards
  - Created `docs/ARCHITECTURE.md` - System architecture, design patterns, and technical decisions
  - Created `docs/DEPLOYMENT.md` - Complete deployment guide for Vercel and Supabase
  - Added JSDoc comments to public APIs in hooks (starting with `useListings`)

- **README Enhancements**
  - Added tech stack badges (Next.js, TypeScript, React, Supabase, Tailwind)
  - Added quick links to demo, documentation, and contributing guides
  - Updated version to v1.6.3

### Changed

- **Code Organization**
  - Created `src/lib/validations/` directory for Zod schemas
  - Created `src/lib/constants/` directory for application constants
  - Improved code documentation with JSDoc comments

### Performance

- **Bundle Analysis**
  - Documented current bundle metrics (~102 kB first load JS)
  - Identified optimization opportunities for future sprints
  - Created performance monitoring checklist

- **Database Performance**
  - Documented indexed columns and query optimization strategies
  - Identified critical queries for monitoring
  - Added recommendations for future database optimizations

## [1.6.3] - 2025-01-22

### Fixed

- **Fixed all ESLint warnings (11 total)**
  - Fixed React Hook dependencies in 4 files (marketplace pages and template hooks)
  - Wrapped `fetchListing` in `useCallback` to stabilize reference in `useListing.ts:13`
  - Added `fetchListings` to dependencies array in `useListings.ts:100`
  - Added `fetchTemplates` to dependencies array in `useTemplates.ts:98`
  - Added `incrementViews` to dependencies array in marketplace detail page
  - Removed 4 unused variables across marketplace and template files
  - Removed unused `useState` imports from create and edit listing pages
  - Removed unused `refetch` variable from edit listing page
  - Removed unused `statusCycle` variable from `SlotTile.tsx:57`
  - Removed unused `pageData` variable from `useCreateTemplate.ts:92`

- **Optimized images with Next.js Image component (3 warnings)**
  - Replaced `<img>` tags with Next.js `<Image>` component in `ImageUpload.tsx:81`
  - Replaced `<img>` tags with Next.js `<Image>` component in `TemplateBasicInfoForm.tsx:89`
  - Replaced `<img>` tags with Next.js `<Image>` component in `TemplateReviewForm.tsx:119`
  - Added proper `fill`, `sizes`, and `alt` attributes for automatic optimization

- **Replaced console logging with logger utility (33 instances)**
  - Replaced all `console.error()` calls with `logger.error()` across 12 files
  - Replaced debug `console.log()` calls with `logger.debug()` in template hooks
  - Replaced `console.warn()` calls with `logger.warn()` in localStorage hook
  - Added logger import to all affected files

### Added

- **Integrated Sentry error tracking service**
  - Installed `@sentry/nextjs` package
  - Created Sentry configuration files (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`)
  - Updated logger utility to send errors to Sentry in production
  - Added `NEXT_PUBLIC_SENTRY_DSN` environment variable to `.env.example`
  - Configured automatic error reporting with replay integration

- **Reorganized repository structure**
  - Created `scripts/` directory
  - Moved SQL files (`clear_user_trades.sql`, `load_collection.sql`) to `scripts/`
  - Created `tests/` directory
  - Moved test files (`mi-coleccion-images.spec.ts`) to `tests/`

- **Comprehensive environment variables documentation**
  - Added detailed "Environment Variables" section to README.md
  - Documented required vs optional variables
  - Added instructions for obtaining Supabase credentials
  - Explained environment file structure (`.env.local` vs `.env.production`)

- **Type generation script**
  - Created `scripts/generate-types.sh` for generating TypeScript types from Supabase
  - Added `generate-types` npm script to package.json
  - Updated README.md with type generation documentation

- **Testing documentation**
  - Created `docs/TESTING.md` with comprehensive testing guide
  - Documented Playwright test patterns and best practices
  - Added CI/CD integration examples
  - Included debugging and troubleshooting tips

- **Development scripts**
  - Added `lint:fix` script for automatic linting fixes
  - Added `test:e2e:ui` script for interactive test UI
  - Added `test:e2e:report` script for generating test reports

### Changed

- **Consolidated documentation**
  - Archived redundant component guide files to `docs/archive/`
  - Kept `docs/components-guide.md` as the single source of truth
  - Updated README.md with new "Development Scripts" section
  - Enhanced README.md with testing documentation reference

## [1.6.2] - 2025-01-22

### Fixed

- **Removed hardcoded Sprint 9 error messages**: Template hooks now display actual RPC error messages instead of placeholder text
  - Fixed `useTemplates.ts` to show proper error messages when loading public templates fails
  - Fixed `useTemplateProgress.ts` to show proper error messages when loading template copies and progress fails
- **Simplified RPC function calls in mis-plantillas page**: Removed unnecessary fallback logic for non-existent RPC functions
  - Removed calls to `test_get_my_template_copies` (test script, not an actual RPC)
  - Removed calls to `get_my_template_copies_basic` (does not exist in database)
  - Now uses only the canonical `get_my_template_copies` RPC function
  - Added explanatory comments documenting the change
- **Re-enabled Playwright test suite**: Changed test script from disabled placeholder to functional `playwright test` command

## [1.6.1] – 2025-10-22 - Template Creation and Collection Management Fixes

### ✨ Added

- Switch UI component for toggle functionality
- Sticker count display in templates and collections
- Clickable collection cards in "Mis Colecciones" page

### 🔄 Changed

- Updated "Mis Plantillas" to "Mis Colecciones" throughout the application
- Updated status labels: "Tenidas" to "Lo Tengo", "Duplicadas" to "Repes"/"Repe", "Faltantes" to "Faltan"
- Improved sticker status logic: Falta (0), Lo Tengo (1), Repe (2+)
- Added +/- buttons for "Lo Tengo" and "Repe" status

### 🐛 Fixed

- Fixed scalar array error in add_template_page RPC
- Fixed progress calculation for collections
- Fixed RPC functions to correctly calculate progress
- Fixed empty slot validation in template creation
- Fixed counts showing as 0/0 in "Mis Colecciones" page

## [1.6.0] – 2025-10-22 - Templates Creation UI (Frontend)

### ✨ Added - Templates Creation UI (Frontend) **Sprint 8.5 Complete**

**Pages:**

- `/templates/create` - Multi-step template creation wizard

**Components:**

- `TemplateCreationWizard` - Main wizard container with progress indicator
- `TemplateBasicInfoForm` - Step 1: Title, description, image, public/private
- `TemplatePagesForm` - Step 2: Dynamic page and slot management
- `TemplateReviewForm` - Step 3: Review and publish confirmation
- `Switch` - Toggle component for public/private settings

**Hooks:**

- `useCreateTemplate` - Template creation with validation and error handling

**Features:**

- Multi-step wizard with progress tracking (3 steps)
- Dynamic page and slot management with add/remove
- Image upload with preview functionality
- Public/private template visibility toggle
- Form validation at each step
- Review and confirmation before publishing
- Integration with existing Sprint 2 RPCs
- Full Spanish localization
- Mobile responsive design
- Error handling with user-friendly messages

### Changed

- Added @radix-ui/react-switch dependency for toggle functionality
- Updated template creation flow to use dedicated hook
- Enhanced form validation throughout the wizard

### Fixed

- TypeScript errors in template forms with proper type definitions
- ESLint warnings for unused imports and variables

## [1.6.0] – 2025-10-21 - Templates UI (Frontend)

### ✨ Added - Templates UI (Frontend) **Sprint 8 Complete**

**Pages:**

- `/templates` - Explorer with search, filters, and sort
- `/mis-plantillas` - User's template copies list
- `/mis-plantillas/[copyId]` - Progress tracking grid

**Components:**

- `TemplateCard` - Card with rating, stats, copy button
- `TemplateFilters` - Search and sort controls
- `TemplateProgressGrid` - Paginated slot grid
- `SlotTile` - Interactive slot with status controls
- `TemplateSummaryHeader` - Progress statistics

**Hooks:**

- `useTemplates` - Fetch public templates with filters
- `useCopyTemplate` - Copy template to user account
- `useTemplateProgress` - Fetch and update slot progress

**Features:**

- Search templates by title/description
- Sort by recent, rating, or popularity
- Copy template with redirect
- Track progress: missing/owned/duplicate
- Page-based navigation (tabs)
- Click slot to cycle status
- Count controls for duplicates
- Publish button on duplicate slots
- Completion percentage tracking
- Optimistic UI updates
- Full Spanish localization
- Mobile responsive design

### Changed

- Updated site navigation to include "Plantillas" and "Mis Plantillas" links
- Added templates components to CambioCromos theme system
- Integrated with existing authentication and toast systems

### Fixed

- TypeScript errors in template hooks by defining proper RPC response types
- ESLint warnings for unused imports and variables
- Mobile responsiveness issues with grid layouts

## [1.6.0] – 2025-10-21 - Marketplace UI (Frontend)

### ✨ Added - Marketplace UI (Frontend) **Sprint 7 Complete**

**Pages:**

- `/marketplace` - Main feed with search and infinite scroll
- `/marketplace/create` - Create listing form
- `/marketplace/[id]` - Listing detail page

**Components:**

- `ListingCard` - Grid card with image, status, author
- `ListingForm` - Reusable create/edit form
- `SearchBar` - Debounced search input
- `ImageUpload` - Image upload to Supabase Storage

**Hooks:**

- `useListings` - Fetch marketplace feed with pagination
- `useListing` - Fetch single listing with view tracking
- `useCreateListing` - Create new listing

**Features:**

- Responsive grid layout (1-4 columns)
- Infinite scroll pagination
- Real-time search with debounce
- Image upload with preview
- View counter auto-increment
- Owner actions (edit/delete)
- Empty states and loading skeletons
- Navigation integration

### Changed

- Updated site navigation to include Marketplace link
- Added marketplace components to CambioCromos theme system
- Integrated with existing authentication and toast systems

### Fixed

- TypeScript errors in marketplace hooks by defining proper RPC response types
- Image upload handling with proper error states
- Form validation with character counters

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

### ✨ Added - Admin Moderation System (Sprint 5)

**Audit Log Extensions**

- Enhanced audit log with moderation-specific fields
- View for moderation actions only
- Context tracking for all moderation actions

**Moderation RPCs with Audit**

- All moderation actions logged with context
- User management with audit logging
- Content deletion with audit logging
- Report handling with audit logging

**Admin Dashboard RPCs**

- Overall statistics (users, listings, templates, reports)
- Recent reports with entity details
- Recent moderation activity
- Report statistics by type and status
- Admin performance metrics

**Bulk Moderation Actions**

- Bulk update report status
- Bulk suspend/unsuspend users
- Bulk delete content
- Report escalation

**Moderation RPCs:**

- `log_moderation_action`, `get_moderation_audit_logs`, `get_entity_moderation_history`
- `admin_update_user_role`, `admin_suspend_user`, `admin_delete_user`, `admin_delete_content`
- `get_admin_dashboard_stats`, `get_recent_reports`, `get_moderation_activity`
- `get_report_statistics`, `get_admin_performance_metrics`
- `bulk_update_report_status`, `bulk_suspend_users`, `bulk_delete_content`, `escalate_report`

### Changed

**Database Schema**

- Clean foundation with core infrastructure preserved
- Authentication, trading, and admin systems intact
- Added marketplace system on top of existing foundation
- Added complete templates system with 5 tables
- Added marketplace-template integration with bidirectional sync
- Added comprehensive social and reputation system
- Added complete admin moderation system with audit logging

**Documentation**

- Updated database-schema.md to reflect all new systems
- Updated current-features.md with Sprint 5 completion
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
- **4 Social Tables**: Favourites, user_ratings, template_ratings, reports
- **17 Social RPCs**: Favourites, ratings, reports management
- **Documentation Updated**: All docs reflect social system

### Sprint 5 Complete (v1.6.0-alpha) ✅ **100%**

- **Admin Moderation Backend**: Complete admin moderation system
- **Audit Log Extensions**: Enhanced audit log with moderation-specific fields
- **13 Moderation RPCs**: Audit logging, dashboard, bulk actions
- **Documentation Updated**: All docs reflect admin moderation system

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

**Current Status**: Database at v1.6.0 ✅ | Frontend at v1.6.0
**Next Focus**: Sprint 9: Integration UI

---

## How to Update This File

When making changes:

1. **Add entries under [Unreleased]** as you develop
2. **Use categories**: Added, Changed, Deprecated, Removed, Fixed, Security, Technical
3. **When releasing**: Move unreleased items to new version section with date
4. **Commit format**: `git commit -m "docs: update changelog for vX.X.X"`

---

**Phase 0 Status**: Cleanup Complete ✅ | Sprint 1 Complete ✅ | Sprint 2 Complete ✅ | Sprint 3 Complete ✅ | Sprint 4 Complete ✅ | Sprint 5 Complete ✅ | Sprint 6.5 Complete ✅ | Sprint 7 Complete ✅ | Sprint 8 Complete ✅ | Sprint 8.5 Complete ✅ | Ready for Sprint 9: Integration UI 🚧
**Next**: Begin Sprint 9 implementation (Integration UI)
