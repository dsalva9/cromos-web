'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import type { Collection, Profile } from '@/types';
import { ArrowRightLeft } from 'lucide-react';

interface ComposerHeaderProps {
  fromUser: Profile | null;
  toUser: Profile;
  collection: Collection;
}

/**
 * Displays a header for the trade proposal composer, showing the two users
 * involved in the trade and the relevant collection.
 */
export function ComposerHeader({
  fromUser,
  toUser,
  collection,
}: ComposerHeaderProps) {
  const supabase = useSupabaseClient();
  const fromUserAvatar = fromUser?.avatar_url
    ? supabase.storage.from('avatars').getPublicUrl(fromUser.avatar_url).data
        .publicUrl
    : null;
  const toUserAvatar = toUser.avatar_url
    ? supabase.storage.from('avatars').getPublicUrl(toUser.avatar_url).data
        .publicUrl
    : null;

  const getInitials = (nickname?: string | null) => {
    return nickname ? nickname.substring(0, 2).toUpperCase() : '??';
  };

  return (
    <ModernCard className="bg-gray-800 border-2 border-black">
      <ModernCardContent className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-black">
              <AvatarImage
                src={fromUserAvatar ?? undefined}
                alt={fromUser?.nickname ?? 'T�'}
              />
              <AvatarFallback>{getInitials(fromUser?.nickname)}</AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <p className="text-lg font-bold text-white">
                {fromUser?.nickname ?? 'T�'}
              </p>
              <p className="text-sm text-gray-400">Ofertante</p>
            </div>
          </div>

          <ArrowRightLeft
            className="h-8 w-8 text-[#FFC000] shrink-0"
            aria-label="Intercambiando con"
          />

          <div className="flex items-center gap-4 flex-row-reverse sm:flex-row">
            <Avatar className="h-12 w-12 border-2 border-black">
              <AvatarImage
                src={toUserAvatar ?? undefined}
                alt={toUser.nickname ?? 'Usuario'}
              />
              <AvatarFallback>{getInitials(toUser.nickname)}</AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-right">
              <p className="text-lg font-bold text-white">{toUser.nickname}</p>
              <p className="text-sm text-gray-400">Receptor</p>
            </div>
          </div>
        </div>
        <div className="text-center mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 uppercase tracking-wider">
            Colecci�n
          </p>
          <p className="text-lg font-semibold text-white">{collection.name}</p>
        </div>
      </ModernCardContent>
    </ModernCard>
  );
}
