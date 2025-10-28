# TODO - CambioCromos v1.6.0

## ?? Sprint 16 - Profile Completion Gate
- [x] Redirigir el primer inicio de sesi�n a `profile/completar` hasta completar usuario y c�digo postal.
- [x] A�adir guardas de navegaci�n para Marketplace, Mis Colecciones y Plantillas cuando el perfil est� incompleto.
- [ ] Validar la migraci�n `20251028093000_enforce_profile_completion.sql` en Supabase y confirmar datos existentes.


## ✅ Completed - Phase 0: Cleanup

- [x] Remove official collections system
- [x] Update base documentation
- [x] Create migration to drop old tables and RPCs
- [x] Update database-schema.md
- [x] Update current-features.md
- [x] Update CHANGELOG.md

---

## ✅ Completed - Sprint 1: Marketplace MVP (Backend)

- [x] Create trade_listings table
- [x] Create basic Marketplace RPCs
- [x] Extend trade_chats for listings
- [x] Update documentation Marketplace

---

## ✅ Completed - Sprint 2: Collection Templates (Backend)

- [x] Create base template tables
- [x] Create template management RPCs
- [x] Create discovery and copy RPCs
- [x] Create user progress RPCs
- [x] Update documentation - templates

---

## ✅ Completed - Sprint 3: Collection Marketplace Integration (Backend)

- [x] Extend trade_listings with template refs
- [x] Create RPC publish duplicate to marketplace
- [x] Create RPC mark_listing_sold_and_decrement
- [x] Create RPC get_my_listings_with_progress
- [x] Update documentation - integration

---

## ✅ Completed - Sprint 4: Social and Reputation (Backend)

- [x] Create favourites system
- [x] Create user ratings system
- [x] Create template ratings system
- [x] Create universal reports system
- [x] Update documentation Social and Reputation

---

## ✅ Completed - Sprint 5: Admin Moderation (Backend)

- [x] Create admin audit log
- [x] Extend moderation RPCs with audit log
- [x] Create admin dashboard RPCs
- [x] Create moderation action RPCs
- [x] Update documentation - Admin moderation

---

## ✅ Completed - Sprint 6: Final Documentation (Backend)

- [x] Update complete README
- [x] Create consolidated CHANGELOG 1.6
- [x] Update TODO.md with post-1.6.0 roadmap
- [x] Create deployment guide
- [x] Create executive summary
- [x] Update database schema documentation

---

## ✅ Completed - Sprint 6.5: Frontend Foundation

- [x] Project setup and dependencies
- [x] Create utility functions and lib
- [x] Create base UI components
- [x] Create remaining UI components
- [x] Create supabase provider and auth guard
- [x] Create base layout and navigation
- [x] Update documentation for foundation
- [x] Final git commands

---

## ✅ Completed - Sprint 7: Marketplace UI

- [x] Create marketplace feed page
- [x] Create listing card component
- [x] Create listing form (create edit)
- [x] Create listing detail page
- [x] Create edit listing page
- [x] Create marketplace-specific hooks
- [x] Create search bar component
- [x] Create image upload component
- [x] Update navigation to include marketplace link
- [x] Spanish localization for marketplace
- [x] Fix view count infinite loop
- [x] Fix edit listing functionality
- [x] Fix logout error handling
- [x] Fix Next.js Image performance warning
- [x] Update documentation Marketplace UI

---

## ✅ Completed - Sprint 8: Templates UI

- [x] Create templates explorer page (/templates)
- [x] Create template card component with Spanish text
- [x] Create template filters component with Spanish labels
- [x] Create useTemplates hook for fetching templates
- [x] Create useCopyTemplate hook for copying templates
- [x] Create template progress view page (/mis-plantillas/[copyId])
- [x] Create template progress grid component with page tabs
- [x] Create slot tile component with status controls
- [x] Create template summary header component
- [x] Create useTemplateProgress hook for tracking progress
- [x] Create "My Templates" page (/mis-plantillas)
- [x] Update site navigation to include templates links
- [x] Spanish localization for all components
- [x] Update documentation - Templates UI

---

## ✅ Completed - Sprint 8.5: Templates Creation UI

- [x] Create Switch UI component (missing from the UI library)
- [x] Create template creation wizard page (/templates/create)
- [x] Create wizard container component with progress indicator
- [x] Create basic info form component (title, description, image, public/private)
- [x] Create pages and slots form component (dynamic page/slot management)
- [x] Create review form component (review and publish confirmation)
- [x] Create template creation hook with validation and error handling
- [x] Test complete template creation flow
- [x] Update documentation - Templates Creation UI

