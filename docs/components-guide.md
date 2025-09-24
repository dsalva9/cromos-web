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

## Trading Components ✅ **ESTABLISHED & EXTENDED - PHASE 2**

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

### Trading Proposal Components ✅ **NEW - MVP COMPLETE**

### ProposalList & ProposalCard

**Files**: `src/components/trades/ProposalList.tsx`, `src/components/trades/ProposalCard.tsx`

Display proposal summaries with status indicators and action buttons.

```typescript
<ProposalList
  proposals={proposals}
  loading={loading}
  onProposalSelect={handleProposalSelect}
  emptyMessage="No tienes propuestas en esta sección"
/>

<ProposalCard
  proposal={proposal}
  onClick={() => onProposalSelect(proposal.id)}
/>
```

**ProposalList Features:**

- **Responsive Grid**: 1-3 columns based on screen size
- **Loading States**: Skeleton placeholders during data fetch
- **Empty States**: Contextual messages for inbox/outbox sections
- **Pagination Support**: Ready for future pagination implementation

**ProposalCard Features:**

- **Status Indicators**: Color-coded badges for pending/accepted/rejected/cancelled
- **User Information**: Avatar and nickname display
- **Proposal Summary**: Item counts for offers and requests
- **Timestamp Display**: Relative time formatting (e.g., "hace 2 horas")
- **Hover Effects**: Smooth transitions and visual feedback
- **Click Navigation**: Routes to proposal detail modal

### ProposalDetailModal

**File**: `src/components/trades/ProposalDetailModal.tsx`

Rich modal interface for viewing and responding to proposals.

```typescript
<ProposalDetailModal
  proposalId={selectedProposalId}
  open={modalOpen}
  onOpenChange={setModalOpen}
  onResponse={handleProposalResponse}
/>
```

**Key Features:**

- **Modal-Based Design**: Maintains context while viewing details
- **Complete Proposal View**: Shows all offer/request items with full sticker details
- **Action Buttons**: Accept, reject, cancel based on proposal status and user role
- **Loading States**: Handles async data loading within modal
- **Error Handling**: User-friendly error messages for failed operations
- **Responsive Layout**: Adapts to mobile and desktop screens
- **Status Display**: Clear indication of proposal status and timestamps
- **Message Display**: Shows optional message from proposal creator

**Modal Structure:**

```typescript
// Header with user info and status
<ModalHeader>
  <UserAvatar nickname={proposal.from_user_nickname} />
  <StatusBadge status={proposal.status} />
  <TimestampDisplay createdAt={proposal.created_at} />
</ModalHeader>

// Body with offer/request sections
<ModalBody>
  <StickerItemsList
    title="Te ofrece"
    items={proposal.offer_items}
    variant="offer"
  />
  <StickerItemsList
    title="Te pide"
    items={proposal.request_items}
    variant="request"
  />
</ModalBody>

// Footer with action buttons
<ModalFooter>
  <ActionButtons
    status={proposal.status}
    canRespond={canUserRespond}
    onAccept={handleAccept}
    onReject={handleReject}
    onCancel={handleCancel}
  />
</ModalFooter>
```

### StickerSelector

**File**: `src/components/trades/StickerSelector.tsx`

Multi-select interface for building proposals with offer/request sections.

```typescript
<StickerSelector
  userStickers={availableStickers}
  selectedOfferItems={selectedOffers}
  selectedRequestItems={selectedRequests}
  onOfferItemsChange={setSelectedOffers}
  onRequestItemsChange={setSelectedRequests}
  otherUserStickers={targetUserStickers}
  loading={loading}
/>
```

**Key Features:**

- **Dual-Section Layout**: Separate "Ofrecer" and "Pedir" sections
- **Multi-Select Functionality**: Toggle stickers in/out of proposal
- **Visual Feedback**: Selected items highlighted with checkmarks
- **Sticker Details**: Full sticker information with rarity colors
- **Smart Filtering**: Only shows relevant stickers for each section
- **Selection Counts**: Real-time count of selected items
- **Responsive Grid**: Adapts grid columns to screen size
- **Search Integration**: Works with parent component search/filter

**Selection Logic:**

