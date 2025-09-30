# Project Roadmap & TODO

## 🚀 Current Sprint Status

### v1.3.0 UI Integration - IN PROGRESS

**Backend Complete ✅ | Frontend Integration Needed 🚧**

- [x] **Database Schema v1.3.0** - All tables, indexes, and RLS policies deployed
  - [x] `collection_pages` table with team/special page definitions
  - [x] `page_slots` table with sticker-to-slot mapping
  - [x] `trade_chats` table for trade messaging
  - [x] `trades_history` table for completion tracking
  - [x] `user_badges` table for achievements
  - [x] Enhanced `stickers` table with image paths and numbers
- [x] **RPC Functions v1.3.0** - All database functions operational
  - [x] `bulk_add_stickers_by_numbers` - Batch sticker addition
  - [x] `get_completion_report` - Per-page completion analysis
  - [x] `search_stickers` - Advanced sticker search with filters
  - [x] `complete_trade` - Mark trades as completed
  - [x] `cancel_trade` - Cancel trades with history

- [x] **Album Pages UI Integration** 🔥 HIGH PRIORITY
  - [x] Implement `useAlbumPages` hook with production RPCs
  - [x] Implement `AlbumPager` component for page navigation
  - [x] Implement `AlbumPageGrid` with 20-slot team pages
  - [x] Implement `StickerTile` component with image support and fallback logic
  - [x] Implement album summary header with live stats from `get_completion_report`
  - [x] Full UI integration complete

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

### Data Migration Tasks 🗄️

- [ ] **Sticker Number Backfill**
  - [ ] Generate sequential numbers for all existing stickers
  - [ ] Update `stickers.sticker_number` column
  - [ ] Verify uniqueness within collections

- [ ] **Collection Pages Seeding**
  - [ ] Create `collection_pages` for all active collections
  - [ ] Generate team pages (20 slots: badge, manager, 18 players)
  - [ ] Generate special pages (variable slots)
  - [ ] Set proper `order_index` for navigation

- [ ] **Page Slots Population**
  - [ ] Map stickers to page slots
  - [ ] Validate slot assignments
  - [ ] Test page completion calculations
- [ ] **Sticker Image Backfill**
  - [x] Implement `npm run backfill:stickers` CLI script for automated processing and upload
  - [ ] **Run script** for all collections to populate Supabase Storage
  - [ ] Verify `image_path_webp_300` and `thumb_path_webp_100` are correctly updated

## ✅ Phase 2: Core Features - BACKEND COMPLETE

### Trading System (Backend ✅ | Frontend Partial ⚠️)

**Trade Discovery & Proposals - COMPLETE ✅**

- [x] Find Traders Feature with RPC-based matching
- [x] Trade Proposals MVP (create, respond, inbox/outbox)
- [x] Proposal detail modal and response system
- [x] Advanced filtering and search

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

### Enhanced Sticker Management - BACKEND COMPLETE ✅

**Album Pages System - BACKEND READY 🚧**

- [x] `collection_pages` table (team rosters, special sections)
- [x] `page_slots` table (sticker positioning)
- [x] `get_completion_report` RPC function
- [x] `search_stickers` RPC function
- [x] Performance indexes for navigation
- [ ] Frontend album navigation UI ⬅️ **NEEDS IMPLEMENTATION**
- [ ] Page grid rendering ⬅️ **NEEDS IMPLEMENTATION**
- [ ] Sticker tile components ⬅️ **NEEDS IMPLEMENTATION**

**Enhanced Sticker Images - BACKEND READY 🚧**

- [x] `sticker_number` column for sequential ordering
- [x] `image_path_webp_300` for full-size WebP images
- [x] `thumb_path_webp_100` for thumbnails
- [x] Supabase Storage buckets configured
- [x] `bulk_add_stickers_by_numbers` RPC function
- [x] Image upload and processing pipeline (via CLI script)
- [x] Frontend image display with WebP and graceful fallback
- [ ] Backfill existing stickers ⬅️ **NEEDS SCRIPT EXECUTION**

## 📋 Phase 2 Continuation - READY TO START

### Enhanced User Experience 🔄 MEDIUM PRIORITY

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

## 🎯 Next Development Session Priorities

### 1. Complete Documentation Alignment ✅ DONE

- [x] Update database-schema.md to v1.3.0
- [x] Update CHANGELOG.md with v1.3.0 status
- [x] Create DATABASE_AUDIT_SUMMARY.md
- [ ] Update TODO.md (this file) ⬅️ **IN PROGRESS**
- [ ] Update current-features.md
- [ ] Update api-endpoints.md

### 2. Choose Next Feature Focus 🎯 DECISION NEEDED

**Option A: Album Pages UI** (Recommended - Quick Win)

- **Effort**: 3-5 days
- **Impact**: HIGH - Completes core collection experience
- **Backend**: ✅ 100% Ready
- **Dependencies**: Need to seed collection pages data first

**Option B: Trade Chat System** (High User Value)

- **Effort**: 5-7 days
- **Impact**: HIGH - Completes trading workflow
- **Backend**: ✅ 100% Ready
- **Dependencies**: Requires Supabase Realtime setup

**Option C: Trade History Dashboard** (Completeness)

- **Effort**: 3-4 days
- **Impact**: MEDIUM - Adds closure and analytics
- **Backend**: ✅ 100% Ready
- **Dependencies**: None

### 3. Data Migration Sprint 🗄️ REQUIRED BEFORE UI

**Before implementing Album Pages UI:**

1. Backfill `sticker_number` for all stickers
2. Generate and seed `collection_pages`
3. Create `page_slots` for all pages
4. Test v1.3.0 RPCs with real data
5. Upload sample sticker images to Storage

**Estimated Effort**: 2-3 days

---

## 🏆 Major Milestones Achieved

### Phase 1 Complete! 🎉 (v1.0.0)

- Zero-reload profile management
- Seamless collection navigation
- Modern responsive design
- Complete sticker inventory system

### Phase 2 Backend Complete! 🚀 (v1.3.0)

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

**Current Status**: Backend at v1.3.0 ✅ | Frontend at v1.2.0 ⚠️  
**Next Milestone**: Complete v1.3.0 UI integration

---

## How to Use This File

1. **Move completed items** to CHANGELOG.md with proper versioning
2. **Add new items** as they come up in development
3. **Update priorities** based on user feedback and business needs
4. **Review weekly** to adjust sprint planning
5. **Update current-features.md** when features are completed

---

**Last Updated**: 2025-01-XX (Post Database Audit)  
**Current Focus**: v1.3.0 UI Integration + Data Migration  
**Recommendation**: Complete Album Pages UI after data migration sprint
