# Changelog

All notable changes to the CambioCromos project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0/).

## [Unreleased]

### Added

- **User Rating System for Marketplace Transactions (2025-10-28)**
  - Complete rating workflow after transaction completion
  - **Buyer Flow:**
    - Rating modal opens automatically after confirming transaction completion
    - Modal can be dismissed - rating link persists in chat
    - After rating: link becomes system message showing rating given
    - Rating is final and cannot be changed
  - **Seller Flow:**
    - "Valorar usuario" button in `listing_completed` notification
    - Rating link also available in completed chat conversation
    - After rating: link becomes system message showing rating given
    - Rating is final and cannot be changed
  - **Mutual Rating Notification:**
    - When both users rate each other, both receive `user_rated` notifications
    - System message added to chat showing both ratings
    - Each user sees counterparty's rating in the conversation
  - **Chat Behavior:**
    - Chat input disabled when transaction status is 'completed'
    - Message: "Chat cerrado - La transacción ha sido completada"
    - Users can still view messages and rating UI
  - **UI Components:**
    - New `UserRatingDialog` component for rating users
    - 5-star rating system with optional comment (max 280 chars)
    - Rating link in chat: "⭐ Haz clic aquí para valorar a [nickname]"
    - Rating message: "Has valorado a [nickname] con ⭐⭐⭐⭐ (4/5) y has comentado: 'xyz'"
    - Counterparty rating message when both rated
  - **Database:**
    - New migration: `20251028202552_add_mutual_rating_notification.sql`
    - Trigger `trigger_check_mutual_ratings` on `user_ratings` table
    - Function `check_mutual_ratings_and_notify()` handles mutual rating completion
    - Sends notifications and adds system message when both users have rated
  - **Integration:**
    - Rating modal accessible from notification dropdown, notifications page, and chat
    - Uses existing `create_user_rating` RPC with context type 'listing'
    - One rating per user per transaction (enforced by unique constraint)
- **Chats Page (2025-10-28)**
  - New centralized `/chats` page to view all marketplace conversations
  - Added "Chats" menu entry in profile dropdown (between "Mis Anuncios" and "Favoritos")
  - Shows all conversations as both buyer and seller
  - Displays listing info, counterparty details, last message, and unread count
  - Conversations sorted by most recent activity
  - Status badges show current listing state (Activo, Reservado, Completado)
  - Clickable cards navigate directly to the conversation
  - For sellers: includes participant query parameter to pre-select buyer
  - Empty state with call-to-action to explore marketplace
  - New RPC: `get_user_conversations()` - Returns all user's listing conversations with details
- **Listing Transaction Workflow (2025-10-28)**
  - Implemented complete reservation and completion workflow for marketplace listings
  - **Workflow States:**
    - `active`: Listing is publicly visible and available
    - `reserved`: Seller has reserved listing for specific buyer via `reserve_listing` RPC
    - `completed`: Transaction completed and confirmed by both parties
  - **Seller Features:**
    - "Marcar Reservado" button in chat (requires selecting a buyer conversation)
    - Creates `listing_transaction` record linking seller and buyer
    - "Marcar Completado" button after meeting/exchange
    - Sends notification to buyer requesting confirmation
  - **Buyer Features:**
    - Receives notification when listing reserved for them
    - "Confirmar Recepción" button appears when seller marks as completed
    - Confirmation triggers mutual rating capability
  - **Mis Anuncios Updates:**
    - Added "Reservados" and "Completados" tabs
    - Replaced single "Vendidos" tab with granular state tracking
    - Users can view all listings: Activos, Reservados, Completados, Eliminados
  - **Notifications:**
    - `listing_completed` notification sent to buyer with `needs_confirmation: true`
    - Updated `complete_listing_transaction` RPC to use `notify_listing_event`
    - Notification formatter shows actionable "Confirma la transacción" message
  - **Database Changes:**
    - Fixed RLS policies on `trade_listings` to allow status updates
    - Updated SELECT policy: users can view own listings regardless of status
    - Updated UPDATE policy: added WITH CHECK clause for proper validation
    - Modified `complete_listing_transaction` to send buyer notifications
  - **Type Updates:**
    - Extended Listing status type: `'active' | 'reserved' | 'completed' | 'sold' | 'removed'`