```typescript
// Offer section: Show stickers user owns (count > 0)
const availableOffers = userStickers.filter(s => s.count > 0);

// Request section: Show stickers other user owns that current user wants
const availableRequests = otherUserStickers.filter(
  s => s.count > 0 && userWantsList.includes(s.id)
);
```

### ProposalSummary

**File**: `src/components/trades/ProposalSummary.tsx`

Preview component showing proposal contents before sending.

```typescript
<ProposalSummary
  offerItems={selectedOfferItems}
  requestItems={selectedRequestItems}
  targetUserNickname={targetUserNickname}
  message={proposalMessage}
  onMessageChange={setProposalMessage}
  onSubmit={handleCreateProposal}
  loading={submitting}
/>
```

**Key Features:**

- **Proposal Preview**: Shows exactly what will be sent
- **Message Input**: Optional message field with character limit
- **Item Counts**: Clear summary of offer/request totals
- **Validation Feedback**: Prevents submission of invalid proposals
- **Loading States**: Handles async proposal creation
- **Success Feedback**: Integration with toast notification system

**Validation Rules:**

```typescript
const isValidProposal =
  selectedOfferItems.length > 0 &&
  selectedRequestItems.length > 0 &&
  message.trim().length <= 500;
```

## Trading Hooks ✅ **COMPREHENSIVE TRADING STATE MANAGEMENT**

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

### useProposals ✅ **NEW - PROPOSAL MANAGEMENT**

**File**: `src/hooks/trades/useProposals.ts`

Manages inbox/outbox proposal lists with pagination and real-time updates.

```typescript
const { proposals, loading, error, hasMore, fetchProposals, refreshProposals } =
  useProposals();

// Usage
await fetchProposals({
  userId: user.id,
  box: 'inbox', // or 'outbox'
  limit: 20,
  offset: 0,
});
```

**Key Features:**

- **Dual Mode Support**: Handles both inbox and outbox proposal lists
- **Pagination Ready**: Offset-based pagination for large proposal lists
- **Real-time Refresh**: Manual refresh capability for immediate updates
- **Error Recovery**: Comprehensive error handling with user feedback
- **Optimistic Updates**: Immediate UI updates for proposal responses

### useCreateProposal ✅ **NEW - PROPOSAL CREATION**

**File**: `src/hooks/trades/useCreateProposal.ts`

Handles proposal creation workflow with validation and error handling.

```typescript
const { createProposal, loading, error, success } = useCreateProposal();

// Usage
await createProposal({
  collectionId: selectedCollectionId,
  toUserId: targetUserId,
  message: optionalMessage,
  offerItems: selectedOfferItems,
  requestItems: selectedRequestItems,
});
```

**Key Features:**

- **RPC Integration**: Calls `create_trade_proposal` Supabase function
- **Validation Logic**: Client-side validation before server submission
- **Error Handling**: Comprehensive error messaging for all failure scenarios
- **Success Feedback**: Integration with toast notification system
- **Loading States**: Granular loading during proposal creation

### useRespondToProposal ✅ **NEW - PROPOSAL RESPONSES**

**File**: `src/hooks/trades/useRespondToProposal.ts`

Manages proposal responses (accept/reject/cancel) with optimistic updates.

```typescript
const { respondToProposal, loading, error } = useRespondToProposal();

// Usage
await respondToProposal({
  proposalId: selectedProposal.id,
  action: 'accept', // 'accept' | 'reject' | 'cancel'
});
```

**Key Features:**

- **Action Validation**: Ensures user can perform requested action based on role and status
- **Optimistic Updates**: Immediate UI feedback before server confirmation
- **RPC Integration**: Calls `respond_to_trade_proposal` Supabase function
- **Error Recovery**: Rollback mechanism for failed responses
- **Toast Integration**: Contextual success/error messaging

### useProposalDetail ✅ **NEW - DETAILED PROPOSAL VIEW**

**File**: `src/hooks/trades/useProposalDetail.ts`

Fetches detailed proposal information with all items and metadata.

```typescript
const { proposal, loading, error, fetchDetail, clearDetail } =
  useProposalDetail();

// Usage
await fetchDetail(proposalId);
```

**Key Features:**

