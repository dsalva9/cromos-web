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
  - **Find Traders (`/trades/find`)**: Dark page with themed filters and match cards
  - **Match Detail (`/trades/find/[userId]`)**: Themed sticker lists and proposal buttons
  - **Proposals Dashboard (`/trades/proposals`)**: Tab interface with gold active states
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
