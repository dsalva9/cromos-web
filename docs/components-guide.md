# Components Architecture Guide

This document outlines the component structure and patterns used in the Cromos Web application.

## Component Organization

```
src/components/
├── ui/                    # shadcn/ui base components + custom extensions
├── providers/             # Context providers
├── collection/           # Collection-specific components
├── trades/              # Trading-specific components
├── profile/             # Profile-specific components (if any)
└── [shared-components]   # Reusable application components
```

## Provider Components

### SupabaseProvider

**File**: `src/components/providers/SupabaseProvider.tsx`

Central authentication and database provider with multiple hook exports.

```typescript
// Main context hook
const { user, session, loading, supabase } = useSupabase();

// Convenience hooks
const { user, loading } = useUser();
const { session, loading } = useSession();
const supabase = useSupabaseClient();
```

**Responsibilities:**

- Manages Supabase client instance
- Handles authentication state changes
- Provides user session data
- Manages global loading states
- Auto-refreshes tokens

## Guard Components

### AuthGuard

**File**: `src/components/AuthGuard.tsx`

Protects routes that require authentication.

```typescript
<AuthGuard redirectTo="/login">
  <ProtectedContent />
</AuthGuard>
```

**Features:**

- Redirects unauthenticated users
- Shows Spanish loading states ("Verificando autenticación...")
- Customizable redirect destination
- Graceful handling of auth state changes

## Collection Components

### CollectionsDropdown

**File**: `src/components/collection/CollectionsDropdown.tsx`

Navigation dropdown for switching between user's owned collections.

```typescript
<CollectionsDropdown
  collections={ownedCollections}
  currentId={currentCollectionId}
  activeId={activeCollectionId}
  onSelect={(id) => router.push(`/mi-coleccion/${id}`)} // Optional
/>
```

**Key Features:**

- **Smart visibility**: Auto-hides when user has ≤1 collection
- **Keyboard accessibility**: Enter/Space key navigation with proper ARIA roles
- **Visual state indicators**:
  - "Activa" badge for active collection
  - "Actual" badge for currently viewed collection
  - Blue highlight for current selection
- **Flexible navigation**: Optional `onSelect` prop, defaults to direct routing
- **Responsive design**: Fixed-width dropdown (320px) with scroll for many collections
- **Backdrop interaction**: Click outside to close

### EmptyCollectionState

**File**: `src/components/collection/EmptyCollectionState.tsx`

Full-screen empty state component for users without collections.

```typescript
<EmptyCollectionState /> // Self-contained with no props
```

**Features:**

- **Full-screen layout**: Takes entire viewport with centered content
- **Contextual messaging**:
  - Welcome message "¡Bienvenido a CambiaCromos!"
  - Clear explanation of next steps
  - Friendly onboarding tone in Spanish
- **Direct CTA**: "Seguir una Colección" button routes to `/profile`
- **Visual hierarchy**: Trophy icon, headings, and descriptive text
- **Theme consistency**: Uses app's gradient background and modern card styling
- **Responsive spacing**: Proper padding and max-width constraints

## Trading Components ✅ **NEW - PHASE 2**

### FindTradersFilters

**File**: `src/components/trades/FindTradersFilters.tsx`

Advanced filter interface for trading search with debounced inputs.

```typescript
<FindTradersFilters
  collections={ownedCollections}
  selectedCollectionId={selectedCollectionId}
  filters={filters}
  onCollectionChange={handleCollectionChange}
  onFiltersChange={handleFiltersChange}
/>
```

**Key Features:**

- **Active-first Collection Selection**: Prioritizes user's active collection with visual indicators
- **Advanced Filter Toggle**: Collapsible advanced filters to reduce cognitive load
- **Debounced Input**: 500ms debounce on text inputs to prevent excessive API calls
- **Visual Filter Summary**: Active filter badges with individual removal options
- **Keyboard Navigation**: Full ARIA support with dropdown keyboard interactions
- **Filter Categories**:
  - Collection dropdown with active/inactive status
  - Player name search with search icon
  - Rarity dropdown (Común, Rara, Épica, Legendaria)
  - Team name text input
  - Minimum overlap button selector (1-10+ coincidences)