- **Complete Data Fetching**: Retrieves full proposal with all offer/request items
- **RPC Integration**: Calls `get_trade_proposal_detail` Supabase function
- **Cache Management**: Smart caching with manual clear capability
- **Error Handling**: User-friendly error states for failed fetches
- **Type Safety**: Returns fully typed `TradeProposalDetail` objects

**Proposal Detail Structure:**

```typescript
interface TradeProposalDetail {
  id: number;
  from_user_id: string;
  to_user_id: string;
  from_user_nickname: string | null;
  to_user_nickname: string | null;
  collection_id: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  message: string | null;
  created_at: string;
  updated_at: string;
  offer_items: TradeProposalDetailItem[];
  request_items: TradeProposalDetailItem[];
}
```

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

### FindTradersPage ✅ **COMPLETED - PHASE 2**

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

### FindTraderDetailPage ✅ **COMPLETED - PHASE 2**

**File**: `src/app/trades/find/[userId]/page.tsx`

Detailed view for specific trading matches with back navigation and proposal creation.

**Key Features:**

- **Parameter validation** for userId and collectionId query params
- **Back navigation** with collection context preservation
- **User profile integration** with nickname fallback
- **Side-by-side sticker lists** using MatchDetail component
- **Proposal creation CTA** with seamless navigation to composer
- **Error boundaries** with user-friendly error states

### ProposalsDashboardPage ✅ **NEW - MVP COMPLETE**

**File**: `src/app/trades/proposals/page.tsx`

Comprehensive proposal management dashboard with inbox/outbox functionality.

**Key Features:**

- **Tab-based Navigation**: Clean separation between "Recibidas" (inbox) and "Enviadas" (outbox)
- **Real-time Updates**: Fresh proposal lists with refresh capability
- **Status Filtering**: Visual indicators for all proposal statuses
- **Empty States**: Contextual messaging for empty inbox/outbox
- **Responsive Design**: Mobile-optimized tab switching and card layout
- **Loading States**: Skeleton placeholders during data fetch
- **Error Recovery**: User-friendly error handling with retry options

**State Management Pattern:**

```typescript
// Tab switching with state preservation
const [activeTab, setActiveTab] = useState<'inbox' | 'outbox'>('inbox');
const [selectedProposal, setSelectedProposal] = useState<number | null>(null);

// Separate data management for each tab
const inboxProposals = useProposals({ box: 'inbox' });
const outboxProposals = useProposals({ box: 'outbox' });

// Modal integration
const handleProposalSelect = (proposalId: number) => {
  setSelectedProposal(proposalId);
  setModalOpen(true);
};
```

### ProposalComposerPage ✅ **NEW - MVP COMPLETE**

**File**: `src/app/trades/compose/page.tsx`

Proposal creation interface with multi-sticker selection and preview.

**Key Features:**

- **URL Parameter Integration**: Accepts `userId` and `collectionId` from find traders flow
- **Multi-Step Workflow**: Sticker selection → summary/preview → submission
- **Validation Logic**: Prevents invalid proposals with clear error messages
- **Context Preservation**: Maintains target user and collection context throughout
- **Back Navigation**: Returns to find traders detail with context preserved
- **Success Flow**: Redirects to proposals dashboard after successful creation

**Component Integration:**

```typescript
// Main composer workflow
<div className="composer-container">
  <UserContextHeader targetUser={targetUser} collection={collection} />

  <StickerSelector
    userStickers={myStickers}
    otherUserStickers={theirStickers}
    selectedOfferItems={offerItems}
    selectedRequestItems={requestItems}
    onOfferItemsChange={setOfferItems}
    onRequestItemsChange={setRequestItems}
  />

  <ProposalSummary
    offerItems={offerItems}
    requestItems={requestItems}
    targetUserNickname={targetUser.nickname}
    message={message}
    onMessageChange={setMessage}
    onSubmit={handleCreateProposal}
    loading={creating}
  />
</div>
```

## Navigation Components

### SiteHeader

**File**: `src/components/site-header.tsx`

Main application navigation with responsive design and trading integration.

**Enhanced Features:**

- Dynamic navigation based on auth state
- **Trading navigation items** for authenticated users
- Mobile hamburger menu with trading routes
- Proper ARIA labels and roles
- Focus management
- Logout functionality

**Updated Navigation Structure:**

