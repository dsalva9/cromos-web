# Two-Stage Marketplace Listing Deletion System

**Implemented**: 2025-12-04
**Version**: v1.7.0+
**Status**: ✅ Production Ready

---

## Overview

The two-stage deletion system provides users with a safe and reversible way to remove marketplace listings, with automatic cleanup after 30 days.

### Key Features

- **Stage 1 (Soft Deletion)**: Listings are marked as 'ELIMINADO' and hidden from marketplace
- **Stage 2 (Permanent Deletion)**: Listings and all associated data are permanently removed
- **Restore Functionality**: Users can restore soft-deleted listings within 30 days
- **Automatic Cleanup**: pg_cron job automatically deletes ELIMINADO listings after 30 days
- **Unified Status**: 'removed' and 'ELIMINADO' statuses are unified in the UI

---

## User Flow

### Soft Deletion (Stage 1)

1. User clicks "Eliminar" button on active or reserved listing
2. Modal shows:
   - Blue-themed UI indicating temporary deletion
   - Explanation that listing moves to "Eliminados" section
   - Notice that listing can be restored within 30 days
   - Warning about automatic deletion after 30 days
   - Chat conversations are preserved
3. User types "ELIMINAR" to confirm
4. Listing status changes to 'ELIMINADO'
5. Listing appears in "Eliminados" tab

**Database Function**: `soft_delete_listing(p_listing_id BIGINT)`

**Requirements**:
- User must own the listing
- Listing must have 'active' status
- Only updates listing status, preserves all data

### Restore Functionality

1. User navigates to "Eliminados" tab
2. Clicks "Restaurar" button on ELIMINADO listing
3. Listing status changes back to 'active'
4. Listing reappears in marketplace and "Activos" tab
5. All chat conversations remain intact

**Database Function**: `restore_listing(p_listing_id BIGINT)`

**Requirements**:
- User must own the listing
- Listing must have 'ELIMINADO' status
- Returns listing to 'active' status

### Permanent Deletion (Stage 2)

**Manual Deletion**:

1. User navigates to "Eliminados" tab
2. Clicks "Eliminar Definitivamente" button
3. Modal shows:
   - Red-themed UI indicating permanent deletion
   - Strong warnings about irreversible action
   - Checkbox confirmation: "Deseo eliminar definitivamente este anuncio"
   - Warning that chat conversations will be lost
4. User checks the confirmation box
5. System permanently deletes:
   - Listing from database
   - All chat messages
   - All transactions
   - All favourites and reports
   - Associated media files

**Automatic Deletion**:

- pg_cron job runs daily at 3:00 AM UTC
- Deletes all listings with 'ELIMINADO' status older than 30 days
- Cleans up all associated data
- Logs results for monitoring

**Database Function**: `hard_delete_listing(p_listing_id BIGINT)`

**Requirements**:
- User must own the listing (or be admin)
- Listing must have 'ELIMINADO' status
- Permanently removes all data

---

## Technical Implementation

### Database Schema

**Status Values**:
```sql
CHECK (status IN ('active', 'reserved', 'completed', 'sold', 'removed', 'ELIMINADO'))
```

**Note**: 'removed' and 'ELIMINADO' are treated as equivalent in the UI for unified "Eliminados" section.

### RPC Functions

#### 1. soft_delete_listing

```sql
soft_delete_listing(p_listing_id BIGINT)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  previous_status TEXT,
  new_status TEXT
)
```

**Permissions**: Authenticated users, own listings only

**Behavior**:
- Changes status from 'active' to 'ELIMINADO'
- Updates `updated_at` timestamp
- Preserves all data and relationships

#### 2. hard_delete_listing

```sql
hard_delete_listing(p_listing_id BIGINT)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  deleted_chat_count INTEGER,
  deleted_transaction_count INTEGER,
  media_files_deleted INTEGER
)
```

**Permissions**: Authenticated users (own listings), admins (any listing)

**Behavior**:
- Deletes chat messages from `trade_chats`
- Deletes transactions from `listing_transactions`
- Deletes favourites and reports
- Attempts media file cleanup from storage
- Deletes listing from `trade_listings`
- Returns counts for monitoring

#### 3. restore_listing

```sql
restore_listing(p_listing_id BIGINT)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  previous_status TEXT,
  new_status TEXT
)
```

