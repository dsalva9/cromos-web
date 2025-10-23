# Sprint 11 Phase 2 - Admin UI Completion Plan

## 📋 Overview

**Status:** Phase 1 Complete (Dashboard + Reports Queue + Navigation)
**Next Steps:** Phase 2 - User Search & Audit Log
**Estimated Tokens:** ~48,000 tokens

---

## ✅ Phase 1 Completed (Current Session)

### Implemented Features

1. **Admin Dashboard** (`/admin/dashboard`)
   - 8 statistics cards with real-time metrics
   - Color-coded icons for visual clarity
   - Suspended users alert banner
   - Responsive grid layout
   - Hook: `useAdminStats`

2. **Reports Queue** (`/admin/reports`)
   - List of pending reports with filters
   - Color-coded entity type badges
   - Report detail modal with full context
   - Three moderation actions (dismiss, remove content, suspend user)
   - User history for moderation context
   - Confirmation prompts
   - Hooks: `usePendingReports`, `useReportDetails`, `useResolveReport`

3. **Admin Navigation Layout**
   - Tab-based navigation (4 sections)
   - Active tab highlighting
   - Admin link in site header
   - Shared layout for all admin pages

4. **Documentation Updates**
   - Updated `current-features.md`
   - Updated `components-guide.md`
   - Updated `CHANGELOG.md`
   - Updated `TODO.md`

### Files Created

**Pages:**
- `src/app/admin/dashboard/page.tsx`
- `src/app/admin/reports/page.tsx`

**Components:**
- `src/components/admin/ReportDetailModal.tsx`

**Hooks:**
- `src/hooks/admin/useAdminStats.ts`
- `src/hooks/admin/usePendingReports.ts`
- `src/hooks/admin/useReportDetails.ts`
- `src/hooks/admin/useResolveReport.ts`

**Layouts:**
- Updated `src/app/admin/layout.tsx`
- Updated `src/components/site-header.tsx`

---

## 🎯 Phase 2 Tasks (Next Session)

### Subtask 11.3: User Search Page

**Estimated Tokens:** ~18,000

**Files to Create:**

1. **`src/app/admin/users/page.tsx`**
   - User search form with filters
   - Search by nickname, email
   - Filter by status (active/suspended)
   - User list with details
   - Suspend/unsuspend buttons
   - Pagination support

2. **`src/hooks/admin/useUserSearch.ts`**
   - Debounced search functionality
   - Call `search_users` RPC (to be verified)
   - Handle pagination
   - Filter state management

3. **`src/hooks/admin/useSuspendUser.ts`**
   - Call `admin_suspend_user` RPC
   - Toggle suspend/unsuspend
   - Optimistic updates
   - Error handling

**Features:**
- Search input with debounce (500ms)
- Filter checkboxes (active, suspended, admin)
- User cards with:
  - Avatar, nickname, email
  - Rating average
  - Join date
  - Active listings count
  - Reports received count
  - Suspend/unsuspend button
- Pagination (20 users per page)
- Empty state for no results

**Backend RPCs Required:**
- `search_users(p_query, p_filter_suspended, p_limit, p_offset)` - Verify exists
- `admin_suspend_user(p_user_id, p_reason)` - Exists ✅
- `admin_unsuspend_user(p_user_id)` - May need to create

---

### Subtask 11.4: Audit Log Viewer

**Estimated Tokens:** ~15,000

**Files to Create:**

1. **`src/app/admin/audit/page.tsx`**
   - Audit log timeline
   - Filter controls
   - Pagination controls
   - Export button (future)

2. **`src/hooks/admin/useAuditLog.ts`**
   - Call `get_moderation_audit_logs` RPC
   - Handle pagination
   - Filter by action type, admin, date range
   - Sort by timestamp

**Features:**
- Timeline view with audit entries
- Each entry shows:
  - Timestamp
  - Admin who performed action
  - Action type (suspend, unsuspend, delete, etc.)
  - Target entity (user/listing/template)
  - Reason/notes
  - Context data
- Filters:
  - Action type dropdown
  - Admin user dropdown
  - Date range picker
  - Entity type filter
- Pagination (50 entries per page)
- Export to CSV button (future)

**Backend RPCs Required:**
- `get_moderation_audit_logs(p_limit, p_offset, p_action_type, p_admin_id, p_start_date, p_end_date)` - Exists ✅
- `get_admin_list()` - For admin filter dropdown (may need to create)