## ✅ Completed - Sprint 8.6: Template Creation and Collection Management Fixes

- [x] Fix scalar array error in add_template_page RPC
- [x] Fix empty slot validation in template creation
- [x] Update "Mis Plantillas" to "Mis Colecciones" throughout the application
- [x] Fix sticker status logic: Falta (0), Lo Tengo (1), Repe (2+)
- [x] Add +/- buttons for "Lo Tengo" and "Repe" status
- [x] Fix progress calculation for collections
- [x] Add sticker count display in templates and collections
- [x] Make collection cards clickable in "Mis Colecciones" page
- [x] Fix RPC functions to correctly calculate progress
- [x] Update documentation for template creation fixes

---

## ✅ Completed - Code Quality Improvements (v1.6.3)

**High Priority Issues (Resolved):**
- [x] Fix all ESLint warnings (11 warnings)
  - [x] Fix React Hook dependencies (4 warnings)
  - [x] Remove unused variables (4 warnings)
  - [x] Optimize images with Next.js Image component (3 warnings)
- [x] Replace console logging with logger utility (33 instances across 12 files)
- [x] Integrate Sentry error tracking service
  - [x] Install @sentry/nextjs
  - [x] Create Sentry configuration files
  - [x] Update logger utility to send errors to Sentry in production

**Medium Priority Issues (Resolved):**
- [x] Repository structure cleanup
  - [x] Move SQL files to scripts/ directory
  - [x] Move test files to tests/ directory
  - [x] Consolidate documentation (archive redundant component guides)
- [x] Environment variables documentation
  - [x] Update .env.example with Sentry DSN
  - [x] Add comprehensive "Environment Variables" section to README.md
- [x] Type safety improvements
  - [x] Create scripts/generate-types.sh for Supabase type generation
  - [x] Add generate-types npm script

**Documentation Updates (Completed):**
- [x] Update CHANGELOG.md with v1.6.3 changes
- [x] Update README.md with new sections (Environment Variables, Development Scripts)
- [x] Create docs/TESTING.md with comprehensive testing guide
- [x] Update TODO.md to reflect completed code quality improvements

**Code Quality Metrics:**
- ✅ 0 ESLint warnings (down from 11)
- ✅ 0 console.log statements in src/ (down from 33)
- ✅ 100% of images using Next.js Image optimization
- ✅ Production error tracking enabled with Sentry
- ✅ Improved repository organization and documentation structure

---

## 📋 Upcoming Sprints

### ✅ Sprint 9: Integration UI - COMPLETE

- [x] Create publish duplicate modal with pre-filling
- [x] usePublishDuplicate hook
- [x] "My Listings" page with tabs
- [x] MyListingCard with sync info
- [x] useMyListings hook with progress data
- [x] Mark as sold with auto-decrement
- [x] useMarkSold hook
- [x] Edit listing page
- [x] Navigation updates
- [x] Breadcrumbs component
- [x] Quick action buttons
- [x] Update documentation Integration UI

## ✅ Completed - Sprint 10: Social UI

- [x] Create public user profile page (`/users/[userId]`)
- [x] Create useUserProfile hook
- [x] Create FavoriteButton component
- [x] Create useFavorites hook
- [x] Create favourites list page (`/favorites`)
- [x] Create useMyFavorites hook
- [x] Create ReportButton component
- [x] Create ReportModal with form
- [x] Create useReport hook
## Pending - Sprint 10 QA follow-up

- [ ] Validar modal de edicion de perfil (avatar, nickname, codigo postal)
- [ ] Verificar filtros Activos/Completados/Eliminados en `/users/[userId]`
- [ ] Confirmar enlaces rapidos a `/marketplace/my-listings` y `/favorites`

- [x] Update navigation with Favorites link
- [x] Update documentation Social UI
- [x] Create list_my_favourites RPC in Supabase

---

### ✅ Sprint 11: Admin UI - COMPLETE

**✅ Phase 1 Complete:**
- [x] Create admin dashboard page (`/admin/dashboard`)
  - [x] useAdminStats hook
  - [x] 8 statistics cards
  - [x] Suspended users alert
  - [x] Admin guard protection
