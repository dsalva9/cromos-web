'use client';

import { StickerWithOwnership, TradeProposalDetailItem } from '@/types';
import { ModernCard, ModernCardContent } from '../ui/modern-card';
import { QuantityStepper } from '../ui/QuantityStepper';

interface StickerSelectorProps {
  title: string;
  stickers: StickerWithOwnership[];
  selectedItems: Partial<TradeProposalDetailItem>[];
  onItemChange: (item: StickerWithOwnership, quantity: number) => void;
}

export function StickerSelector({
  title,
  stickers,
  selectedItems,
  onItemChange,
}: StickerSelectorProps) {
  return (
    <ModernCard className="bg-white/10">
      <ModernCardContent className="p-6">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        {stickers.length === 0 ? (
          <p className="text-white/60">No hay cromos disponibles.</p>
        ) : (
          <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3">
            {stickers.map(sticker => {
              const selected = selectedItems.find(
                i => i.sticker_id === sticker.id
              );
              const availableDuplicates = Math.max(0, sticker.count ?? 0);
              const selectedQuantity = Math.min(
                Math.max(selected?.quantity ?? 0, 0),
                availableDuplicates
              );

              return (
                <div
                  key={sticker.id}
                  className="flex items-center justify-between p-3 bg-black/20 rounded-lg"
                >
                  <div>
                    <p className="font-semibold">{sticker.player_name}</p>
                    <p className="text-xs text-white/70">
                      {sticker.code} - Tienes {availableDuplicates}
                    </p>
                  </div>
                  <QuantityStepper
                    value={selectedQuantity}
                    onChange={qty => onItemChange(sticker, qty)}
                    min={0}
                    max={availableDuplicates}
                    size="sm"
                  />
                </div>
              );
            })}
          </div>
        )}
      </ModernCardContent>
    </ModernCard>
  );
}

