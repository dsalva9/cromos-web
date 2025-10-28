## API Endpoints & Operations

**Version**: v1.5.0
**Status**: 🚧 v1.5.0 Admin, Location Matching & Quick Entry endpoints documented (pre-implementation)

---

## RPC Functions (Database)

### Collection Statistics

#### `get_user_collection_stats`

Returns completion statistics for a collection. The `missing` metric replaces the legacy flag and is inferred from ownership counts (count = 0).

**Function Signature:**

```sql
get_user_collection_stats(
  p_user_id UUID,
  p_collection_id INTEGER
) RETURNS JSON
```

**Returns:**

```json
{
  "total_stickers": 600,
  "owned_stickers": 450,
  "completion_percentage": 75,
  "duplicates": 120,
  "missing": 150,
}
```

**Security**: SECURITY DEFINER

---

#### `get_completion_report` ✅ **v1.3.0 NEW**

Generates a per-page completion report, listing missing and duplicate stickers for each page.

**Function Signature:**

```sql
get_completion_report(
  p_user_id UUID,
  p_collection_id INTEGER
) RETURNS JSON
```

**Returns:**

```json
{
  "collection_id": 1,
  "pages": [
    {
      "page_id": 1,
      "title": "FC Barcelona",
      "kind": "team",
      "order_index": 1,
      "missing": [1, 5, 12],
      "repes": [3, 7, 15]
    }
  ]
}
```

**Security**: SECURITY DEFINER, requires caller = `p_user_id`

---

### Sticker Management

#### `bulk_add_stickers_by_numbers` ✅ **v1.3.0 NEW**

Adds multiple stickers to a user's inventory by their `sticker_number` in a single operation.

**Function Signature:**

```sql
bulk_add_stickers_by_numbers(
  p_user_id UUID,
  p_collection_id INTEGER,
  p_numbers INTEGER[]
) RETURNS JSON
```

**Returns:**

```json
{
  "added": 5,
  "duplicates": [12, 15],
  "invalid": [999]
}
```

**Security**: SECURITY DEFINER, requires caller = `p_user_id`

---

#### `search_stickers` ✅ **v1.3.0 NEW**

Performs an advanced search for stickers within a collection, with filters for ownership status.

**Function Signature:**

```sql
search_stickers(
  p_collection_id INTEGER,
  p_query TEXT,
  p_filters JSONB
) RETURNS SETOF sticker_search_result
```

**Filters:**

```json
{
  "owned": true,
  "missing": false,
  "repes": true,
  "kind": "team"
}
```

**Security**: SECURITY DEFINER, authenticated users only

---

#### `mark_team_page_complete` ✅ **v1.4.0 NEW**

Marks all stickers on a team page as owned (count=1) for a user. Only adds stickers that are currently missing (no row or count=0). Idempotent - returns added_count=0 if page already complete.

**Function Signature:**

```sql
mark_team_page_complete(
  p_user_id UUID,
  p_collection_id INT,
  p_page_id INT
) RETURNS JSONB
```

**Parameters:**

- `p_user_id`: User UUID (must match authenticated user)
- `p_collection_id`: Collection ID that owns the page
- `p_page_id`: Page ID to mark complete (must be a team page)

**Returns:**

```json
{
  "added_count": 5,
  "affected_sticker_ids": [1, 5, 12, 18, 20]
}
```

**Preconditions:**

- User must be authenticated (`auth.uid()`)
- Caller must be acting on their own behalf (`p_user_id = auth.uid()`)
- Page must belong to the specified collection
- Page must be a team page (`kind = 'team'` or exactly 20 slots)

**Side Effects:**

- Inserts new rows into `user_stickers` with `count = 1` for missing stickers
- Updates existing rows where `count = 0` to `count = 1`
- Does NOT modify stickers with `count >= 1` (preserves singles and duplicates)
- Idempotent: re-running on same page returns `added_count = 0`

**Security:**

- `SECURITY DEFINER`: Runs with elevated privileges
- Auth guard: Validates `p_user_id = auth.uid()` at function start
- RLS remains enabled on `user_stickers` table
- Cross-user writes blocked by exception

**Scope:**

- **Team pages only**: Badge + manager + 18 players (20 slots)
- **Special pages**: Not supported in Phase 1 (raises exception)

**Usage Example:**

```typescript
try {
  const { data, error } = await supabase.rpc('mark_team_page_complete', {
    p_user_id: user.id,
    p_collection_id: 1,
    p_page_id: 5,
  });

  if (error) throw error;

  const { added_count, affected_sticker_ids } = data;

  if (added_count > 0) {
    toast.success(`¡Equipo completado! ${added_count} cromos añadidos`);
  } else {
    toast.info('Este equipo ya estaba completo');
  }

  // Refresh collection stats
  refreshCompletionReport();
} catch (err) {
  console.error('Error completing team page:', err);
  toast.error('Error al completar equipo');
}
```

**Error Cases:**

| Error Condition | Exception Message | SQLSTATE |
|----------------|-------------------|----------|
| Cross-user write | `Unauthorized: Cannot modify stickers for another user` | Default |
| Invalid page/collection | `Invalid page_id X for collection_id Y` | Default |
| Non-team page | `Only team pages are supported` | `check_violation` |
| Page not found | `Invalid page_id X for collection_id Y` | Default |
| RLS violation | Supabase RLS error | `42501` |

**Example Response - Partial Completion:**

```json
{
  "added_count": 3,
  "affected_sticker_ids": [102, 105, 119]
}
```

**Example Response - Already Complete:**

```json
{
  "added_count": 0,
  "affected_sticker_ids": []
}
```

**Notes:**

- Designed for "Mark team as complete" UI feature
- Useful for users who acquire full team rosters physically
- Complements single-sticker addition workflows
- Does not validate physical sticker possession (trust-based)
- Consider adding audit logging in future phases

---

### Trading - Discovery (v1.1.0)

#### `find_mutual_traders`

Finds users with mutual trading opportunities based on a variety of filters.

**Function Signature:**

```sql
FUNCTION find_mutual_traders(
  p_user_id UUID,
  p_collection_id INTEGER,
  p_rarity TEXT DEFAULT NULL,
  p_team TEXT DEFAULT NULL,
  p_query TEXT DEFAULT NULL,
  p_min_overlap INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  match_user_id UUID,
  nickname TEXT,
  overlap_from_them_to_me BIGINT,
  overlap_from_me_to_them BIGINT,
  total_mutual_overlap BIGINT
)
```

**Security**: SECURITY DEFINER
**Use Case**: Powers the `/trades/find` page, enabling users to discover potential trading partners.

---

#### `get_mutual_trade_detail`

Gets the detailed sticker-by-sticker breakdown of a mutual trade opportunity between two users.

**Function Signature:**

