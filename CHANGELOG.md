# Changelog

All notable changes to the CambioCromos project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

## [1.4.0] - 2025-01-XX

### Added

- **Retro-Comic UI/UX Design System**: Implemented a bold, high-contrast, retro-comic sticker aesthetic across the entire application.

### Changed

- **Complete UI Overhaul**: Replaced the previous gradient-based theme with a dark mode-first design (`bg-[#1F2937]`).
- **Component Redesign**: Updated all major components (`ModernCard`, `StickerTile`, headers, buttons, badges) with a chunky, high-contrast style featuring thick black borders and specific accent colors (`#FFC000` gold, `#E84D4D` red).
- **Updated Pages**: Applied the new theme consistently across the Profile Page, Collection Grid, and the full Album View.
- **Typography**: Standardized major titles to be bold, condensed, and `uppercase` for a stronger visual identity.

### Technical

- Refactored multiple page and component styles to use the new centralized theme principles.

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
- Optimistic updates for TENGO/QUIERO/REPE controls
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
- Comprehensive sticker inventory system ("TENGO"/"QUIERO")
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

### Phase 2.5 Complete (v1.4.0)

- **Complete UI/UX Redesign**
- Modern, high-contrast "Retro-Comic" theme implemented
- Consistent styling across all user-facing pages

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
