'use client';

import { StickerWithOwnership, TradeProposalItem } from '@/types';
import { ModernCard, ModernCardContent } from '../ui/modern-card';
import { Input } from '../ui/input';

interface StickerSelectorProps {
  title: string;
  stickers: StickerWithOwnership[];
  selectedItems: TradeProposalItem[];
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
              return (
                <div
                  key={sticker.id}
                  className="flex items-center justify-between p-3 bg-black/20 rounded-lg"
                >
                  <div>
                    <p className="font-semibold">{sticker.player_name}</p>
                    <p className="text-xs text-white/70">
                      {sticker.code} - Tienes {sticker.count}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label
                      htmlFor={`sticker-${sticker.id}`}
                      className="text-sm"
                    >
                      Cant:
                    </label>
                    <Input
                      id={`sticker-${sticker.id}`}
                      type="number"
                      min="0"
                      max={sticker.count}
                      value={selected?.quantity || 0}
                      onChange={e =>
                        onItemChange(sticker, parseInt(e.target.value, 10) || 0)
                      }
                      className="w-16 bg-black/30 border-white/20 text-center"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ModernCardContent>
    </ModernCard>
  );
}