```sql
FUNCTION get_mutual_trade_detail(
  p_user_id UUID,
  p_other_user_id UUID,
  p_collection_id INTEGER
) RETURNS TABLE (
  direction TEXT,
  sticker_id INTEGER,
  sticker_code TEXT,
  player_name TEXT,
  team_name TEXT,
  rarity TEXT,
  count INTEGER
)
```

**Security**: SECURITY DEFINER
**Use Case**: Previously powered the detail page (removed in v1.4.3). Now used internally for data preparation before navigating to composer.

---

### Trading - Proposals (v1.2.0)

#### `create_trade_proposal`

Creates a new trade proposal with offered and requested items.

**Function Signature:**

```sql
FUNCTION create_trade_proposal(
  p_collection_id INTEGER,
  p_to_user UUID,
  p_message TEXT,
  p_offer_items JSONB,
  p_request_items JSONB
) RETURNS JSON
```

**Returns:**

```json
{
  "proposal_id": 123
}
```

**Security**: SECURITY DEFINER
**Use Case**: Powers the proposal composer at `/trades/compose`.

---

#### `respond_to_trade_proposal`

Allows a user to accept, reject, or cancel a trade proposal.

**Function Signature:**

```sql
FUNCTION respond_to_trade_proposal(
  p_proposal_id INTEGER,
  p_action TEXT
) RETURNS JSON
```

**Parameters:**

- `p_action`: `'accept'`, `'reject'`, or `'cancel'`

**Security**: SECURITY DEFINER
**Use Case**: Used in the proposal detail modal to handle user responses.

---

#### `list_trade_proposals`

Lists a user's trade proposals, separated into an inbox and an outbox.

**Function Signature:**

```sql
FUNCTION list_trade_proposals(
  p_user_id UUID,
  p_box TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (...)
```

**Parameters:**

- `p_box`: `'inbox'` or `'outbox'`

**Security**: SECURITY DEFINER
**Use Case**: Powers the `/trades/proposals` dashboard.

---

#### `get_trade_proposal_detail`

Retrieves the complete details of a single trade proposal, including all items and user information.

**Function Signature:**

```sql
FUNCTION get_trade_proposal_detail(
  p_proposal_id INTEGER
) RETURNS JSON
```

**Security**: SECURITY DEFINER
**Access Control**: Only proposal participants can view details
**Use Case**: Powers proposal detail modal

---

### Trading - History ✅ **v1.3.0 NEW**

#### `complete_trade`

Mark a trade as completed and record in history.

**Function Signature:**

```sql
complete_trade(
  p_trade_id BIGINT
) RETURNS VOID;
```

**Parameters:**

- `p_trade_id`: Trade proposal ID (required)

**Validation:**

- Caller must be either sender or recipient
- Proposal must exist
- Updates `trades_history` with completion timestamp
- Sets proposal status to 'accepted' (if not already cancelled)

**Usage Example:**

```typescript
try {
  const { error } = await supabase.rpc('complete_trade', {
    p_trade_id: proposalId,
  });

  if (error) throw error;

  toast.success('¡Intercambio completado!');

  // Update local state or redirect
  router.push('/trades/history');
} catch (err) {
  console.error('Error completing trade:', err);
  toast.error('Error al completar intercambio');
}
```

**Security**: SECURITY DEFINER  
**Side Effects**:

- Upserts `trades_history` row with status 'completed'
- Sets `completed_at` timestamp
- Clears any previous `cancelled_at`

**Use Case**: When users physically exchange stickers and want to mark trade complete

---

#### `cancel_trade`

Cancel a trade and record cancellation in history.

**Function Signature:**

```sql
cancel_trade(
  p_trade_id BIGINT
) RETURNS VOID;
```

**Parameters:**

- `p_trade_id`: Trade proposal ID (required)

**Validation:**

- Caller must be either sender or recipient
- Proposal must exist
- Updates `trades_history` with cancellation timestamp
- Sets proposal status to 'cancelled'

**Usage Example:**

```typescript
try {
  const { error } = await supabase.rpc('cancel_trade', {
    p_trade_id: proposalId,
  });

  if (error) throw error;

  toast.success('Intercambio cancelado');

  // Update UI
  refreshProposals();
} catch (err) {
  console.error('Error cancelling trade:', err);
  toast.error('Error al cancelar intercambio');
}
```

**Security**: SECURITY DEFINER  
**Side Effects**:

- Upserts `trades_history` row with status 'cancelled'
- Sets `cancelled_at` timestamp
- Clears any previous `completed_at`
- Updates `trade_proposals.status` to 'cancelled'

**Use Case**: When trade falls through or users change their mind

---

## Admin Endpoints (v1.5.0) ✅ **NEW**

### Collections Management

#### `admin_upsert_collection`

Create or update a collection. Admin only.

**Request:**
```typescript
await supabase.rpc('admin_upsert_collection', {
  p_collection: {
    id: 123, // Optional for create
    name: 'LaLiga 2025-26',
    competition: 'LaLiga',
    year: '2025-26',
    description: 'Spanish football season',
    image_url: 'https://...',
    is_active: true
  }
});
```

**Response:**
```json
{
  "id": 123,
  "name": "LaLiga 2025-26",
  "created": true
}
```

**Auth**: Requires `is_admin = TRUE` in JWT claims

---

#### `admin_delete_collection`

Delete a collection and cascade to all related data.

**Request:**
```typescript
await supabase.rpc('admin_delete_collection', {
  p_collection_id: 123
});
```

**Auth**: Admin only

---

### Pages Management

#### `admin_upsert_page`

Create or update a collection page.

**Request:**
```typescript
await supabase.rpc('admin_upsert_page', {
  p_page: {
    id: 456, // Optional for create
    collection_id: 123,
    kind: 'team', // or 'special'
    team_id: 10,
    title: 'FC Barcelona',
    order_index: 1
  }
});
```

**Response:**
```json
{
  "id": 456,
  "title": "FC Barcelona",
  "created": false
}
```

**Auth**: Admin only

---

#### `admin_delete_page`

Delete a page and its slots.

**Request:**
```typescript
await supabase.rpc('admin_delete_page', {
  p_page_id: 456
});
```

**Auth**: Admin only

---

### Stickers Management

#### `admin_upsert_sticker`

Create or update a sticker.

**Request:**
```typescript
await supabase.rpc('admin_upsert_sticker', {
  p_sticker: {
    id: 789, // Optional for create
    collection_id: 123,
    team_id: 10,
    code: 'BAR001',
    player_name: 'Lionel Messi',
    position: 'FW',
    nationality: 'Argentina',
    rating: 95,
    rarity: 'legendary',
    image_url: 'https://...',
    sticker_number: 1,
    image_path_webp_300: 'path/to/image.webp',
    thumb_path_webp_100: 'path/to/thumb.webp'
  }
});
```

**Response:**
```json
{
  "id": 789,
  "code": "BAR001",
  "player_name": "Lionel Messi",
  "created": true
}
```

