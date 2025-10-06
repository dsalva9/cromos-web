'use client';

import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
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
  const supabase = useSupabaseClient();

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
        const newItem = {
          ...sticker,
          quantity: newQuantity,
          direction: mode as TradeProposalItemDirection,
        } as TradeProposalItem;
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
      <div className="flex items-center justify-center h-40 bg-gray-800/50 rounded-lg">
        <p className="text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {stickers.map(sticker => {
        const selectedQuantity = selectedMap.get(sticker.sticker_id) ?? 0;
        const imageUrl = sticker.stickers?.thumb_path_webp_100
          ? supabase.storage
              .from('sticker-images')
              .getPublicUrl(sticker.stickers.thumb_path_webp_100).data.publicUrl
          : '/placeholder.webp';

        return (
          <ModernCard
            key={sticker.sticker_id}
            className={cn(
              'transition-all duration-200',
              selectedQuantity > 0
                ? 'border-[#FFC000] shadow-lg shadow-yellow-500/20'
                : 'border-black'
            )}
          >
            <ModernCardContent className="p-2 relative">
              {selectedQuantity > 0 && (
                <CheckCircle2 className="absolute top-2 right-2 h-6 w-6 text-[#FFC000] bg-gray-900 rounded-full p-0.5 z-10" />
              )}
              <div className="aspect-[3/4] w-full relative rounded-md overflow-hidden mb-2">
                <Image
                  src={imageUrl}
                  alt={sticker.stickers?.player_name ?? 'Sticker'}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className="object-cover"
                />
              </div>
              <div className="text-center px-1">
                <p className="text-sm font-bold truncate">
                  {sticker.stickers?.player_name}
                </p>
                <p className="text-xs text-gray-400 mb-2">
                  {sticker.stickers?.code}
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
