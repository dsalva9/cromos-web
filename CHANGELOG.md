# Changelog

All notable changes to the CambioCromos project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0/).

> [!NOTE]
> This file contains a high-level summary of recent changes.
> For the complete historical changelog, please see [docs/changelog/detailed-changelog.md](docs/changelog/detailed-changelog.md).

## [Unreleased]

### Upcoming / In-Progress
-   **Mobile Architecture Initialization**: Adopting Capacitor for Android MVP. Zero-branch strategy with `process.env` and context detection.

### Mobile MVP (Phase 1 & 2)
-   **Viewport & Safe Areas**: Fixed meta tags (no-zoom) and implemented CSS variables for safe area insets.
-   **Mobile Interactions**: Removed sticky hover states using `@media (hover: hover)` and disabled `autoFocus` on mobile.
-   **Input Handling**: Optimized `inputMode="numeric"` for numeric inputs to trigger correct mobile keyboards.
-   **CSS Architecture**: Added standard Z-Index scale to Tailwind config and fixed overscroll behavior (`overscroll-behavior-y: none`).
-   **Capacitor Setup**: Initialized Capacitor project, added Android platform, and configured `capacitor.config.ts` to point to production URL.
-   **Native Features**:
    -   Added `OneSignalProvider` for push notifications (requires App ID).
    -   Configured Android Deep Linking for `cromos-web.vercel.app`.

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
