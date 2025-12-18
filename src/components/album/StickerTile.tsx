'use client';

import Image from 'next/image';
import { Shield, User, Shirt, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PageSlot } from '@/hooks/album';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface StickerTileProps {
  slot: PageSlot;
  pageKind: 'team' | 'special';
  isPriority: boolean; // For image loading
  onMarkOwned: (stickerId: number) => void;
  onReduceOwned: (stickerId: number) => void;
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
  isPending = false,
}: StickerTileProps) {
  const sticker = slot.stickers;
  const ownership = sticker?.user_stickers?.[0];
  const ownedCount = ownership?.count ?? 0;
  const repeCount = Math.max(ownedCount - 1, 0);
  const stickerId = slot.sticker_id ?? null;

  const altText = getAltText(sticker, pageKind, slot.slot_index);
  const slotRole =
    pageKind === 'team' ? getTeamSlotRole(slot.slot_index) : 'special';
  const teamName = getTeamName(sticker);

  const disabledIncrease = !stickerId || isPending;
  const disabledDecrease = !stickerId || isPending || ownedCount === 0;

  const handleIncrease = () => {
    if (!stickerId || disabledIncrease) return;
    onMarkOwned(stickerId);
  };

  const handleDecrease = () => {
    if (!stickerId || disabledDecrease) return;
    onReduceOwned(stickerId);
  };

  const renderPlaceholder = () => {
    let Icon = Shirt;
    if (slotRole === 'badge') Icon = Shield;
    if (slotRole === 'manager') Icon = User;

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white border-2 border-dashed border-gray-200 rounded-md p-2 text-center">
        <Icon className="w-8 h-8 text-gray-600 mb-2" />
        <span className="text-xs font-bold text-gray-600 uppercase">
          #{slot.slot_index + 1}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleIncrease}
        disabled={disabledIncrease}
        className={cn(
          'aspect-[3/4] w-full relative rounded-md overflow-hidden bg-white border-2 border-black shadow-xl group focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed transition-all',
          ownedCount === 0 && 'grayscale hover:grayscale-0'
        )}
        aria-label={`A�adir ${sticker?.player_name ?? 'cromo'}`}
      >
        {sticker && sticker.thumb_public_url ? (
          <Image
            src={sticker.thumb_public_url}
            alt={altText}
            fill
            className="object-cover"
            priority={isPriority}
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 15vw"
          />
        ) : sticker && sticker.image_public_url ? (
          <Image
            src={sticker.image_public_url}
            alt={altText}
            fill
            className="object-cover"
            priority={isPriority}
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 15vw"
          />
        ) : (
          renderPlaceholder()
        )}

        {/* Desktop-only Badges */}
        <div className="hidden sm:block">
          {repeCount > 0 ? (
            <div className="absolute top-2 right-2 bg-green-500 text-white border-2 border-black px-2 py-0.5 font-semibold">
              +{repeCount}
            </div>
          ) : ownedCount > 0 ? (
            <div className="absolute top-2 right-2 bg-green-500 text-white border-2 border-black p-1">
              <Check className="h-4 w-4" />
            </div>
          ) : null}
        </div>

        {/* Mobile Dropdown Trigger via Badges */}
        <div className="sm:hidden absolute top-2 right-2 z-10">
          <DropdownMenu>
            {ownedCount > 0 && (
              <DropdownMenuTrigger
                asChild
                onClick={e => e.stopPropagation()} // Prevent parent button click
              >
                {repeCount > 0 ? (
                  <div className="border-2 border-black px-2 py-0.5 font-semibold cursor-pointer bg-green-500 text-white">
                    +{repeCount}
                  </div>
                ) : (
                  <div className="bg-green-500 text-white border-2 border-black p-1 cursor-pointer">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </DropdownMenuTrigger>
            )}
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={e => {
                  e.stopPropagation();
                  handleDecrease();
                }}
                disabled={disabledDecrease}
              >
                Quitar uno
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {sticker && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-2 drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
            <p className="font-bold text-base uppercase truncate text-white">
              {sticker.player_name}
            </p>
            <p className="text-xs truncate text-gray-300">{teamName}</p>
          </div>
        )}

        {isPending && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="h-6 w-6 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </button>

      {sticker && (
        <div className="flex flex-col gap-2 sm:grid">
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              className="hidden sm:flex flex-1 text-xs rounded-md transition-all duration-200 bg-white text-gray-900 font-bold border-2 border-black hover:bg-gray-100 focus:ring-[#FFC000] relative"
              onClick={handleIncrease}
              disabled={disabledIncrease}
            >
              TENGO
              {ownedCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-black">
                  +{ownedCount}
                </span>
              )}
            </Button>

            {ownedCount > 0 && (
              <div className="hidden sm:flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-lg font-bold border-2 border-black bg-[#E84D4D] text-white hover:bg-red-600 focus:ring-[#FFC000]"
                  onClick={handleDecrease}
                  disabled={disabledDecrease}
                  aria-label="Quitar uno"
                >
                  -
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



