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
   git commit -m "docs: update changelog for v0.6.0"
   git push origin main
   ```