**Auth**: Admin only

---

#### `admin_delete_sticker`

Delete a sticker.

**Request:**
```typescript
await supabase.rpc('admin_delete_sticker', {
  p_sticker_id: 789
});
```

**Auth**: Admin only

---

### Bulk Upload

#### `admin_bulk_upload_preview`

Preview bulk upload changes without applying them.

**Request:**
```typescript
await supabase.rpc('admin_bulk_upload_preview', {
  p_upload_data: [
    {
      code: 'BAR001',
      player_name: 'Lionel Messi',
      team_id: 10,
      rarity: 'legendary'
      // ... more fields
    },
    // ... more stickers
  ]
});
```

**Response:**
```json
{
  "valid_rows": 50,
  "invalid_rows": 2,
  "errors": [
    {"row": 12, "error": "Missing required field: player_name"}
  ],
  "warnings": [
    {"row": 5, "warning": "sticker_number is optional but recommended"}
  ],
  "diffs": [
    {"action": "create", "entity": "sticker", "data": {...}},
    {"action": "update", "entity": "sticker", "id": 123, "changes": {...}}
  ]
}
```

**Auth**: Admin only

---

#### `admin_bulk_upload_apply`

Apply bulk upload changes after preview approval.

**Request:**
```typescript
await supabase.rpc('admin_bulk_upload_apply', {
  p_upload_data: [ /* same structure as preview */ ]
});
```

**Response:**
```json
{
  "created": 45,
  "updated": 5,
  "failed": 0,
  "audit_log_entries": 50
}
```

**Auth**: Admin only

**Note**: This RPC is transactional. All operations succeed or all fail. Audit log entries are created for each operation.

---

### Location-Based Matching (v1.5.0) ✅ **NEW**

#### `find_mutual_traders` (Enhanced with Location Scoring)

This existing RPC (v1.1.0) has been enhanced to support location-based matching with Haversine distance calculation.

**Request (with location):**
```typescript
// First, get user's postcode centroid
const { data: postalData } = await supabase
  .from('postal_codes')
  .select('lat, lon')
  .eq('postcode', user.postcode)
  .eq('country', 'ES')
  .single();

// Then call enhanced RPC
await supabase.rpc('find_mutual_traders', {
  p_user_id: user.id,
  p_collection_id: activeCollectionId,
  p_lat: postalData?.lat,
  p_lon: postalData?.lon,
  p_radius_km: 50, // Filter within 50 km
  p_sort: 'mixed', // 'distance' | 'overlap' | 'mixed'
  p_limit: 20
});
```

**Response:**
```json
{
  "data": [
    {
      "match_user_id": "uuid-here",
      "nickname": "user123",
      "postcode": "28001", // Optional, for privacy display
      "overlap_from_them_to_me": 12,
      "overlap_from_me_to_them": 8,
      "total_mutual_overlap": 20,
      "distance_km": 12.5, // NULL if no location data
      "score": 0.85 // Mixed score (0.6 * overlap + 0.4 * distance_decay)
    },
    ...
  ]
}
```

**Sort Modes:**
- `"distance"`: Sort by proximity (ASC, closest first)
- `"overlap"`: Sort by trade overlap (DESC, most trades first)
- `"mixed"`: Weighted score = 0.6 × normalized_overlap + 0.4 × distance_decay

**Privacy:**
- Only postcode stored (not exact address)
- Distance calculated from postcode centroids
- UI shows "~12 km" without revealing exact location

---

#### Update User Postcode

**Request:**
```typescript
await supabase
  .from('profiles')
  .update({ postcode: '28001' })
  .eq('id', user.id);
```

**Validation:**
- Must be valid postcode in `postal_codes` table
- Optional field (can be NULL for users who don't want location matching)

---

### Quick Entry (v1.5.0) ✅ **NEW**

#### `bulk_add_stickers_by_numbers` (Enhanced for Quick Entry)

This existing RPC (v1.3.0) is used by the Quick Entry feature to add 1-5 stickers at once.

**Usage in Quick Entry:**

```typescript
// User enters: "1, 5, 12, 15, 20"
// or pastes CSV: "1;5;12;15;20"
// UI auto-splits, dedupes, and calls:

await supabase.rpc('bulk_add_stickers_by_numbers', {
  p_user_id: user.id,
  p_collection_id: activeCollectionId,
  p_numbers: [1, 5, 12, 15, 20]
});
```

**Response:**
```json
{
  "added": 3,
  "duplicates": [5, 12],
  "invalid": [999]
}
```

**UI Summary (Spanish):**
- "✅ 3 cromos añadidos"
- "🔄 2 ya los tenías (repes aumentados)"
- "❌ 0 números inválidos"

---

### Badges (v1.5.0) ✅ **NEW - Read Only**

Badges are read-only for now. No RPC for awarding badges yet.

**Fetch user badges:**

```typescript
const { data: badges, error } = await supabase
  .from('user_badges')
  .select('*')
  .eq('user_id', user.id);
```

**Badge structure:**
```json
[
  {
    "id": 1,
    "user_id": "...",
    "badge_code": "first_collection",
    "awarded_at": "2025-10-01T12:00:00Z"
  }
]
```

---

### Profile Avatars (v1.5.0) ✅ **NEW - Seed Phase**

#### Update avatar (seed selection)

**Request:**
```typescript
await supabase
  .from('profiles')
  .update({ avatar_url: 'avatars/seed/avatar-1.webp' })
  .eq('id', user.id);
```

**Seed avatar paths:**
- `avatars/seed/avatar-1.webp`
- `avatars/seed/avatar-2.webp`
- ... (12 total)

**Phase B (deferred)**: Secure user uploads with validation and storage quotas.

---

## Supabase Client Operations

### Authentication Operations

```typescript
// Sign up
await supabase.auth.signUp({ email, password });

// Sign in
await supabase.auth.signInWithPassword({ email, password });

// Sign out
await supabase.auth.signOut();

// Get current session
const {
  data: { session },
} = await supabase.auth.getSession();

// Get current user
const {
  data: { user },
} = await supabase.auth.getUser();
```

---

### Database Operations

#### User Collections

```typescript
// Get user's collections with details
const { data } = await supabase
  .from('user_collections')
  .select(
    `
    is_active,
    joined_at,
    collections (
      id,
      name,
      competition,
      year,
      description,
      image_url
    )
  `
  )
  .eq('user_id', userId);

// Join a collection
await supabase.from('user_collections').insert({
  user_id: userId,
  collection_id: collectionId,
  is_active: false,
});

// Set active collection
await supabase
  .from('user_collections')
  .update({ is_active: true })
  .eq('user_id', userId)
  .eq('collection_id', collectionId);
```

---

#### Stickers

```typescript
// Get stickers with user ownership data
const { data } = await supabase
  .from('stickers')
  .select(
    `
    *,
    collection_teams (team_name),
    user_stickers!left (count)
  `
  )
  .eq('collection_id', collectionId)
  .eq('user_stickers.user_id', userId);

// Update sticker ownership
await supabase.from('user_stickers').upsert({
  user_id: userId,
  sticker_id: stickerId,
  count: newCount,
});
```

---

#### Profiles

```typescript
// Get user profile
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

// Update profile
await supabase.from('profiles').upsert({
  id: userId,
  nickname: newNickname,
});

// Update avatar
await supabase
  .from('profiles')
  .update({
    avatar_url: avatarUrl,
  })
  .eq('id', userId);
```

---

#### Album Pages (v1.3.0) ✅ **COMPLETE**

The `useAlbumPages` hook performs an efficient query to get all necessary data for a page in one go.

```typescript
// Get all slots for a page with nested sticker and user ownership data
const { data: slotsData, error: slotsError } = await supabase
  .from('page_slots')
  .select(
    `
    slot_index,
    sticker_id,
    stickers (
      *,
      user_stickers!left ( user_id, count ),
      collection_teams ( team_name ),
      -- Public URLs are resolved on the client
      image_path_webp_300,
      thumb_path_webp_100,
      image_url
    )
  `
  )
  .eq('page_id', pageId)
  .order('slot_index', { ascending: true });

// On the client, this data is then processed:
// 1. Filter user_stickers to only the current user's data.
// 2. Resolve public URLs for thumb_path_webp_100 and image_path_webp_300.
// 3. Construct the final fallback chain for images.
// 4. Calculate page completion stats (owned_slots / total_slots).

// This pattern is encapsulated within the useAlbumPages hook
// to ensure consistency and performance.
```

---

#### Trade Chats (v1.3.0) ✅ **BACKEND READY** | ✅ **UI SHIPPED v1.4.2**

```typescript
// Get chat messages for a trade (with pagination)
const { data: messages } = await supabase
  .from('trade_chats')
  .select(
    `
    *,
    profiles!trade_chats_sender_id_fkey (nickname)
  `
  )
  .eq('trade_id', tradeId)
  .order('created_at', { ascending: false })
  .limit(50); // Load most recent 50

// Send a message
await supabase.from('trade_chats').insert({
  trade_id: tradeId,
  sender_id: userId,
  message: messageText,
});

// Subscribe to real-time messages (Supabase Realtime)
const channel = supabase
  .channel(`trade-chat-${tradeId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'trade_chats',
      filter: `trade_id=eq.${tradeId}`,
    },
    payload => {
      console.log('New message:', payload.new);
      addMessageToUI(payload.new);
    }
  )
  .subscribe();

