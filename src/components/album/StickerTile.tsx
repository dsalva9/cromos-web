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
  if (
    typeof sticker.collection_teams === 'object' &&
    sticker.collection_teams !== null
  ) {
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
  const slotRole =
    pageKind === 'team' ? getTeamSlotRole(slot.slot_index) : 'special';
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
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/50 border-2 border-dashed border-gray-700 rounded-lg p-2 text-center">
        <Icon className="w-8 h-8 text-gray-600 mb-2" />
        <span className="text-xs font-semibold text-gray-500">
          #{slot.slot_index + 1}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-[3/4] w-full relative rounded-lg overflow-hidden bg-gray-800 border-2 border-black shadow-xl">
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
          </>
        ) : (
          renderPlaceholder()
        )}

        {isWanted && (
          <div className="absolute top-2 right-2 bg-[#FFC000] text-gray-900 border-2 border-black px-2 py-0.5 font-extrabold">
            QUIERO
          </div>
        )}

        {repeCount > 0 && (
          <div className="absolute top-2 right-2 bg-[#E84D4D] text-white border-2 border-black px-2 py-0.5 font-extrabold">
            REPE
          </div>
        )}

        {sticker && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-2 text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
            <p className="font-bold text-base uppercase truncate">
              {sticker.player_name}
            </p>
            <p className="text-xs opacity-90 truncate">{teamName}</p>
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
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              className={`flex-1 text-xs rounded-md transition-all duration-200 ${
                ownedCount > 0
                  ? 'bg-[#FFC000] text-gray-900 font-bold border border-black hover:bg-yellow-400'
                  : 'bg-gray-700 text-white font-bold border border-black hover:bg-gray-600'
              }`}
              onClick={handleIncrease}
              disabled={disabledIncrease}
            >
              {ownedCount === 0 ? 'TENGO' : `REPE (+${repeCount})`}
            </Button>

            <div className="flex gap-2">
              {ownedCount > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-lg font-bold border-black bg-gray-700 text-white hover:bg-gray-600"
                  onClick={handleDecrease}
                  disabled={disabledDecrease}
                >
                  -
                </Button>
              ) : (
                <Button
                  size="sm"
                  className={`w-full text-xs rounded-md transition-all duration-200 ${
                    isWanted
                      ? 'bg-[#E84D4D] text-white font-bold border border-black hover:bg-red-600'
                      : 'bg-[#FFC000] text-gray-900 font-bold border border-black hover:bg-yellow-400'
                  }`}
                  onClick={handleToggleWanted}
                  disabled={disabledWanted}
                >
                  {isWanted ? 'YA NO' : 'LO QUIERO'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
