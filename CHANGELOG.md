# Changelog

All notable changes to the CambioCromos project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0/).

> [!NOTE]
> This file contains a high-level summary of recent changes.
> For the complete historical changelog, please see [docs/changelog/detailed-changelog.md](docs/changelog/detailed-changelog.md).

## [Unreleased]

### Upcoming / In-Progress
-   **Dynamic Cromo Fields (2025-12-01)**: ✅ COMPLETE - Major refactor to allow user-defined fields for cromos in templates. Simplifies marketplace listings to title/description only. Adds group/pack listings for bulk selling.
    -   ✅ Database: Added `item_schema` to templates, `data` to slots, `is_group`/`group_count` to listings
    -   ✅ RPCs: Updated `create_template`, `create_trade_listing`, `add_template_page_v2`, `get_template_progress`, `get_template_details`, `list_trade_listings_filtered_with_distance`
    -   ✅ Types: Added `ItemFieldDefinition` interface and updated all related types
    -   ✅ Components: Created `ItemSchemaBuilder`, `DynamicFieldsEditor`, `SimplifiedListingForm`, `PublishSparesBulkModal`
    -   ✅ Template Creation: Full support for custom fields - users can define and use dynamic fields, drag-and-drop reordering
    -   ✅ Marketplace: Simplified listing creation to title/description/collection/images with individual/pack toggle, images now mandatory
    -   ✅ Collection Field: Added optional collection field with template selector modal for quick-filling from user's templates
    -   ✅ Bulk Listing: "Publicar Repes" feature auto-generates pack listings from album spares
    -   ✅ Single Spare Publishing: Auto-fills title and description from album + custom fields, hides pack option
    -   ✅ Template Stats: Fixed REPES count to show total spare cromos (sum of count-1 for all duplicate slots)
    -   ✅ Listing Badges: Replaced "Activo" with "Pack de cromos" or "Cromo" based on `is_group` field
    -   ✅ Marketplace Search: Prioritizes title matches, then description, then collection for better relevance
    -   ✅ Validation: Required dynamic fields now properly validated in template creation wizard
-   **Mobile Architecture Initialization**: Adopting Capacitor for Android MVP. Zero-branch strategy with `process.env` and context detection. Need to fix push notifications for Android, currently web notifications work.

### Mobile MVP (Phase 1 & 2)
-   **Viewport & Safe Areas**: Fixed meta tags (no-zoom) and implemented CSS variables for safe area insets.
-   **Mobile Interactions**: Removed sticky hover states using `@media (hover: hover)` and disabled `autoFocus` on mobile.
-   **Input Handling**: Optimized `inputMode="numeric"` for numeric inputs to trigger correct mobile keyboards.
-   **CSS Architecture**: Added standard Z-Index scale to Tailwind config and fixed overscroll behavior (`overscroll-behavior-y: none`).
-   **Capacitor Setup**: Initialized Capacitor project, added Android platform, and configured `capacitor.config.ts` to point to production URL.
-   **Native Features**:
    -   Added `OneSignalProvider` for push notifications (requires App ID).
    -   Configured Android Deep Linking for `cromos-web.vercel.app`.
    -   Added `DeepLinkHandler` for routing incoming deep links to correct pages.
    -   **Phase 2 Polish**:
        -   Native Splash Screen (Icon & Splash images generated).
        -   Haptic Feedback on navigation interactions.
        -   Mobile-specific CSS polish (user-select: none, safe-area insets).

**Status**: Mobile MVP Phase 1 & 2 complete. App successfully runs on Android with deep linking, safe area handling, mobile-optimized inputs, and native feel (haptics, splash).

### Mobile UI Redesign (New)
-   **Bottom Navigation**: Implemented a fixed bottom bar with 5 icons (Marketplace, Albums, Chats, Favorites, Menu).
-   **Floating Action Button (FAB)**: Added a global FAB for "Publicar Anuncio" and "Crear Plantilla" on mobile.
-   **Simplified Header**: Mobile header now only shows Logo, Notifications, and Avatar.
-   **More Menu**: Implemented a slide-up drawer for secondary navigation links.
-   **Hidden Elements**: Hidden redundant "Publicar" buttons on mobile pages in favor of the FAB.

### Pending Mobile Work
-   **Refactoring**: Split large components (`users/[userId]`, `marketplace/[id]/chat`, `profile`) to improve performance.

### Added
- **Delete Template Collection Feature (2025-11-04)**: Users can delete tracked collections.
- **Badges Gamification System (2025-01-04)**: 19 badges across 6 categories with real-time progress.
- **Panini Metadata Fields (2025-11-01)**: Added page number, title, and slot variants to listings.
- **Marketplace Collection Filter (2025-10-31)**: Filter listings by user's template collections.

### Fixed
- **Marketplace Fixes**: Excluded user's own listings from marketplace view.
- **Admin Dashboard Fixes**: Resolved 404 errors and audit log filtering issues.

### Improved
- **Marketplace Search**: Implemented smarter search with prefix matching (e.g., "Maradon" finds "Maradona") and partial matching (e.g., "Ite" finds "Item"). Added Spanish Full Text Search and Trigram indices for better performance and accuracy.

## [2025-10-30] - User Ignore & Profile Updates

### Added
- **User Ignore System**: Block users, hide their listings, and prevent chat interactions.
- **User Profile Enhancements**: Comprehensive ratings section with charts and detailed reviews.
- **Chat Improvements**: Clickable usernames and context-aware system messages.

### Fixed
- **Distance Sorting**: Restored distance-based sorting with ignore filter integration.
- **Rating Notifications**: Fixed duplicate notifications and premature alerts.
- **Chat Access**: Fixed issues for first-time buyers and listing participants.

## [2025-10-25] - Notifications System Reboot

### Added
- **Unified Notification System**: Real-time updates for all platform events.
- **New Notification Types**: Listing chat, reservations, completions, ratings.
- **Smart Deduplication**: Prevents notification spam.
- **Notification Center**: Dedicated page with filtering and history.

---

**Full History**: See [docs/changelog/detailed-changelog.md](docs/changelog/detailed-changelog.md)
