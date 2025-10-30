# User Ignore Functionality

**Version**: v1.6.0
**Status**: ✅ Implemented
**Last Updated**: 2025-10-30

---

## Overview

The User Ignore functionality allows users to block other users from seeing their marketplace listings and prevent unwanted chat messages. This feature provides users with control over their interactions and privacy within the CambioCromos platform.

## Features

### Core Capabilities

1. **User Blocking**
   - Ignore users from their profile page
   - Unignore users at any time
   - View list of all ignored users

2. **Marketplace Filtering**
   - Ignored users' listings are automatically hidden from marketplace
   - Works with both chronological and distance-based sorting
   - Filtering is transparent to the user (no indication that content is filtered)

3. **Chat Protection**
   - Prevents ignored users from sending messages
   - Blocks ability to initiate conversations with ignored users
   - Existing chat history remains intact but no new messages allowed

4. **Management Interface**
   - Dedicated page to view all ignored users (`/profile/ignored`)
   - Quick access from user profile
   - Shows when each user was ignored
   - One-click unignore functionality

## User Experience

### Ignoring a User

1. Navigate to a user's profile page (`/users/[userId]`)
2. Click the "Ignorar" button (next to Favorite and Report buttons)
3. User is immediately added to ignored list
4. Button changes to "Dejar de ignorar"
5. Success toast notification appears

### Unignoring a User

**From Profile Page:**
1. Click "Dejar de ignorar" button on user's profile
2. User is removed from ignored list
3. Success toast notification appears

**From Ignored Users Management Page:**
1. Navigate to `/profile/ignored`
2. Find the user in the list
3. Click "Quitar de ignorados"
4. User is removed from list and can be seen again

### Managing Ignored Users

Access via:
- Profile page → "Usuarios Ignorados" button
- Navigation menu → Profile dropdown → "Usuarios Ignorados"
- Mobile menu → Profile section → "Usuarios Ignorados"
- Direct URL: `/profile/ignored`

The management page shows:
- User avatar and nickname
- When they were ignored (relative time: "hace 2 días")
- Unignore button for each user
- Empty state when no users are ignored

## Technical Implementation

### Database Schema

#### Table: `ignored_users`

```sql
CREATE TABLE ignored_users (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ignored_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, ignored_user_id)
);

-- Indexes for performance
CREATE INDEX idx_ignored_users_user_id ON ignored_users(user_id);
CREATE INDEX idx_ignored_users_ignored_user_id ON ignored_users(ignored_user_id);
```

### RPC Functions

#### `ignore_user(p_ignored_user_id UUID)`

Adds a user to the current user's ignore list.

**Validations:**
- User must be authenticated
- Cannot ignore yourself
- Target user must exist
- Handles duplicate ignores gracefully (UPSERT)

**Returns:** `BOOLEAN` (always true on success)

**Errors:**
- "Usuario no autenticado" - No authenticated user
- "No puedes ignorarte a ti mismo" - Attempting to ignore self
- "Usuario no encontrado" - Target user doesn't exist

---

#### `unignore_user(p_ignored_user_id UUID)`

Removes a user from the current user's ignore list.

**Returns:** `BOOLEAN` (always true on success)

**Errors:**
- "Usuario no autenticado" - No authenticated user

---

#### `is_user_ignored(p_user_id UUID, p_target_user_id UUID)`

Checks if a specific user is ignored.

**Returns:** `BOOLEAN`

**Note:** Currently both parameters are the same value in practice (checking if current user has ignored target)

---

#### `get_ignored_users(p_limit INTEGER, p_offset INTEGER)`

Returns paginated list of ignored users with their profile information.

**Returns:**
```typescript
{
  ignored_user_id: UUID;
  nickname: string;
  avatar_url: string | null;
  created_at: string;
}[]
```

**Defaults:** `p_limit = 50`, `p_offset = 0`

---

#### `get_ignored_users_count()`

Returns the total count of ignored users for the current user.

**Returns:** `INTEGER`

---

#### `list_trade_listings_filtered(p_limit, p_offset, p_search)`

Lists marketplace listings with ignored users filtered out.

**Features:**
- Filters out listings from ignored users
- Full-text search support (Spanish)
- Ordered by creation date (newest first)

**Returns:**
```typescript
{
  id: number;
  user_id: string;
  author_nickname: string;
  author_avatar_url: string | null;
  author_postcode: string | null;
  title: string;
  description: string | null;
  sticker_number: string | null;
  collection_name: string | null;
  image_url: string | null;
  status: string;
  views_count: number;
  created_at: string;
  updated_at: string;
  copy_id: number | null;
  slot_id: number | null;
}[]
```

---

#### `list_trade_listings_filtered_with_distance(p_limit, p_offset, p_search, p_viewer_postcode, p_sort_by_distance)`

Lists marketplace listings with ignored users filtered out AND distance-based sorting support.