// Cleanup
return () => {
  channel.unsubscribe();
};
```

**v1.4.2 Additions:**

```typescript
// Mark trade as read (for unread badges)
const { error } = await supabase.rpc('mark_trade_read', {
  p_trade_id: tradeId,
});

if (error) {
  console.error('Error marking trade as read:', error);
}

// Get unread message counts
const { data, error } = await supabase.rpc('get_unread_counts', {
  p_box: 'inbox', // or 'outbox'
  p_trade_ids: [123, 456, 789], // Optional: filter by specific trades
});

if (error) throw error;

// Transform to Map for O(1) lookups
const unreadMap = new Map(
  data.map(item => [item.trade_id, item.unread_count])
);

console.log(unreadMap.get(123)); // Number of unread messages for trade 123
```

---

#### Trade History (v1.3.0) ✅ **BACKEND READY**

```typescript
// Get user's completed trades
const { data: completedTrades } = await supabase
  .from('trades_history')
  .select(
    `
    *,
    trade_proposals (
      id,
      collection_id,
      from_user,
      to_user,
      created_at,
      collections (name),
      profiles!trade_proposals_from_user_fkey (nickname),
      profiles!trade_proposals_to_user_fkey (nickname)
    )
  `
  )
  .eq('status', 'completed')
  .or(
    `trade_proposals.from_user.eq.${userId},trade_proposals.to_user.eq.${userId}`
  )
  .order('completed_at', { ascending: false });

// Get cancelled trades
const { data: cancelledTrades } = await supabase
  .from('trades_history')
  .select(
    `
    *,
    trade_proposals (*)
  `
  )
  .eq('status', 'cancelled')
  .or(
    `trade_proposals.from_user.eq.${userId},trade_proposals.to_user.eq.${userId}`
  )
  .order('cancelled_at', { ascending: false });
```

---

## Supabase Storage Operations ✅ **v1.3.0 CONFIGURED**

### Sticker Images

```typescript
// Upload sticker image (300px full-size)
const filePath = `${collectionId}/${stickerNumber}-${stickerId}.webp`;
const { data, error } = await supabase.storage
  .from('sticker-images')
  .upload(filePath, imageFile, {
    contentType: 'image/webp',
    upsert: true,
  });

// Upload thumbnail (100px)
const thumbPath = `${collectionId}/thumbs/${stickerNumber}-${stickerId}.webp`;
await supabase.storage.from('sticker-images').upload(thumbPath, thumbnailFile, {
  contentType: 'image/webp',
  upsert: true,
});

// Get public URL for display
const {
  data: { publicUrl },
} = supabase.storage.from('sticker-images').getPublicUrl(filePath);

// Update sticker record with paths
await supabase
  .from('stickers')
  .update({
    image_path_webp_300: filePath,
    thumb_path_webp_100: thumbPath,
  })
  .eq('id', stickerId);
```

---

### User Avatars

```typescript
// Upload user avatar
const avatarPath = `${userId}/avatar.webp`;
const { error } = await supabase.storage
  .from('avatars')
  .upload(avatarPath, avatarFile, {
    contentType: 'image/webp',
    upsert: true,
  });

// Get public URL
const {
  data: { publicUrl },
} = supabase.storage.from('avatars').getPublicUrl(avatarPath);

// Update profile
await supabase
  .from('profiles')
  .update({ avatar_url: publicUrl })
  .eq('id', userId);