**State Management Pattern:**

```typescript
// Debounced filter updates
const [localFilters, setLocalFilters] = useState(filters);

useEffect(() => {
  const timeoutId = setTimeout(() => {
    onFiltersChange(localFilters);
  }, 500);
  return () => clearTimeout(timeoutId);
}, [localFilters]);
```

### MatchCard

**File**: `src/components/trades/MatchCard.tsx`

Trading match summary card with mutual benefit visualization.

```typescript
<MatchCard
  match={match}
  collectionId={selectedCollectionId}
/>
```

**Key Features:**

- **Mutual Benefit Display**: Clear visualization of bidirectional trading opportunities
- **User Identity**: Avatar placeholder with nickname fallback
- **Action-Oriented Design**: "Ver detalles" CTA with hover effects
- **Color-Coded Stats**:
  - Green for "Te pueden ofrecer" (incoming offers)
  - Blue for "Puedes ofrecer" (outgoing offers)
  - Teal gradient for total mutual overlap
- **Click-to-Navigate**: Entire card routes to detail view with collection context

**Visual Structure:**

```typescript
// Exchange visualization
<div className="bg-green-50 rounded-lg">📥 Te pueden ofrecer: {count}</div>
<ArrowRightLeft className="exchange-icon" />
<div className="bg-blue-50 rounded-lg">📤 Puedes ofrecer: {count}</div>
<div className="bg-gradient-teal">⭐ {total} intercambios mutuos</div>
```

### MatchDetail

**File**: `src/components/trades/MatchDetail.tsx`

Detailed side-by-side sticker lists for trading pairs.

```typescript
<MatchDetail
  theyOffer={theyOffer}
  iOffer={iOffer}
  targetUserNickname={targetUserNickname}
/>
```

**Key Features:**