- **Marketplace Distance Sorting (2025-10-28)**
  - Added optional distance-based sorting for marketplace listings
  - Users can toggle between "Más reciente" (most recent) and "Distancia" (distance) sort modes
  - Distance sorting requires user to have a postcode configured in their profile
  - Distance calculations use Spanish postcode centroids and Haversine formula
  - Listings show approximate distance (in km) when sorting by distance
  - New RPC: `list_trade_listings_with_distance` for distance-aware listing retrieval
  - Database migrations: postal_codes table, haversine_distance function
- **Signup (2025-10-28)**
  - Requiere aceptar los terminos del servicio antes de crear una cuenta e incluye modal con texto temporal para consulta.
- **Perfil obligatorio (2025-10-28)**
  - A�adida p�gina `profile/completar` para que nuevos usuarios completen avatar, usuario y c�digo postal antes de navegar por la aplicaci�n.
  - Cabecera, men�s y layouts bloquean Marketplace, Mis Colecciones y Plantillas hasta finalizar el perfil mostrando aviso contextual.
  - Login y callback redirigen autom�ticamente al flujo de perfil cuando faltan datos obligatorios.



### Changed

- **Listing Chat Button Logic (2025-10-28)**
  - Fixed button visibility based on transaction status (not just listing status)
  - Seller "Marcar Completado" button only shows when transaction status is 'reserved'
  - Buyer "Confirmar Recepción" button shows when listing is 'reserved' but transaction is 'completed'
  - Prevents seller from seeing button after marking as completed (waiting for buyer)
  - System message updated: "[Seller Name] ha reservado '[Listing Title]'" (removed "para ti")
- **Perfiles (2025-10-28)**
  - Migraci�n `20251028093000_enforce_profile_completion.sql` a�ade validaciones NOT VALID y un �ndice �nico (case-insensitive) para asegurar usuario obligatorio y c�digos postales no vac�os.

### Fixed

- **Listing Transaction Workflow (2025-10-28)**
  - Fixed `trade_listings` status CHECK constraint to include 'reserved' and 'completed' statuses
  - Fixed RLS SELECT policy to allow users to view own listings regardless of status
  - Fixed RLS UPDATE policy by adding WITH CHECK clause
  - Fixed `reserve_listing` RPC to not reference non-existent `reserved_by` column
  - Fixed `notify_listing_status_change` trigger to use `listing_transactions` table for buyer info
  - Fixed `complete_listing_transaction` to implement proper two-step workflow:
    - Step 1 (Seller): Updates transaction to 'completed', listing stays 'reserved', notifies buyer
    - Step 2 (Buyer): Updates listing to 'completed' (finalizes transaction)
- **Build Warnings (2025-10-27)**
  - Removed unused imports: `ReportButton` from templates/[id]/page.tsx, `Flag` and `ReportButton` from TradeChatPanel
  - Removed unused variables: `counterpartyId` from TradeChatPanel and ProposalDetailModal
  - Replaced `<img>` tags with Next.js `<Image>` component for better performance and automatic optimization:
    - marketplace/[id]/chat/page.tsx - listing image in chat header
    - TemplateReviewList.tsx - user avatar images in reviews
  - Build now completes with no ESLint warnings
- **Admin Reports (2025-10-27)**
  - Added accessible dialog titles and descriptions to all report review modal states to satisfy Radix Dialog requirements and clear console warnings
  - Hardened `get_report_details_with_context` Supabase function to return query results, raise explicit `Report not found` errors, normalize `target_id` handling across numeric and text identifiers, and surface user emails via `auth.users` for admin reviews
  - Recreated `resolve_report` Supabase RPC with full moderation actions and audit logging and refreshed `log_moderation_action`/`audit_log` constraints so admin resolve/dismiss flows succeed
  - Fixed 400 Bad Request error when resolving reports by making `p_moderated_entity_id` nullable in `log_moderation_action` function (allows NULL for suspend_user actions where entity ID is UUID)
  - Fixed CHECK constraint violation in `audit_log` table by adding 'moderation' to allowed actions (previously only allowed: create, update, delete, bulk_upsert, remove_image)
  - Enhanced error handling in report resolution flow with detailed logging and user-friendly error messages