```

---

## Error Handling Patterns

### Standard Error Response

```typescript
try {
  const { data, error } = await supabase.from('table').select('*');

  if (error) throw error;

  return data;
} catch (err: unknown) {
  console.error('Operation failed:', err);
  const errorMessage = err instanceof Error ? err.message : 'Unknown error';
  toast.error(errorMessage);
  return null;
}
```

---

### RPC-Specific Error Handling

```typescript
// Proposal creation with specific error cases
try {
  const { data, error } = await supabase.rpc('create_trade_proposal', params);

  if (error) {
    console.error('Proposal creation failed:', error);

    if (error.message.includes('insufficient_items')) {
      throw new Error('No tienes suficientes cromos para esta propuesta');
    } else if (error.message.includes('invalid_target_user')) {
      throw new Error('El usuario objetivo no existe');
    } else {
      throw new Error('Error al crear la propuesta');
    }
  }

  return data;
} catch (err: unknown) {
  const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
  toast.error(errorMessage);
  throw err;
}
```

**Mark Team Page Complete:**

```typescript
// Complete a team page with error handling
try {
  const { data, error } = await supabase.rpc('mark_team_page_complete', {
    p_user_id: user.id,
    p_collection_id: collectionId,
    p_page_id: pageId,
  });

  if (error) {
    console.error('Page completion failed:', error);

    if (error.code === 'check_violation') {
      throw new Error('Solo las páginas de equipos pueden completarse');
    } else if (error.message.includes('Invalid page_id')) {
      throw new Error('La página no pertenece a esta colección');
    } else if (error.message.includes('Unauthorized')) {
      throw new Error('No autorizado');
    } else {
      throw new Error('No se pudo completar el equipo');
    }
  }

  const { added_count, affected_sticker_ids } = data;

  if (added_count === 0) {
    toast.info('Este equipo ya estaba completo');
  } else {
    toast.success(`Equipo completado ✔️ (${added_count} cromos añadidos)`);
  }

  return data;
} catch (err: unknown) {
  const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
  toast.error(errorMessage);
  throw err;
}
```

---

### Album Pages Error Handling

```typescript
// Get completion report with fallback
try {
  const { data, error } = await supabase.rpc('get_completion_report', {
    p_user_id: userId,
    p_collection_id: collectionId,
  });

  if (error) {
    console.error('Failed to get completion report:', error);

    // Fallback to basic stats
    return calculateStatsLocally();
  }

  return data;
} catch (err) {
  console.error('Unexpected error:', err);
  return null;
}
```

---

## Route Parameters and Query Strings

### Trading Routes

#### `/trades/find`

Query parameters (all optional):

- `collection`: Collection ID to search within
- `rarity`: Filter by rarity (`common`, `rare`, `epic`, `legendary`)
- `team`: Filter by team name
- `query`: Search by player name
- `min_overlap`: Minimum mutual matches (default: 1)
- `page`: Page number for pagination (default: 0)

Example: `/trades/find?collection=1&rarity=rare&team=Barcelona&min_overlap=2&page=1`

---

#### `/trades/find/[userId]` ⚠️ **REMOVED in v1.4.3**

**This route has been removed**. Match cards now link directly to `/trades/compose`.

**Migration**: Use `/trades/compose?userId=[userId]&collectionId=[collectionId]` instead.

---

#### `/trades/proposals`

Query parameters (all optional):

- `tab`: Which tab to show (`inbox` | `outbox`, default: `inbox`)
- `status`: Filter by status (`pending` | `accepted` | `rejected` | `cancelled`)
- `page`: Page number for pagination (default: 0)

Example: `/trades/proposals?tab=outbox&status=pending&page=1`

---

#### `/trades/compose`

Query parameters (required):

- `userId`: UUID of the user to create proposal for (required)
- `collectionId`: Collection context (required)

Example: `/trades/compose?userId=123e4567-e89b-12d3-a456-426614174000&collectionId=1`

---

### Profile Routes

#### `/profile/completar`

- **Purpose**: Página forzada tras el primer login para completar avatar, usuario y código postal.
- **Access**: Requiere sesión iniciada. Usuarios con perfil completo son redirigidos automáticamente a `/`.
- **Guards**: Bloquea Marketplace, Mis Colecciones y Plantillas hasta que se completen los datos obligatorios.
- **Query params**: N/A

---

#### `/mi-coleccion/[id]` (Album Pages - Planned)

URL parameters:

- `id`: Collection ID

Query parameters:

- `page`: Page ID to display (optional, defaults to first page)

Example: `/mi-coleccion/1?page=5`

---

## Real-time Subscriptions (Supabase Realtime)

### Proposal Updates

```typescript
// Subscribe to proposal changes for real-time inbox updates
const proposalChannel = supabase
  .channel('trade_proposals')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'trade_proposals',
      filter: `to_user=eq.${userId}`,
    },
    payload => {
      console.log('Proposal updated:', payload);

      if (payload.eventType === 'INSERT') {
        toast.info('Nueva propuesta recibida');
        refreshInboxProposals();
      } else if (payload.eventType === 'UPDATE') {
        const newStatus = payload.new.status;
        if (newStatus === 'accepted') {
          toast.success('¡Tu propuesta fue aceptada!');
        } else if (newStatus === 'rejected') {
          toast.info('Tu propuesta fue rechazada');
        }
        refreshProposals();
      }
    }
  )
  .subscribe();