```typescript
const navigationItems = [
  { href: '/mi-coleccion', label: 'Mi Colección' },
  { href: '/trades/find', label: 'Buscar Intercambios' }, // NEW
  { href: '/trades/proposals', label: 'Mis Propuestas' }, // NEW
  { href: '/profile', label: 'Perfil' },
];
```

### NavLink

**File**: `src/components/nav-link.tsx`

Navigation link with active state detection and trading route support.

```typescript
<NavLink href="/trades/proposals" className="custom-styles" onClick={closeMenu}>
  Mis Propuestas
</NavLink>
```

**Enhanced Features:**

- Special handling for home route (exact match only)
- **Trading route active state detection**
- Active state styling with gradient support
- Click handler support for menu closing

## UI Components

### Base shadcn/ui Components

All standard shadcn/ui components are available with trading-specific enhancements:

- `Button` - With loading states and variants (enhanced for proposal actions)
- `Input` - Form inputs with validation styling (enhanced for search/filters)
- `Badge` - Status indicators (enhanced for proposal statuses)
- `Dialog` - Modal windows (enhanced for proposal details)
- `Avatar` - User avatars with fallbacks
- `Progress` - Progress bars
- `Textarea` - Multi-line text inputs (enhanced for proposal messages)
- `Card` - Standard card layouts (enhanced for proposals)

### Custom UI Extensions

#### ModernCard

**File**: `src/components/ui/modern-card.tsx`

Enhanced card component for the sports card theme with trading support.

```typescript
<ModernCard className="bg-gradient-to-r from-teal-400 to-cyan-500">
  <ModernCardContent className="p-6">
    Content with hover effects and smooth transitions
  </ModernCardContent>
</ModernCard>
```

**Enhanced Features:**

- **Proposal card variants** with status-based styling
- **Interactive hover states** for clickable proposal cards
- **Loading placeholders** for async content

#### ConfirmModal

**File**: `src/components/ui/confirm-modal.tsx`

Reusable confirmation modal for destructive actions with trading support.

```typescript
<ConfirmModal
  open={confirmState.open}
  onOpenChange={setConfirmState}
  title="Rechazar propuesta"
  description={<span>¿Estás seguro? <strong>Esta acción no se puede deshacer</strong></span>}
  confirmText="Rechazar"
  cancelText="Cancelar"
  onConfirm={handleReject}
  loading={rejecting}
  variant="destructive"
/>
```

**Enhanced Features:**

- **Trading action variants** for proposal responses
- **Multi-context support** for different destructive actions
- **Loading state management** during async operations

## Form Components

### AuthForm Components

**File**: `src/components/AuthForm.tsx`

Comprehensive form component library for authentication flows with trading context.

```typescript
// Individual components with trading integration
<FormContainer title="Iniciar Sesión" description="Accede a tu cuenta de intercambios">
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

/* NEW - Proposal status gradients */
.bg-gradient-pending: from-yellow-400 to-yellow-500
.bg-gradient-accepted: from-green-400 to-green-500
.bg-gradient-rejected: from-red-400 to-red-500
.bg-gradient-cancelled: from-gray-400 to-gray-500
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

### Enhanced Toast Notification System ✅ **EXTENDED FOR TRADING**

Simple inline toast implementation for user feedback with trading-specific messaging:

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

// Enhanced usage examples for trading
showToast('Propuesta enviada correctamente'); // Proposal creation
showToast('Propuesta aceptada'); // Proposal acceptance
showToast('Propuesta rechazada'); // Proposal rejection
showToast('Propuesta cancelada'); // Proposal cancellation
showToast('Error al enviar propuesta', 'error'); // Creation failure
showToast('Error al responder propuesta', 'error'); // Response failure
```

## State Management Patterns

### Perfected Optimistic Updates with Rollback ✅ **EXTENDED TO TRADING**

All user actions follow this pattern for immediate feedback with **zero page reloads**:

```typescript
const performTradingAction = async actionData => {
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

### Advanced Snapshot-Based Caching ✅ **ENHANCED FOR PROPOSALS**

```typescript
// Cache management for complex proposal operations
const takeProposalSnapshot = useCallback(
  () => ({
    proposals: [...proposals],
    selectedProposal: selectedProposal,
    modalState: { ...modalState },
    filterState: { ...filterState },
  }),
  [proposals, selectedProposal, modalState, filterState]
);

