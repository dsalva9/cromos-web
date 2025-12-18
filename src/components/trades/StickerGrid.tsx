'use client';

import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import Image from 'next/image';
import { TradeProposalItemDirection, type TradeProposalItem } from '@/types';
import type { UserStickerWithDetails } from '@/types';

interface StickerGridProps {
  stickers: (UserStickerWithDetails & { duplicates: number })[];
  selectedItems: TradeProposalItem[];
  onItemsChange: (items: TradeProposalItem[]) => void;
  mode: 'offer' | 'request';
  emptyMessage: string;
}

/**
 * Renders a responsive grid of stickers for selection in a trade proposal.
 * Each sticker includes a QuantityStepper to adjust the number of items.
 */
export function StickerGrid({
  stickers,
  selectedItems,
  onItemsChange,
  mode,
  emptyMessage,
}: StickerGridProps) {
  const selectedMap = useMemo(
    () => new Map(selectedItems.map(item => [item.sticker_id, item.quantity])),
    [selectedItems]
  );

  const handleQuantityChange = (stickerId: number, newQuantity: number) => {
    const updatedItems = [...selectedItems];
    const existingItemIndex = updatedItems.findIndex(
      item => item.sticker_id === stickerId
    );

    if (newQuantity > 0) {
      if (existingItemIndex > -1) {
        updatedItems[existingItemIndex].quantity = newQuantity;
      } else {
        // Find the sticker to satisfy the TradeProposalItem type
        const sticker = stickers.find(s => s.sticker_id === stickerId);
        if (!sticker) return;
        const newItem: TradeProposalItem = {
          ...sticker,
          quantity: newQuantity,
          direction: mode as TradeProposalItemDirection,
        };
        updatedItems.push(newItem);
      }
    } else {
      if (existingItemIndex > -1) {
        updatedItems.splice(existingItemIndex, 1);
      }
    }
    onItemsChange(updatedItems);
  };

  if (stickers.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 bg-white rounded-md border-2 border-black shadow-xl">
        <p className="text-gray-600 font-bold">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {stickers.map(sticker => {
        const selectedQuantity = selectedMap.get(sticker.sticker_id) ?? 0;
        const imageUrl = sticker.stickers?.thumb_public_url || sticker.stickers?.image_public_url;

        return (
          <ModernCard
            key={sticker.sticker_id}
            className={cn(
              'transition-all duration-200 border-2 shadow-xl',
              selectedQuantity > 0
                ? 'border-[#FFC000] shadow-yellow-500/20'
                : 'border-black'
            )}
          >
            <ModernCardContent className="p-2 relative bg-white">
              {selectedQuantity > 0 && (
                <CheckCircle2 className="absolute top-2 right-2 h-6 w-6 text-[#FFC000] bg-gray-50 rounded-full p-0.5 z-10 border-2 border-black" />
              )}
              <div className="aspect-[3/4] w-full relative rounded-md overflow-hidden mb-2 border-2 border-black bg-gray-50">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={sticker.stickers?.player_name ?? 'Sticker'}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl text-gray-600">?</span>
                  </div>
                )}
              </div>
              <div className="text-center px-1">
                <p className="text-sm font-bold truncate text-gray-900">
                  {sticker.stickers?.player_name}
                </p>
                <p className="text-xs text-gray-600 mb-2">
                  {sticker.stickers?.collection_teams?.team_name ?? sticker.stickers?.code}
                </p>
                <QuantityStepper
                  value={selectedQuantity}
                  onChange={qty =>
                    handleQuantityChange(sticker.sticker_id, qty)
                  }
                  max={sticker.duplicates}
                />
              </div>
            </ModernCardContent>
          </ModernCard>
        );
      })}
    </div>
  );
}