- **Side-by-Side Layout**: Clear separation of "they offer" vs "I offer" stickers
- **Rarity-Based Styling**: Gradient badges matching collection rarity system
- **Scrollable Lists**: Fixed height with overflow for large result sets
- **Sticker Details Display**:
  - Sticker code (#ABC123)
  - Player name (truncated for mobile)
  - Team name
  - Rarity badge with color coding
  - Duplicate count indicator (x2, x3, etc.)
- **Empty States**: Contextual messages when no stickers available in either direction
- **Accessibility**: Semantic HTML with proper headings and screen reader support

**Rarity Color System:**

```typescript
function getRarityColor(rarity: string) {
  switch (rarity?.toLowerCase()) {
    case 'legendary':
      return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
    case 'epic':
      return 'bg-gradient-to-r from-purple-400 to-pink-500 text-white';
    case 'rare':
      return 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white';
    case 'common':
      return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
    default:
      return 'bg-gray-200 text-gray-700';
  }
}
```

## Trading Hooks ✅ **NEW - PHASE 2**

### useFindTraders

**File**: `src/hooks/trades/useFindTraders.ts`

RPC-based trading search with pagination and filtering.

```typescript
const {
  matches,
  loading,
  error,
  hasMore,
  totalCount,
  searchTrades,
  clearResults,
} = useFindTraders();

// Usage
await searchTrades({
  userId: user.id,
  collectionId: selectedCollectionId,
  filters: { rarity: 'rare', team: 'Barcelona', query: 'Messi', minOverlap: 2 },
  limit: 20,
  offset: 0,
});
```

**Key Features:**

- **RPC Integration**: Direct calls to `find_mutual_traders` Supabase function
- **Pagination Support**: Offset-based pagination with `hasMore` indicator
- **Error Recovery**: Automatic state reset on search errors
- **Filter Management**: Comprehensive filter parameter handling
- **Loading States**: Granular loading for search vs pagination operations

**State Management Pattern:**

```typescript
const searchTrades = useCallback(
  async ({ userId, collectionId, filters, limit, offset }) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc(
        'find_mutual_traders',
        {
          p_user_id: userId,
          p_collection_id: collectionId,
          // ... filter parameters
        }
      );

      if (rpcError) throw new Error('Error al buscar intercambios disponibles');

      // Handle pagination vs new search
      if (offset === 0) {
        setMatches(data || []);
      } else {
        setMatches(prev => [...prev, ...(data || [])]);
      }

      setHasMore(data?.length === limit);
    } catch (err) {
      setError(err.message);
      if (offset === 0) {
        setMatches([]);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  },
  [supabase]
);
```

### useMatchDetail

**File**: `src/hooks/trades/useMatchDetail.ts`

Detailed sticker lists for specific trading pairs.

```typescript
const { theyOffer, iOffer, loading, error, fetchDetail, clearDetail } =
  useMatchDetail();

// Usage
await fetchDetail({
  userId: user.id,
  otherUserId: targetUserId,
  collectionId: selectedCollectionId,
});
```

**Key Features:**

- **Bidirectional Results**: Separates "they_offer" vs "i_offer" results automatically
- **RPC Integration**: Calls `get_mutual_trade_detail` Supabase function
- **Data Transformation**: Converts raw RPC results to typed interfaces
- **Error Handling**: State reset on errors with user-friendly messages
- **Cache Management**: `clearDetail` for component unmounting

## Page Components

### CollectionPage

**File**: `src/app/mi-coleccion/[id]/page.tsx`

Main sticker collection interface with optimistic updates.

**Key Features:**

- Sticker grid with rarity-based gradients
- TENGO/QUIERO button interactions
- Real-time progress calculation with useMemo
- Sticky progress header
- Optimistic UI updates with error rollback

**State Management Pattern:**

```typescript
// Progress calculation
const progress = useMemo((): UserProgress => {
  // Calculate from current stickers state
  const totalStickers = stickers.length;
  const ownedUniqueStickers = stickers.filter(s => s.count > 0).length;
  // ... more calculations
  return { total_stickers, owned_unique_stickers, completion_percentage };
}, [stickers]);

// Optimistic updates
const updateStickerOwnership = async (stickerId: number) => {
  // 1. Immediate UI update
  setStickers(prev => prev.map(s =>
    s.id === stickerId ? { ...s, count: s.count + 1 } : s
  ));

  try {
    // 2. Server sync
    await supabase.from('user_stickers').upsert({...});
  } catch (error) {
    // 3. Revert on error
    fetchStickersAndCollection();
  }
};
```

### ProfilePage ✅ **COMPLETED & PERFECTED**

**File**: `src/app/profile/page.tsx`

User profile and collection management with **true zero-reload optimistic updates**.

**Key Features:**

- **Inline nickname editing** with keyboard shortcuts (Enter/Escape)
- **True optimistic collection management** (add/remove/activate) with zero page reloads
- **Click-to-navigate cards** - entire collection cards are clickable for seamless navigation
- **Active collection warning system** - orange alert when no active collection selected
- **Enhanced toast notifications** with context-aware messaging
- **Per-action loading states** for granular user feedback
- **Confirmation modals** for destructive actions with cascade delete warnings

**Perfected Optimistic Update Pattern:**

```typescript
const handleAction = async actionData => {
  // 1. Take snapshot for rollback
  const previousOwned = [...optimisticOwnedCollections];
  const previousAvailable = [...optimisticAvailableCollections];

  try {
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));

    // 2. Immediate optimistic update
    setOptimisticOwnedCollections(newState);
    setOptimisticAvailableCollections(newAvailableState);

    // 3. Show immediate user feedback
    showToast('Action completed successfully');

    // 4. Server sync (NO REFRESH NEEDED)
    await supabaseOperation();

    // Optimistic state IS the correct state
  } catch (error) {
    // 5. Rollback only on error
    setOptimisticOwnedCollections(previousOwned);
    setOptimisticAvailableCollections(previousAvailable);
    showToast('Error occurred', 'error');
  } finally {
    setActionLoading(prev => ({ ...prev, [actionKey]: false }));
  }
};
```

### FindTradersPage ✅ **NEW - PHASE 2**

**File**: `src/app/trades/find/page.tsx`

Main trading search interface with filtering and pagination.

**Key Features:**

- **Active-first collection preselection** with fallback logic
- **Zero-reload filtering** with debounced inputs and optimistic UI
- **Pagination controls** with loading states and result counts
- **Empty states** for no collections and no matches
- **Active collection warnings** consistent with profile patterns
- **Toast notifications** for search errors
- **Responsive grid layout** for match cards (1-3 columns based on screen size)

**State Management Pattern:**

```typescript
// Auto-select active collection
useEffect(() => {
  if (activeCollection) {
    setSelectedCollectionId(activeCollection.id);
  } else if (collections.length > 0) {
    setSelectedCollectionId(collections[0].id);
  }
}, [activeCollection, collections]);

// Search with filter/pagination reset
const handleFiltersChange = (newFilters: typeof filters) => {
  setFilters(newFilters);
  setCurrentPage(0); // Reset pagination
};
```

### FindTraderDetailPage ✅ **NEW - PHASE 2**

**File**: `src/app/trades/find/[userId]/page.tsx`

Detailed view for specific trading matches with back navigation.

**Key Features:**

- **Parameter validation** for userId and collectionId query params
- **Back navigation** with collection context preservation
- **User profile integration** with nickname fallback
- **Side-by-side sticker lists** using MatchDetail component
- **Disabled CTA preview** for future "Proponer intercambio" functionality
- **Error boundaries** with user-friendly error states

## Navigation Components

### SiteHeader

**File**: `src/components/site-header.tsx`

Main application navigation with responsive design.

**Features:**

- Dynamic navigation based on auth state
- Mobile hamburger menu
- Proper ARIA labels and roles
- Focus management
- Logout functionality

### NavLink

**File**: `src/components/nav-link.tsx`

Navigation link with active state detection.

```typescript
<NavLink href="/profile" className="custom-styles" onClick={closeMenu}>
  Profile
</NavLink>
```

**Features:**

- Special handling for home route (exact match only)
- Active state styling
- Click handler support for menu closing

## UI Components

### Base shadcn/ui Components

All standard shadcn/ui components are available:

- `Button` - With loading states and variants
- `Input` - Form inputs with validation styling
- `Badge` - Status indicators
- `Dialog` - Modal windows
- `Avatar` - User avatars with fallbacks
- `Progress` - Progress bars
- `Textarea` - Multi-line text inputs
- `Card` - Standard card layouts

### Custom UI Extensions

#### ModernCard

**File**: `src/components/ui/modern-card.tsx`

Enhanced card component for the sports card theme.

```typescript
<ModernCard className="bg-gradient-to-r from-teal-400 to-cyan-500">
  <ModernCardContent className="p-6">
    Content with hover effects and smooth transitions
  </ModernCardContent>
</ModernCard>
```

#### ConfirmModal

**File**: `src/components/ui/confirm-modal.tsx`

Reusable confirmation modal for destructive actions.

```typescript
<ConfirmModal
  open={confirmState.open}
  onOpenChange={setConfirmState}
  title="Eliminar colección"
  description={<span>¿Estás seguro? <strong>Esto no se puede deshacer</strong></span>}
  confirmText="Eliminar"
  cancelText="Cancelar"
  onConfirm={handleDelete}
  loading={deleteLoading}
  variant="destructive"
/>
```

## Form Components

### AuthForm Components

**File**: `src/components/AuthForm.tsx`

Comprehensive form component library for authentication flows.

```typescript
// Individual components
<FormContainer title="Iniciar Sesión" description="Accede a tu cuenta">
  <FormField
    id="email"
    label="Email"
    type="email"
    value={email}
    onChange={setEmail}
    error={emailError}
    required
  />

  <LoadingButton loading={isLoading} loadingText="Iniciando sesión...">
    Iniciar Sesión
  </LoadingButton>

  <ErrorAlert error={errorMessage} />
  <SuccessAlert message={successMessage} />
</FormContainer>
```

## Styling Patterns

### Gradient Design System

```css
/* Primary application gradients */
.bg-gradient-primary: from-teal-400 via-cyan-500 to-blue-600
.bg-gradient-success: from-green-400 to-green-500
.bg-gradient-warning: from-orange-400 to-orange-500
.bg-gradient-profile: from-blue-500 to-purple-600

/* Card header strips */
.bg-gradient-active: from-green-400 to-green-500
.bg-gradient-inactive: from-gray-400 to-gray-500
.bg-gradient-available: from-yellow-400 to-yellow-500

/* Trading-specific gradients */
.bg-gradient-trade-offer: from-green-500 to-green-600
.bg-gradient-trade-request: from-blue-500 to-blue-600
.bg-gradient-mutual-benefit: from-teal-500 to-cyan-500
```

### Rarity-Based Gradients

```typescript
function getRarityGradient(rarity: Sticker['rarity']) {
  switch (rarity) {
    case 'legendary':
      return 'from-yellow-400 to-orange-500';
    case 'epic':
      return 'from-purple-400 to-pink-500';
    case 'rare':
      return 'from-blue-400 to-cyan-500';
    case 'common':
      return 'from-gray-400 to-gray-500';
  }
}
```

### Enhanced Toast Notification System ✅ **PERFECTED**

Simple inline toast implementation for user feedback with context-aware messaging:

```typescript
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll('[data-toast]');
  existingToasts.forEach(toast => toast.remove());

  // Create and show toast
  const toast = document.createElement('div');
  toast.setAttribute('data-toast', 'true');
  toast.className = `fixed top-20 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white font-medium ${
    type === 'success' ? 'bg-green-500' : 'bg-red-500'
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => toast.remove(), 3000);
};

