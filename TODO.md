# Project Roadmap & TODO

## 🚀 Current Sprint: v1.4.0 - Team Page Completion Feature

### v1.4.0 Feature Status

**Backend Complete ✅ | Frontend Complete ✅ | Documentation Complete ✅ | Tests Complete ✅**

- [x] **Mark Team Page Complete Feature**
  - [x] `mark_team_page_complete` RPC function with validation
  - [x] Desktop: "Marcar equipo completo" button with confirmation dialog
  - [x] Mobile: Long-press (600ms) + overflow menu (⋯) with ActionSheet
  - [x] Optimistic UI updates in `useAlbumPages` hook
  - [x] Success/error toast notifications
  - [x] Idempotent behavior (preserves singles and duplicates)
  - [x] Accessibility: keyboard navigation, ARIA labels
  - [x] Performance indexes for fast queries
  - [x] Comprehensive documentation in all guides
  - [x] Playwright E2E tests (4 test cases)

### v1.3.0 Feature Status

**Backend Complete ✅ | Frontend Code Complete ✅ | Data Migration Needed 🚧**

- [x] **Database Schema v1.3.0** - All tables, indexes, and RLS policies deployed
  - [x] `collection_pages` table with team/special page definitions
  - [x] `page_slots` table with sticker-to-slot mapping
  - [x] `trade_chats` table for trade messaging
  - [x] `trades_history` table for completion tracking
  - [x] `user_badges` table for achievements
  - [x] Enhanced `stickers` table with image paths and numbers
- [x] **RPC Functions v1.4.0** - All database functions operational (15 total)
  - [x] `bulk_add_stickers_by_numbers` - Batch sticker addition
  - [x] `get_completion_report` - Per-page completion analysis
  - [x] `search_stickers` - Advanced sticker search with filters
  - [x] `complete_trade` - Mark trades as completed
  - [x] `cancel_trade` - Cancel trades with history
  - [x] `mark_team_page_complete` - Bulk mark team pages ✅ **v1.4.0**

- [x] **Album Pages UI - Code Complete**
  - [x] Implement `useAlbumPages` hook with production RPCs
  - [x] Implement `AlbumPager` component for page navigation
  - [x] Implement `AlbumPageGrid` with 20-slot team pages
  - [x] Implement `StickerTile` component with image support and fallback logic
  - [x] Implement album summary header with live stats from `get_completion_report`
  - [x] Full UI integration complete

- [x] **UI/UX Redesign - Complete**
  - [x] Implemented new "Retro-Comic" dark theme across all pages.
  - [x] Updated all major components (`ModernCard`, `StickerTile`, headers, buttons) to new style.

### Data Migration Sprint - IN PROGRESS 🔥

- [ ] **Sticker Number Backfill**
  - [ ] Generate sequential numbers for all existing stickers
  - [ ] Update `stickers.sticker_number` column
  - [ ] Verify uniqueness within collections

- [ ] **Collection Pages & Slots Seeding**
  - [ ] Create `collection_pages` for all active collections
  - [ ] Generate team pages (20 slots: badge, manager, 18 players)
  - [ ] Generate special pages (variable slots)
  - [ ] Set proper `order_index` for navigation
  - [ ] Map stickers to page slots
  - [ ] Validate slot assignments
  - [ ] Test page completion calculations

- [ ] **Sticker Image Backfill**
  - [x] Implement `npm run backfill:stickers` CLI script for automated processing and upload
  - [ ] **Run script** for all collections to populate Supabase Storage and update `stickers` table
  - [ ] Verify `image_path_webp_300` and `thumb_path_webp_100` are correctly updated

## ✅ Phase 2: Core Features - COMPLETE

### Trading System (Backend ✅ | Frontend Proposals ✅ | Chat/History 🚧)

**Trade Discovery & Proposals - COMPLETE ✅**

- [x] Find Traders Feature with RPC-based matching
- [x] Trade Proposals MVP (create, respond, inbox/outbox)
- [x] Proposal detail modal and response system
- [x] Advanced filtering and search

**Album Pages System - COMPLETE ✅**

