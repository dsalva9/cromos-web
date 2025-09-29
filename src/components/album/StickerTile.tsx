'use client';

import Image from 'next/image';
import { PageSlot } from '@/hooks/album';
import { cn } from '@/lib/utils';
import { Shield, User, Shirt, Star } from 'lucide-react';

interface StickerTileProps {
  slot: PageSlot;
  pageKind: 'team' | 'special';
  isPriority: boolean; // For image loading
}

function getTeamSlotRole(slotIndex: number): string {
    if (slotIndex === 0) return 'badge';
    if (slotIndex === 1) return 'manager';
    return 'player';
}

function getAltText(sticker: PageSlot['stickers'], pageKind: 'team' | 'special', slotIndex: number): string {
    if (!sticker) return "Cromo no disponible";

    const role = pageKind === 'team' ? getTeamSlotRole(slotIndex) : 'special';

    switch (role) {
        case 'badge':
            return `Escudo del ${sticker.team_name}`;
        case 'manager':
            return `Entrenador de ${sticker.team_name}`;
        case 'player':
            return `${sticker.player_name} — ${sticker.team_name}`;
        default:
            return `${sticker.player_name} — ${sticker.collection?.name}`;
    }
}

export default function StickerTile({ slot, pageKind, isPriority }: StickerTileProps) {
  const sticker = slot.stickers;
  const ownership = sticker?.user_stickers?.[0];
  const isOwned = ownership && ownership.count > 0;
  const repeCount = ownership && ownership.count > 1 ? ownership.count - 1 : 0;

  const altText = getAltText(sticker, pageKind, slot.slot_index);
  const slotRole = pageKind === 'team' ? getTeamSlotRole(slot.slot_index) : 'special';

  const renderPlaceholder = () => {
    let Icon = Shirt;
    if (slotRole === 'badge') Icon = Shield;
    if (slotRole === 'manager') Icon = User;

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800/50 border-2 border-dashed border-white/20 rounded-xl p-2">
            <Icon className="w-8 h-8 text-white/30 mb-2" />
            <span className="text-xs text-center font-semibold text-white/40">{sticker?.player_name ?? `#${slot.slot_index}`}</span>
        </div>
    );
  };

  return (
    <div className="aspect-[3/4] w-full relative rounded-xl overflow-hidden shadow-lg transition-transform duration-200 hover:scale-105">
      {isOwned && sticker?.thumb_public_url ? (
        <>
          <Image
            src={sticker.thumb_public_url}
            alt={altText}
            fill
            className="object-cover bg-gray-700"
            priority={isPriority}
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 15vw"
          />
          <div className="absolute inset-0 bg-black/10" />
          {repeCount > 0 && (
            <div className="absolute top-1.5 right-1.5 bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
              REPE ({repeCount})
            </div>
          )}
          <div className="absolute bottom-1.5 left-1.5 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
            TENGO
          </div>
        </>
      ) : (
        renderPlaceholder()
      )}
    </div>
  );
}