---

### Subtask 11.6: Complete Documentation

**Estimated Tokens:** ~5,000

**Files to Update:**

1. **`docs/current-features.md`**
   - Mark Admin UI as fully complete
   - Update Phase 2 section from pending to complete

2. **`docs/components-guide.md`**
   - Add User Search page documentation
   - Add Audit Log viewer documentation
   - Update admin hooks section

3. **`docs/api-endpoints.md`**
   - Document admin RPCs:
     - `get_admin_stats`
     - `list_pending_reports`
     - `get_report_details_with_context`
     - `resolve_report`
     - `search_users` (if new)
     - `admin_unsuspend_user` (if new)
     - `get_moderation_audit_logs`
     - `get_admin_list` (if new)

4. **`CHANGELOG.md`**
   - Add Phase 2 features
   - Mark Sprint 11 as complete

5. **`TODO.md`**
   - Mark Sprint 11 as fully complete
   - Update Phase 2 tasks to completed

---

## 🔧 Backend Verification Needed

Before starting Phase 2, verify these RPCs exist:

### Existing (Confirmed)
- ✅ `get_admin_stats`
- ✅ `list_pending_reports`
- ✅ `get_report_details_with_context`
- ✅ `resolve_report`
- ✅ `admin_suspend_user`
- ✅ `get_moderation_audit_logs`

### To Verify/Create
- ❓ `search_users(p_query, p_filter_suspended, p_limit, p_offset)`
- ❓ `admin_unsuspend_user(p_user_id)`
- ❓ `get_admin_list()` - For admin filter dropdown

If these don't exist, may need to create them or use alternative approaches.

---

## 📊 Token Budget Breakdown

| Task | Estimated Tokens |
|------|------------------|
| User Search Page | 9,000 |
| useUserSearch Hook | 4,000 |
| useSuspendUser Hook | 3,000 |
| Testing User Search | 2,000 |
| **Subtask 11.3 Total** | **18,000** |
| | |
| Audit Log Page | 8,000 |
| useAuditLog Hook | 4,000 |
| Testing Audit Log | 3,000 |
| **Subtask 11.4 Total** | **15,000** |
| | |
| Documentation Updates | 5,000 |
| **Subtask 11.6 Total** | **5,000** |
| | |
| Integration Testing | 10,000 |
| **Total Phase 2** | **~48,000** |

---

## 🚀 Recommended Approach for Next Session

1. **Start Fresh** (200k tokens available)
   - Clear runway for complete implementation
   - Room for testing and iterations

2. **Order of Implementation:**
   1. Verify backend RPCs exist (5 min)
   2. Implement User Search (Subtask 11.3)
   3. Implement Audit Log (Subtask 11.4)
   4. Update all documentation (Subtask 11.6)
   5. Integration testing
   6. Final commit

3. **Testing Strategy:**
   - Test user search with various queries
   - Test suspend/unsuspend actions
   - Test audit log filters and pagination
   - Test navigation between all admin sections
   - Verify admin guard works on all pages

4. **Success Criteria:**
   - All 4 admin tabs functional
   - Zero ESLint warnings/errors
   - Complete documentation
   - Clean git commit

---

## 📝 Quick Start Command for Next Session

```bash
# Read this plan
cat docs/SPRINT-11-PHASE-2-PLAN.md

# Check backend RPCs
# Review Sprint 11 subtasks
cat "docs/sprints/SPRINT 11 ADMIN UI/Subtask 11.3 Create user search page.txt"
cat "docs/sprints/SPRINT 11 ADMIN UI/Subtask 11.4 Create audit log viewer.txt"

# Start implementation
# Follow the order in "Order of Implementation" above
```

---

## 🎉 Phase 1 Success Metrics

- ✅ 3/6 subtasks complete (11.1, 11.2, 11.5)
- ✅ ~65,000 tokens used (within budget)
- ✅ Zero ESLint warnings/errors
- ✅ Fully functional core moderation system
- ✅ Clean, documented code
- ✅ Professional git commit

**Phase 1 delivers immediate value:** Admins can now view dashboard stats and moderate reports!

---

## 🔮 After Sprint 11 Completion

Next up: **Sprint 12 - Polish and Testing**
- Loading skeletons and empty states
- Error boundaries
- Accessibility improvements
- Performance optimizations
- Final documentation and deploy preparation

Good luck with Phase 2! 🚀
