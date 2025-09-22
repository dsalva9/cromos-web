# Changelog

All notable changes to the Cromos Web project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Trading system development (in progress)
- User directory and public profiles (planned)
- Advanced search and filtering (planned)

### Changed

- N/A

### Fixed

- N/A

### Removed

- N/A

## [0.8.0] - 2024-12-XX

### Added

- **Seamless Perfil Actions with Optimistic Updates**
  - All profile actions now update UI instantly without page reloads
  - Per-action loading states for individual buttons and controls
  - Optimistic cache management with automatic rollback on errors
  - Custom toast notification system for success/error feedback
  - Hook-based architecture for profile data and collection actions

- **Enhanced Profile User Experience**
  - Inline nickname editing with immediate visual feedback
  - Collection add/remove/activate actions work seamlessly
  - Visual loading indicators per action (no full-page spinners)
  - Error handling with toast notifications and state recovery
  - Keyboard shortcuts for nickname editing (Enter to save, Escape to cancel)

- **Robust State Management**
  - Snapshot-based optimistic updates with rollback capability
  - Soft refresh functionality for cache reconciliation
  - Client-side cache with server sync validation
  - Prevention of concurrent conflicting actions

### Changed

- **Profile Page Architecture**: Complete refactor to hook-based optimistic updates
- **Data Flow**: Eliminated all router.refresh() calls and page reloads
- **User Feedback**: Replaced full-page loading with granular action feedback
- **Error Handling**: Enhanced error states with automatic recovery

### Technical Infrastructure

- New hooks: `useProfileData` and `useCollectionActions` for optimistic state management
- Custom toast utility system for user notifications
- Enhanced confirm modal component with loading states
- Improved TypeScript interfaces for profile and collection data

## [0.7.0] - 2024-12-XX

### Added

- **Modern Card-Based Profile Design**
  - Gradient header profile card with large avatar and status indicators
  - Inline nickname editing with stylish pencil icon button
  - Smooth hover animations for all collection cards
  - Visual progress bars with animated completion percentages
  - Color-coded gradient header strips (green for active, gray for inactive collections)

- **Enhanced Visual Design System**
  - Pill-style action buttons with proper color coding (blue activate, red delete, green add)
  - Colorful statistics display boxes with meaningful lucide-react icons
  - Consistent card elevation and shadow system across all components
  - Improved spacing and typography hierarchy for better readability

- **UI/UX Improvements**
  - Smooth scale-up hover effects on collection cards
  - Animated progress indicators with gradient fills
  - Better visual feedback for all user actions
  - Enhanced empty states with larger icons and better messaging
  - Consistent badge styling with shadow effects

### Changed

- **Profile Page Complete Visual Overhaul**: Transformed from basic layout to modern card-based design matching Mi Colección page aesthetics
- **Collection Card Layout**: Redesigned with gradient headers, better stats display, and modern action buttons
- **Button Design System**: Unified pill-style buttons with consistent colors and hover effects
- **Visual Hierarchy**: Improved spacing, typography, and color usage throughout profile interface

### Infrastructure

- Enhanced ModernCard component usage for consistent design language
- Improved loading states with better visual feedback
- Better responsive design patterns for card-based layouts

## [0.6.0] - 2024-12-XX

### Added

- **Complete Profile Collection Management Refactor**
  - Two-section layout: "Mis Colecciones" vs "Colecciones Disponibles"
  - Add collections to user profile with one-click action
  - Remove collections from profile with confirmation modal and cascade delete
  - Set active collection with exclusive activation logic
  - Auto-activation for first collection added
  - Comprehensive loading states for all collection actions
  - Empty states for both owned and available collection sections

- **Enhanced User Experience**
  - Confirmation modal component with destructive action styling
  - Detailed collection statistics display (completion %, duplicates, wanted items)
  - Visual badges for collection status (Active, Nueva, Inactiva)
  - Granular action loading states (per-button loading indicators)
  - Improved error handling and user feedback

- **Data Integrity & Safety**
  - Cascade delete functionality when removing collections
  - Unique constraints preventing duplicate collection joins
  - Safe destructive actions with clear warning messages
  - Proper cleanup of user_stickers when removing collections

### Changed

- **ProfilePage Complete Rewrite**: Separated owned vs available collections with distinct UI sections
- **Collection Management Logic**: Enhanced with proper cascade delete and exclusive active states
- **User Interface**: Improved visual hierarchy and action organization

### Infrastructure

- New ConfirmModal component for safe destructive actions
- Enhanced database schema documentation for cascade behavior
- Improved TypeScript interfaces for collection management
- Updated RLS policies for collection operations

## [0.2.0] - 2024-12-XX

### Added

- Complete user authentication system with Supabase
- User profile management with collection statistics
- Collection joining and switching functionality
- Comprehensive sticker inventory system ("TENGO"/"QUIERO" functionality)
- Collection progress tracking with completion percentages
- Modern gradient UI with responsive design
- Protected routes with AuthGuard component
- Multi-collection support with user preferences
- Real-time sticker ownership updates
- Duplicate tracking and want list management
- Site navigation with user-specific menu items

### Infrastructure

- Supabase RLS policies implementation
- Database functions for collection statistics
- Optimistic UI updates for better UX
- Error handling and loading states

## [0.1.0] - 2024-XX-XX

### Added

- Initial project setup
- Next.js 15 with App Router
- TypeScript configuration
- Tailwind CSS v4 integration
- shadcn/ui component library setup
- Basic UI components: Button, Card, Input, Dialog, Avatar, Badge, Progress, Textarea
- Modern card component for sports card theme
- Supabase integration preparation
- Development workflow documentation

### Infrastructure

- ESLint and Prettier configuration
- Git workflow and conventional commits setup
- Environment variables template
- Core documentation files

---

## How to Update This File

When making changes to the project:

1. **Add entries under [Unreleased]** as you develop
2. **Use these categories:**
   - `Added` for new features
   - `Changed` for changes in existing functionality
   - `Deprecated` for soon-to-be removed features
   - `Removed` for now removed features
   - `Fixed` for bug fixes
   - `Security` for vulnerability fixes

3. **When releasing a version:**
   - Move unreleased items to a new version section
   - Add the release date
   - Create a new empty [Unreleased] section

4. **Commit message format:**
   ```bash
   git add CHANGELOG.md
   git commit -m "docs: update changelog for v0.8.0"
   git push origin main
   ```
