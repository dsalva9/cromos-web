# Components Architecture Guide

This document outlines the component structure and patterns used in the CambioCromos application.

---

## UI Redesign: Retro-Comic Theme (v1.4.1) ✅ **COMPLETE**

The application has been fully redesigned with a bold, high-contrast, retro-comic sticker aesthetic. This theme is applied across **all** user-facing pages, navigation, and components.

### Core Theme Principles

- **Background**: A solid, deep charcoal/navy is used for all main page backgrounds (`bg-[#1F2937]`).
- **Typography**: Major titles are bold, condensed, and `uppercase` (`text-4xl font-extrabold uppercase text-white`).
- **Borders & Shadows**: Components feature thick, black borders and pronounced shadows for a chunky, physical feel (`border-2 border-black shadow-xl`).
- **Rounding**: Corner rounding is reduced to `rounded-lg` or `rounded-md` for a blockier, sticker-like appearance.

### Theme Colors

- **Primary Accent (Gold/Yellow)**: `#FFC000` (`bg-[#FFC000]`). Used for primary actions (`TENGO`, `Hacer Activa`), active states, and highlighted stats.
- **Secondary Accent (Red)**: `#E84D4D` (`bg-[#E84D4D]`). Used for duplicate (`REPE`) indicators, removal actions (`Eliminar`), and rejection states.
- **Dark Backgrounds**: `bg-gray-800` for cards and `bg-gray-900` for sticky navigation elements.

### Styled Page Examples (v1.4.1 - Complete Rollout)

All pages now follow the Retro-Comic theme:

- **Home Page (`/`)**: Hero section and features with themed cards and buttons
- **Authentication Pages (`/login`, `/signup`)**: Dark theme with gold logo and card styling
- **Navigation**: SiteHeader and SiteFooter with consistent dark theme and gold accents
- **Profile Page (`/profile`)**: User management with themed cards and gold/red buttons
- **Collection Pages (`/mi-coleccion`, `/mi-coleccion/[id]`)**: Album view with gold progress bars and tabs
- **Trading Pages**:
  - **Find Traders (`/trades/find`)**: Dark page with themed filters and match cards (links directly to composer)
  - **Proposals Dashboard (`/trades/proposals`)**: Tab interface with gold active states, unread badges
  - **Proposal Composer (`/trades/compose`)**: Multi-sticker selection with themed summary

---

This document outlines the component structure and patterns used in the CambioCromos application.

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

### Sticker Images & Placeholders

Sticker images are managed through Supabase Storage and rendered using `next/image` for optimal performance and accessibility.

#### Database & URL Resolution

- **DB Schema**: The `stickers` table contains `thumb_path_webp_100` (for 100px thumbnails) and `image_path_webp_300` (for 300px detail images).
- **Client-side Resolution**: The client is responsible for resolving these paths into public URLs using `supabase.storage.from('sticker-images').getPublicUrl(path)`.

#### Usage Strategy

- **Grids (e.g., `CollectionPage`)**: Always use the `thumb_path_webp_100` to minimize initial load times.
- **Detail Views (e.g., Modals, Detail Pages)**: Use the `image_path_webp_300` for a higher-quality view.

#### Fallback Chain & Layout Shift

A graceful fallback chain prevents missing images and layout shifts:

1.  **`thumb_public_url`**: The primary source for grid images.
2.  **`image_public_url`**: If the thumbnail is missing, fall back to the full-size image.
3.  **`image_url`**: If storage paths are missing, fall back to the original external URL.
4.  **Initials Placeholder**: If all image sources fail, a non-image placeholder with the player's initial is rendered inside the card's aspect-ratio container, preventing any layout shift.

#### Performance: `sizes` and `priority`

- **`sizes`**: The `sizes` prop should be used on all grid-based images to help the browser select the most efficient image from the `srcset`. A good default for our responsive grid is `"(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"`.
- **`priority`**: The `priority` prop should be applied to images that are "above the fold" on initial page load (e.g., the first 6-12 images in `CollectionPage`) to signal the browser to preload them.

#### Accessibility: ALT Text Policy

A consistent and deterministic ALT text policy is enforced:

- **Player/Sticker Card**: `alt="{playerName} - {teamName}"` (e.g., `alt="Lionel Messi - Inter Miami CF"`)
- **Team Badge/Crest Slot**: `alt="Escudo del {teamName}"`
- **Manager Slot**: `alt="Entrenador de {teamName}"`
- **Special Themed Sticker**: `alt="{specialPageTitle} - {stickerName}"`
- **Empty Special Slot**: `alt="{specialPageTitle} - pendiente"`

This ensures screen readers provide useful, predictable context for all images.

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

- **Smart visibility**: Auto-hides cuando el usuario tiene 1 coleccion o menos
- **Keyboard accessibility**: Enter/Space key navigation with proper ARIA roles
- **Visual state indicators en el listado**:
  - "Activa" badge dentro del panel para marcar la coleccion activa
  - "Actual" badge para indicar la coleccion actualmente abierta
  - Blue highlight for current selection
- **Trigger layout**: El boton principal deja la insignia "Activa" al contenedor padre para alinear badge y dropdown.
- **Flexible navigation**: Optional `onSelect` prop, defaults to direct routing
- **Responsive design**: Fixed-width dropdown (320px) with scroll for many collections
- **Backdrop interaction**: Click outside to close

### StickerCard (inline)

**File**: `src/app/mi-coleccion/[id]/page.tsx`

Renderiza los controles principales de cada cromo dentro de `CollectionPage`.

**Detalles clave:**

- Boton principal `Tengo` permanece blanco en `count = 0`, se vuelve verde en `count = 1` y muta a `Repe (n)` cuando `count >= 2`.
- Boton ghost `-` (aria-label/title: "Quitar uno") aparece con `count > 0` para restar inventario sin caer por debajo de cero.
- Ambos botones usan actualizaciones optimistas con snapshots y `toast.error` para revertir en caso de fallo de Supabase.
- La insignia `+n` mantiene visible la cantidad de repes disponibles en la tarjeta.

### EmptyCollectionState

**File**: `src/components/collection/EmptyCollectionState.tsx`

Full-screen empty state component for users without collections.

```typescript
<EmptyCollectionState /> // Self-contained with no props
```

**Features:**

- **Full-screen layout**: Takes entire viewport with centered content
- **Contextual messaging**:
  - Welcome message "¡Bienvenido a CambioCromos!"
  - Clear explanation of next steps
  - Friendly onboarding tone in Spanish