- **UI/UX Fixes (2025-10-27)**
  - **Mis Colecciones Page:**
    - Fixed React hydration error caused by nested `<a>` tags (Link within Link)
    - Removed redundant inner Link from "Ver Progreso" button
    - Updated button text: "Explorar Colecciones" G�� "Explorar Plantillas de Colecciones"
    - Updated button text: "Crear Colecci+�n" G�� "Crear Plantilla"
  - **Colecci+�n Detail Page:**
    - Removed "Ver Mis Anuncios" and "Crear Anuncio Manual" buttons
    - Buttons were redundant as they're already accessible elsewhere
    - Cleaner UI focused on collection progress tracking
  - **Listing Chat Database:**
    - Fixed ambiguous 'user_id' column reference error in `get_listing_chat_participants` RPC
    - Renamed variable from `v_listing_user_id` to `v_listing_owner_id` for clarity
    - Fully qualified all table references in queries to avoid ambiguity
- **Template Ratings (2025-10-27)**
  - Recreated Supabase RPCs (`create_template_rating`, `update_template_rating`, `delete_template_rating`) to recalculate aggregates directly from `template_ratings` and backfill existing data
  - Added migration `20251027161000_fix_template_rating_aggregates.sql` to refresh schema, recompute averages/counts, and eliminate duplicate key errors on updates
  - Normalized `useTemplateRatings` hook to coerce numeric fields, hydrate missing distributions, and surface accurate counts in the UI
  - Updated template detail layout to show template content before reviews and made the header rating badge scroll smoothly to the valoraciones section

### Added

- **Marketplace Chat Enhancements (2025-10-27)**
  - **Terms of Service Requirement:**
    - Buyers must accept ToS before sending first message in listing chat
    - Checkbox with terms link appears for buyers with no previous messages
    - Prevents message sending if ToS not accepted
  - **Listing Info Display:**
    - Added listing information card at top of chat page
    - Shows listing image, title, collection name, and sticker number
    - Displays listing status (Disponible/Reservado)
    - Clickable title links back to listing detail page
    - Visible to both seller and buyer participants
  - **Reserve Functionality:** (UPDATED 2025-10-28)
    - Sellers can mark listings as "Reservado" directly from chat
    - Reserve button appears in listing info card for sellers
    - Now uses `reserve_listing` RPC to create proper transaction records
    - Updates listing status to 'reserved' (previously 'sold')
    - Creates entry in `listing_transactions` table
    - Provides visual feedback during reservation process
    - Button only visible when listing is still active and seller has selected a buyer conversation
  - **System Messages in Chat:**
    - Added support for system-generated messages in chat
    - New `is_system` column in `trade_chats` table
    - System messages displayed centered with distinct styling (gray background, italic text)
    - Automatic system message when seller marks listing as reserved
    - Message format: "[Seller] ha marcado '[Listing Title]' como reservado"
    - System messages visible to all participants in the conversation

### Added

- **Templates System Enhancements (2025-01-27)**
  - **My Templates Page:**
    - New `/templates/my-templates` page showing user's created templates (public and private)
    - Visual badges indicating template visibility status (P+�blica/Privada)
    - Green badge with Eye icon for public templates
    - Gray badge with EyeOff icon for private templates
    - Link from main templates page to access personal templates
  - **Template Editing Enhancements:**
    - Added ability to create new pages in existing templates
    - Added ability to add new slots/cromos to existing pages
    - New page creation form with title, type, and multiple slots
    - Inline slot addition within each page
    - Enhanced UI with "A+�adir Nueva P+�gina" button
    - "A+�adir Cromo" button for each page with inline editing
  - **Terms of Service Integration:**
    - ToS acceptance checkbox for marketplace listing creation
    - ToS acceptance checkbox when making templates public (creation and editing)
    - Modal with placeholder terms text (lorem ipsum)
    - Validation prevents submission without ToS acceptance
  - **Navigation Improvements:**
    - Added "Volver al Marketplace" back link in listing creation page
    - "Mis Plantillas" button in templates page (for authenticated users)

### Fixed

