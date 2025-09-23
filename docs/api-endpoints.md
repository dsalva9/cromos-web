# API Endpoints Documentation

This document outlines the API endpoints and routes for the Cromos Web application.

## Authentication Routes

### Public Routes (No authentication required)

- `GET /` - Landing page
- `GET /login` - Login page (`src/app/(auth)/login/page.tsx`)
- `POST /login` - Handle login form
- `GET /signup` - Registration page (`src/app/(auth)/signup/page.tsx`)
- `POST /signup` - Handle registration form
- `GET /auth/callback` - Supabase auth callback handler

## Protected Routes (Authentication required)

### Main Application Routes

- `GET /mi-coleccion` - User's active collection view (`src/app/mi-coleccion/page.tsx`)
- `GET /mi-coleccion/[id]` - Specific collection view (`src/app/mi-coleccion/[id]/page.tsx`)
- `GET /profile` - User profile management (`src/app/profile/page.tsx`)

### Trading System Routes

- `GET /trades/find` - Find mutual traders interface (`src/app/trades/find/page.tsx`)
- `GET /trades/find/[userId]` - Detailed view of trading match (`src/app/trades/find/[userId]/page.tsx`)

**Future Trading Routes (Phase 2+):**

- `GET /trades/proposals` - Trade proposals management (not implemented)
- `GET /trades/history` - Trade history (not implemented)
- `GET /messages` - User messages (not implemented)

## Database Functions (Supabase RPC)

### Collection Statistics

```sql
get_user_collection_stats(p_user_id: UUID, p_collection_id: INTEGER)
```

**Returns:**

```typescript
{
  total_stickers: number;
  owned_stickers: number;
  completion_percentage: number;
  duplicates: number;
  wanted: number;
}
[];
```

**DB note:** The three overlap fields are stored as `BIGINT` in Postgres; PostgREST returns them as numbers in JS.

**Usage:**

```typescript
const { data } = await supabase.rpc('get_user_collection_stats', {
  p_user_id: user.id,
  p_collection_id: collectionId,
});
```

### Trading System RPCs

#### Find Mutual Traders

```sql
find_mutual_traders(
  p_user_id: UUID,
  p_collection_id: INTEGER,
  p_rarity: TEXT,
  p_team: TEXT,
  p_query: TEXT,
  p_min_overlap: INTEGER,
  p_limit: INTEGER,
  p_offset: INTEGER
)
```

**Parameters:**

- `p_user_id`: Current user's UUID (required)
- `p_collection_id`: Collection to search within (required)
- `p_rarity`: Filter by sticker rarity ('common', 'rare', 'epic', 'legendary') (optional)
- `p_team`: Filter by team name (partial match, case-insensitive) (optional)
- `p_query`: Filter by player name (partial match, case-insensitive) (optional)
- `p_min_overlap`: Minimum number of mutual matches required (default: 1)
- `p_limit`: Results per page (default: 20, max: 100)
- `p_offset`: Pagination offset (default: 0)

**Returns:**

```typescript
{
  match_user_id: string;
  nickname: string | null;
  overlap_from_them_to_me: number; // Stickers they can offer me
  overlap_from_me_to_them: number; // Stickers I can offer them
  total_mutual_overlap: number; // Sum of both overlaps
}
[];
```

**Usage:**

```typescript
const { data: matches, error } = await supabase.rpc('find_mutual_traders', {
  p_user_id: user.id,
  p_collection_id: 1,
  p_rarity: 'rare',
  p_team: 'Barcelona',
  p_query: 'Messi',
  p_min_overlap: 2,
  p_limit: 20,
  p_offset: 0,
});
```

#### Get Mutual Trade Detail

```sql
get_mutual_trade_detail(
  p_user_id: UUID,
  p_other_user_id: UUID,
  p_collection_id: INTEGER
)
```

**Parameters:**

- `p_user_id`: Current user's UUID (required)
- `p_other_user_id`: Target user to trade with (required)
- `p_collection_id`: Collection context (required)

**Returns:**

```typescript
{
  direction: 'they_offer' | 'i_offer';
  sticker_id: number;
  sticker_code: string;
  player_name: string;
  team_name: string;
  rarity: string;
  count: number;
}
[];
```

