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
- `GET /trades` - Trading interface (not implemented yet)
- `GET /messages` - User messages (not implemented yet)
- `GET /profile` - User profile management (`src/app/profile/page.tsx`)

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

**Usage:**

```typescript
const { data } = await supabase.rpc('get_user_collection_stats', {
  p_user_id: user.id,
  p_collection_id: collectionId,
});
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

## Real-time Subscriptions (Not Currently Used)

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

## Rate Limiting

Currently relying on Supabase's built-in rate limiting. For future scaling, consider:

- Implement client-side debouncing for rapid updates
- Add request queuing for bulk operations
- Cache frequently accessed data in localStorage