- [x] Create reports queue page (`/admin/reports`)
  - [x] usePendingReports hook
  - [x] ReportDetailModal component
  - [x] Accessible dialog title and description for report review modal (2025-10-27)
  - [x] useReportDetails hook
  - [x] useResolveReport hook
  - [x] Color-coded entity badges
  - [x] Three moderation actions
  - [x] Confirmation prompts
- [x] Create admin navigation layout
  - [x] Tab-based navigation
  - [x] Four sections (Dashboard, Reports, Users, Audit)
  - [x] Active tab highlighting
  - [x] Admin link in site header

**✅ Phase 2 Complete:**
- [x] Create user search page (`/admin/users`) - Subtask 11.3
  - [x] User search form with debounced input
  - [x] useUserSearch hook with filters
  - [x] Suspend/unsuspend actions with prompts
  - [x] useSuspendUser hook
  - [x] User activity overview (ratings, listings, reports)
  - [x] Admin/Suspended badges
  - [x] Warning for users with reports
- [x] Create audit log viewer (`/admin/audit`) - Subtask 11.4
  - [x] Audit log timeline view
  - [x] useAuditLog hook with pagination
  - [x] Filter by action type
  - [x] Color-coded badges and icons
  - [x] Expandable metadata viewer
  - [x] Infinite scroll with "Load More"
- [x] Complete documentation - Subtask 11.6
  - [x] Updated current-features.md
  - [x] Updated components-guide.md
  - [x] Updated CHANGELOG.md
  - [x] Updated TODO.md

**Sprint 11 Summary:**
- ✅ 6/6 subtasks complete (11.1, 11.2, 11.3, 11.4, 11.5, 11.6)
- ✅ 4 admin pages functional
- ✅ 7 custom hooks created
- ✅ Complete moderation workflow
- ✅ Full documentation updated

### ✅ Sprint 12: Polish and Testing

- [x] Add loading skeletons and empty states
- [x] Add error boundaries
- [x] Add accessibility improvements
- [x] Add performance optimizations
- [x] Final documentation and deploy preparation

### ✅ Sprint 13: Marketplace Transactions - COMPLETE

**Completed:**
- [x] Avatar system with presets and uploads
- [x] Header avatar dropdown menu
- [x] Bidirectional marketplace chat
- [x] Chat page with realtime updates
- [x] Transaction workflow database (reserve/complete/cancel)
- [x] Camera capture for mobile listing photos
- [x] Buyer reservations page
- [x] Transaction status badges
- [x] Manual testing guide created
- [x] Documentation updated

### ✅ Sprint 14: Templates and Admin Control - COMPLETE

**Completed:**
- [x] Template editing functionality
- [x] Admin marketplace oversight
- [x] Admin template moderation
- [x] Admin user purge functionality
- [x] Manual testing guide created
- [x] Documentation updated

### ✅ Sprint 15: Notifications System - COMPLETE

**Completed:**
- [x] Notifications data model reboot
  - [x] Extended notifications schema with new columns
  - [x] Added 6 new notification kinds
  - [x] Implemented triggers for chats, ratings, listings
  - [x] Created enriched RPC functions
  - [x] Added deduplication constraints
- [x] Notification hooks and services
  - [x] Created TypeScript type definitions
  - [x] Built Supabase client wrapper with Zod validation
  - [x] Implemented notification formatter
  - [x] Created React hook with realtime subscriptions
- [x] Notifications UI
  - [x] Built NotificationCard component
  - [x] Created NotificationDropdown for header
  - [x] Implemented Notifications Center page
  - [x] Updated site header integration
- [x] Cross-feature integration
  - [x] Integrated with listing chat
  - [x] Connected reservation/completion workflows
  - [x] Wired rating notifications
- [x] Documentation and testing
  - [x] Created implementation summary
  - [x] Created manual testing guide
  - [x] Created quick reference guide
  - [x] Updated all project documentation

---

## 📅 Timeline

**Estimated Duration:**

- Phase 0: Cleanup ✅ Complete (1 day)
- Sprint 1: Marketplace MVP ✅ Complete (1 day)
- Sprint 2: Collection Templates ✅ Complete (1 day)
- Sprint 3: Integration ✅ Complete (1 day)
- Sprint 4: Social & Reputation ✅ Complete (1 day)
- Sprint 5: Admin moderation ✅ Complete (1 day)
- Sprint 6: Documentation ✅ Complete (1 day)
- Sprint 6.5: Frontend Foundation ✅ Complete (1 week)
- Sprint 7: Marketplace UI ✅ Complete (1 day)
- Sprint 8-12: UI Implementation (5 weeks)