- [x] `collection_pages` & `page_slots` tables (deployed)
- [x] `get_completion_report` & `search_stickers` RPC functions (deployed)
- [x] Performance indexes for navigation (deployed)
- [x] Frontend album navigation UI ✅
- [x] Page grid rendering ✅
- [x] Sticker tile components ✅
- [x] Data migration for Collection 24 ✅
  - [x] Sticker number backfill (577 stickers numbered)
  - [x] Collection pages created (28 pages total)
  - [x] Page slots mapped (577 stickers mapped)

**Trade Chat - BACKEND READY 🚧**

- [x] Database schema (`trade_chats` table)
- [x] RLS policies for secure messaging
- [x] Indexes for chronological loading
- [ ] Frontend chat interface ⬅️ **NEEDS IMPLEMENTATION**
- [ ] Supabase Realtime integration ⬅️ **NEEDS IMPLEMENTATION**
- [ ] Message notifications ⬅️ **NEEDS IMPLEMENTATION**

**Trade History - BACKEND READY 🚧**

- [x] Database schema (`trades_history` table)
- [x] `complete_trade` RPC function
- [x] `cancel_trade` RPC function
- [x] History tracking with metadata
- [ ] Frontend history dashboard ⬅️ **NEEDS IMPLEMENTATION**
- [ ] Statistics and analytics UI ⬅️ **NEEDS IMPLEMENTATION**
- [ ] Trade rating system (future)

**Enhanced Sticker Images - COMPLETE ✅**

- [x] `sticker_number` column for sequential ordering
- [x] `image_path_webp_300` for full-size WebP images
- [x] `thumb_path_webp_100` for thumbnails
- [x] Supabase Storage buckets configured
- [x] `bulk_add_stickers_by_numbers` RPC function
- [x] Image upload and processing pipeline (via CLI script)
- [x] Frontend image display with WebP and graceful fallback
- [ ] Backfill existing stickers ⬅️ **DATA MIGRATION SPRINT**

## 📋 Phase 2.1: Next Sprint - READY TO START

- [x] **Implicit Missing UI Migration** (Phase 2)
  - [x] Replace `user_stickers.wanted` reads in `src/hooks/album/useAlbumPages.ts` with count-derived missing/duplicate logic.
  - [x] Update album components (`StickerTile`, `AlbumSummaryHeader`, `AlbumPageGrid`) to show missing badges using `count = 0`.
  - [x] Refactor collection grid toggles in `src/components/CollectionPage.tsx` to drop manual wanted upserts.
  - [x] Update profile stats (`src/hooks/profile/useProfileData.ts`, `ProfilePage`, `components/profile/OwnedCollectionCard.tsx`) to consume the new `missing` field.
  - [x] Retire `userWantsList` usage across trading docs and `src/app/trades/compose/page.tsx` in favor of missing-based selectors.
  - [x] QA trading flows to ensure compose/detail UI matches Phase 1 RPC semantics (duplicates > 1 vs missing).
- [ ] **Trade Chat UI** 🔥 HIGH PRIORITY
  - [ ] Build chat interface components
  - [ ] Integrate Supabase Realtime listeners
  - [ ] Add chat to proposal detail modal
  - [ ] Implement message notifications
  - [ ] Test real-time message delivery

- [ ] **Trade History Dashboard**
  - [ ] Create history viewing interface
  - [ ] Integrate `complete_trade` / `cancel_trade` actions
  - [ ] Display completed trade statistics
  - [ ] Add trade rating system (future)

### Enhanced User Experience 🔄 MEDIUM PRIORITY (Post Chat/History)

- [ ] **Public User Profiles**
  - [ ] Create public profile routes
  - [ ] Build public collection viewing interface
  - [ ] Add user search functionality
  - [ ] Implement privacy controls

- [ ] **User Directory**
  - [ ] Create user directory page
  - [ ] Add search and filtering options
  - [ ] Show user activity and stats
  - [ ] Add "follow" or "bookmark" users feature

- [ ] **Notification System**
  - [ ] Create notifications database schema
  - [ ] Build notification center interface
  - [ ] Add real-time notifications with Supabase Realtime
  - [ ] Implement email notification preferences
  - [ ] Integrate with trade proposal workflow

- [ ] **Collection Completion Celebrations**
  - [ ] Design achievement system (uses existing `user_badges` table)
  - [ ] Create celebration animations
  - [ ] Add progress milestones
  - [ ] Build achievement showcase