// Cleanup
return () => {
  proposalChannel.unsubscribe();
};
```

---

### Trade Chat Messages

```typescript
// Subscribe to new messages in a trade conversation
const chatChannel = supabase
  .channel(`trade-chat-${tradeId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'trade_chats',
      filter: `trade_id=eq.${tradeId}`,
    },
    payload => {
      const newMessage = payload.new;

      // Only show notification if message is from other user
      if (newMessage.sender_id !== userId) {
        toast.info('Nuevo mensaje en el intercambio');
      }

      // Add message to UI
      addMessageToChat(newMessage);
    }
  )
  .subscribe();

// Cleanup
return () => {
  chatChannel.unsubscribe();
};
```

---

### User Sticker Changes

```typescript
// Subscribe to inventory changes (for proposal validation)
const stickerChannel = supabase
  .channel('user_stickers')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'user_stickers',
      filter: `user_id=eq.${userId}`,
    },
    payload => {
      console.log('Sticker inventory updated:', payload);

      // Update local cache
      updateLocalInventory(payload.new);

      // Might need to refresh active proposals if inventory changed
      validateActiveProposals();
    }
  )
  .subscribe();

// Cleanup
return () => {
  stickerChannel.unsubscribe();
};
```

---

## Environment Variables

Required environment variables for API operations:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Row Level Security (RLS) Policies

All database operations are protected by RLS policies. Key policies:

### User Data

- **profiles**: Users can read all, update own
- **user_collections**: Users can only manage own
- **user_stickers**: Users can only access own

### Public Data

- **collections, stickers, collection_teams**: Public read access
- **collection_pages, page_slots**: Public read, no client writes

### Trading Data

- **trade_proposals**: Users see only proposals where they are sender or receiver
- **trade_proposal_items**: Access controlled through parent proposal
- **trade_chats**: Only proposal participants can read/write
- **trades_history**: Only proposal participants can view

### Protected Data

- **user_badges**: Users can read own, no client writes

All modifications to proposals, chats, and history must go through RPC functions (no direct INSERT/UPDATE/DELETE).

---

## Rate Limiting

### Current Limits

- **Search requests**: Debounced on client-side (500ms)
- **Pagination**: Max 50 proposals per page, 100 traders per page
- **Detail requests**: Cached for 5 minutes per proposal
- **Proposal operations**: Limited by RPC execution time

### Trading-Specific Rate Limits

- **Proposal Creation**: Client-side validation prevents rapid-fire
- **Proposal Responses**: Optimistic UI reduces perceived latency
- **List Refresh**: Debounced refresh operations
- **Detail Modal**: Caches during modal session

### Future Considerations

- Implement user-based rate limiting (e.g., max 10 proposals per hour)
- Add request queuing for bulk operations
- Cache frequently accessed data in localStorage
- Progressive loading for large lists

---

## Performance Monitoring

### Key Metrics to Track

**RPC Execution Times:**

- `find_mutual_traders`: Target < 500ms
- `get_completion_report`: Target < 300ms
- `create_trade_proposal`: Target < 200ms
- `list_trade_proposals`: Target < 200ms

**UI Response Times:**

- Proposal creation: < 2 seconds end-to-end
- Proposal list loading: < 1 second for 20 items
- Detail modal opening: < 500ms
- Proposal response: < 1 second

**Search Performance:**

- `search_stickers`: Target < 400ms
- Find traders with filters: Target < 600ms

---

## API Documentation Standards

### RPC Function Documentation Format

```sql
-- Function: Brief description
-- @param p_parameter_name: Description and validation rules
-- @returns: Description with TypeScript interface
-- @throws: Common error conditions
-- @security: RLS and authorization requirements
-- @example: Usage example with sample data
```

### Client Hook Documentation Format

```typescript
/**
 * Hook for managing [specific functionality]
 *
 * @param config - Configuration object with required parameters
 * @returns Object with data, loading, error states and action functions
 *
 * @example
 * const { data, loading, action } = useHook({
 *   userId: user.id,
 *   param: value
 * });
 */
```

---

## Migration and Deployment Notes

### Database Migration Checklist

When deploying v1.3.0 features:

1. ✅ All core tables created (13 tables)
2. ✅ All indexes applied (30 indexes)
3. ✅ All RLS policies active (25 policies)
4. ✅ All RPC functions deployed (14 functions)
5. ✅ Storage buckets configured (2 buckets)
6. ⚠️ Backfill `stickers.sticker_number` before enforcing NOT NULL
7. ⚠️ Populate `collection_pages` and `page_slots` for active collections
8. ⚠️ Upload sticker images to Storage and update image paths

### Deployment Steps

1. **Apply schema changes** (already done in production)
2. **Run data migrations**:
   - Backfill sticker numbers
   - Seed collection pages
   - Create page slots
3. **Upload images** to Storage
4. **Test all RPCs** with production data
5. **Deploy frontend** with new UI components
6. **Monitor performance** of new features

---

## Schema Version History

- **v1.3.0** (Current): Album pages, trade history, badges, enhanced stickers
- **v1.2.0**: Complete trade proposals system
- **v1.1.0**: Trading discovery (find mutual traders)
- **v1.0.0**: Core collection and sticker management

---

**Status**: ✅ All v1.3.0 backend features documented and operational  
**Next**: Frontend UI integration for album pages, chat, and history  
**Ready for**: Full Phase 2 feature completion



---

## Integration Hooks

### usePublishDuplicate

**File:** `src/hooks/integration/usePublishDuplicate.ts`

Publishes a duplicate from collection to marketplace.

**Usage:**
```typescript
const { publishDuplicate, loading } = usePublishDuplicate();

const listingId = await publishDuplicate(copyId, slotId, {
  title: 'Custom Title',
  description: 'Custom description',
  // ... other optional fields
});
```

**Backend RPC:** `publish_duplicate_to_marketplace`

### useMyListings

**File:** `src/hooks/integration/useMyListings.ts`

Fetches user's listings with inventory sync data.

**Returns:**
- `listings` - Array with sync information
- `loading` - Loading state
- `error` - Error message if any
- `refetch` - Function to refresh data

**Backend RPC:** `get_my_listings_with_progress`

### useMarkSold

**File:** `src/hooks/integration/useMarkSold.ts`

Marks listing as sold and decrements duplicate count.

**Usage:**
```typescript
const { markSold, loading } = useMarkSold();
await markSold(listingId); // Auto-decrements if linked to template
```

**Backend RPC:** `mark_listing_sold_and_decrement`

---

## Marketplace Listing RPCs (v1.6.0)

### `list_trade_listings`

Lists active marketplace listings with pagination and search.

**Function Signature:**

```sql
list_trade_listings(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL
) RETURNS TABLE (
  id BIGINT,
  user_id UUID,
  author_nickname TEXT,
  author_avatar_url TEXT,
  title TEXT,
  description TEXT,
  sticker_number TEXT,
  collection_name TEXT,
  image_url TEXT,
  status TEXT,
  views_count INTEGER,
  created_at TIMESTAMPTZ
)
```

**Security**: SECURITY DEFINER, accessible to anon and authenticated

---

### `list_trade_listings_with_distance` ✅ **v1.6.0 NEW**

Lists active marketplace listings with optional distance-based sorting. Uses Spanish postal code centroids and Haversine formula to calculate distances.

**Function Signature:**

```sql
list_trade_listings_with_distance(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_viewer_postcode TEXT DEFAULT NULL,
  p_sort_by_distance BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
  id BIGINT,
  user_id UUID,
  author_nickname TEXT,
  author_avatar_url TEXT,
  author_postcode TEXT,
  title TEXT,
  description TEXT,
  sticker_number TEXT,
  collection_name TEXT,
  image_url TEXT,
  status TEXT,
  views_count INTEGER,
  created_at TIMESTAMPTZ,
  distance_km NUMERIC
)
```

**Parameters:**
- `p_viewer_postcode` - Viewer's postcode for distance calculation (optional)
- `p_sort_by_distance` - When TRUE, sorts by distance ascending, pushing NULL distances to end

**Returns:**
- `distance_km` - Approximate distance in kilometers (NULL if postcodes missing or invalid)
- Listings without valid postcodes are pushed to end when sorting by distance

**Security**: SECURITY DEFINER, accessible to anon and authenticated

**Notes:**
- Requires `postal_codes` table and `haversine_distance` function
- Distance calculated using postcode centroids, not exact addresses
- Only supports Spanish postcodes (ES) in v1.6.0

---

### Helper Functions

#### `haversine_distance` ✅ **v1.6.0 NEW**

Calculates distance between two geographic coordinates using the Haversine formula.

**Function Signature:**

```sql
haversine_distance(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION
```

**Returns**: Distance in kilometers

**Security**: IMMUTABLE PARALLEL SAFE

---

## Sprint 13: Listing Transactions & Reservations ✅ **v1.6.0 UPDATED**

### Transaction Workflow RPCs

#### `reserve_listing` ✅ **v1.6.0 USED**

Reserves a listing for a specific buyer. Creates a transaction record and updates listing status to 'reserved'.

**Function Signature:**

```sql
reserve_listing(
  p_listing_id BIGINT,
  p_buyer_id UUID,
  p_note TEXT DEFAULT NULL
) RETURNS BIGINT
```

**Parameters:**
- `p_listing_id`: The listing to reserve
- `p_buyer_id`: The buyer to reserve for
- `p_note`: Optional note about the reservation

**Returns**: Transaction ID

**Security**: SECURITY DEFINER, seller only

**Validations:**
- Caller must be the listing owner
- Listing must be active
- Buyer must exist and not be the seller

**Usage:**
```typescript
const { data: transactionId, error } = await supabase.rpc('reserve_listing', {
  p_listing_id: listingId,
  p_buyer_id: buyerId,
  p_note: null
});
```

---

#### `complete_listing_transaction` ✅ **v1.6.0 UPDATED**

Marks a transaction as completed. When seller initiates, sends notification to buyer for confirmation.

**Function Signature:**

```sql
complete_listing_transaction(
  p_transaction_id BIGINT
) RETURNS BOOLEAN
```

**Parameters:**
- `p_transaction_id`: The transaction to complete

**Returns**: TRUE on success

**Security**: SECURITY DEFINER, seller or buyer

**Behavior:**
- Updates transaction status to 'completed'
- Updates listing status to 'completed'
- If caller is seller: sends `listing_completed` notification to buyer with `needs_confirmation: true`
- If caller is buyer: confirms the transaction (no notification sent)

**Usage:**
```typescript
// Seller marks as completed
const { data, error } = await supabase.rpc('complete_listing_transaction', {
  p_transaction_id: transactionId
});

// Buyer confirms (same function)
const { data, error } = await supabase.rpc('complete_listing_transaction', {
  p_transaction_id: transactionId
});
```

---

#### `cancel_listing_transaction`

Cancels a reservation and reverts listing to active status.

**Function Signature:**

```sql
cancel_listing_transaction(
  p_transaction_id BIGINT,
  p_reason TEXT
) RETURNS BOOLEAN
```

**Parameters:**
- `p_transaction_id`: The transaction to cancel
- `p_reason`: Reason for cancellation

**Returns**: TRUE on success

**Security**: SECURITY DEFINER, seller only

**Usage:**
```typescript
const { data, error } = await supabase.rpc('cancel_listing_transaction', {
  p_transaction_id: transactionId,
  p_reason: 'Buyer no longer interested'
});
```

---

#### `get_listing_transaction` ✅ **v1.6.0 USED**

Retrieves transaction details for a listing.

**Function Signature:**

```sql
get_listing_transaction(
  p_listing_id BIGINT
) RETURNS TABLE (
  id BIGINT,
  listing_id BIGINT,
  seller_id UUID,
  buyer_id UUID,
  seller_nickname TEXT,
  buyer_nickname TEXT,
  status TEXT,
  reserved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
)
```

**Parameters:**
- `p_listing_id`: The listing ID

**Returns**: Most recent transaction for the listing

**Security**: SECURITY DEFINER, seller or buyer only

**Usage:**
```typescript
const { data, error } = await supabase.rpc('get_listing_transaction', {
  p_listing_id: listingId
});

if (data && data.length > 0) {
  const transaction = data[0];
  console.log('Transaction status:', transaction.status);
}
```

---

## Sprint 13: Listing Chat System

### Listing Chat RPCs

#### `get_listing_chats(p_listing_id, p_participant_id)`

Retrieves chat messages for a specific listing, supporting bidirectional conversations between buyers and sellers.

**Function Signature:**

```sql
get_listing_chats(
  p_listing_id BIGINT,
  p_participant_id UUID DEFAULT NULL
) RETURNS TABLE (
  id BIGINT,
  sender_id UUID,
  receiver_id UUID,
  sender_nickname TEXT,
  message TEXT,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ
)
```

**Parameters:**
- `p_listing_id`: The listing ID
- `p_participant_id`: (Optional) For sellers, filters conversation to specific buyer

**Access Control:**
- Sellers can view all conversations or filter by participant
- Buyers can only view their own conversation with the seller

**Usage:**
```typescript
const { data, error } = await supabase.rpc('get_listing_chats', {
  p_listing_id: listingId,
  p_participant_id: buyerId // Optional - seller only
});
```

---

#### `get_user_conversations()` ✅ **v1.6.0 NEW**

Retrieves all listing conversations for the current authenticated user, showing both conversations where they are the seller and where they are the buyer.

**Function Signature:**

```sql
get_user_conversations() RETURNS TABLE (
  listing_id BIGINT,
  listing_title TEXT,
  listing_image_url TEXT,
  listing_status TEXT,
  counterparty_id UUID,
  counterparty_nickname TEXT,
  counterparty_avatar_url TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT,
  is_seller BOOLEAN
)
```

**Returns:**
- All conversations sorted by most recent activity
- Includes listing details, counterparty info, last message, and unread count
- `is_seller` indicates if the user is the listing owner in this conversation

**Security**: SECURITY DEFINER, authenticated only

**Usage:**
```typescript
const { data: conversations, error } = await supabase.rpc('get_user_conversations');

// conversations contains all chats
conversations.forEach(conv => {
  console.log(`${conv.listing_title} - ${conv.counterparty_nickname}`);
  console.log(`Unread: ${conv.unread_count}`);
  console.log(`Role: ${conv.is_seller ? 'Seller' : 'Buyer'}`);
});
```

**Use Cases:**
- Display centralized chats page showing all conversations
- Track unread messages across all listings
- Navigate to specific conversation with proper context

---

#### `send_listing_message(p_listing_id, p_receiver_id, p_message)`

Sends a message in a listing chat conversation.

**Function Signature:**

```sql
send_listing_message(
  p_listing_id BIGINT,
  p_receiver_id UUID,
  p_message TEXT
) RETURNS BIGINT -- Returns message ID
```

**Parameters:**
- `p_listing_id`: The listing ID
- `p_receiver_id`: The user ID receiving the message
- `p_message`: Message text (max 500 characters)

**Validation:**
- Message must not be empty
- Message max length: 500 characters
- Receiver must exist
- Cannot send messages to yourself
- Buyers can only message listing owner
- Sellers can only reply to buyers who messaged first

**Usage:**
```typescript
const { data, error } = await supabase.rpc('send_listing_message', {
  p_listing_id: listingId,
  p_receiver_id: receiverId,
  p_message: message.trim()
});
```

---

#### `get_listing_chat_participants(p_listing_id)`

Gets all participants (buyers) who have messaged about a listing. Seller-only function.

**Function Signature:**

```sql
get_listing_chat_participants(
  p_listing_id BIGINT
) RETURNS TABLE (
  user_id UUID,
  nickname TEXT,
  avatar_url TEXT,
  is_owner BOOLEAN,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER
)
```

**Parameters:**
- `p_listing_id`: The listing ID

**Access Control:**
- Only listing owner can call this function

**Usage:**
```typescript
const { data, error } = await supabase.rpc('get_listing_chat_participants', {
  p_listing_id: listingId
});
```

---

#### `mark_listing_messages_read(p_listing_id, p_sender_id)`

Marks all messages from a specific sender as read.

**Function Signature:**

```sql
mark_listing_messages_read(
  p_listing_id BIGINT,
  p_sender_id UUID
) RETURNS INTEGER -- Returns count of messages marked as read
```

**Parameters:**
- `p_listing_id`: The listing ID
- `p_sender_id`: The user ID who sent the messages

**Side Effects:**
- Also marks listing chat notifications as read via `mark_listing_chat_notifications_read`

**Usage:**
```typescript
const { data, error } = await supabase.rpc('mark_listing_messages_read', {
  p_listing_id: listingId,
  p_sender_id: senderId
});
```

---

## Sprint 15: Notifications System

### Notification RPCs

#### `get_notifications()`

Returns enriched notifications for the current user with actor, listing, template, and trade details.

**Function Signature:**

```sql
get_notifications() RETURNS TABLE (
  id BIGINT,
  kind TEXT,
  trade_id BIGINT,
  listing_id BIGINT,
  template_id BIGINT,
  rating_id BIGINT,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  payload JSONB,
  actor_id UUID,
  actor_nickname TEXT,
  actor_avatar_url TEXT,
  -- Plus additional enriched fields from joins
)
```

**Returns:**

```json
[
  {
    "id": 123,
    "kind": "listing_chat",
    "listing_id": 456,
    "actor_id": "user-uuid",
    "actor_nickname": "Juan",
    "actor_avatar_url": "/avatars/...",
    "listing_title": "Cromo Messi",
    "created_at": "2025-10-25T10:30:00Z",
    "read_at": null,
    "payload": { "sender_id": "user-uuid", "message_preview": "Hola..." }
  }
]
```

**Security:** SECURITY DEFINER, returns only auth.uid() notifications

---

#### `get_notification_count()`

Returns count of unread notifications for current user.

**Function Signature:**

```sql
get_notification_count() RETURNS INTEGER
```

**Returns:** Integer count (e.g., 5)

**Security:** SECURITY DEFINER

---

#### `mark_all_notifications_read()`

Marks all unread notifications as read for current user.

**Function Signature:**

```sql
mark_all_notifications_read() RETURNS VOID
```

**Security:** SECURITY DEFINER

---

#### `mark_notification_read(p_notification_id)`

Marks a single notification as read.

**Function Signature:**

```sql
mark_notification_read(p_notification_id BIGINT) RETURNS VOID
```

**Parameters:**
- `p_notification_id` - ID of notification to mark as read

**Security:** SECURITY DEFINER, validates ownership

---

#### `mark_listing_chat_notifications_read(p_listing_id, p_participant_id)`

Marks all chat notifications for a specific listing and participant as read.

**Function Signature:**

```sql
mark_listing_chat_notifications_read(
  p_listing_id BIGINT,
  p_participant_id UUID
) RETURNS VOID
```

**Parameters:**
- `p_listing_id` - Listing ID
- `p_participant_id` - User ID of chat participant

**Use Case:** Called when user opens a listing chat conversation

**Security:** SECURITY DEFINER, validates ownership

---

### Notification Triggers

Sprint 15 added database triggers that automatically create notifications:

#### `trigger_notify_chat_message`

- **Fires:** AFTER INSERT on `trade_chats`
- **Creates:** `listing_chat` or `chat_unread` notification
- **Logic:** Determines counterparty, upserts notification (prevents duplicates)

#### `trigger_notify_user_rating`

- **Fires:** AFTER INSERT on `user_ratings`
- **Creates:** `user_rated` notification
- **Recipient:** Rated user
- **Payload:** rating_value, context_type, context_id, has_comment

#### `trigger_notify_template_rating`

- **Fires:** AFTER INSERT on `template_ratings`
- **Creates:** `template_rated` notification
- **Recipient:** Template author
- **Payload:** rating_value, has_comment

#### `trigger_notify_listing_status_change`

- **Fires:** AFTER UPDATE on `trade_listings` (status change)
- **Creates:** `listing_reserved` or `listing_completed` notifications
- **Recipients:** Both buyer and seller
- **Payload:** listing_title, reservation details, completion timestamp

---

### Frontend Hooks

#### `useNotifications()`

**File:** `src/hooks/notifications/useNotifications.ts`

Main hook for notifications with realtime subscriptions.

**Usage:**

```typescript
const {
  notifications,          // FormattedNotification[] - All formatted notifications
  unreadNotifications,    // FormattedNotification[] - Unread only
  readNotifications,      // FormattedNotification[] - Read only
  unreadCount,            // number - Unread count
  groupedByCategory,      // GroupedNotifications - By category
  loading,                // boolean - Loading state
  error,                  // string | null - Error message
  refresh,                // () => Promise<void> - Refresh data
  markAllAsRead,          // () => Promise<void> - Mark all as read
  markAsRead,             // (id: number) => Promise<void> - Mark single as read
  markListingChatAsRead,  // (listingId, participantId) => Promise<void>
  clearError,             // () => void - Clear error state
} = useNotifications();
```

**Features:**
- Automatic fetch on mount and user change
- Realtime Supabase subscriptions
- Optimistic updates
- Computed properties (grouped, filtered)
- Spanish error messages

---

### Notification Types

| Kind | Trigger Event | Category | Example Message |
|------|--------------|----------|----------------|
| `listing_chat` | Chat message sent | Marketplace | "Juan te ha enviado un mensaje sobre 'Cromo Messi'" |
| `listing_reserved` | Listing reserved | Marketplace | "María ha reservado 'Pack Completo' para ti" |
| `listing_completed` | Transaction completed | Marketplace | "Tu compra de 'Album Vintage' se ha completado" |
| `user_rated` | User receives rating | Community | "Pedro te ha valorado con ⭐⭐⭐⭐⭐ (5/5)" |
| `template_rated` | Template receives rating | Templates | "Ana ha valorado tu plantilla 'La Liga' con ⭐⭐⭐⭐" |
| `chat_unread` | Trade chat message | Trades | "Mensaje en intercambio" |
| `proposal_accepted` | Trade proposal accepted | Trades | "Tu propuesta fue aceptada" |
| `proposal_rejected` | Trade proposal rejected | Trades | "Tu propuesta fue rechazada" |
| `finalization_requested` | Trade finalization | Trades | "Solicitud de finalización" |
| `admin_action` | Admin moderation | System | "Acción administrativa" |

---

### Migration Files

- **`20251025194614_notifications_reboot.sql`** - Core notifications schema updates
- **`20251025194615_notifications_listing_workflow.sql`** - Listing workflow notifications

---

**Last Updated:** 2025-10-25 (Sprint 15 Complete)