**Total Estimated:** ~9 weeks for complete v1.6.0 implementation

---

## 🎯 Current Priority

**Next Sprint:** Sprint 6.5: Frontend Foundation
**First Task:** Project setup and dependencies
**Goal**: Establish foundation for frontend implementation

---

## 📝 Notes

**Pivot Rationale:**

- Legal compliance: Neutral hosting model (LSSI/DSA)
- Scalability: Community-generated content vs. official licensing
- User control: More flexibility in collections and trading

**Key Decisions:**

- Manual discovery vs. automatic matching
- Community templates vs. official albums
- Neutral intermediary vs. content creator

**Technical Considerations:**

- Maintain existing authentication and admin systems
- Reuse trading infrastructure where possible
- Focus on clean separation of concerns

**Sprint 1 Achievements:**

- Complete marketplace backend infrastructure
- Trade listings table with full-text search
- 4 marketplace RPCs for CRUD operations
- Extended trade_chats for listing conversations
- Complete documentation updates

**Sprint 2 Achievements:**

- Complete templates backend infrastructure
- 5 template tables with pages and slots
- 8 template RPCs for management, discovery, and progress
- Copy system with automatic progress tracking
- Complete documentation updates

**Sprint 3 Achievements:**

- Complete integration backend infrastructure
- Extended trade_listings with template references
- Created bidirectional sync between marketplace and templates
- 3 integration RPCs (publish, sell, sync tracking)
- Complete documentation updates

**Sprint 4 Achievements:**

- Complete social backend infrastructure
- 4 social tables (favourites, user_ratings, template_ratings, reports)
- 17 social RPCs for management and discovery
- Comprehensive reputation system
- Complete documentation updates

**Sprint 5 Achievements:**

- Complete admin moderation backend infrastructure
- Extended audit log with moderation-specific fields
- 13 moderation RPCs (audit, dashboard, bulk actions)
- Comprehensive admin workflow with audit logging
- Complete documentation updates

**Sprint 6 Achievements:**

- Complete documentation for v1.6.0 backend
- Updated README with comprehensive project overview
- Created consolidated CHANGELOG_1.6.md
- Updated TODO.md with post-1.6.0 roadmap
- Created deployment guide
- Created executive summary
- Updated database schema documentation

---

## 🗺️ Post-1.6.0 Roadmap

### v1.7.0 - Mobile App (Future)

- React Native mobile app
- Push notifications
- Mobile-specific features
- Offline mode support

### v1.8.0 - Advanced Features (Future)

- Advanced search with filters
- Recommendation system
- Machine learning for matching
- Premium features

### v2.0.0 - Expansion (Future)

- Multi-country support
- Additional sports
- Professional seller tools
- API for third-party integration

---

## 🔍 Technical Debt

### Resolved in v1.6.0

- ✅ Removed legacy collections system
- ✅ Consolidated similar functionality
- ✅ Standardized naming conventions
- ✅ Improved error handling
- ✅ Added comprehensive documentation

### Future Improvements

- ⏳ Frontend implementation
- ⏳ Mobile app development
- ⏳ Advanced search features
- ⏳ Recommendation system
- ⏳ Performance optimizations
- ⏳ Security enhancements

---

## 📊 Metrics and KPIs

### Development Metrics (v1.6.0)

- **Total Development Time**: 6 days
- **Migration Files**: 18 total
- **RPC Functions**: 47 total
- **Database Tables**: 20 total
- **Documentation Pages**: 6 total

### Quality Metrics

- **Code Coverage**: To be determined after frontend
- **Performance**: To be determined after frontend
- **Security**: Comprehensive RLS and audit logging
- **Documentation**: 100% coverage for backend

---

## 🎉 Success Criteria

### v1.6.0 Success Criteria

- ✅ Backend migration complete
- ✅ All RPCs implemented and tested
- ✅ Comprehensive documentation
- ✅ Security measures in place
- ✅ Audit logging implemented

### v1.7.0 Success Criteria (Future)

- ⏳ Frontend implementation complete
- ⏳ Mobile app released
- ⏳ User adoption targets met
- ⏳ Performance benchmarks met
- ⏳ Security audit passed

---

**Last Updated**: 2025-10-25 (Sprint 15 Complete)
**Current Version**: Backend v1.5.0 | Frontend v1.5.0
**Status**: Phase 0 Complete ✅ | Sprint 1-14 Complete ✅ | Sprint 15 Complete ✅ | **PRODUCTION READY** 🚀