**Permissions**: Authenticated users, own listings only

**Behavior**:
- Changes status from 'ELIMINADO' to 'active'
- Updates `updated_at` timestamp
- Listing becomes visible in marketplace

#### 4. cleanup_old_eliminado_listings

```sql
cleanup_old_eliminado_listings()
RETURNS TABLE (
  deleted_count INTEGER,
  deleted_listing_ids BIGINT[]
)
```

**Permissions**: System (SECURITY DEFINER)

**Behavior**:
- Finds all 'ELIMINADO' listings older than 30 days
- Deletes each listing and associated data
- Returns count and IDs for monitoring
- Handles errors gracefully

**Schedule**: Daily at 3:00 AM UTC via pg_cron

---

## Frontend Components

### DeleteListingModal (Soft Delete)

**Location**: `src/components/marketplace/DeleteListingModal.tsx`

**Features**:
- Blue-themed UI (temporary action)
- Multi-step flow: Warning → Confirmation → Deleting → Success
- Clear explanation of 30-day restoration window
- Typed confirmation ("ELIMINAR")
- Disabled during deletion process

**Usage**:
```tsx
<DeleteListingModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onConfirm={handleSoftDelete}
  listing={{
    id: listingId,
    title: listingTitle,
    status: listingStatus
  }}
  loading={loading}
/>
```

### HardDeleteModal (Permanent Delete)

**Location**: `src/components/marketplace/HardDeleteModal.tsx`

**Features**:
- Red-themed UI (permanent action)
- Multi-step flow: Warning → Confirmation → Deleting → Success
- Checkbox confirmation: "Deseo eliminar definitivamente este anuncio"
- Strong warnings about chat conversation loss
- Shows deletion counts on success

**Usage**:
```tsx
<HardDeleteModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onConfirm={handleHardDelete}
  listing={{
    id: listingId,
    title: listingTitle,
    status: 'ELIMINADO'
  }}
  loading={loading}
/>
```

### MyListingCard Actions

**Location**: `src/components/integration/MyListingCard.tsx`

**Action Buttons by Status**:

- **Active**: Edit, Mark Complete, Eliminar (soft delete)
- **Reserved**: Eliminar (soft delete)
- **Completed/Sold**: Reactivar
- **ELIMINADO/removed**: Restaurar, Eliminar Definitivamente

---

## React Hooks

### useSoftDeleteListing

**Location**: `src/hooks/marketplace/useSoftDeleteListing.ts`

**Usage**:
```tsx
const { softDeleteListing, loading } = useSoftDeleteListing();

await softDeleteListing(listingId);
```

### useHardDeleteListing

**Location**: `src/hooks/marketplace/useHardDeleteListing.ts`

**Usage**:
```tsx
const { hardDeleteListing, loading } = useHardDeleteListing();

await hardDeleteListing(listingId);
```

### useRestoreListing

**Location**: `src/hooks/marketplace/useRestoreListing.ts`

**Usage**:
```tsx
const { restoreListing, loading } = useRestoreListing();

await restoreListing(listingId);
```

---

## UI/UX Design

### Color Coding

- **Soft Delete (Stage 1)**: Blue theme - indicates temporary, reversible action
- **Permanent Delete (Stage 2)**: Red theme - indicates permanent, irreversible action
- **Restore**: Green theme - indicates recovery action

### Confirmation Patterns

- **Soft Delete**: Typed confirmation ("ELIMINAR") - moderate friction
- **Permanent Delete**: Checkbox confirmation - lower friction but clear commitment
- **Restore**: Direct button click - low friction for recovery

### User Messaging

- Clear distinction between temporary and permanent deletion
- Explicit mention of 30-day restoration window
- Warnings about chat conversation loss in permanent deletion
- Success messages confirm action and next steps

---

## Security & Permissions

### Permission Checks

1. **Soft Delete**: User must own listing
2. **Hard Delete**: User must own listing (admins can delete any)
3. **Restore**: User must own listing
4. **Auto-cleanup**: Runs with system permissions (SECURITY DEFINER)

### Data Integrity

- All deletions use database transactions
- Foreign key constraints ensure referential integrity
- Error handling prevents partial deletions
- Audit trail via `updated_at` timestamps

---

## Monitoring & Maintenance

### Monitoring Points

