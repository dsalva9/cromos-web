'use client';

import { AlbumPageData, PageSlot } from '@/hooks/album';
import StickerTile from './StickerTile';

interface AlbumPageGridProps {
  page: AlbumPageData;
  onMarkOwned: (stickerId: number) => void;
  onReduceOwned: (stickerId: number) => void;
  onToggleWanted: (stickerId: number) => void;
  pendingStickerIds?: number[];
}

const GRID_COLS = 5; // Number of columns for priority calculation

export default function AlbumPageGrid({
  page,
  onMarkOwned,
  onReduceOwned,
  onToggleWanted,
  pendingStickerIds = [],
}: AlbumPageGridProps) {
  // Use actual slots from the page - no padding for team pages
  const slots: PageSlot[] = page.page_slots;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
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
              onToggleWanted={onToggleWanted}
              isPending={isPending}
            />
          );
        })}
      </div>
    </div>
  );
}
