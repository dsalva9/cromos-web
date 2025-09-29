'use client';

import { AlbumPageData, PageSlot } from '@/hooks/album';
import StickerTile from './StickerTile';

interface AlbumPageGridProps {
  page: AlbumPageData;
}

const GRID_COLS = 5; // Number of columns for priority calculation

export default function AlbumPageGrid({ page }: AlbumPageGridProps) {
  let slots: (PageSlot | { slot_index: number, sticker_id: null, stickers: null })[] = page.page_slots;

  if (page.kind === 'team') {
    const allSlots = Array.from({ length: 20 }, (_, i) => {
      const existingSlot = page.page_slots.find(s => s.slot_index === i);
      return existingSlot || { slot_index: i, sticker_id: null, stickers: null };
    });
    slots = allSlots;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
        {slots.map((slot, index) => (
          <StickerTile
            key={slot.slot_index}
            slot={slot as PageSlot}
            pageKind={page.kind}
            isPriority={index < GRID_COLS * 2} // Prioritize first two rows
          />
        ))}
      </div>
    </div>
  );
}