1. **Auto-cleanup Results**:
   ```sql
   SELECT * FROM cleanup_old_eliminado_listings();
   ```

2. **ELIMINADO Listings Count**:
   ```sql
   SELECT COUNT(*) FROM trade_listings WHERE status = 'ELIMINADO';
   ```

3. **Old ELIMINADO Listings**:
   ```sql
   SELECT id, title, updated_at
   FROM trade_listings
   WHERE status = 'ELIMINADO'
   AND updated_at < NOW() - INTERVAL '30 days';
   ```

4. **pg_cron Job Status**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'cleanup-eliminado-listings';
   ```

### Manual Cleanup

If needed, run cleanup manually:
```sql
SELECT * FROM cleanup_old_eliminado_listings();
```

---

## Testing Recommendations

### Backend Tests

1. **Soft Delete**:
   - Verify status changes from 'active' to 'ELIMINADO'
   - Confirm data preservation
   - Test permission checks
   - Verify only 'active' listings can be soft deleted

2. **Hard Delete**:
   - Verify complete data removal
   - Test cascading deletes
   - Confirm count accuracy
   - Test permission checks for users and admins
   - Verify only 'ELIMINADO' listings can be hard deleted

3. **Restore**:
   - Verify status changes from 'ELIMINADO' to 'active'
   - Confirm data integrity
   - Test permission checks
   - Verify only 'ELIMINADO' listings can be restored

4. **Auto-cleanup**:
   - Test with listings exactly 30 days old
   - Test with listings older than 30 days
   - Verify proper cleanup of associated data
   - Test error handling

### Frontend Tests

1. **DeleteListingModal**:
   - Test typed confirmation requirement
   - Verify modal state transitions
   - Test button disable states
   - Verify error handling

2. **HardDeleteModal**:
   - Test checkbox confirmation requirement
   - Verify warning messages
   - Test button disable states
   - Verify auto-close on success

3. **MyListingCard**:
   - Test correct buttons appear for each status
   - Verify modal integration
   - Test loading states
   - Verify UI refresh after actions

### Integration Tests

1. **Complete Flow**:
   - Soft delete → Verify in Eliminados → Restore → Verify in Activos
   - Soft delete → Wait 30 days → Verify auto-deletion
   - Soft delete → Manual permanent delete → Verify complete removal

2. **Edge Cases**:
   - Delete listing with active chats
   - Delete reserved listing
   - Restore and immediately delete again
   - Multiple concurrent deletions

---

## Migration History

1. **20251203000000_two_stage_deletion_system.sql**: Initial two-stage system
   - Added 'ELIMINADO' status
   - Created soft_delete, hard_delete, and restore functions

2. **20251204000000_auto_cleanup_eliminado_listings_v2.sql**: Auto-cleanup
   - Enabled pg_cron extension
   - Created cleanup function
   - Scheduled daily job

---

## Future Enhancements

1. **Email Notifications**: Notify users before auto-deletion (e.g., at 25 days)
2. **Bulk Operations**: Allow deleting/restoring multiple listings at once
3. **Deletion Reasons**: Optional field for why user deleted listing
4. **Admin Dashboard**: View all ELIMINADO listings and cleanup history
5. **Configurable Timeout**: Allow changing 30-day period per organization
6. **Soft Delete for Other Statuses**: Allow soft delete from 'reserved' or 'completed'

---

## Support & Troubleshooting

### Common Issues

**Issue**: Listing not appearing in Eliminados tab
- **Solution**: Check listing status in database, may need to refresh page

**Issue**: Restore button not working
- **Solution**: Verify listing has 'ELIMINADO' status and user owns listing

**Issue**: Auto-cleanup not running
- **Solution**: Check pg_cron job status and logs

**Issue**: Permission denied on delete
- **Solution**: Verify user owns listing and is authenticated

### Database Queries for Debugging

```sql
-- Check listing status
SELECT id, title, status, user_id, updated_at
FROM trade_listings
WHERE id = <listing_id>;

-- Check cron job
SELECT * FROM cron.job WHERE jobname = 'cleanup-eliminado-listings';

-- Manual cleanup test
SELECT * FROM cleanup_old_eliminado_listings();
```

---

**Last Updated**: 2025-12-04
**Status**: ✅ Production Ready
**Contact**: For issues or questions, check database logs and frontend console errors