- **Direct CTA**: "Seguir una Colección" button routes to `/profile`
- **Visual hierarchy**: Trophy icon, headings, and descriptive text
- **Theme consistency**: Uses app's gradient background and modern card styling
- **Responsive spacing**: Proper padding and max-width constraints

## Album Components (v1.3.0)

### AlbumSummaryHeader

**File**: `src/components/album/AlbumSummaryHeader.tsx`

The main sticky header in the album view, updated to the new dark theme.

**Styling:**

- **Container**: `sticky top-16 z-40 bg-gray-800 py-4 border-b border-gray-700`.
- **Title**: `text-3xl font-extrabold uppercase`.
- **Stats Bar**: No longer uses pills. It's now a series of `font-bold` text elements where numbers are highlighted in the primary accent color (`text-[#FFC000]`).
- **Collection Switcher**: The `<select>` element is styled to match the dark theme: `bg-gray-900 text-white border-2 border-black rounded-full`.

### AlbumPager

**File**: `src/components/album/AlbumPager.tsx`

The sticky, horizontal navigation for album pages (teams and special sections).

**Styling:**

- **Container**: `sticky top-32 z-30 bg-gray-900 border-y border-gray-700`. It is positioned below the `AlbumSummaryHeader`.
- **Active Tab**: Uses the primary accent color for a high-contrast look: `bg-[#FFC000] text-gray-900 font-extrabold`.
- **Inactive Tab**: Dark and subtle: `bg-gray-800 text-gray-300 border border-gray-700`.

### PageHeader

**File**: `src/components/album/PageHeader.tsx`

Displays the title, progress, and completion actions for the current album page (e.g., "ATHLETIC CLUB").

**Props:**

- `page: AlbumPageData` - Current page data
- `onMarkPageComplete?: (pageId: number) => Promise<void>` - Callback to mark all missing stickers as owned

**Features:**

**Desktop (≥ md):**

- Displays page title and progress bar
- Shows "Marcar equipo completo" button when:
  - Page is a team page (`kind === 'team'`)
  - Has missing stickers (`missing > 0`)
  - `onMarkPageComplete` callback is provided
- Button opens confirmation dialog before completing
- Green button styling for positive action

**Mobile (< md):**

- Long-press on title area (600ms) opens ActionSheet
- Overflow menu button (⋯) provides discoverable alternative
- ActionSheet (bottom sheet) with:
  - Team name and missing count
  - "Marcar todo el equipo como completado" primary action
  - "Cancelar" secondary action
- Visual feedback during long-press (opacity change)

**Accessibility:**

- Long-press area supports keyboard navigation (Enter/Space)
- Proper ARIA labels for screen readers
- Focus management in dialogs
- Disabled states when page is already complete

**Behavior:**

- Calls `onMarkPageComplete(pageId)` from hook
- Optimistic UI updates for instant feedback
- Success toast: "Equipo completado ✔️"
- Error toast: "No se pudo completar el equipo."
- Idempotent: re-running shows "Ya estaba completo"

**Styling:**

- **Container**: Sticky bottom bar with backdrop blur (`sticky bottom-0 z-20 bg-gray-900/80 backdrop-blur-sm`)
- **Title**: `text-xl md:text-2xl font-extrabold uppercase text-white`
- **Progress Bar**: Dark track (`bg-gray-600`)
- **Complete Button**: Green primary (`bg-green-600 hover:bg-green-700`)
- **ActionSheet**: Rounded top corners, drag handle indicator

### useAlbumPages

**File**: `src/hooks/album/useAlbumPages.ts`

Orchestrates all data fetching and state management for the album view.

**Key Features:**

- Fetches all `collection_pages` for a given collection.
- Fetches the content (`page_slots` and `stickers`) for a specific page.
- Fetches the user's ownership data (`user_stickers`) for the current page's stickers.
- Merges page slot data with user ownership to provide a complete view.
- Handles default page logic: if no `page` is in the URL query, it loads the first page.
- Manages loading and error states for the album view.
- Provides action handlers (`markStickerOwned`, `reduceStickerOwned`) for optimistic updates.
- Returns `pages`, `currentPage`, `loading`, `error`, and the action handlers.

### AlbumPageGrid

**File**: `src/components/album/AlbumPageGrid.tsx`

Renders the grid of stickers for a given page.

**Props:**

- `page: AlbumPageData`

**Features:**

- Renders exactly 20 slots for `team` pages to ensure layout consistency.
- Renders a variable number of slots for `special` pages based on data.
- Maps over slots and renders a `StickerTile` for each.
- Marks above-the-fold images as `priority` for `next/image`.

### StickerTile

**File**: `src/components/album/StickerTile.tsx`

Renders an individual sticker slot in the album.

**Props:**

- `slot: PageSlot`
- `pageKind: 'team' | 'special'`
- `isPriority: boolean`

**Styling:**

- **Container**: `aspect-[3/4] w-full relative rounded-lg overflow-hidden bg-gray-800 border-2 border-black shadow-xl`.
- **Badges**: Duplicates render a red `REPE` chip; owned singles render a green checkmark badge.
- **Player Info Overlay**: A dark gradient at the bottom displays the player name: `bg-gradient-to-t from-black/80 to-transparent`.
- **Action Buttons**:
  - **Layout**: Buttons sit in a stacked `flex flex-col space-y-1` wrapper.
  - **Add (`TENGO` / `REPE`)**: Primary button toggles between `TENGO` and `REPE (+n)` with gold styling when owned.
  - **Remove (`-`)**: Outline button appears only when the user owns the sticker and decrements the count.
  - **Missing (`FALTAN`) state**: Zero owned count automatically marks the sticker as missing; there is no separate want toggle or badge.
- **Placeholder**: For empty slots, a dashed border container is used: `bg-gray-900/50 border-2 border-dashed border-gray-700 rounded-lg`.
  - **Mode-aware Labeling**: `mode="offer"` muestra "Tus duplicados"; `mode="request"` resalta duplicados del otro coleccionista.

## Profile & Collection Cards

The `ModernCard` component is used extensively on the `/profile` page and the non-album `/mi-coleccion` grid view. It follows the same core styling as `StickerTile`.

- **Container**: `bg-gray-800 border-2 border-black rounded-lg shadow-xl`.
- **Action Buttons**: Use the primary (`#FFC000`) and secondary (`#E84D4D`) accent colors for actions like "Hacer Activa" and "Eliminar".
- **Badges**: The "Activa" and "Nueva" badges also use the new high-contrast style (`bg-[#FFC000] text-gray-900 font-extrabold border-2 border-black`).