// Context-aware usage examples
showToast('"Mi Colección 2024" añadida a tus colecciones');
showToast('"Mi Colección 2024" eliminada. No tienes colección activa.');
showToast('Error al activar colección', 'error');
showToast('Error al buscar intercambios disponibles', 'error'); // NEW - Trading
```

## State Management Patterns

### Perfected Optimistic Updates with Rollback ✅ **ZERO-RELOAD GUARANTEE**

All user actions follow this pattern for immediate feedback with **zero page reloads**:

```typescript
const performAction = async actionData => {
  // 1. Take snapshot for potential rollback
  const snapshot = takeCurrentStateSnapshot();

  try {
    // 2. Apply optimistic update immediately
    updateUIImmediately(actionData);
    showToast('Action completed');

    // 3. Sync with server (NO REFRESH/RELOAD)
    await serverOperation(actionData);

    // Optimistic state is already correct - no additional updates needed
  } catch (error) {
    // 4. Rollback only on failure
    restoreFromSnapshot(snapshot);
    showToast('Action failed', 'error');
  }
};
```

### Advanced Snapshot-Based Caching

```typescript
// Cache management for complex optimistic updates
const takeSnapshot = useCallback(
  () => ({
    ownedCollections: [...ownedCollections],
    availableCollections: [...availableCollections],
    nickname,
    activeCollectionId,
  }),
  [ownedCollections, availableCollections, nickname, activeCollectionId]
);

