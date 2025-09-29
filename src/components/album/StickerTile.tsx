'use client';

import Image from 'next/image';
import { Shield, User, Shirt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSlot } from '@/hooks/album';

interface StickerTileProps {
  slot: PageSlot;
  pageKind: 'team' | 'special';
  isPriority: boolean; // For image loading
  onMarkOwned: (stickerId: number) => void;
  onReduceOwned: (stickerId: number) => void;
  onToggleWanted: (stickerId: number) => void;
  isPending?: boolean;
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
  if (typeof sticker.collection_teams === 'object' && sticker.collection_teams !== null) {
    return (sticker.collection_teams as { team_name: string }).team_name;
  }
  return 'Equipo Desconocido';
}

function getAltText(
  sticker: PageSlot['stickers'],
  pageKind: 'team' | 'special',
  slotIndex: number
): string {
  if (!sticker) return 'Cromo no disponible';

  const role = pageKind === 'team' ? getTeamSlotRole(slotIndex) : 'special';
  const teamName = getTeamName(sticker);

  switch (role) {
    case 'badge':
      return `Escudo del ${teamName}`;
    case 'manager':
      return `Entrenador de ${teamName}`;
    case 'player':
      return `${sticker.player_name} - ${teamName}`;
    default:
      return sticker.player_name;
  }
}

export default function StickerTile({
  slot,
  pageKind,
  isPriority,
  onMarkOwned,
  onReduceOwned,
  onToggleWanted,
  isPending = false,
}: StickerTileProps) {
  const sticker = slot.stickers;
  const ownership = sticker?.user_stickers?.[0];
  const ownedCount = ownership?.count ?? 0;
  const repeCount = Math.max(ownedCount - 1, 0);
  const stickerId = slot.sticker_id ?? null;
  const isWanted = Boolean(ownership?.wanted && ownedCount === 0);

  const altText = getAltText(sticker, pageKind, slot.slot_index);
  const slotRole = pageKind === 'team' ? getTeamSlotRole(slot.slot_index) : 'special';
  const teamName = getTeamName(sticker);

  const disabledIncrease = !stickerId || isPending;
  const disabledDecrease = !stickerId || isPending || ownedCount === 0;
  const disabledWanted = !stickerId || isPending || ownedCount > 0;

  const handleIncrease = () => {
    if (!stickerId || disabledIncrease) return;
    onMarkOwned(stickerId);
  };

  const handleDecrease = () => {
    if (!stickerId || disabledDecrease) return;
    onReduceOwned(stickerId);
  };

  const handleToggleWanted = () => {
    if (!stickerId || disabledWanted) return;
    onToggleWanted(stickerId);
  };

  const renderPlaceholder = () => {
    let Icon = Shirt;
    if (slotRole === 'badge') Icon = Shield;
    if (slotRole === 'manager') Icon = User;

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/30 border-2 border-dashed border-white/20 rounded-xl p-2 text-center">
        <Icon className="w-8 h-8 text-white/30 mb-2" />
        <span className="text-xs font-semibold text-white/40">#{slot.slot_index + 1}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-[3/4] w-full relative rounded-xl overflow-hidden shadow-lg bg-gray-700/20">
        {sticker && sticker.thumb_public_url ? (
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
          </>
        ) : sticker && sticker.image_public_url ? (
          <>
            <Image
              src={sticker.image_public_url}
              alt={altText}
              fill
              className="object-cover"
              priority={isPriority}
              sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 15vw"
            />
            <div className="absolute inset-0 bg-black/10" />
          </>
        ) : (
          renderPlaceholder()
        )}

        {isWanted && (
          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
            QUIERO
          </div>
        )}

        {repeCount > 0 && (
          <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
            REPE (+{repeCount})
          </div>
        )}

        {sticker && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white">
            <p className="font-bold text-sm truncate">{sticker.player_name}</p>
            <p className="text-xs opacity-80 truncate">{teamName}</p>
          </div>
        )}

        {isPending && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="h-6 w-6 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {sticker && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className={`flex-1 text-xs font-bold rounded-xl transition-all duration-200 ${
                ownedCount > 0
                  ? 'bg-green-500 hover:bg-green-600 text-white shadow-md'
                  : 'bg-white/90 text-green-600 border border-green-500 hover:bg-green-50 shadow-sm'
              }`}
              onClick={handleIncrease}
              disabled={disabledIncrease}
            >
              {ownedCount === 0 ? 'TENGO' : `TENGO (${ownedCount})`}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="w-10 h-9 text-lg font-bold border-green-400 text-green-600 hover:bg-green-50"
              onClick={handleDecrease}
              disabled={disabledDecrease}
            >
              -
            </Button>
          </div>

          <Button
            size="sm"
            className={`w-full text-xs font-bold rounded-xl transition-all duration-200 ${
              isWanted
                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md'
                : 'bg-white/90 text-blue-600 border border-blue-500 hover:bg-blue-50 shadow-sm'
            }`}
            onClick={handleToggleWanted}
            disabled={disabledWanted}
          >
            {isWanted ? 'YA NO' : 'QUIERO'}
          </Button>
        </div>
      )}
    </div>
  );
}
