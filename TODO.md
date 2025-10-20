# TODO - CambioCromos v1.6.0

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

## 🚧 In Progress - Sprint 2: Collection Templates

- [ ] Create base template tables
- [ ] Create template management RPCs
- [ ] Create discovery and copy RPCs
- [ ] Create user progress RPCs
- [ ] Update documentation - templates

---

## 📋 Upcoming Sprints

### Sprint 3: Collection Marketplace Integration

- [ ] Extend trade_listings with template refs
- [ ] Create RPC publish duplicate to marketplace
- [ ] Create RPC mark_listing_sold_and_decrement
- [ ] Create RPC get_my_listings_with_progress
- [ ] Update documentation - integration

### Sprint 4: Social and Reputation

- [ ] Create favourites system
- [ ] Create user ratings system
- [ ] Create template ratings system
- [ ] Create universal reports system
- [ ] Update documentation Social and Reputation

### Sprint 5: Admin moderation

- [ ] Create admin audit log
- [ ] Extend moderation RPCs with audit log
- [ ] Create admin dashboard RPCs
- [ ] Create moderation action RPCs
- [ ] Update documentation - Admin moderation

### Sprint 6: Final Documentation

- [ ] Update complete README
- [ ] Create consolidated CHANGELOG 1.6
- [ ] Update TODO.md with post 1.6.0 roadmap
- [ ] Create deployment guide
- [ ] Create executive summary
- [ ] Update database schema documentation

### Sprint 6.5: Frontend Foundation

- [ ] Project setup and dependencies
- [ ] Create utility functions and lib
- [ ] Create base UI components
- [ ] Create remaining UI components
- [ ] Create supabase provider and auth guard
- [ ] Create base layout and navigation
- [ ] Update documentation for foundation
- [ ] Final git commands

### Sprint 7: Marketplace UI

- [ ] Create marketplace feed page
- [ ] Create listing card component
- [ ] Create listing form (create edit)
- [ ] Create listing detail page
- [ ] Update documentation Marketplace UI

### Sprint 8: Templates UI

- [ ] Create templates explorer page
- [ ] Create template card component
- [ ] Create template progress view (my templates)
- [ ] Create template summary header
- [ ] Update documentation - Templates UI

### Sprint 9: Integration UI

- [ ] Create publish duplicate model
- [ ] Create My Listings view with sync
- [ ] Add navigation links for integration
- [ ] Create edit listing page
- [ ] Update documentation Integration UI

### Sprint 10: Social UI

- [ ] Create public user profile page
- [ ] Create favourite button component
- [ ] Create favourites list page
- [ ] Create report button and modal
- [ ] Update documentation Social UI

### Sprint 11: Admin UI

- [ ] Create admin dashboard page
- [ ] Create reports queue page
- [ ] Create user search page
- [ ] Create audit log viewer
- [ ] Create admin navigation layout
- [ ] Update documentation Admin UI

### Sprint 12: Polish and Testing

- [ ] Add loading skeletons and empty states
- [ ] Add error boundaries
- [ ] Add accessibility improvements
- [ ] Add performance optimizations
- [ ] Final documentation and deploy preparation

---

## 📅 Timeline

**Estimated Duration:**

- Phase 0: Cleanup ✅ Complete (1 day)
- Sprint 1: Marketplace MVP ✅ Complete (1 day)
- Sprint 2: Collection Templates (1 week)
- Sprint 3: Integration (1 week)
- Sprint 4: Social & Reputation (1 week)
- Sprint 5: Admin moderation (1 week)
- Sprint 6: Documentation (1 week)
- Sprint 6.5: Frontend Foundation (1 week)
- Sprint 7-12: UI Implementation (6 weeks)

**Total Estimated:** ~12 weeks for complete v1.6.0 implementation

---

## 🎯 Current Priority

**Next Sprint:** Sprint 2: Collection Templates
**First Task:** Create base template tables
**Goal:** Establish foundation for community-generated collection system

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
