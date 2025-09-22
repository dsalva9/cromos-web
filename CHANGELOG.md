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

## [1.0.0] - 2025-01-XX

### Added

- **Complete Profile Management Refactor with Advanced Optimistic Updates**
  - Eliminated all page reloads from profile actions for seamless UX
  - Optimistic state management with automatic rollback on server errors
  - Per-action loading states for granular user feedback
  - Simple toast notification system for success/error messages
  - Hook-based architecture with `useProfileData` and `useCollectionActions`
- **Enhanced Collection Navigation Experience**
  - Clickable collection cards for direct navigation to collection pages
  - "Ver Colección" buttons for explicit navigation actions
  - Deep-linking support with canonical `/mi-coleccion/[id]` URLs
  - Improved visual design with enhanced hover effects and transitions
  - Better mobile responsiveness for collection cards

- **Advanced State Management Architecture**
  - Snapshot-based cache system for optimistic updates
  - Smart error recovery with automatic state rollback
  - Conflict prevention through action loading states
  - Client-side validation before server operations

### Changed

- **Profile Page Architecture**: Complete refactor from traditional form-based updates to modern optimistic state management
- **Collection Management Flow**: Enhanced from basic CRUD to sophisticated optimistic updates with error recovery
- **User Feedback System**: Migrated from alerts and page reloads to elegant toast notifications
- **Navigation Patterns**: Improved from static links to dynamic, context-aware navigation

### Technical Infrastructure

- New custom hooks: `useProfileData` for optimistic state management
- Enhanced TypeScript interfaces for better type safety
- Improved component organization with better separation of concerns
- Better error handling patterns throughout the application

### Fixed

- Eliminated page refresh issues when managing collections
- Fixed inconsistent loading states across profile actions
- Resolved navigation issues with collection switching
- Improved error handling for network failures

## [0.9.0] - 2024-12-XX

### Added

- **Active-first Collection Navigation**
  - Navbar "Mi Colección" link now redirects to user's active collection by default
  - New dynamic routing: `/mi-coleccion/[id]` for canonical collection URLs
  - Collection pages show Active/Inactive status with inline "Hacer activa" button
  - Collections dropdown switcher to easily navigate between owned collections
  - Empty state for users with no collections, with CTA to follow collections

- **Enhanced Collection User Experience**
  - Deep-linking from Profile cards directly to collection pages
  - Visual active collection indicators in dropdown (✓ checkmark and "Activa" badge)
  - Optimistic active collection switching with immediate visual feedback
  - Fallback logic when no active collection exists (auto-activates first owned)
  - Smart redirect handling with user-friendly toast messages

- **Improved Navigation Architecture**
  - Canonical collection URLs for better bookmarking and sharing
  - Client-side navigation between collections with no page reloads
  - Keyboard accessible dropdown with proper ARIA labels
  - Consistent loading states and error handling across navigation

### Changed

- **Routing Structure**: Migrated from `/mi-coleccion` to `/mi-coleccion/[id]` pattern
- **Profile Collection Cards**: Now include "Ver Colección" button for direct navigation
- **Collection Header**: Enhanced with status indicators and collection switcher dropdown

### Technical Infrastructure

- New CollectionsDropdown component with accessibility features
- Enhanced OwnedCollectionCard component with deep-link navigation
- Empty state handling for users without collections
- Improved error boundaries and fallback strategies

## [0.8.0] - 2024-12-XX

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

## [0.7.0] - 2024-12-XX

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
   git commit -m "docs: update changelog for v1.0.0"
   git push origin main
   ```