const restoreProposalSnapshot = useCallback(snapshot => {
  setProposals(snapshot.proposals);
  setSelectedProposal(snapshot.selectedProposal);
  setModalState(snapshot.modalState);
  setFilterState(snapshot.filterState);
}, []);
```

### Debounced Input Pattern ✅ **ESTABLISHED - TRADING FILTERS**

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

### Modal State Management ✅ **NEW - PROPOSAL MODALS**

Comprehensive modal state management for proposal workflows:

```typescript
// Modal state management
const [modalState, setModalState] = useState({
  detailModal: { open: false, proposalId: null },
  confirmModal: { open: false, action: null, proposalId: null },
});

// Modal actions
const openProposalDetail = (proposalId: number) => {
  setModalState(prev => ({
    ...prev,
    detailModal: { open: true, proposalId },
  }));
};

const confirmProposalAction = (action: string, proposalId: number) => {
  setModalState(prev => ({
    ...prev,
    confirmModal: { open: true, action, proposalId },
  }));
};

// Clean modal closure
const closeAllModals = () => {
  setModalState({
    detailModal: { open: false, proposalId: null },
    confirmModal: { open: false, action: null, proposalId: null },
  });
};
```

### Loading States ✅ **ENHANCED FOR TRADING OPERATIONS**

Per-action loading for granular user feedback:

```typescript
const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({});

const handleTradingAction = async (actionId: string, actionType: string) => {
  const actionKey = `${actionType}-${actionId}`;

  try {
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    await performTradingAction();
  } finally {
    setActionLoading(prev => ({ ...prev, [actionKey]: false }));
  }
};

// In render
<Button
  disabled={actionLoading[`accept-${proposalId}`]}
  loading={actionLoading[`accept-${proposalId}`]}
>
  {actionLoading[`accept-${proposalId}`] ? 'Aceptando...' : 'Aceptar'}
</Button>
```

## Component Creation Guidelines

### TypeScript Interface Standards ✅ **EXTENDED FOR TRADING**

```typescript
interface TradingComponentProps {
  // Required props first
  proposalId: number;
  userId: string;

  // Optional props with defaults
  variant?: 'inbox' | 'outbox';
  showActions?: boolean;
  className?: string;
  children?: React.ReactNode;

