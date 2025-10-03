## API Endpoints & Operations

**Version**: v1.3.0  
**Status**: ✅ All backend features documented

---

## RPC Functions (Database)

### Collection Statistics

#### `get_user_collection_stats`

Returns completion statistics for a collection. The new `missing` metric infers wants from inventory counts; the legacy `wanted` key mirrors this value until the Phase 2 UI cleanup.

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
  "wanted": 150
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
**Use Case**: Powers the `/trades/find/[userId]` detail page, showing what each user can offer the other.

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
    user_stickers!left (count, wanted)
  `
  )
  .eq('collection_id', collectionId)
  .eq('user_stickers.user_id', userId);

// Update sticker ownership
await supabase.from('user_stickers').upsert({
  user_id: userId,
  sticker_id: stickerId,
  count: newCount,
  wanted: false,
});

// Legacy wanted toggle (Phase 1 compatibility only - prefer relying on implicit missing via count = 0)
await supabase.from('user_stickers').upsert({
  user_id: userId,
  sticker_id: stickerId,
  count: 0,
  wanted: true,
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
      user_stickers!left ( user_id, count, wanted ),
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

#### Trade Chats (v1.3.0) ✅ **BACKEND READY**

```typescript
// Get chat messages for a trade
const { data: messages } = await supabase
  .from('trade_chats')
  .select(
    `
    *,
    profiles (nickname)
  `
  )
  .eq('trade_id', tradeId)
  .order('created_at', { ascending: true });

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

#### `/trades/find/[userId]`

URL parameters:

- `userId`: UUID of the user to view trade details for

Query parameters:

- `collectionId`: Collection context (required)

Example: `/trades/find/123e4567-e89b-12d3-a456-426614174000?collectionId=1`

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