**Usage:**

```typescript
const { data: details, error } = await supabase.rpc('get_mutual_trade_detail', {
  p_user_id: user.id,
  p_other_user_id: 'target-user-uuid',
  p_collection_id: 1,
});

// Separate the results
const theyOffer = details?.filter(d => d.direction === 'they_offer') || [];
const iOffer = details?.filter(d => d.direction === 'i_offer') || [];
```

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
```

### Database Operations

#### User Collections

```typescript
// Get user's collections
const { data } = await supabase
  .from('user_collections')
  .select(
    `
    is_active,
    joined_at,
    collections (*)
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
```

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
```

#### Trading Operations

```typescript
// Find mutual traders with filters
const { data: traders } = await supabase.rpc('find_mutual_traders', {
  p_user_id: user.id,
  p_collection_id: activeCollectionId,
  p_rarity: selectedRarity,
  p_team: teamFilter,
  p_query: searchQuery,
  p_min_overlap: minOverlap,
  p_limit: pageSize,
  p_offset: pageIndex * pageSize,
});

// Get trading details for specific user
const { data: tradeDetails } = await supabase.rpc('get_mutual_trade_detail', {
  p_user_id: user.id,
  p_other_user_id: targetUserId,
  p_collection_id: collectionId,
});
```

## Error Handling Patterns

### Standard Error Response

All database operations should follow this pattern:

```typescript
try {
  const { data, error } = await supabase.from('table').select('*');

  if (error) throw error;

  // Handle success
  return data;
} catch (err: unknown) {
  console.error('Operation failed:', err);
  const errorMessage = err instanceof Error ? err.message : 'Unknown error';

  // Show user-friendly error
  setError(errorMessage);
}
```

### Trading-Specific Error Handling

```typescript
// Trading RPC error handling
try {
  const { data, error } = await supabase.rpc('find_mutual_traders', params);

  if (error) {
    console.error('Trading search failed:', error);
    throw new Error('Error al buscar intercambios disponibles');
  }

  return data || [];
} catch (err: unknown) {
  const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
  showToast(errorMessage, 'error');
  return [];
}
```

## Route Parameters and Query Strings

### Trading Routes

#### `/trades/find`

Query parameters (all optional):

- `collection`: Collection ID to search within
- `rarity`: Filter by rarity ('common', 'rare', 'epic', 'legendary')
- `team`: Filter by team name
- `query`: Search by player name
- `min_overlap`: Minimum mutual matches (default: 1)
- `page`: Page number for pagination (default: 0)

Example: `/trades/find?collection=1&rarity=rare&team=Barcelona&min_overlap=2&page=1`

#### `/trades/find/[userId]`

URL parameters:

- `userId`: UUID of the user to view trade details for

Query parameters:

- `collectionId`: Collection context (required)

Example: `/trades/find/123e4567-e89b-12d3-a456-426614174000?collectionId=1`

## Real-time Subscriptions (Future Implementation)

For future implementation:

```typescript
// Subscribe to user sticker changes
const subscription = supabase
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
      // Handle real-time updates
      console.log('Sticker updated:', payload);
      // Refresh trading matches if needed
    }
  )
  .subscribe();

// Cleanup
return () => {
  subscription.unsubscribe();
};
```

## Environment Variables

Required environment variables for API operations:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Row Level Security (RLS) Policies

All database operations are protected by RLS policies:

- **profiles**: Users can only access their own profile
- **user_collections**: Users can only manage their own collections
- **user_stickers**: Users can only manage their own stickers
- **collections, stickers, collection_teams**: Public read access
- **Trading RPCs**: SECURITY DEFINER functions with controlled data exposure

## Rate Limiting

Currently relying on Supabase's built-in rate limiting. For trading features specifically:

- **Search requests**: Debounced on client-side (500ms default)
- **Pagination**: Client-side page size limits (max 100 results per request)
- **Detail requests**: Cached for 5 minutes per user pair to reduce server load

For future scaling, consider:

- Implement client-side debouncing for rapid filter changes
- Add request queuing for bulk operations
- Cache frequently accessed trading data in localStorage
- Implement progressive loading for large result sets