  // Event handlers
  onProposalSelect?: (proposalId: number) => void;
  onProposalResponse?: (proposalId: number, action: string) => void;
  onError?: (error: string) => void;
}
```

### Accessibility Requirements ✅ **EXTENDED FOR TRADING WORKFLOWS**

- **Spanish language**: All user-facing text in Spanish
- **ARIA labels**: Proper labeling for screen readers, especially for complex trading interfaces
- **Keyboard navigation**: Tab order and keyboard shortcuts for proposal management
- **Focus management**: Visible focus indicators, especially in modals
- **Semantic HTML**: Proper heading hierarchy and roles for trading content
- **Screen reader support**: Descriptive text for proposal statuses and actions

### File Naming Conventions

- **Components**: PascalCase (`ProposalDetailModal.tsx`, `StickerSelector.tsx`)
- **Utilities**: kebab-case (`nav-link.tsx`, `confirm-modal.tsx`)
- **Hooks**: camelCase with 'use' prefix (`useProposals.ts`, `useCreateProposal.ts`)
- **Pages**: PascalCase for page components (`ProposalsDashboardPage.tsx`)

## Testing Considerations (Future Implementation)

### Priority Testing Areas ✅ **EXTENDED FOR TRADING**

- **Optimistic updates**: Verify rollback behavior on server errors
- **Auth flows**: Login/logout state transitions
- **Form validation**: Error states and accessibility
- **Navigation**: Route protection and redirects
- **User interactions**: Button clicks, modal interactions
- **Trading RPC calls**: Mock Supabase functions for testing filter logic
- **Debounced inputs**: Verify search delay and cancellation
- **Proposal workflows**: End-to-end testing for proposal creation, response, and management
- **Modal interactions**: Focus management and keyboard navigation in modals
- **State management**: Verify optimistic updates and rollback for proposal actions

## Performance Optimization

### Current Optimizations ✅ **ENHANCED FOR TRADING**

- **Memoization**: `useMemo` for expensive calculations (progress stats, proposal filtering)
- **Callback stability**: `useCallback` for event handlers
- **Optimistic UI**: Zero perceived latency for user actions
- **Selective re-renders**: Proper dependency arrays
- **Debounced inputs**: 500ms debounce for search filters
- **Pagination**: Limit result sets to 20 items per page
- **Modal optimization**: Lazy loading of proposal details
- **Component splitting**: Separate components for different proposal states

### Future Improvements

- **Image optimization**: Lazy loading for sticker images
- **Virtual scrolling**: Large collection support
- **Code splitting**: Route-based component loading
- **Caching**: React Query for server state management
- **Trading result caching**: Local storage for recently searched users
- **Proposal caching**: Cache proposal lists for faster navigation
- **Real-time updates**: Supabase Realtime for live proposal updates

## Debug Components

### Development Tools

- **SessionDebug**: Display current Supabase session (development only)
- **AuthTest**: Interactive auth testing component
- **ProposalDebug**: Display proposal state and RPC responses (development only)

These should be removed from production builds.

---

## Phase 2 Component Patterns ✅ **FULLY ESTABLISHED**

### Comprehensive Trading Component Architecture

All Phase 2 trading components follow these established patterns:

1. **RPC-First Architecture**: Direct Supabase function calls without intermediate REST APIs
2. **Debounced Search Inputs**: 500ms debounce for all text-based filters
3. **Zero-Reload Interactions**: All filtering, pagination, and proposal management without page refreshes
4. **Modal-Based Detail Views**: Rich modals for detailed interactions while preserving context
5. **Optimistic State Management**: Immediate UI updates with rollback on errors
6. **Context-Aware Navigation**: Preserve collection and user context across page navigation
7. **Progressive Enhancement**: Works without JavaScript for basic functionality
8. **Spanish-First UX**: All UI text, error messages, and empty states in Spanish
9. **Active Collection Priority**: Always preselect user's active collection when available
10. **Comprehensive Error Handling**: User-friendly error states with recovery options

### Trading-Specific Patterns ✅ **NEW ARCHITECTURAL PATTERNS**

11. **Proposal Lifecycle Management**: Complete workflow from creation to response with state tracking
12. **Multi-Sticker Selection**: Complex selection interfaces supporting bulk operations
13. **Bidirectional Data Display**: Clear "offer" vs "request" visual separation throughout
14. **Status-Based UI**: Dynamic interfaces that adapt to proposal and user status
15. **Modal State Coordination**: Multiple modal types working together without conflicts
16. **RPC Security Integration**: All operations protected by SECURITY DEFINER functions
17. **Toast Integration**: Contextual feedback for all trading actions
18. **Responsive Trading UI**: Mobile-optimized interfaces for complex trading workflows

These patterns extend the foundation from Phase 1 and establish the architectural principles for all future trading features (chat, history, advanced proposals).

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
11. ✅ **Debounced inputs** for search/filter functionality
12. ✅ **RPC integration** following established Supabase patterns
13. ✅ **Modal state management** for complex UI workflows (NEW)
14. ✅ **Proposal lifecycle integration** for trading features (NEW)
15. ✅ **Status-based conditional rendering** for dynamic interfaces (NEW)

---

## Architecture Success Metrics

### Component Reusability ✅ **ACHIEVED**

- Trading components follow established patterns from profile system
- Consistent state management across all features
- Reusable UI patterns for similar workflows

### Performance Optimization ✅ **ACHIEVED**

- Zero-reload interactions maintained across complex trading workflows
- Efficient RPC-based data fetching
- Optimized modal rendering and state management

### User Experience Excellence ✅ **ACHIEVED**

- Intuitive trading workflows with clear visual feedback
- Comprehensive error handling and recovery
- Mobile-optimized responsive design throughout

### Developer Experience ✅ **ACHIEVED**

- Comprehensive TypeScript coverage
- Clear component boundaries and responsibilities
- Extensive documentation and patterns for future development

**Phase 2 Component Architecture Status**: ✅ **COMPLETE AND PRODUCTION-READY**
