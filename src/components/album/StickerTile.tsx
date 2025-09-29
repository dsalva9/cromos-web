'use client';

import Image from 'next/image';
import { PageSlot } from '@/hooks/album';
import { Shield, User, Shirt } from 'lucide-react';

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

function getTeamName(sticker: PageSlot['stickers']): string {
    if (!sticker?.collection_teams) return 'Equipo Desconocido';
    if (Array.isArray(sticker.collection_teams)) {
        return sticker.collection_teams[0]?.team_name || 'Equipo Desconocido';
    }
    // The type from Supabase can be a single object if it's a to-one relationship
    if (typeof sticker.collection_teams === 'object' && sticker.collection_teams !== null) {
        return (sticker.collection_teams as { team_name: string }).team_name;
    }
    return 'Equipo Desconocido';
}


function getAltText(sticker: PageSlot['stickers'], pageKind: 'team' | 'special', slotIndex: number): string {
    if (!sticker) return "Cromo no disponible";

    const role = pageKind === 'team' ? getTeamSlotRole(slotIndex) : 'special';
    const teamName = getTeamName(sticker);

    switch (role) {
        case 'badge':
            return `Escudo del ${teamName}`;
        case 'manager':
            return `Entrenador de ${teamName}`;
        case 'player':
            return `${sticker.player_name} — ${teamName}`;
        default:
            return sticker.player_name;
    }
}

export default function StickerTile({ slot, pageKind, isPriority }: StickerTileProps) {
  const sticker = slot.stickers;
  const ownership = sticker?.user_stickers?.[0];
  const isOwned = ownership && ownership.count > 0;
  const repeCount = ownership && ownership.count > 1 ? ownership.count - 1 : 0;

  const altText = getAltText(sticker, pageKind, slot.slot_index);
  const slotRole = pageKind === 'team' ? getTeamSlotRole(slot.slot_index) : 'special';
  const teamName = getTeamName(sticker);

  const renderPlaceholder = () => {
    let Icon = Shirt;
    if (slotRole === 'badge') Icon = Shield;
    if (slotRole === 'manager') Icon = User;

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800/50 border-2 border-dashed border-white/20 rounded-xl p-2 text-center">
            <Icon className="w-8 h-8 text-white/30 mb-2" />
            <span className="text-xs font-semibold text-white/40">{sticker?.player_name ?? `#${slot.slot_index + 1}`}</span>
        </div>
    );
  };

  return (
    <div className="aspect-[3/4] w-full relative rounded-xl overflow-hidden shadow-lg bg-gray-700/20">
      {isOwned && sticker?.thumb_public_url ? (
        <>
          <Image
            src={sticker.thumb_public_url}
            alt={altText}
            fill
            className="object-cover"
            priority={isPriority}
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 15vw"
          />
          <div className="absolute inset-0 bg-black/10" />
          {repeCount > 0 && (
            <div className="absolute top-1.5 right-1.5 bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg z-10">
              REPE ({repeCount})
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white">
            <p className="font-bold text-sm truncate">{sticker.player_name}</p>
            <p className="text-xs opacity-80">{teamName}</p>
          </div>
        </>
      ) : (
        renderPlaceholder()
      )}
    </div>
  );
}