const restoreSnapshot = useCallback(snapshot => {
  setOptimisticOwnedCollections(snapshot.ownedCollections);
  setOptimisticAvailableCollections(snapshot.availableCollections);
  setOptimisticNickname(snapshot.nickname);
}, []);
```

### Debounced Input Pattern ✅ **NEW - TRADING FILTERS**

For search inputs and filters to prevent excessive API calls:

```typescript
const [localFilters, setLocalFilters] = useState(filters);

// Debounced updates
useEffect(() => {
  const timeoutId = setTimeout(() => {
    onFiltersChange(localFilters);
  }, 500); // 500ms debounce

  return () => clearTimeout(timeoutId);
}, [localFilters, onFiltersChange]);

// Immediate UI updates, debounced server calls
const handleFilterUpdate = (key: string, value: string) => {
  setLocalFilters(prev => ({ ...prev, [key]: value }));
};
```

### Loading States

Per-action loading for granular user feedback:

```typescript
const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({});

const handleAction = async (actionId: string) => {
  const actionKey = `action-${actionId}`;

  try {
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    await performAction();
  } finally {
    setActionLoading(prev => ({ ...prev, [actionKey]: false }));
  }
};

// In render
<Button
  disabled={actionLoading[`action-${actionId}`]}
  loading={actionLoading[`action-${actionId}`]}