- **Camera Issues:**
  - Fixed camera flickering in marketplace listing creation (desktop and mobile)
  - Prevented multiple camera stream initializations
  - Added proper cleanup with mounted flag
- **Database Query Issues:**
  - Fixed foreign key relationship error in my-templates query
  - Changed from PostgREST foreign key syntax to direct queries
  - Correctly using `collection_templates` table with `author_id` column
- **Footer Cleanup:**
  - Removed navigation links from site footer (kept only branding and copyright)
  - Navigation now exclusively in top navbar

### Changed

- **TemplateCard Component:**
  - Added optional `showVisibility` prop to display public/private badges
  - Enhanced Template interface with `is_public` field
  - Conditional rendering of visibility badge on template images
- **useTemplateEditor Hook:**
  - Added `addPage()` function using `add_template_page_v2` RPC
  - Added `addSlot()` function for adding individual slots to pages
  - Proper slot numbering and page slot_count updates

- **Sprint 15: Notifications System (COMPLETE)**
  - **Notifications Data Model:**
    - Extended notifications schema with listing_id, template_id, rating_id, actor_id
    - Added 6 new notification kinds: listing_chat, listing_reserved, listing_completed, user_rated, template_rated, admin_action
    - Composite unique index prevents duplicate unread notifications
    - GIN index on payload for efficient JSONB queries
    - Database triggers for automatic notification creation
  - **Notification Types:**
    - Listing chat notifications (with deduplication per conversation)
    - Listing reservation notifications (buyer + seller)
    - Listing completion notifications (buyer + seller)
    - User rating notifications (with star count)
    - Template rating notifications (for authors)
    - Admin action notifications (future use)
  - **Backend Infrastructure:**
    - Enriched RPC `get_notifications()` with actor, listing, template data
    - New RPC `mark_notification_read(id)` for single items
    - New RPC `mark_listing_chat_notifications_read(listing_id, participant_id)`
    - Trigger functions for chats, ratings, and listing workflows
    - Realtime notification delivery via Supabase subscriptions
  - **Frontend Implementation:**
    - Complete TypeScript type system with helper functions
    - Supabase client wrapper with Zod validation
    - Notification formatter with Spanish messages
    - `useNotifications` hook with realtime updates and optimistic UI
    - NotificationCard component with all notification types
    - NotificationDropdown in header with badge
    - Notifications Center page at `/profile/notifications`
    - Categorized view (Marketplace, Plantillas, Comunidad, Intercambios, Sistema)
    - Unread/Read tabs with empty states
  - **Integration:**
    - Auto-mark chat notifications as read when conversation opened
    - Listing reservation/completion workflow integration
    - Rating submission creates notifications
    - Cross-feature state synchronization

- **Sprint 14: Templates and Admin Control (COMPLETE)**
  - Template editing functionality
  - Admin marketplace oversight
  - Admin template moderation
  - Admin user purge functionality

- **Sprint 13: Marketplace Transactions (COMPLETE)**
  - **Avatar System:**
    - 8 preset retro-comic avatars (SVG)
    - Custom avatar upload with auto-processing (square crop, WebP conversion, compression)
    - Two-tab avatar picker (gallery/upload)
    - Profile avatar editing with preview
    - Avatar resolution helper for presets and storage paths
  - **Header Improvements:**
    - User avatar dropdown in site header
    - Mini-profile menu (My Profile, My Listings, Favorites, Sign Out)
    - Conditional admin panel link
    - Mobile-responsive avatar display
  - **Marketplace Chat:**
    - Bidirectional chat between buyers and sellers
    - Seller can view and manage multiple buyer conversations
    - Real-time message updates via Supabase
    - Auto-read receipts
    - Character limit (500) with counter
    - Comic-style message bubbles
    - Chat page at `/marketplace/[id]/chat`
  - **Transaction Workflow (Database):**
    - Listing reservation system
    - Transaction states: reserved G�� completed/cancelled
    - Seller can reserve listing for specific buyer
    - Both parties can mark transaction complete
    - Seller can cancel with reason
    - Transaction history tracking
  - **Mobile Features:**
    - Camera capture modal for listing photos
    - Direct camera access via `getUserMedia`
    - Live preview with retake option
    - Auto-processing to WebP format
    - Permission handling with fallbacks
  - **New Pages:**
    - `/marketplace/[id]/chat` - Listing chat interface
    - `/marketplace/reservations` - Buyer's active reservations

