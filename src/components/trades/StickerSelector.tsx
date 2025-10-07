'use client';

import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StickerGrid } from '@/components/trades/StickerGrid';
import { Skeleton } from '@/components/ui/skeleton';
import type { TradeProposalItem } from '@/types';
import type { UserStickerWithDetails } from '@/types';

interface StickerSelectorProps {
  myStickers: UserStickerWithDetails[];
  otherUserStickers: UserStickerWithDetails[];
  selectedOfferItems: TradeProposalItem[];
  selectedRequestItems: TradeProposalItem[];
  onOfferItemsChange: (items: TradeProposalItem[]) => void;
  onRequestItemsChange: (items: TradeProposalItem[]) => void;
  loading: boolean;
}

/**
 * A dual-tabbed component for selecting stickers to offer and request in a trade.
 * It intelligently filters stickers based on ownership and duplicate counts,
 * and uses StickerGrid to render the selectable items.
 */
export function StickerSelector({
  myStickers,
  otherUserStickers,
  selectedOfferItems,
  selectedRequestItems,
  onOfferItemsChange,
  onRequestItemsChange,
  loading,
}: StickerSelectorProps) {
  // Memoize the derived lists for performance. These recalculate only when input sticker lists change.

  // Offer section: Filters for stickers the current user has duplicates of (count > 1).
  const availableOffers = useMemo(
    () =>
      myStickers
        .filter(s => s.count > 1)
        .map(s => ({ ...s, duplicates: s.count - 1 })),
    [myStickers]
  );

  // Request section: Filters for stickers the other user has (count > 0)
  // AND the current user is missing (count = 0).
  const availableRequests = useMemo(() => {
    const myOwnedStickerIds = new Set(
      myStickers.filter(s => s.count > 0).map(s => s.sticker_id)
    );
    return otherUserStickers
      .filter(s => s.count > 0 && !myOwnedStickerIds.has(s.sticker_id))
      .map(s => ({ ...s, duplicates: s.count }));
  }, [myStickers, otherUserStickers]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-sm bg-gray-800 border-2 border-black" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-md bg-gray-800 border-2 border-black" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="offer" className="w-full">
      <TabsList className="grid grid-cols-2 max-w-[400px] bg-gray-800 border-2 border-black p-1">
        <TabsTrigger
          value="offer"
          className="font-bold uppercase data-[state=active]:bg-[#FFC000] data-[state=active]:text-gray-900 data-[state=active]:border-2 data-[state=active]:border-black rounded-md"
        >
          Ofrecer ({selectedOfferItems.length})
        </TabsTrigger>
        <TabsTrigger
          value="request"
          className="font-bold uppercase data-[state=active]:bg-[#FFC000] data-[state=active]:text-gray-900 data-[state=active]:border-2 data-[state=active]:border-black rounded-md"
        >
          Pedir ({selectedRequestItems.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="offer" className="mt-4">
        <StickerGrid
          stickers={availableOffers}
          selectedItems={selectedOfferItems}
          onItemsChange={onOfferItemsChange}
          mode="offer"
          emptyMessage="No tienes cromos repetidos para ofrecer en esta colección."
        />
      </TabsContent>

      <TabsContent value="request" className="mt-4">
        <StickerGrid
          stickers={availableRequests}
          selectedItems={selectedRequestItems}
          onItemsChange={onRequestItemsChange}
          mode="request"
          emptyMessage="Este usuario no tiene cromos repetidos que te falten."
        />
      </TabsContent>
    </Tabs>
  );
}