---

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
- **Full-Card Link**: Entire card is a focusable link with hover/focus states instead of a secondary button
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
- **QuantityStepper Integration**: Uses shared +/- control with duplicate-aware clamping and disabled state at max=0
- **Visual Feedback**: Selected items highlighted with checkmarks
- **Sticker Details**: Full sticker information with rarity colors
- **Smart Filtering**: Only shows relevant stickers for each section
- **Selection Counts**: Real-time count of selected items
- **Responsive Grid**: Adapts grid columns to screen size
- **Search Integration**: Works with parent component search/filter

**Selection Logic:**

```typescript
// Offer section: trade only duplicates (count - 1) the user still has
const availableOffers = myStickers
  .map(s => ({ ...s, duplicates: Math.max(0, s.count - 1) }))
  .filter(s => s.duplicates > 0);

// Request section: partner duplicates the user is still missing
const myOwnedCounts = new Map(myCollection.map(s => [s.id, s.count]));
const availableRequests = partnerStickers
  .map(s => ({ ...s, duplicates: Math.max(0, s.count - 1) }))
  .filter(s => s.duplicates > 0 && (myOwnedCounts.get(s.id) ?? 0) === 0);
```

### QuantityStepper

**File**: `src/components/ui/QuantityStepper.tsx`

Reusable counter control for adjusting proposal quantities.

**Props & Behavior:**

- `value: number` current quantity (component clamps it within bounds)
- `onChange(next: number)` returns sanitized integers within the configured range
- `min?: number` defaults to `0`; `max?: number` disables incrementing when duplicates are exhausted
- `size?: 'sm' | 'md'` exposes compact and default sizing variants

**Accessibility & UX:**

- Ghost icon buttons with `aria-label`/`title` ("Disminuir", "Añadir uno")
- Disabled states at bounds; prevents negative values or exceeding owned duplicates
- Centered value uses `aria-live="polite"` to announce updates for screen readers
- Keyboard focus ring handled on the outer container to match optimistic UI patterns

**Usage:**

- Embedded in `StickerSelector` for both offer/request lists
- Keeps proposal summaries and submission payloads aligned with duplicate limits

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
- **Success Feedback**: Sonner-based toast notifications

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
- **Success Feedback**: Sonner-based toast notifications
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
- **Sonner Toast Integration**: Contextual success/error messaging

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

- Sticker grid with rarity-based gradients y cintillos de rareza
- Botones `Tengo`/`Repe (n)` con actualizaciones optimistas y rollback
- Boton ghost `-` para decrementar repes con toasts de error y focus visible
- Sticky progress header con pills Tengo / Faltan / Repes / Total alimentadas por `get_user_collection_stats`
- CollectionsDropdown alineado con la insignia externa "Activa" y fallback a calculos locales cuando la RPC no responde
- Capa de fallback local con `useMemo` para mantener estadisticas cuando la RPC no esta disponible

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
- **Sonner toast notifications** with context-aware messaging
- **Per-action loading states** for granular user feedback
- **Confirmation modals** for destructive actions with cascade delete warnings

### FindTradersPage (Simplified) ✅ **v1.4.3**

**File**: `src/app/trades/find/page.tsx`

Streamlined trading discovery showing matches for active collection only.

**Key Features:**

- **Active collection only**: No filters, shows matches for user's active collection
- **"Búsqueda avanzada" button**: Routes to `/trades/search` for advanced filtering
- **Zero-reload interactions**: Instant pagination without page refresh
- **Empty states** for no collections and no matches
- **Active collection warnings** consistent with profile patterns
- **Toast notifications** for search errors
- **Responsive grid layout** for match cards (1-3 columns based on screen size)

### AdvancedSearchPage ✅ **NEW - v1.4.3**

**File**: `src/app/trades/search/page.tsx`

Full-featured trading search interface with comprehensive filters.

**Key Features:**

- **Complete filter controls**: Collection dropdown, player search, rarity, team, minOverlap
- **Debounced inputs**: 500ms debounce on text-based filters
- **"Volver a Intercambios" link**: Easy return to simplified view
- **Filter badges**: Visual summary of active filters with individual removal
- **Pagination controls** with loading states and result counts
- **Context tip**: Header explains relationship between simplified and advanced views

### FindTraderDetailPage ⚠️ **REMOVED in v1.4.3**

**This page has been removed** to streamline the user flow. Match cards now link directly to `/trades/compose`.

**Rationale**: The intermediate detail page was redundant. Users can now go from finding a match to creating a proposal in one click.

### ProposalsDashboardPage ✅ **v1.4.3 - ENHANCED**

**File**: `src/app/trades/proposals/page.tsx`

Comprehensive proposal management dashboard with inbox/outbox functionality and highlight support.

**Key Features:**

- **SegmentedTabs Navigation**: Equal-width RECIBIDAS|ENVIADAS tabs with icons and unread badges
- **Query-driven Tab Selection**: `?tab=sent` param sets initial tab (for post-create redirect)
- **One-time Highlight**: `?highlight=<proposalId>` param triggers 2-second pulse animation on newly created proposal
- **Real-time Updates**: Fresh proposal lists with refresh capability
- **Status Filtering**: Visual indicators for all proposal statuses
- **Empty States**: Contextual messaging for empty inbox/outbox
- **Responsive Design**: Mobile-optimized tab switching and card layout
- **Loading States**: Skeleton placeholders during data fetch
- **Error Recovery**: User-friendly error handling with retry options

**State Management Pattern:**

```typescript
// Query param integration (v1.4.3)
const tabParam = searchParams.get('tab');
const initialTab = tabParam === 'sent' ? 'outbox' : 'inbox';
const highlightParam = searchParams.get('highlight');
const [highlightProposalId, setHighlightProposalId] = useState(
  highlightParam ? parseInt(highlightParam) : null
);

// Tab switching with state preservation
const [activeTab, setActiveTab] = useState<'inbox' | 'outbox'>(initialTab);
const [selectedProposal, setSelectedProposal] = useState<number | null>(null);

// Clear highlight after 2 seconds
useEffect(() => {
  if (highlightProposalId) {
    const timer = setTimeout(() => {
      setHighlightProposalId(null);
      // Remove highlight param from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('highlight');
      window.history.replaceState({}, '', url.toString());
    }, 2000);
    return () => clearTimeout(timer);
  }
}, [highlightProposalId]);
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
<div class="composer-container">
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

#### SegmentedTabs ✅ **NEW - v1.4.3**

**File**: `src/components/ui/SegmentedTabs.tsx`

Equal-width paired tab control following Retro-Comic theme with perfect alignment and flush seams.

```typescript
<SegmentedTabs
  tabs={[
    {
      value: 'inbox',
      label: 'Recibidas',
      icon: <Inbox className="h-4 w-4" />,
      badge: unreadCount > 0 ? <Badge>...</Badge> : undefined,
    },
    {
      value: 'outbox',
      label: 'Enviadas',
      icon: <Send className="h-4 w-4" />,
    },
  ]}
  value={activeTab}
  onValueChange={setActiveTab}
  aria-label="Propuestas de intercambio"