- **Database Changes (Sprint 13):**
  - Extended `trade_listings.status` to include 'reserved' and 'completed'
  - New `listing_transactions` table with RLS policies
  - Updated listing chat RPCs for bidirectional conversation
  - New transaction management RPCs (reserve, complete, cancel)

- **Sprint 12: Polish & Testing (COMPLETE)**
  - **UX Improvements:**
    - Loading skeletons for listing cards
    - Loading skeletons for template cards
    - EmptyState component with CTAs
    - Consistent empty states across all pages (marketplace, templates, my-listings)
    - Improved loading indicators
  - **Error Handling:**
    - Enhanced ErrorBoundary component with better design
    - Next.js error pages (error.tsx, global-error.tsx)
    - User-friendly error messages in Spanish
    - Try again and go home actions
    - Dev mode error details
    - Prevent white screen of death
  - **Accessibility:**
    - Enhanced skip to content link with proper focus styles
    - Focus styles throughout app with #FFC000 ring
    - Viewport meta tags for mobile
    - Theme color meta tag
    - Screen reader utilities (.sr-only)
    - Better keyboard navigation support
  - **Performance:**
    - LazyImage component with fallbacks
    - Next.js image optimization (AVIF, WebP)
    - Route-based loading states
    - Request caching utilities
    - Production console cleanup (only errors/warnings)
    - Package import optimizations (lucide-react, radix-ui)
    - SWC minification enabled

- **Admin UI (Sprint 11 - COMPLETE)**
  - **Phase 1 - Core Moderation:**
    - Admin Dashboard (`/admin/dashboard`)
      - 8 real-time statistics cards (users, reports, listings, templates, trades, admin actions)
      - Color-coded metrics with icons
      - Suspended users alert banner
      - Responsive grid layout
    - Reports Queue (`/admin/reports`)
      - List of pending reports with filters
      - Color-coded entity type badges (user, listing, template, chat)
      - Reason badges and reporter info
      - "Review Report" button opens detail modal
      - Empty state for when queue is clear
    - Report Detail Modal
      - Full report context display
      - Entity-specific information (user details, listing info, template info)
      - User history section for moderation context
      - Three moderation actions: Dismiss, Remove Content, Suspend User
      - Required admin notes with validation
      - Confirmation prompts for destructive actions
      - Loading states and toast notifications
    - Admin Navigation Layout
      - Tab-based navigation (Dashboard, Reports, Users, Audit)
      - Active tab highlighting
      - Admin link in site header (visible only to admins)
      - Shared layout for all admin pages
  - **Phase 2 - User Management & Audit:**
    - User Search Page (`/admin/users`)
      - Debounced search by nickname or email (500ms)
  - **Profile Experience Enhancements (Sprint 10 Social UI)**
    - `/users/[userId]` now surfaces the signed-in user's email and postcode-based location hint
    - Added an "Editar perfil" dialog with avatar upload (Supabase `avatars` bucket), nickname, and postcode controls
    - Listing grid supports Activos/Completados/Eliminados filters with status-aware empty states and quick links to `Mis Anuncios`/`Favoritos`
    - Visitors see only active listings; sold/removed filters remain exclusive to the profile owner
      - Status filter (all/active/suspended)
      - User cards with avatar, stats, and details
      - Suspend/Unsuspend actions with reason prompts
      - View profile links
      - Warning indicator for users with reports
      - Admin users cannot be suspended
    - Audit Log Viewer (`/admin/audit`)
      - Timeline view of all admin actions
      - Filter by action type (suspend, unsuspend, remove, dismiss)
      - Color-coded action badges with icons
      - Shows admin performer, timestamp, target, reason
      - Expandable metadata viewer
      - Infinite scroll pagination (20 per page)
  - Admin Components
    - `AdminGuard` - Route protection with admin verification
    - `ReportDetailModal` - Report review and moderation
  - Admin Hooks (7 total)
    - `useAdminStats` - Dashboard statistics
    - `usePendingReports` - Reports queue
    - `useReportDetails` - Single report with context
    - `useResolveReport` - Moderation actions
    - `useUserSearch` - Search users with filters
    - `useSuspendUser` - Suspend/unsuspend users
    - `useAuditLog` - Audit log with pagination