**Features:**
- All features of `list_trade_listings_filtered`
- Distance calculation using Haversine formula
- Optional distance-based sorting
- Requires viewer postcode for distance calculations

**Additional Parameters:**
- `p_viewer_postcode: TEXT` - Viewer's postal code for distance calculation
- `p_sort_by_distance: BOOLEAN` - Whether to sort by distance

**Additional Return Fields:**
- `distance_km: NUMERIC` - Distance in kilometers (NULL if postcodes unavailable)

**Sorting Behavior:**
- When `p_sort_by_distance = true`:
  1. Listings with valid distances first (ordered by distance)
  2. Listings without distance data last (ordered by created_at DESC)
- When `p_sort_by_distance = false`:
  1. All listings ordered by created_at DESC

---

#### `get_listing_chats(p_listing_id, p_participant_id)`

Returns chat messages for a listing, blocking access if users have ignored each other.

**Blocking Logic:**
- Returns empty if listing owner ignored current user
- Returns empty if current user ignored listing owner
- Prevents bidirectional communication when either party has ignored the other

---

### Frontend Components

#### `<IgnoreButton />`

Component: `src/components/social/IgnoreButton.tsx`

**Props:**
```typescript
{
  userId: string;           // User to ignore/unignore
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}
```

**Features:**
- Automatically checks if user is already ignored
- Toggles between "Ignorar" and "Dejar de ignorar" states
- Loading states during API calls
- Toast notifications for success/error
- Hidden for own profile

---

### Custom Hooks

#### `useIgnore()`

Hook: `src/hooks/social/useIgnore.ts`

**API:**
```typescript
{
  ignoreUser: (userId: string) => Promise<boolean>;
  unignoreUser: (userId: string) => Promise<boolean>;
  isUserIgnored: (userId: string) => Promise<boolean>;
  loading: boolean;
}
```

**Usage:**
```typescript
const { ignoreUser, unignoreUser, isUserIgnored, loading } = useIgnore();

// Ignore a user
const success = await ignoreUser('user-id-123');

// Check if ignored
const ignored = await isUserIgnored('user-id-123');

// Unignore
const success = await unignoreUser('user-id-123');
```

---

#### `useIgnoredUsers()`

Hook: `src/hooks/social/useIgnore.ts`

**API:**
```typescript
{
  ignoredUsers: Array<{
    ignored_user_id: string;
    nickname: string;
    avatar_url: string | null;
    created_at: string;
  }>;
  loading: boolean;
  error: string | null;
  fetchIgnoredUsers: (limit?: number, offset?: number) => Promise<void>;
  getIgnoredUsersCount: () => Promise<number>;
  removeFromIgnoredList: (userId: string) => void;
}
```

**Usage:**
```typescript
const { ignoredUsers, loading, fetchIgnoredUsers } = useIgnoredUsers();

useEffect(() => {
  fetchIgnoredUsers();
}, []);

// ignoredUsers is now populated
```

---

#### `useListings()` - Updated

Hook: `src/hooks/marketplace/useListings.ts`

**Changes:**
- Now uses `list_trade_listings_filtered` by default
- Switches to `list_trade_listings_filtered_with_distance` when sorting by distance
- Automatically filters ignored users in all cases

**Parameters:**
```typescript
{
  search?: string;
  limit?: number;
  sortByDistance?: boolean;
  viewerPostcode?: string | null;
}
```

## Security

### Row Level Security (RLS)

The `ignored_users` table has RLS enabled with the following policies:

1. **SELECT**: Users can only view their own ignored users
   ```sql
   CREATE POLICY "Users can view their own ignored users"
     ON ignored_users FOR SELECT
     USING (auth.uid() = user_id);
   ```

2. **INSERT**: Users can only add to their own ignore list
   ```sql
   CREATE POLICY "Users can insert their own ignored users"
     ON ignored_users FOR INSERT
     WITH CHECK (auth.uid() = user_id);
   ```

3. **DELETE**: Users can only remove from their own ignore list
   ```sql
   CREATE POLICY "Users can delete their own ignored users"
     ON ignored_users FOR DELETE
     USING (auth.uid() = user_id);
   ```

### Function Security

All RPC functions use `SECURITY DEFINER` to ensure:
- Functions execute with schema owner privileges
- Users cannot bypass RLS policies
- Current user context is properly captured via `auth.uid()`

### Validations

1. **Cannot Ignore Self**: Server-side validation prevents users from ignoring themselves
2. **User Existence**: Validates target user exists before allowing ignore
3. **Authentication**: All operations require authenticated user
4. **Unique Constraints**: Database prevents duplicate ignore entries

## Performance Considerations

### Indexing

Two indexes are created for optimal query performance:

```sql
CREATE INDEX idx_ignored_users_user_id ON ignored_users(user_id);
CREATE INDEX idx_ignored_users_ignored_user_id ON ignored_users(ignored_user_id);
```