### Current Feature Enhancements 🔧 LOW PRIORITY

- [ ] **Collection Management Improvements**
  - [ ] Add search and filtering for stickers (use `search_stickers` RPC)
  - [x] Implement sticker image upload/management system ✅ Backend ready
  - [ ] Add bulk sticker operations (use `bulk_add_stickers_by_numbers`)
  - [ ] Create collection export/import functionality

- [ ] **Navigation & UX Polish**
  - [ ] Add breadcrumb navigation for deep-linked collections
  - [ ] Improve back navigation flow
  - [ ] Add keyboard shortcuts for common actions
  - [ ] Create onboarding tour for new users

- [ ] **Mobile & Responsive**
  - [ ] Optimize mobile collection grid layout
  - [ ] Improve mobile navigation patterns
  - [ ] Add mobile-specific gestures and interactions
  - [ ] Test and improve tablet experience

## 🔮 Phase 3: Advanced Features

### Community Features

- [ ] User ratings and reviews for trades
- [ ] Community forums/discussions
- [ ] Featured collections showcase
- [ ] Trading groups/communities
- [ ] Collection sharing and social features

### Analytics & Insights

- [ ] Collection value tracking
- [ ] Market trend analysis for popular cards
- [ ] Trade success metrics
- [ ] Personal collection insights and recommendations

### Integration & API

- [ ] External card database integration (Panini API if available)
- [ ] Price tracking APIs integration
- [ ] Social media sharing features
- [ ] Advanced export/import with other platforms

## 🔧 Technical Debt & Improvements

### Code Quality & Testing

- [ ] Add comprehensive test suite (Jest + React Testing Library)
- [ ] Set up Storybook for component documentation
- [ ] Implement proper error handling patterns throughout
- [ ] Add TypeScript strict mode gradually
- [ ] Create component documentation

### Performance & Optimization

- [x] Implement image optimization (`sizes`, `priority`) and lazy loading ✅
- [ ] Add caching strategies (React Query migration?)
- [ ] Optimize bundle size and code splitting
- [ ] Set up monitoring and analytics (Vercel Analytics)
- [ ] Implement service worker for offline capabilities

### DevOps & Infrastructure

- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Add automated testing in CI
- [ ] Set up staging environment
- [ ] Database backup and migration strategies
- [ ] Add error tracking (Sentry)

## 🛡️ Known Issues & Tech Debt

### Minor Issues

- [ ] Consider adding confirmation for other destructive actions
- [ ] Toast notifications could use better positioning on mobile
- [ ] Proposal composer could benefit from auto-save functionality

### Optimization Opportunities

- [ ] Profile data could use React Query for better caching
- [ ] Collection dropdown could be optimized for large numbers of collections
- [ ] Consider virtualizing sticker grids for very large collections
- [ ] Trade proposal queries could benefit from additional indexes

---

## 🏆 Major Milestones Achieved

### Phase 1 Complete! 🎉 (v1.0.0)

- Zero-reload profile management
- Seamless collection navigation
- Modern responsive design
- Complete sticker inventory system

### Phase 2 Complete! 🚀 (v1.3.0)

- **Complete Trading Infrastructure**
  - Discovery, proposals, chat tables, history
  - All RPC functions operational
  - Security and performance optimized

- **Album Pages System**
  - Page and slot structure defined
  - Completion tracking ready
  - Search and bulk operations ready

- **Enhanced Sticker Management**
  - WebP image optimization ready
  - Sequential numbering system
  - Storage buckets configured

**Current Status**: Backend at v1.3.0 ✅ | Frontend code at v1.3.0 ✅  
**Next Milestone**: Complete v1.3.0 Data Migration to go live.

---

## How to Use This File

1. **Check off completed items** and update CHANGELOG.md with proper versioning
2. **Add new items** as they come up in development
3. **Update priorities** based on user feedback and business needs
4. **Review weekly** to adjust sprint planning
5. **Update current-features.md** when features are completed

---

**Last Updated**: 2025-10-06 (v1.4.0 - Team Page Completion Feature)
**Current Focus**: v1.4.0 Feature Complete - Ready for deployment
**Next Focus**: v1.3.0 Data Migration Sprint → Trade Chat UI and History Dashboard