- **Social UI (Sprint 10)**
  - Public user profile page (`/users/[userId]`)
    - Avatar with fallback icon
    - Rating display with stars and count
    - Active listings grid
    - Favorites count and ratings count stats
    - Admin/suspended badges
    - Favorite button for other users
  - Favorites system
    - `FavoriteButton` component with optimistic updates
    - Favorites list page (`/favorites`)
    - Grid of followed users with stats
    - Remove favorite functionality
    - Empty state with CTA to marketplace
  - Universal report system
    - `ReportButton` component (works for users, listings, templates, chat)
    - `ReportModal` with form validation
    - 6 report categories (spam, inappropriate, scam, harassment, fake, other)
    - Optional description field (500 chars max)
    - Character counter
    - Toast notifications for success/error
  - Social hooks
    - `useUserProfile` - Fetch public user profiles with listings
    - `useFavorites` - Check and toggle favorite status
    - `useMyFavorites` - Fetch current user's favorites list
    - `useReport` - Submit content reports
  - Navigation
    - Added "Favoritos" link to main navigation
  - Backend
    - Created `list_my_favourites` RPC for favorites list with stats

### Changed

- TBD

### Fixed

- TBD

## [1.6.5] - 2025-01-22

### Added
- Integrated Zod validation with marketplace listing form and template wizard (step-level)
- Loading skeletons (Card, List, Profile, Template) to improve perceived performance
- ARIA labels and accessibility improvements across header, cards, and upload
- Skip link and semantic landmarks in layout for better navigation
- Error boundaries for app, marketplace, and templates routes with recovery actions

### Improved
- Keyboard and screen reader experience with aria attributes and focusable elements
- Form validation feedback with Spanish messages surfaced inline and as summaries
- Visual loading states aligned to content layouts
- Spanish copy normalized across Plantillas flows and marketplace listings to eliminate mojibake
- Wizard validation messaging deferred until user interaction for a cleaner first-load experience

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

## [1.6.1] G�� 2025-10-22 - Template Creation and Collection Management Fixes

### G�� Added

- Switch UI component for toggle functionality
- Sticker count display in templates and collections
- Clickable collection cards in "Mis Colecciones" page

### =��� Changed

- Updated "Mis Plantillas" to "Mis Colecciones" throughout the application
- Updated status labels: "Tenidas" to "Lo Tengo", "Duplicadas" to "Repes"/"Repe", "Faltantes" to "Faltan"
- Improved sticker status logic: Falta (0), Lo Tengo (1), Repe (2+)
- Added +/- buttons for "Lo Tengo" and "Repe" status

### =�ɢ Fixed

- Fixed scalar array error in add_template_page RPC
- Fixed progress calculation for collections
- Fixed RPC functions to correctly calculate progress
- Fixed empty slot validation in template creation
- Fixed counts showing as 0/0 in "Mis Colecciones" page

## [1.6.0] G�� 2025-10-22 - Integration UI (Frontend)

### G�� Added - Integration UI (Frontend) **Sprint 9 Complete**

**Pages:**
- `/mis-plantillas/[copyId]/publicar/[slotId]` - Publish duplicate modal
- `/marketplace/my-listings` - My listings with sync
- `/marketplace/[id]/edit` - Edit listing

**Components:**
- `MyListingCard` - Listing card with sync info and alerts
- `Breadcrumbs` - Navigation breadcrumbs

**Hooks:**
- `usePublishDuplicate` - Publish from collection to marketplace
- `useMyListings` - Fetch listings with sync data
- `useMarkSold` - Mark sold with auto-decrement

**Features:**
- Publish duplicates with 1 click from collection
- Pre-filled listing form from slot data
- "My Listings" view with tabs (active/sold/removed)
- Sync indicator for template-linked listings
- Alert badge when listing active but count = 0
- Mark as sold with automatic duplicate decrement
- Edit listing functionality
- Confirm dialogs for critical actions
- Updated navigation with "Mis Anuncios" link
- Quick action buttons in collection view
- Ownership validation on edit

