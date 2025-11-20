# Frontend Pending Tasks

Tasks related to frontend code, components, and UI implementation that are pending completion.

---

## RPC Migration (High Priority)

From `FRONTEND_CODE_UPDATES_SUMMARY.md` - Deprecated v1.5.0 RPCs requiring updates:

### ❌ Not Started

**1. `src/hooks/album/useAlbumPages.ts`** (2 deprecated RPCs)
- Migrate `get_user_collection_stats` to `get_my_template_copies()`
- Replace `mark_team_page_complete` with bulk template progress updates
- **Effort**: 4-6 hours
- **Priority**: High (core collection functionality)

**2. `src/hooks/trades/useFindTraders.ts`** (1 signature change)
- Add location parameters to `find_mutual_traders`: p_lat, p_lon, p_radius_km, p_sort
- **Effort**: 2-3 hours
- **Priority**: High (distance-based matching)

**3. `src/hooks/trades/useMatchDetail.ts`** (1 removed)
- Remove hook entirely (RPC deprecated in v1.4.3)
- Update routing logic to skip detail page
- **Effort**: 1-2 hours
- **Priority**: Medium

**4. `src/components/ProfilePage.tsx`** (1 deprecated)
- Migrate `get_user_collection_stats` to template progress RPCs
- **Effort**: 2-3 hours
- **Priority**: High (user profile display)

**5. `src/types/index.ts`** (type cleanup)
- Remove deprecated `get_user_collection_stats` type def
- **Effort**: 30 minutes
- **Priority**: Low

**6. `src/lib/collectionStats.ts`** (entire file deprecated)
- Create new `templateStats.ts` utility
- Migrate all callers
- **Effort**: 2-3 hours
- **Priority**: Medium

---

## Legacy Trading System Removal (Medium Priority)

### ❌ Not Started

**Components to remove/deprecate:**
- `ProposalList`, `ProposalCard`, `ProposalDetailModal`
- `StickerSelector`, `QuantityStepper` (if trade-specific)
- `ProposalSummary`
- `TradeChatPanel` (legacy version)

**Routes to remove:**
- `/trades/proposals`
- `/trades/compose`

**Hooks to remove:**
- `useProposals`
- `useCreateProposal`
- `useRespondToProposal`
- `useProposalDetail`
- `useTradeChat` (legacy)
- `useTradeHistory`
- `useTradeFinalization`

**Note**: Keep marketplace chat components (different system)

---

## Total Estimated Effort

| Category | Effort | Priority |
|----------|--------|----------|
| RPC Migration | 12-18 hours | High |
| Legacy Cleanup | 4-6 hours | Medium |
| **TOTAL** | **16-24 hours** | - |

---

**Last Updated**: 2025-11-20  
**Status**: All items pending, awaiting prioritization
