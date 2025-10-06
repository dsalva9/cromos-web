'use client';

import { AlbumPageData, PageSlot } from '@/hooks/album';
import StickerTile from './StickerTile';

interface AlbumPageGridProps {
  page: AlbumPageData;
  onMarkOwned: (stickerId: number) => void;
  onReduceOwned: (stickerId: number) => void;
  pendingStickerIds?: number[];
}

const GRID_COLS = 5; // Number of columns for priority calculation

export default function AlbumPageGrid({
  page,
  onMarkOwned,
  onReduceOwned,
  pendingStickerIds = [],
}: AlbumPageGridProps) {
  let slots: PageSlot[] = page.page_slots;

  if (page.kind === 'team') {
    slots = Array.from({ length: 20 }, (_, index) => {
      const existingSlot = page.page_slots.find(
        slot => slot.slot_index === index
      );
      return (existingSlot || {
        slot_index: index,
        sticker_id: null,
        stickers: null,
      }) as PageSlot;
    });
  }

  return (
    <div className="container mx-auto px-4 pt-6 pb-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {slots.map((slot, index) => {
          const isPending = slot.sticker_id
            ? pendingStickerIds.includes(slot.sticker_id)
            : false;

          return (
            <StickerTile
              key={slot.slot_index}
              slot={slot}
              pageKind={page.kind}
              isPriority={index < GRID_COLS * 2} // Prioritize first two rows
              onMarkOwned={onMarkOwned}
              onReduceOwned={onReduceOwned}
              isPending={isPending}
            />
          );
        })}
      </div>
    </div>
  );
}