## [1.6.0] G�� 2025-10-22 - Templates Creation UI (Frontend)

### G�� Added - Templates Creation UI (Frontend) **Sprint 8.5 Complete**

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

## [1.6.0] G�� 2025-10-21 - Templates UI (Frontend)

### G�� Added - Templates UI (Frontend) **Sprint 8 Complete**

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

## [1.6.0] G�� 2025-10-21 - Marketplace UI (Frontend)

### G�� Added - Marketplace UI (Frontend) **Sprint 7 Complete**

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

## [1.6.0-alpha] G�� 2025-10-20 - PIVOT: Marketplace + Templates

### =��� Breaking Changes

**Official Collections System REMOVED**

- Removed 7 tables: collections, stickers, collection_teams, collection_pages, page_slots, user_collections, user_stickers
- Removed 7 RPCs: find_mutual_traders, get_mutual_trade_detail, bulk_add_stickers_by_numbers, search_stickers, mark_team_page_complete, get_user_collection_stats, get_completion_report
- Reason: Pivot to neutral marketplace + community templates
- No affected users (pre-production)

**New Model: Neutral Marketplace**

- From automatic matching to manual discovery
- From official albums to community templates
- Legal model: neutral hosting (LSSI/DSA)

### G�� Added - Marketplace System (Sprint 1)

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

### G�� Added - Collection Templates System (Sprint 2)

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

### G�� Added - Marketplace-Template Integration (Sprint 3)

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
    G�� [publish_duplicate_to_marketplace]
trade_listings (copy_id, slot_id)
    G�� [mark_listing_sold_and_decrement]