**Impact:**
- Fast lookups when checking if a user is ignored
- Efficient filtering in marketplace listings
- Quick retrieval of ignored users list

### Marketplace Filtering

The `NOT EXISTS` subquery pattern is used for filtering:

```sql
AND NOT EXISTS (
  SELECT 1 FROM ignored_users iu
  WHERE iu.user_id = v_current_user_id
  AND iu.ignored_user_id = tl.user_id
)
```

**Benefits:**
- Leverages indexes for fast lookups
- Short-circuits on first match (efficient)
- Works well with PostgreSQL query planner

### Caching Considerations

- Frontend checks ignore status on component mount
- Status is cached in component state
- Manual refetch needed after ignore/unignore operations
- Consider implementing real-time updates in future

## Migration Path

### Files Modified

1. **Database Migrations:**
   - `supabase/migrations/20251030_add_ignored_users.sql` (comprehensive version)
   - `supabase/migrations/20251030_add_ignored_users_simple.sql` (simplified version)
   - `supabase/migrations/20251030_add_distance_sort_with_ignore_filter.sql` (distance + filter)

2. **Frontend Components:**
   - `src/components/social/IgnoreButton.tsx` (new)
   - `src/app/profile/ignored/page.tsx` (new)
   - `src/app/profile/page.tsx` (updated - added button)
   - `src/app/users/[userId]/page.tsx` (updated - added IgnoreButton)

3. **Hooks:**
   - `src/hooks/social/useIgnore.ts` (new)
   - `src/hooks/marketplace/useListings.ts` (updated)

4. **Pages:**
   - `src/app/marketplace/page.tsx` (updated - restored distance UI)

### Deployment Steps

1. **Run Database Migrations:**
   ```bash
   # Apply migrations in order
   npx supabase db push
   ```

2. **Deploy Frontend:**
   ```bash
   # Build and deploy
   npm run build
   vercel deploy --prod
   ```

3. **Verify Functionality:**
   - Test ignore/unignore workflow
   - Verify marketplace filtering
   - Check chat blocking
   - Test distance sorting with filtering

## Testing

### Manual Testing Checklist

See: `docs/MANUAL_TESTING_IGNORE_FUNCTIONALITY.md`

Key scenarios:
- [ ] Ignore user from profile page
- [ ] Unignore user from profile page
- [ ] View ignored users list
- [ ] Verify marketplace filtering
- [ ] Test chat blocking
- [ ] Test with distance sorting enabled
- [ ] Test with distance sorting disabled
- [ ] Verify empty states
- [ ] Test error handling

### Edge Cases

1. **Ignoring yourself:** Should be prevented by UI (button not shown) and server (validation error)
2. **Deleted users:** Cascade delete ensures ignored_users entries are removed
3. **Concurrent operations:** UNIQUE constraint prevents race conditions
4. **Null postcodes:** Distance calculation returns NULL gracefully
5. **Empty ignore list:** Proper empty state displayed

## Future Enhancements

### Potential Improvements

1. **Real-time Updates:**
   - Use Supabase Realtime to update UI when ignore status changes
   - Automatically refresh marketplace when user is ignored/unignored

2. **Bulk Operations:**
   - Allow ignoring multiple users at once
   - Batch unignore functionality

3. **Analytics:**
   - Track how often ignore feature is used
   - Identify frequently ignored users for moderation

4. **Advanced Filtering:**
   - Filter by ignore reason (requires schema change)
   - Time-based auto-unignore (temporary blocks)

5. **Notifications:**
   - Optional notification when someone ignores you (debatable UX)
   - Confirmation dialog before ignoring

## Troubleshooting

### Common Issues

**Issue:** Ignored users still appearing in marketplace

**Solution:**
- Verify migration was applied: Check for `ignored_users` table
- Check RPC function: `list_trade_listings_filtered` should exist
- Verify frontend is calling correct RPC function
- Clear cache and hard refresh

---

**Issue:** Cannot ignore user - button doesn't work

**Solution:**
- Check browser console for errors
- Verify user is authenticated
- Check network tab for failed RPC calls
- Verify Supabase function permissions

---

**Issue:** Distance sorting not working after ignore implementation

**Solution:**
- Verify `list_trade_listings_filtered_with_distance` function exists
- Check that `useListings` hook passes `sortByDistance` parameter
- Ensure postcode is set in user profile
- Verify migration `20251030_add_distance_sort_with_ignore_filter.sql` was applied

## References

- **Database Schema:** `docs/database-schema.md`
- **API Endpoints:** `docs/api-endpoints.md`
- **Manual Testing Guide:** `docs/MANUAL_TESTING_IGNORE_FUNCTIONALITY.md`
- **Architecture:** `docs/ARCHITECTURE.md`
