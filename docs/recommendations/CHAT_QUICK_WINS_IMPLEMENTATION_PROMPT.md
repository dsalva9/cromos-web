# Implementation Prompt: Chat UX Quick Wins

## Context

We have a marketplace chat system with two entry points:
1. `/chats` - Lists all user conversations
2. `/marketplace/[id]/chat` - Individual chat interface

The chat interface is located at: `src/app/marketplace/[id]/chat/page.tsx`

### Current Problems

The mobile chat experience is severely compromised:

1. **Fixed 500px chat height** (line 634) - Creates double-scrolling nightmare on mobile
2. **Listing card always expanded** (lines 478-568) - Takes 200-250px on mobile
3. **Conversation selector always visible for sellers** (lines 573-626) - Takes 200-300px even when chat is selected
4. **Action buttons in listing card** (lines 518-565) - Take valuable space
5. **Result**: Chat messages occupy only ~30% of mobile viewport

### Screenshots Evidence
- Desktop (seller view): Works reasonably well with sidebar layout
- Mobile (seller view): Listing card + conversation selector + messages all stacked, requiring excessive scrolling
- Mobile scrolled: Have to scroll multiple times just to see messages and reach input

## Tasks to Implement

### 1. Dynamic Chat Height (HIGH PRIORITY)

**Current Code** (line 634):
```tsx
<div className="h-[500px] overflow-y-auto p-4 space-y-3">
```

**Change to**:
```tsx
<div className="h-[500px] md:h-[500px] overflow-y-auto p-4 space-y-3" style={{
  height: typeof window !== 'undefined' && window.innerWidth < 768
    ? 'calc(100vh - 60px - 120px - 180px - 80px)'
    : '500px'
}}>
```

**Better approach** - Add custom hook:
```tsx
// Create new file: src/hooks/useResponsiveChatHeight.ts
import { useState, useEffect } from 'react';

export function useResponsiveChatHeight() {
  const [chatHeight, setChatHeight] = useState('500px');

  useEffect(() => {
    const updateHeight = () => {
      if (window.innerWidth < 768) {
        // Mobile: Full viewport minus chrome
        // header(60) + listing-card(120) + composer(180) + bottom-nav(80)
        const height = window.innerHeight - 60 - 120 - 180 - 80;
        setChatHeight(`${height}px`);
      } else {
        setChatHeight('500px');
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return chatHeight;
}
```

**Usage in page.tsx**:
```tsx
const chatHeight = useResponsiveChatHeight();

// Then in JSX:
<div
  className="overflow-y-auto p-4 space-y-3"
  style={{ height: chatHeight }}
>
```

### 2. Collapsible Listing Card (HIGH PRIORITY)

**Current Code** (lines 478-568):
The listing card is always fully expanded, showing image, title, description, status, and action buttons.

**Implementation**:

Add state near line 54:
```tsx
const [listingCardExpanded, setListingCardExpanded] = useState(false);
```

**Replace the current listing card section** (lines 478-568) with:

```tsx
{listing && (
  <ModernCard className="mb-6">
    <ModernCardContent className="p-4">
      {/* Mobile: Collapsible */}
      <div className="md:hidden">
        <button
          onClick={() => setListingCardExpanded(!listingCardExpanded)}
          className="w-full flex items-center gap-3"
        >
          {listing.image_url && (
            <div className="relative w-12 h-12 flex-shrink-0">
              <Image
                src={listing.image_url}
                alt={listing.title}
                fill
                className="object-cover rounded-md border-2 border-gray-700"
              />
            </div>
          )}
          <div className="flex-1 min-w-0 text-left">
            <h3 className="text-sm font-bold text-white truncate">
              {listing.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                'px-2 py-0.5 rounded text-xs font-bold uppercase',
                listing.status === 'active' && 'bg-green-900/30 text-green-400',
                listing.status === 'reserved' && 'bg-yellow-900/30 text-yellow-400',
                listing.status === 'completed' && 'bg-blue-900/30 text-blue-400',
                listing.status === 'sold' && 'bg-gray-700 text-gray-300'
              )}>
                {listing.status === 'active' && 'Disponible'}
                {listing.status === 'reserved' && 'Reservado'}
                {listing.status === 'completed' && 'Completado'}
                {listing.status === 'sold' && 'Completado'}
              </span>
            </div>
          </div>
          <ChevronDown
            className={cn(
              'h-5 w-5 text-gray-400 transition-transform',
              listingCardExpanded && 'rotate-180'
            )}
          />
        </button>

        {listingCardExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-sm text-gray-400 mb-3">
              {listing.collection_name} {listing.sticker_number && `- #${listing.sticker_number}`}
            </p>
            <div className="flex flex-col gap-2">
              {/* Action buttons - moved here */}
              {isOwner && listing.status === 'active' && !transactionStatus && (
                <Button
                  onClick={handleReserve}
                  disabled={reserving || !selectedParticipant}
                  variant="outline"
                  className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700 w-full"
                >
                  <Package className="h-4 w-4 mr-2" />
                  {reserving ? 'Marcando...' : 'Marcar Reservado'}
                </Button>
              )}
              {isOwner && listing.status === 'reserved' && transactionStatus === 'reserved' && (
                <>
                  <Button
                    onClick={handleComplete}
                    disabled={completing}
                    variant="outline"
                    className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700 w-full"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    {completing ? 'Completando...' : 'Marcar Completado'}
                  </Button>
                  <Button
                    onClick={handleUnreserve}
                    disabled={unreserving}
                    variant="outline"
                    className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700 w-full"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    {unreserving ? 'Liberando...' : 'Liberar Reserva'}
                  </Button>
                </>
              )}
              {isBuyer && listing.status === 'reserved' && transactionStatus === 'pending_completion' && (
                <Button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="bg-[#FFC000] text-black hover:bg-yellow-400 font-bold w-full"
                >
                  <Package className="h-4 w-4 mr-2" />
                  {confirming ? 'Confirmando...' : 'Confirmar Recepción'}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Keep current layout */}
      <div className="hidden md:block">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-4 flex-1">
            {listing.image_url && (
              <div className="relative w-20 h-20 flex-shrink-0">
                <Image
                  src={listing.image_url}
                  alt={listing.title}
                  fill
                  className="object-cover rounded-md border-2 border-gray-700"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <Link href={`/marketplace/${listingId}`}>
                <h3 className="text-lg font-bold text-white hover:text-[#FFC000] transition-colors">
                  {listing.title}
                </h3>
              </Link>
              <p className="text-sm text-gray-400">
                {listing.collection_name} {listing.sticker_number && `- #${listing.sticker_number}`}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={cn(
                  'px-2 py-1 rounded text-xs font-bold uppercase',
                  listing.status === 'active' && 'bg-green-900/30 text-green-400',
                  listing.status === 'reserved' && 'bg-yellow-900/30 text-yellow-400',
                  listing.status === 'completed' && 'bg-blue-900/30 text-blue-400',
                  listing.status === 'sold' && 'bg-gray-700 text-gray-300'
                )}>
                  {listing.status === 'active' && 'Disponible'}
                  {listing.status === 'reserved' && 'Reservado'}
                  {listing.status === 'completed' && 'Completado'}
                  {listing.status === 'sold' && 'Completado'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Desktop action buttons - keep as is */}
            {isOwner && listing.status === 'active' && !transactionStatus && (
              <Button
                onClick={handleReserve}
                disabled={reserving || !selectedParticipant}
                variant="outline"
                className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700 w-full sm:w-auto whitespace-nowrap"
              >
                <Package className="h-4 w-4 mr-2" />
                {reserving ? 'Marcando...' : 'Marcar Reservado'}
              </Button>
            )}
            {isOwner && listing.status === 'reserved' && transactionStatus === 'reserved' && (
              <>
                <Button
                  onClick={handleComplete}
                  disabled={completing}
                  variant="outline"
                  className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700 w-full sm:w-auto whitespace-nowrap"
                >
                  <Package className="h-4 w-4 mr-2" />
                  {completing ? 'Completando...' : 'Marcar Completado'}
                </Button>
                <Button
                  onClick={handleUnreserve}
                  disabled={unreserving}
                  variant="outline"
                  className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700 w-full sm:w-auto whitespace-nowrap"
                >
                  <Package className="h-4 w-4 mr-2" />
                  {unreserving ? 'Liberando...' : 'Liberar Reserva'}
                </Button>
              </>
            )}
            {isBuyer && listing.status === 'reserved' && transactionStatus === 'pending_completion' && (
              <Button
                onClick={handleConfirm}
                disabled={confirming}
                className="bg-[#FFC000] text-black hover:bg-yellow-400 font-bold w-full sm:w-auto whitespace-nowrap"
              >
                <Package className="h-4 w-4 mr-2" />
                {confirming ? 'Confirmando...' : 'Confirmar Recepción'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </ModernCardContent>
  </ModernCard>
)}
```

**Add imports** (near top of file):
```tsx
import { ChevronDown } from 'lucide-react';
```

### 3. Hide Conversation Selector After Selection (HIGH PRIORITY)

**Current Code** (lines 573-626):
Conversation selector is always visible for sellers.

Add state near line 54:
```tsx
const [showConversationList, setShowConversationList] = useState(true);
```

Update useEffect that auto-selects (around line 159):
```tsx
useEffect(() => {
  if (isOwner && participants.length === 1 && !selectedParticipant) {
    setSelectedParticipant(participants[0].user_id);
    setShowConversationList(false); // Hide list when auto-selecting
  }
}, [isOwner, participants, selectedParticipant]);
```

**Replace the grid section** (lines 571-840) with:

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {/* Participants sidebar (seller only) */}
  {isOwner && participants.length > 0 && (
    <>
      {/* Mobile: Show list OR back button */}
      <div className="md:hidden">
        {showConversationList || !selectedParticipant ? (
          <div className="mb-6">
            <ModernCard>
              <ModernCardContent className="p-4">
                <h3 className="font-bold text-white mb-3">
                  Conversaciones ({participants.length})
                </h3>
                <div className="space-y-2">
                  {participants.map(participant => {
                    const isReservedForThisParticipant =
                      listing?.status === 'reserved' &&
                      transactionId &&
                      transaction?.buyer_id === participant.user_id;

                    return (
                      <button
                        key={participant.user_id}
                        onClick={() => {
                          setSelectedParticipant(participant.user_id);
                          setShowConversationList(false);
                        }}
                        className={cn(
                          'w-full text-left p-3 rounded-md transition-colors',
                          selectedParticipant === participant.user_id
                            ? 'bg-[#FFC000]/20 border-2 border-[#FFC000]'
                            : 'bg-gray-800 hover:bg-gray-700 border-2 border-transparent'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">
                              {participant.nickname}
                            </span>
                            {isReservedForThisParticipant && (
                              <span className="bg-yellow-900/30 text-yellow-400 text-xs font-bold px-1.5 py-0.5 rounded">
                                Reservado
                              </span>
                            )}
                          </div>
                          {participant.unread_count > 0 && (
                            <span className="bg-[#FFC000] text-black text-xs font-bold px-2 py-0.5 rounded-full">
                              {participant.unread_count}
                            </span>
                          )}
                        </div>
                        {participant.last_message && (
                          <p className="text-sm text-gray-400 truncate mt-1">
                            {participant.last_message}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ModernCardContent>
            </ModernCard>
          </div>
        ) : (
          <button
            onClick={() => setShowConversationList(true)}
            className="flex items-center gap-2 mb-4 text-[#FFC000] hover:text-yellow-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-bold">Conversaciones ({participants.length})</span>
          </button>
        )}
      </div>

      {/* Desktop: Always show sidebar */}
      <div className="hidden md:block md:col-span-1">
        <ModernCard>
          <ModernCardContent className="p-4">
            <h3 className="font-bold text-white mb-3">
              Conversaciones
            </h3>
            <div className="space-y-2">
              {participants.map(participant => {
                const isReservedForThisParticipant =
                  listing?.status === 'reserved' &&
                  transactionId &&
                  transaction?.buyer_id === participant.user_id;

                return (
                  <button
                    key={participant.user_id}
                    onClick={() => setSelectedParticipant(participant.user_id)}
                    className={cn(
                      'w-full text-left p-3 rounded-md transition-colors',
                      selectedParticipant === participant.user_id
                        ? 'bg-[#FFC000]/20 border-2 border-[#FFC000]'
                        : 'bg-gray-800 hover:bg-gray-700 border-2 border-transparent'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          {participant.nickname}
                        </span>
                        {isReservedForThisParticipant && (
                          <span className="bg-yellow-900/30 text-yellow-400 text-xs font-bold px-1.5 py-0.5 rounded">
                            Reservado
                          </span>
                        )}
                      </div>
                      {participant.unread_count > 0 && (
                        <span className="bg-[#FFC000] text-black text-xs font-bold px-2 py-0.5 rounded-full">
                          {participant.unread_count}
                        </span>
                      )}
                    </div>
                    {participant.last_message && (
                      <p className="text-sm text-gray-400 truncate mt-1">
                        {participant.last_message}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </ModernCardContent>
        </ModernCard>
      </div>
    </>
  )}

  {/* Chat panel - rest stays the same */}
  <div className={cn(
    isOwner && participants.length > 0 ? 'md:col-span-2' : 'md:col-span-3',
    // Hide on mobile when showing conversation list
    isOwner && showConversationList && !selectedParticipant && 'hidden md:block'
  )}>
    {/* Rest of chat panel code stays the same */}
  </div>
</div>
```

### 4. Better Auto-Scroll Behavior (MEDIUM PRIORITY)

**Current code** uses `messagesEndRef` but can be improved.

Update the effect that handles scrolling (add after line 249):

```tsx
// Improve auto-scroll behavior
useEffect(() => {
  // Scroll to bottom when messages change
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // On mobile, also ensure input stays visible
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    setTimeout(() => {
      // Scroll the message container to bottom
      const messageContainer = messagesEndRef.current?.closest('.overflow-y-auto');
      if (messageContainer) {
        messageContainer.scrollTop = messageContainer.scrollHeight;
      }
    }, 100);
  }
}, [messages]);

// Also scroll when conversation changes
useEffect(() => {
  if (selectedParticipant) {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }
}, [selectedParticipant]);
```

### 5. Add Smart Mobile Header (BONUS - MEDIUM PRIORITY)

Add a sticky header that shows context on mobile.

Add state near line 54:
```tsx
const [showDetailsSheet, setShowDetailsSheet] = useState(false);
```

Add this header right after the "Volver al anuncio" button (around line 476):

```tsx
{/* Mobile sticky header with context */}
<div className="md:hidden sticky top-0 bg-[#1F2937] border-b-2 border-gray-700 z-20 mb-4 -mt-8 -mx-4 px-4 py-3">
  <div className="flex items-center gap-3">
    {isOwner && selectedParticipant ? (
      <>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white truncate">
            {participants.find(p => p.user_id === selectedParticipant)?.nickname || 'Usuario'}
          </p>
          {listing && (
            <p className="text-xs text-gray-400 truncate">
              {listing.title}
            </p>
          )}
        </div>
        <button
          onClick={() => setListingCardExpanded(true)}
          className="text-gray-400 hover:text-white"
        >
          <Info className="h-5 w-5" />
        </button>
      </>
    ) : !isOwner && listing ? (
      <>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white truncate">
            {listing.title}
          </p>
          <p className="text-xs text-gray-400 truncate">
            Vendedor: {listing.author_nickname}
          </p>
        </div>
        <button
          onClick={() => setListingCardExpanded(true)}
          className="text-gray-400 hover:text-white"
        >
          <Info className="h-5 w-5" />
        </button>
      </>
    ) : null}
  </div>
</div>
```

Add import:
```tsx
import { Info } from 'lucide-react';
```

## Required Imports

Add to the imports section at the top of the file:

```tsx
import { ChevronDown, Info } from 'lucide-react';
```

## Testing Checklist

After implementation, test the following:

### Mobile (375px width)
- [ ] Chat height fills available viewport
- [ ] Listing card is collapsed by default
- [ ] Expanding listing card shows all details and actions
- [ ] Seller: Conversation list shows when no chat selected
- [ ] Seller: After selecting conversation, list is hidden and back button appears
- [ ] Seller: Back button shows conversation list again
- [ ] Buyer: Chat takes most of screen
- [ ] Messages are immediately visible without scrolling
- [ ] Input field is accessible without scrolling
- [ ] Auto-scroll works when new messages arrive

### Tablet (768px width)
- [ ] Layout switches to desktop mode at 768px
- [ ] Sidebar appears for sellers
- [ ] Listing card shows full details

### Desktop (1024px+ width)
- [ ] All original functionality preserved
- [ ] Sidebar shows for sellers
- [ ] Full listing card visible

### Cross-browser
- [ ] Chrome (desktop & mobile)
- [ ] Safari (iOS)
- [ ] Firefox

## Expected Results

### Before
- Mobile: Chat messages occupy ~30% of viewport
- Seller: 3-4 scrolls to reach chat input
- Buyer: 2-3 scrolls to reach chat input

### After
- Mobile: Chat messages occupy ~60-70% of viewport
- Seller: 0-1 scrolls to reach chat input
- Buyer: 0 scrolls to reach chat input
- Much better conversation management for sellers

## Files to Modify

1. `src/app/marketplace/[id]/chat/page.tsx` - Main implementation
2. `src/hooks/useResponsiveChatHeight.ts` - New file (if using hook approach)

## Rollback Plan

If issues arise:
1. All changes are in one file (`page.tsx`)
2. Can revert to git commit before changes
3. Or comment out mobile-specific code (everything in `md:` breakpoints stays the same)

## Notes

- Desktop experience remains unchanged
- All existing functionality preserved
- Only mobile UX improvements
- No database or API changes needed
- No breaking changes