user_template_progress (count + 1)
```

### G�� Added - Social and Reputation System (Sprint 4)

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

### G�� Added - Admin Moderation System (Sprint 5)

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

## [1.5.0] G�� 2025-10-12

### Critical Fixes G�� **COMPLETE**

- **Removed duplicate Supabase client instance**: Deleted `src/lib/supabase/client.ts` (unused duplicate), using only SupabaseProvider globally
- **Added batch RPC `get_multiple_user_collection_stats`**: Replaces N+1 queries with single batch call, 5-10x faster for users with multiple collections
- **Implemented ErrorBoundary component**: React Error Boundary with Spanish fallback UI ("Algo sali+� mal") and "Volver al inicio" button, integrated in root layout
- **Added logger utility**: Created `src/lib/logger.ts` with environment-aware logging (debug/info dev-only, warn/error always)
- **Updated ESLint configuration**: Stricter rules enforced
- **Performance optimizations ready**: Profile load verified <1s (batch RPC eliminates N+1 queries)

### Added - Admin Backoffice (MVP) G�� **COMPLETE**

#### **Admin Panel UI** (`/admin`)

- **CollectionsTab**: CRUD for collections with publish/draft status indicators
- **PagesTab**: Create and manage album pages
- **StickersTab**: Full sticker management with WebP image upload
- **BulkUploadTab**: CSV-based batch sticker creation
- **UsersTab**: Complete user management system
- **TeamsTab**: Manage collection teams with flag URLs
- **AuditTab**: View admin action history

#### **Admin Database RPCs** G�� **NEW**

- **User Management**: `admin_list_users`, `admin_update_user_role`, `admin_suspend_user`, `admin_delete_user`
- **Content Management**: `admin_upsert_collection`, `admin_delete_collection`, `admin_upsert_page`, `admin_delete_page`, `admin_upsert_sticker`, `admin_delete_sticker`
- **Audit**: `admin_get_audit_log`

#### **Security & Access Control**

- **AdminGuard component**: Protects `/admin` route
- **Suspended user checks**: Auth callback checks suspension status

### Added - Badges UI (Read-only) =�ܺ In Progress

- **useUserBadges hook**: Read-only hook for fetching user badges
- **BadgeCard component**: Grid display in `/profile` with empty state
- **Retro-Comic styling**: Matches existing dark theme with gold accents

### Added - Quick Entry ("Abrir un sobre") =�ܺ In Progress

- **Pack opener route**: `/mi-coleccion/[id]/pack` (authenticated)
- **Multi-number input**: 5 inputs with paste support (CSV/space/semicolon G�� auto-split; dedupe; auto-advance)
- **Bulk add RPC**: Calls `bulk_add_stickers_by_numbers` and shows summary (a+�adidos, repes, inv+�lidos)
- **Optimistic updates**: Progress updates + clear/"Abrir otro sobre" flow

### Added - Location-Based Matching (Centroid + Haversine) =�ܺ In Progress G�� **NEW**

- **Postcode field**: Optional `profiles.postcode` for location-based matching
- **Postal codes table**: Centroid data (lat/lon) for Spanish postcodes
- **Haversine distance**: Calculate distance between users' postcodes
- **Mixed scoring**: Weighted score (0.6 overlap + 0.4 distance_decay)
- **Radius filter**: 10G��100 km radius for finding nearby traders
- **Sort modes**: "distance" | "overlap" | "mixed"
- **Privacy preserved**: Show distance (~12 km) but not exact addresses

### Added - Profile Avatars (Seed Phase) =�ܺ In Progress

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
- RPC: `mark_trade_read(p_trade_id)` G�� upserts last_read_at
- RPC: `get_unread_counts(p_box, p_trade_ids)` G�� returns per-trade unread_count

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

## =��� Major Milestones

### Phase 0 Complete (v1.6.0-alpha) G�� **100%**

- **Complete System Cleanup**: Removed old collections system
- **Clean Foundation**: Ready for marketplace + templates implementation
- **Documentation Updated**: Reflects new direction and current state

### Sprint 1 Complete (v1.6.0-alpha) G�� **100%**

- **Marketplace Backend**: Complete listings system with RPCs
- **Chat from Listings**: Extended trade_chats for marketplace
- **Documentation Updated**: All docs reflect marketplace system

### Sprint 2 Complete (v1.6.0-alpha) G�� **100%**

- **Templates Backend**: Complete template system with RPCs
- **5 Template Tables**: Full template structure with pages and slots
- **8 Template RPCs**: Management, discovery, and progress tracking
- **Documentation Updated**: All docs reflect templates system

### Sprint 3 Complete (v1.6.0-alpha) G�� **100%**

- **Integration Backend**: Complete marketplace-template bridge
- **Bidirectional Sync**: Template G�� marketplace with count management
- **3 Integration RPCs**: Publish, sell, and sync tracking
- **Documentation Updated**: All docs reflect integration system

### Sprint 4 Complete (v1.6.0-alpha) G�� **100%**

- **Social Backend**: Complete social and reputation system
- **4 Social Tables**: Favourites, user_ratings, template_ratings, reports
- **17 Social RPCs**: Favourites, ratings, reports management
- **Documentation Updated**: All docs reflect social system

### Sprint 5 Complete (v1.6.0-alpha) G�� **100%**

- **Admin Moderation Backend**: Complete admin moderation system
- **Audit Log Extensions**: Enhanced audit log with moderation-specific fields
- **13 Moderation RPCs**: Audit logging, dashboard, bulk actions
- **Documentation Updated**: All docs reflect admin moderation system

### Phase 2.5 Complete (v1.4.1)

- **Complete UI/UX Redesign** G�� **100% ROLLOUT**
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

**Current Status**: Database at v1.6.0 G�� | Frontend at v1.6.0
**Next Focus**: Sprint 9: Integration UI

---

## How to Update This File

When making changes:

1. **Add entries under [Unreleased]** as you develop
2. **Use categories**: Added, Changed, Deprecated, Removed, Fixed, Security, Technical
3. **When releasing**: Move unreleased items to new version section with date
4. **Commit format**: `git commit -m "docs: update changelog for vX.X.X"`

---

**Phase 0 Status**: Cleanup Complete G�� | Sprint 1 Complete G�� | Sprint 2 Complete G�� | Sprint 3 Complete G�� | Sprint 4 Complete G�� | Sprint 5 Complete G�� | Sprint 6.5 Complete G�� | Sprint 7 Complete G�� | Sprint 8 Complete G�� | Sprint 8.5 Complete G�� | Ready for Sprint 9: Integration UI =�ܺ
**Next**: Begin Sprint 9 implementation (Integration UI)