>
  {actionLoading[`action-${actionId}`] ? 'Procesando...' : 'Acción'}
</Button>
```

## Component Creation Guidelines

### TypeScript Interface Standards

```typescript
interface ComponentProps {
  // Required props first
  id: string;
  title: string;

  // Optional props with defaults
  variant?: 'primary' | 'secondary';
  className?: string;
  children?: React.ReactNode;

  // Event handlers
  onUpdate?: (data: UpdateData) => void;
  onClick?: () => void;
}
```

### Accessibility Requirements

- **Spanish language**: All user-facing text in Spanish
- **ARIA labels**: Proper labeling for screen readers
- **Keyboard navigation**: Tab order and keyboard shortcuts
- **Focus management**: Visible focus indicators
- **Semantic HTML**: Proper heading hierarchy and roles

### File Naming Conventions

- **Components**: PascalCase (`ProfilePage.tsx`, `CollectionsDropdown.tsx`, `FindTradersFilters.tsx`)
- **Utilities**: kebab-case (`nav-link.tsx`, `confirm-modal.tsx`)
- **Hooks**: camelCase with 'use' prefix (`useProfileData.ts`, `useFindTraders.ts`)

## Testing Considerations (Future Implementation)

### Priority Testing Areas

- **Optimistic updates**: Verify rollback behavior on server errors
- **Auth flows**: Login/logout state transitions
- **Form validation**: Error states and accessibility
- **Navigation**: Route protection and redirects
- **User interactions**: Button clicks, modal interactions
- **Trading RPC calls**: Mock Supabase functions for testing filter logic
- **Debounced inputs**: Verify search delay and cancellation

## Performance Optimization

### Current Optimizations

- **Memoization**: `useMemo` for expensive calculations (progress stats)
- **Callback stability**: `useCallback` for event handlers
- **Optimistic UI**: Zero perceived latency for user actions
- **Selective re-renders**: Proper dependency arrays
- **Debounced inputs**: 500ms debounce for search filters
- **Pagination**: Limit result sets to 20 items per page

### Future Improvements

- **Image optimization**: Lazy loading for sticker images
- **Virtual scrolling**: Large collection support
- **Code splitting**: Route-based component loading
- **Caching**: React Query for server state management
- **Trading result caching**: Local storage for recently searched users

## Debug Components

### Development Tools

- **SessionDebug**: Display current Supabase session (development only)
- **AuthTest**: Interactive auth testing component

These should be removed from production builds.

---

## Phase 2 Component Patterns ✅ **ESTABLISHED**

### New Patterns for Trading System

All Phase 2 trading components follow these established patterns:

1. **RPC-First Architecture**: Direct Supabase function calls without intermediate REST APIs
2. **Debounced Search Inputs**: 500ms debounce for all text-based filters
3. **Zero-Reload Interactions**: All filtering and pagination without page refreshes
4. **Bidirectional Data Display**: Clear "they offer" vs "I offer" visual separation
5. **Context-Aware Navigation**: Preserve collection context across page navigation
6. **Progressive Enhancement**: Works without JavaScript for basic functionality
7. **Spanish-First UX**: All UI text, error messages, and empty states in Spanish
8. **Active Collection Priority**: Always preselect user's active collection when available

These patterns extend the foundation from Phase 1 and should be used for all future trading features (proposals, chat, history).

---

## Component Checklist for New Features

When creating new components:

1. ✅ **TypeScript interfaces** defined for all props
2. ✅ **Spanish language** for all user-facing text
3. ✅ **Error boundaries** and proper error handling
4. ✅ **Loading states** for async operations
5. ✅ **Responsive design** with mobile-first approach
6. ✅ **Accessibility** features (ARIA, keyboard navigation)
7. ✅ **Consistent styling** following gradient design system
8. ✅ **Zero-reload optimistic updates** where applicable
9. ✅ **Context-aware user feedback** with appropriate toast messaging
10. ✅ **Snapshot-based error recovery** for complex state management
11. ✅ **Debounced inputs** for search/filter functionality (NEW)
12. ✅ **RPC integration** following established Supabase patterns (NEW)