/>
```

**Key Features:**

- **Equal-width columns** using CSS Grid (`grid-template-columns: repeat(N, 1fr)`)
- **Outer border only**: Container has `border-2 border-black`, tabs have no individual borders
- **Flush seams**: Single-pixel dividers via `::before` pseudo-element (no double borders)
- **Rounded outer corners only**: Container has `rounded-md overflow-hidden`, inner corners square
- **No layout shift**: Focus ring uses `ring-inset`, active state changes only background color
- **Full keyboard navigation**:
  - Arrow keys (Left/Right) to switch tabs
  - Home/End to jump to first/last tab
  - Tab key for standard focus movement
- **ARIA compliant**: `role="tablist"`, `aria-selected`, `aria-controls` attributes
- **Icon & badge support**: Optional icon and badge props per tab
- **Truncation support**: Long labels truncate with ellipsis, title attribute shows full text
- **Test IDs**: `data-testid="segmented-tabs"` on container, `data-testid="segmented-tab-{value}"` on each tab

**Implementation Details:**

- Container: `grid gap-0 border-2 border-black rounded-md overflow-hidden`
- Tab (inactive): `bg-gray-800 text-white hover:bg-gray-700`
- Tab (active): `bg-[#FFC000] text-black z-10`
- Divider: `before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-black` (on non-first tabs)
- Focus: `ring-2 ring-[#FFC000] ring-inset` (no border change = no layout shift)

**Usage locations:**

- **Proposals Page** (`/trades/proposals`): RECIBIDAS | ENVIADAS tabs
- **ProposalDetailModal**: RESUMEN | MENSAJES tabs
- **StickerSelector** (`/trades/compose`): OFRECER | PEDIR tabs

#### ModernCard

**File**: `src/components/ui/modern-card.tsx`

Enhanced card component for the sports card theme with trading support.

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

### Retro-Comic Theme

Refer to `docs/theme-guide.md` for the complete color palette, core principles, and component examples for the v1.4.0 "Retro-Comic" theme.

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

### Toast Notifications with Sonner ?o. **EXTENDED FOR TRADING**

Our shared wrapper around [Sonner](https://sonner.emilkowal.ski) keeps the familiar `toast` API while enabling richer interactions:

```typescript
import { toast } from '@/lib/toast';

// Quick success & error feedback
toast.success('Propuesta enviada correctamente');
toast.error('Error al enviar propuesta');

// Optionally provide extra context
toast.success('Propuesta aceptada', {
  description: 'El intercambio aparecera ahora en tu historial.',
});

toast.error('Error al responder propuesta', {
  description: 'Intentalo de nuevo en unos segundos.',
});
```

Sonner maneja el apilado, el enfoque y las animaciones automaticamente, asi que no hace falta manipular el DOM manualmente.

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

### Priority Testing Areas ✅ **EXTENDED FOR TRADING & THEME**

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
- **Theme Verification** ✅ **NEW (v1.4.1)**:
  - Visual regression testing for Retro-Comic theme
  - Verify thick borders (`border-2 border-black`) on components
  - Verify gold accent (`#FFC000`) on active states and buttons
  - Verify dark backgrounds (`bg-[#1F2937]`) on pages
  - Check reduced rounding (`rounded-md`) throughout
  - Accessibility: contrast ratios for gold buttons and text
  - Keyboard navigation with new themed focus states

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

## v1.5.0 Components ✅ **NEW**

### Admin Components (Sprint 11 - Phase 1) ⚠️

#### AdminGuard

**File**: `src/components/AdminGuard.tsx`

**Purpose:** Protects admin routes from unauthorized access

**Features:**
- Checks `is_admin` flag from profiles table
- Verifies user is not suspended
- Shows loading spinner during verification
- Displays "Access Denied" page for non-admins
- Auto-signs out suspended users
- Redirects to login if not authenticated

**Usage:**
```tsx
<AdminGuard>
  <AdminContent />
</AdminGuard>
```

---

#### Admin Dashboard

**File**: `src/app/admin/dashboard/page.tsx`

**Purpose:** Main admin dashboard with platform statistics

**Features:**
- 8 real-time statistics cards
  - Total Users
  - Active Users (30d)
  - Pending Reports
  - Active Listings
  - Public Templates
  - Completed Trades (30d)
  - Admin Actions (30d)
  - Suspended Users
- Color-coded icons for each metric
- Suspended users alert banner
- Responsive grid layout
- Protected by AdminGuard

**Hook:** `useAdminStats` - Calls `get_admin_stats` RPC

---

#### Reports Queue Page

**File**: `src/app/admin/reports/page.tsx`

**Purpose:** List and manage pending reports

**Features:**
- List of all pending reports
- Color-coded entity type badges (user, listing, template, chat)
- Reason badges
- Reporter information
- Report timestamp
- Entity ID display
- "Review Report" button opens detail modal
- Empty state when no reports

**Hook:** `usePendingReports` - Calls `list_pending_reports` RPC

---

#### ReportDetailModal

**File**: `src/components/admin/ReportDetailModal.tsx`

**Purpose:** Detailed view and moderation actions for a single report

**Features:**
- Full report context display
- Entity-specific information:
  - User reports: nickname, email, rating, suspension status
  - Listing reports: title, description, status, owner
  - Template reports: title, author, rating, public status
- User history section (total reports, listings, templates, rating)
- Required admin notes textarea
- Three action buttons:
  - Dismiss Report (outline)
  - Remove Content (orange)
  - Suspend User (red)
- Confirmation on second click
- Loading states
- Toast notifications

**Hooks:**
- `useReportDetails` - Calls `get_report_details_with_context` RPC
- `useResolveReport` - Calls `resolve_report` RPC

---

#### Admin Layout

**File**: `src/app/admin/layout.tsx`

**Purpose:** Shared layout with tab navigation for all admin pages

**Features:**
- Tab navigation with 4 sections:
  - Dashboard (LayoutDashboard icon)
  - Reports (AlertTriangle icon)
  - Users (Users icon) - Phase 2
  - Audit Log (FileText icon) - Phase 2
- Active tab highlighting in yellow (#FFC000)
- Admin Panel header
- Protected by AdminGuard
- Dark theme styling

**Navigation:** Links to `/admin/dashboard`, `/admin/reports`, `/admin/users`, `/admin/audit`

---

#### User Search Page

**File**: `src/app/admin/users/page.tsx`

**Purpose:** Search and manage platform users

**Features:**
- Debounced search input (500ms delay)
- Search by nickname or email
- Status filter dropdown (all/active/suspended)
- User cards showing:
  - Avatar with fallback
  - Nickname and email
  - Admin/Suspended badges
  - Rating with star count
  - Active listings count
  - Reports received count
  - Join date
- View Profile link
- Suspend/Unsuspend buttons (disabled for admins)
- Reason prompt for actions
- Warning indicator for users with reports
- Empty state for no results
- Protected by AdminGuard

**Hooks:**
- `useUserSearch` - Searches users with filters, calls `search_users_admin` RPC
- `useSuspendUser` - Suspend/unsuspend actions

---

#### Audit Log Viewer

**File**: `src/app/admin/audit/page.tsx`

**Purpose:** View complete history of admin moderation actions

**Features:**
- Timeline view of audit entries
- Filter by action type dropdown
- Color-coded action badges:
  - Suspend User (red)
  - Unsuspend User (green)
  - Remove Content (orange)
  - Dismiss Report (gray)
- Each entry shows:
  - Action icon
  - Admin who performed action
  - Timestamp
  - Target type and ID
  - Reason (in gray box)
  - Expandable metadata viewer
- Infinite scroll pagination (20 per page)
- "Load More" button
- Empty state for no logs
- Protected by AdminGuard

**Hook:**
- `useAuditLog` - Fetches audit logs from `admin_actions` table with pagination

---

#### Old Admin Components (Legacy - Pre-Sprint 11)

**File**: `src/app/admin/page.tsx` (OLD - may be deprecated)

Main admin dashboard with tabbed interface for old collection system.

**Features:**

- **RBAC Guard**: Only accessible to users with `is_admin = true`
- **Tabbed Interface**: Collections | Pages | Stickers | Bulk Upload | Audit
- **Server-side check**: Verifies admin status on page load
- **401 Redirect**: Non-admins redirected to home

---

#### CollectionsList

**File**: `src/components/admin/CollectionsList.tsx`

CRUD interface for collections management.

**Features:**

- **List view**: All collections with status pills (draft/published)
- **Create/Edit forms**: Modal-based forms with validation
- **Delete confirmation**: With cascade warning
- **Publish toggle**: Mark collections as draft or published
- **Retro-Comic styling**: Dark cards with gold accents

---

#### PageEditor

**File**: `src/components/admin/PageEditor.tsx`

CRUD interface for collection pages.

**Features:**

- **Team pages**: 20 fixed slots (badge, manager, 18 players)
- **Special pages**: Variable slots
- **Order index control**: Drag-and-drop or numeric input
- **Slot assignment**: Assign stickers to page slots

---

#### StickerEditor

**File**: `src/components/admin/StickerEditor.tsx`

CRUD interface for individual stickers.

**Features:**

- **Form fields**: All sticker properties with validation
- **Image upload**: Client-side WebP conversion + 100px thumb generation
- **Assign to page**: Dropdown to assign to page slot
- **Number optional**: sticker_number is optional for now

---

#### BulkImportWizard

**File**: `src/components/admin/BulkImportWizard.tsx`

Multi-step wizard for bulk uploads.

**Features:**

- **Step 1: Upload**: CSV/XLSX file upload with drag-and-drop
- **Step 2: Preview**: Shows validation errors, warnings, and diffs
- **Step 3: Apply**: Transactional bulk insert/update
- **Progress tracking**: Live progress bar during apply
- **Error handling**: Detailed error messages per row

---

#### AuditTable

**File**: `src/components/admin/AuditTable.tsx`

Read-only audit log viewer.

**Features:**

- **Filters**: By user, entity, action, date range
- **Expandable rows**: Show before/after JSON diffs
- **Pagination**: 50 entries per page
- **Export**: CSV export of audit entries

---

### Badges Components (v1.5.0)

#### BadgeCard

**File**: `src/components/profile/BadgeCard.tsx`

Display a single badge with icon and metadata.

**Props:**

```typescript
interface BadgeCardProps {
  badge: {
    badge_code: string;
    awarded_at: string;
  };
}
```

**Features:**

- **Icon mapping**: Maps badge_code to icon
- **Awarded date**: Relative time format ("hace 2 meses")
- **Retro-Comic styling**: Gold border, dark background
- **Tooltip**: Shows badge description on hover

---

#### BadgesGrid

**File**: `src/components/profile/BadgesGrid.tsx`

Grid of user badges in profile page.

**Features:**

- **Responsive grid**: 2-4 columns based on screen size
- **Empty state**: Friendly message when no badges
- **useUserBadges hook**: Fetches user badges on mount
- **Loading skeletons**: Shows placeholders during load

---

#### useUserBadges

**File**: `src/hooks/profile/useUserBadges.ts`

Hook for fetching user badges.

**Usage:**

```typescript
const { badges, loading, error } = useUserBadges(userId);
```

**Features:**

- **Read-only**: No mutation methods yet
- **Auto-refresh**: Refetches on userId change
- **Error handling**: Toast on error

---

### Quick Entry Components (v1.5.0)

#### OpenPackPage

**File**: `src/app/mi-coleccion/[id]/pack/page.tsx`

Quick entry route for adding multiple stickers by number.

**Features:**

- **Auth guard**: Requires authentication
- **Active collection**: Uses collection ID from URL
- **5 numeric inputs**: Auto-advance on input
- **Paste support**: CSV/space/semicolon auto-split
- **Dedupe**: Removes duplicate numbers before submit
- **Bulk add RPC**: Calls `bulk_add_stickers_by_numbers`
- **Summary display**: Shows añadidos, repes, inválidos
- **Clear/repeat flow**: "Abrir otro sobre" button

---

#### PackNumberInputs

**File**: `src/components/quick-entry/PackNumberInputs.tsx`

Component for 5 numeric inputs with smart paste handling.

**Features:**

- **Auto-advance**: Moves focus to next input on valid entry
- **Paste handling**: Splits CSV/space/semicolon into 5 inputs
- **Dedupe**: Removes duplicate values
- **Validation**: Only accepts positive integers
- **Mobile keyboard**: `inputMode="numeric"` for mobile optimization
- **Accessibility**: Proper labels and ARIA attributes

---

#### useQuickEntry

**File**: `src/hooks/quick-entry/useQuickEntry.ts`

Hook for quick entry logic.

**Usage:**

```typescript
const { numbers, setNumbers, addStickers, loading, result } = useQuickEntry(
  userId,
  collectionId
);
```

**Features:**

- **Optimistic updates**: Progress updates before RPC completes
- **Error handling**: Toast on error, rollback on failure
- **Result summary**: Returns added, duplicates, invalid arrays

---

### Avatar Seed Components (v1.5.0)

#### AvatarPicker

**File**: `src/components/profile/AvatarPicker.tsx`

Grid selector for seed avatars.

**Features:**

- **12 seed avatars**: Pre-loaded from `avatars/seed/...`
- **Grid layout**: 3-4 columns based on screen size
- **Selection state**: Highlights currently selected avatar
- **Update profile**: Writes to `profiles.avatar_url` on select
- **Keyboard navigation**: Arrow keys, Enter/Space
- **Accessibility**: ARIA labels, focus management

**Props:**

```typescript
interface AvatarPickerProps {
  currentAvatarUrl?: string;
  onSelect: (avatarUrl: string) => void;
}
```

---

### Location Matching Components (v1.5.0)

#### LocationSettings

**File**: `src/components/profile/LocationSettings.tsx`

Postcode input for location-based matching.

**Props:**

```typescript
interface LocationSettingsProps {
  currentPostcode?: string | null;
  onUpdate: (postcode: string) => Promise<void>;
  loading: boolean;
}
```

**Features:**

- **Postcode input**: Validates against `postal_codes` table
- **Privacy note**: Explains centroid-based distance calculation
- **Optional field**: Clear indicator that location is optional
- **Auto-validation**: Real-time check if postcode exists in database
- **Clear button**: Remove postcode to disable location matching

---

#### TraderListSortControls

**File**: `src/components/trades/TraderListSortControls.tsx`

Sort and filter controls for trade matches with location.

**Props:**

```typescript
interface TraderListSortControlsProps {
  sortMode: 'distance' | 'overlap' | 'mixed';
  radiusKm: number;
  onSortChange: (mode: string) => void;
  onRadiusChange: (radius: number) => void;
  hasLocation: boolean;
}
```

**Features:**

- **Sort dropdown**: Distance / Overlap / Mixed (60/40 weighted)
- **Radius slider**: 10–100 km with visual indicators
- **Disabled state**: Grayed out when user has no postcode set
- **Tooltip**: Explains mixed scoring algorithm
- **Responsive**: Stacks vertically on mobile

---

#### MatchCardWithDistance

**File**: `src/components/trades/MatchCardWithDistance.tsx`

Enhanced match card displaying distance.

**Props:**

```typescript
interface MatchCardWithDistanceProps {
  match: {
    match_user_id: string;
    nickname: string;
    overlap_from_them_to_me: number;
    overlap_from_me_to_them: number;
    distance_km?: number | null;
    score?: number | null;
  };
  onViewDetails: (userId: string) => void;
}
```

**Features:**

- **Distance badge**: "~12 km" displayed with location icon
- **Score indicator**: Visual bar for mixed score (0-1)
- **Fallback state**: "Distancia no disponible" when NULL
- **Privacy-first**: Never shows exact coordinates
- **Retro-Comic styling**: Gold accent for nearby traders (<20 km)

---

#### useLocationMatching

**File**: `src/hooks/trades/useLocationMatching.ts`

Hook for location-based trade matching.

**Usage:**

```typescript
const {
  matches,
  loading,
  error,
  sortMode,
  radiusKm,
  setSortMode,
  setRadiusKm,
  userLocation,
  fetchMatches,
} = useLocationMatching(userId, collectionId);
```

**Features:**

- **Auto-fetch location**: Gets user's postcode centroid on mount
- **Optimistic filtering**: Updates UI before RPC completes
- **Error handling**: Toast on location fetch failure
- **Fallback mode**: Falls back to overlap-only if no location data

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

- **Consistent styling** following the Retro-Comic theme (`docs/theme-guide.md`)

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

---

## Template Components ✅ **NEW (v1.6.0)**

### TemplateCard

**File**: `src/components/templates/TemplateCard.tsx`

Template preview card for explorer grid.

**Props:**

- `template: Template` - Template data

**Features:**

- Rating display with stars
- Copies and pages count
- Author info
- Copy button with loading state
- Success feedback with redirect
- Login redirect if unauthenticated

### TemplateFilters

**File**: `src/components/templates/TemplateFilters.tsx`

Search and sort controls for templates explorer.

**Props:**

- `searchQuery: string` - Current search query
- `onSearchChange: (value: string) => void` - Search change handler
- `sortBy: SortOption` - Current sort option
- `onSortChange: (value: SortOption) => void` - Sort change handler

**Features:**

- Search templates by title/description
- Sort by recent, rating, or popularity
- Spanish labels

### TemplateProgressGrid

**File**: `src/components/templates/TemplateProgressGrid.tsx`

Grid of slots grouped by pages with tabs.

**Props:**

- `progress: SlotProgress[]` - All slot progress data
- `onUpdateSlot: (slotId, status, count) => Promise<void>` - Update handler
- `copyId: string` - Template copy ID

**Features:**

- Page tabs for navigation
- Responsive grid (2-5 columns)
- Grouped by page number
- Sorted slots within pages
- Spanish page labels

### SlotTile

**File**: `src/components/templates/SlotTile.tsx`

Individual slot with status and count controls.

**Props:**

- `slot: SlotProgress` - Slot data
- `onUpdate: (slotId, status, count) => Promise<void>` - Update handler
- `copyId: string` - Template copy ID

**Features:**

- Click to cycle status (missing → owned → duplicate → missing)
- Count controls for duplicates (+/- buttons)
- Publish button for duplicates
- Color-coded by status
- Optimistic updates
- Loading overlay
- Spanish status labels

### TemplateSummaryHeader

**File**: `src/components/templates/TemplateSummaryHeader.tsx`

Statistics header for template progress.

**Props:**

- `copy: TemplateCopy` - Template copy info
- `progress: SlotProgress[]` - Progress data

**Features:**

- Completion percentage with progress bar
- Three stat pills (owned, duplicates, missing)
- Active/inactive badge
- Color-coded stats
- Spanish labels

### Template Hooks

#### useTemplates

**File**: `src/hooks/templates/useTemplates.ts`

Fetch public templates with pagination and filters.

**Usage:**

```typescript
const { templates, loading, error, hasMore, loadMore } = useTemplates({
  search: query,
  sortBy: 'recent',
  limit: 12,
});
```

**Features:**

- Search templates by title/description
- Sort by recent, rating, or popularity
- Pagination with load more
- Error handling

#### useCopyTemplate

**File**: `src/hooks/templates/useCopyTemplate.ts`

Copy template to user account.

**Usage:**

```typescript
const { copyTemplate, loading } = useCopyTemplate();
const copyId = await copyTemplate(templateId);
```

**Features:**

- Copy template with custom title
- Loading state
- Error handling

#### useTemplateProgress

**File**: `src/hooks/templates/useTemplateProgress.ts`

Fetch and update slot progress.

**Usage:**

```typescript
const { copy, progress, loading, error, updateSlotStatus } =
  useTemplateProgress(copyId);
```

**Features:**

- Fetch template copy info
- Fetch slot progress data
- Update slot status with optimistic updates
- Error handling

## Integration Components ✅

### MyListingCard

**File:** `src/components/integration/MyListingCard.tsx`

Card for user's listings with sync information.

**Props:**
- `listing: MyListing` - Listing with sync data
- `onUpdate: () => void` - Callback after actions

**Features:**
- Status badge (active/sold/removed)
- Alert if needs attention (count = 0)
- Sync indicator for template-linked listings
- Current duplicate count display
- Mark as sold button with confirm
- Edit button for active listings
- View count and creation date
- Automatic decrement on sold

### Breadcrumbs

**File:** `src/components/Breadcrumbs.tsx`

Navigation breadcrumbs for nested routes.

**Props:**
- `items: BreadcrumbItem[]` - Array of breadcrumb items

**Features:**
- Clickable links for parent routes
- Current page highlighted
- Chevron separators
- Responsive text sizing

## Social Components ✅ **NEW (v1.6.0 - Sprint 10)**

### FavoriteButton

**File:** `src/components/social/FavoriteButton.tsx`

Toggle button to favorite/unfavorite users.

**Props:**
- `userId: string` - Target user ID

**Features:**
- Heart icon (filled when favorited)
- Optimistic updates
- Loading state during check
- Toast notifications
- Error handling with revert
- Auto-checks favorite status on mount

**Usage:**
```tsx
<FavoriteButton userId={userId} />
```

### ReportButton

**File:** `src/components/social/ReportButton.tsx`

Button to open report modal for content moderation.

**Props:**
- `entityType: 'user' | 'listing' | 'template' | 'chat'` - Content type
- `entityId: string` - Content ID
- `variant?: 'default' | 'outline' | 'ghost'` - Button style
- `size?: 'default' | 'sm' | 'lg'` - Button size

**Features:**
- Flag icon with hover state
- Opens ReportModal on click
- Universal for all content types

**Usage:**
```tsx
<ReportButton entityType="listing" entityId={listingId} />
```

### ReportModal

**File:** `src/components/social/ReportModal.tsx`

Modal with report form for content moderation.

**Props:**
- `open: boolean` - Modal visibility
- `onClose: () => void` - Close handler
- `entityType: 'user' | 'listing' | 'template' | 'chat'` - Content type
- `entityId: string` - Content ID

**Features:**
- Radio button reason selection (6 categories)
- Optional description textarea
- Character counter (500 max)
- Validation (reason required)
- Loading state during submission
- Success/error toast notifications
- Form reset on successful submit

**Report Reasons:**
- Spam or misleading
- Inappropriate content
- Scam or fraud
- Harassment or abuse
- Fake or counterfeit items
- Other

### Social Hooks

#### useUserProfile

**File:** `src/hooks/social/useUserProfile.ts`

Fetches public user profile with stats and listings.

**Usage:**
```tsx
const { profile, listings, loading, error, refetch } = useUserProfile(userId);
```

**Returns:**
- `profile: UserProfile | null` - User profile data
- `listings: Listing[]` - User's active listings
- `loading: boolean` - Loading state
- `error: string | null` - Error message if any
- `refetch: () => void` - Function to refresh data

**Profile Fields:**
- `id`, `nickname`, `avatar_url`
- `rating_avg`, `rating_count`, `favorites_count`
- `is_admin`, `is_suspended`

#### useFavorites

**File:** `src/hooks/social/useFavorites.ts`

Manages user favorites (check, toggle).

**Functions:**
- `checkFavorite(userId: string): Promise<boolean>` - Check if user is favorited
- `toggleFavorite(userId: string): Promise<boolean>` - Toggle favorite status (returns true if added, false if removed)

**Backend RPC:** `toggle_favourite`

#### useMyFavorites

**File:** `src/hooks/social/useMyFavorites.ts`

Fetches current user's favorites list with stats.

**Usage:**
```tsx
const { favorites, loading, error, refetch } = useMyFavorites();
```

**Returns:**
- `favorites: Favorite[]` - Array of favorited users with stats
- `loading: boolean` - Loading state
- `error: string | null` - Error message
- `refetch: () => void` - Refresh function

**Favorite Fields:**
- `favorite_user_id`, `nickname`, `avatar_url`
- `active_listings_count`, `rating_avg`
- `created_at`

**Backend RPC:** `list_my_favourites`

#### useReport

**File:** `src/hooks/social/useReport.ts`

Submits content reports.

**Usage:**
```tsx
const { submitReport, loading } = useReport();

await submitReport(
  'listing',  // entityType
  '123',      // entityId
  'spam',     // reason
  'This listing appears to be spam'  // description (optional)
);
```

**Backend RPC:** `create_report`

---

## Notifications Components (Sprint 15)

### NotificationCard

**File:** `src/components/notifications/NotificationCard.tsx`

Displays individual notifications with rich context and actions.

**Usage:**
```tsx
<NotificationCard
  notification={formattedNotification}
  onMarkAsRead={handleMarkAsRead}
  compact={false}
/>
```

**Props:**
- `notification: FormattedNotification` - Formatted notification object
- `onMarkAsRead?: (id: number) => void` - Callback when notification is clicked
- `compact?: boolean` - Compact mode for dropdowns (default: false)

**Features:**
- Shows actor avatar or notification icon
- Unread indicator (blue dot + accent border)
- Relative timestamps ("hace 5 minutos")
- Quick action buttons (e.g., "Ir al chat")
- Suspended/deleted entity badges
- Responsive layout

**Notification Types Supported:**
- Listing chat messages
- Listing reservations
- Listing completions
- User ratings (with star display)
- Template ratings
- Trade notifications
- Admin actions

---

### NotificationDropdown

**File:** `src/components/notifications/NotificationDropdown.tsx`

Header bell icon with dropdown preview of latest notifications.

**Usage:**
```tsx
<NotificationDropdown maxItems={5} />
```

**Props:**
- `maxItems?: number` - Max notifications to show (default: 5)
- `onOpenRatingModal?: (userId: string, nickname: string, listingId: number, listingTitle: string) => void` - Callback to open rating modal from notification

**Features:**
- Bell icon with unread badge count
- Shows top N most recent unread notifications
- Clickable action buttons within dropdown (no need to go to "Ver todas")
- Actions include: "Ir al chat", "Confirmar transacción", "Valorar usuario", "Ver valoración"
- "Ver todas las notificaciones" link for full page view
- Auto-closes on navigation
- Empty state when no notifications
- Full notification cards with action buttons

**Behavior:**
- Updates badge count in realtime
- Marks notifications as read when clicked
- Shows "y N más..." when there are more notifications
- Dropdown closes automatically when action button is clicked

---

### Notifications Center Page

**File:** `src/app/profile/notifications/page.tsx`

Full-page notifications management interface.

**Route:** `/profile/notifications`

**Features:**
- **Two Tabs:**
  - "Nuevas" - Unread notifications
  - "Historial" - Read notifications
- **Categorization:**
  - Marketplace (listing_chat, listing_reserved, listing_completed)
  - Plantillas (template_rated)
  - Comunidad (user_rated)
  - Intercambios (trade notifications)
  - Sistema (admin_action)
- **Actions:**
  - "Marcar todas como leídas" button
  - Individual mark as read on click
  - Navigate to linked content
- **Empty States:**
  - "No hay notificaciones nuevas" with icon
  - "No hay notificaciones leídas" with explanation

**Auth:** Protected with `AuthGuard`

---

## Notifications Hooks (Sprint 15)

### useNotifications

**File:** `src/hooks/notifications/useNotifications.ts`

Main hook for notifications with realtime updates.

**Usage:**
```tsx
const {
  notifications,          // All formatted notifications
  unreadNotifications,    // Unread only
  readNotifications,      // Read only
  unreadCount,            // Number of unread
  groupedByCategory,      // Grouped by category
  loading,                // Loading state
  error,                  // Error message
  refresh,                // Refresh data
  markAllAsRead,          // Mark all as read
  markAsRead,             // Mark single as read
  markListingChatAsRead,  // Mark listing chat as read
  clearError,             // Clear error
} = useNotifications();
```

**Returns:**

**Data:**
- `notifications: FormattedNotification[]` - All notifications with title, body, href
- `unreadNotifications: FormattedNotification[]` - Filtered unread
- `readNotifications: FormattedNotification[]` - Filtered read
- `unreadCount: number` - Count of unread
- `groupedByCategory: GroupedNotifications` - Grouped by category

**State:**
- `loading: boolean` - Loading state
- `error: string | null` - Error message in Spanish

**Actions:**
- `refresh: () => Promise<void>` - Refresh all notifications
- `markAllAsRead: () => Promise<void>` - Mark all as read
- `markAsRead: (id: number) => Promise<void>` - Mark single as read
- `markListingChatAsRead: (listingId: number, participantId: string) => Promise<void>` - Mark chat notifications
- `clearError: () => void` - Clear error state

**Features:**
- Automatic fetch on mount and user change
- Realtime Supabase subscriptions
- Optimistic updates for instant feedback
- Computed properties (filtered, grouped)
- Error handling with Spanish messages
- Auto-refresh on notification changes

**Backend RPCs:**
- `get_notifications()`
- `get_notification_count()`
- `mark_all_notifications_read()`
- `mark_notification_read(id)`
- `mark_listing_chat_notifications_read(listing_id, participant_id)`

---

## Notification Type System (Sprint 15)

### NotificationKind

**File:** `src/types/notifications.ts`

TypeScript union type for all notification kinds.

```typescript
type NotificationKind =
  | 'chat_unread'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'finalization_requested'
  | 'listing_chat'
  | 'listing_reserved'
  | 'listing_completed'
  | 'user_rated'
  | 'template_rated'
  | 'admin_action';
```

### AppNotification

Core notification interface with all data.

```typescript
interface AppNotification {
  id: number;
  kind: NotificationKind;
  createdAt: string;
  readAt: string | null;
  
  // Related entities
  tradeId?: number | null;
  listingId?: number | null;
  templateId?: number | null;
  ratingId?: number | null;
  
  // Actor
  actor: NotificationActor | null;
  
  // Additional data
  payload: Record<string, unknown>;
  
  // Enriched fields from joins
  listingTitle?: string | null;
  templateName?: string | null;
  // ... more fields
}
```

### FormattedNotification

Display-ready notification with title, body, href.

```typescript
interface FormattedNotification extends AppNotification {
  title: string;        // e.g., "Nuevo mensaje"
  body: string;         // e.g., "Juan te ha enviado un mensaje..."
  href: string | null;  // Link to relevant page
  icon: string;         // Icon name (e.g., "MessageSquare")
  category: NotificationCategory;
}
```

### Helper Functions

```typescript
// Type guards
isListingNotification(kind: NotificationKind): boolean
isTemplateNotification(kind: NotificationKind): boolean
isTradeNotification(kind: NotificationKind): boolean
isRatingNotification(kind: NotificationKind): boolean
isChatNotification(kind: NotificationKind): boolean

// Categorization
getNotificationCategory(kind: NotificationKind): NotificationCategory
getNotificationIcon(kind: NotificationKind): string

// Formatting
formatNotification(notification: AppNotification): FormattedNotification
groupNotificationsByCategory(notifications: FormattedNotification[]): GroupedNotifications
getRelativeTimeString(dateString: string): string  // "hace 5 minutos"
```

---

## Notification Formatter (Sprint 15)

**File:** `src/lib/notifications/formatter.ts`

Converts raw notifications into Spanish user-friendly messages.

**Example Outputs:**

```typescript
// Listing chat
"Juan te ha enviado un mensaje sobre 'Cromo Messi'"

// Listing reserved
"María ha reservado 'Pack Completo' para ti"

// Listing completed
"Tu compra de 'Album Vintage' se ha completado"

// User rated
"Pedro te ha valorado con ⭐⭐⭐⭐⭐ (5/5)"

// Template rated
"Ana ha valorado tu plantilla 'La Liga' con ⭐⭐⭐⭐"
```

**Functions:**

- `formatNotification(notification)` - Main formatter
- `getNotificationFormat(notification)` - Returns {title, body, href}
- `groupNotificationsByCategory(notifications)` - Groups by category
- `getRelativeTimeString(dateString)` - Spanish relative time

**Spanish Time Strings:**
- "hace unos segundos"
- "hace 5 minutos"
- "hace 2 horas"
- "hace 3 días"
- "hace 2 semanas"
- "hace 1 mes"

---

**Last Updated:** 2025-10-25 (Sprint 15 - Notifications System Complete)
