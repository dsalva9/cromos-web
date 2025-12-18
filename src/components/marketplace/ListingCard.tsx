'use client';

import { useState, useEffect } from 'react';
import { UserLink } from '@/components/ui/user-link';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Ban, Trash2 } from 'lucide-react';
import { Listing } from '@/types/v1.6.0';
import { useUser, useSupabase } from '@/components/providers/SupabaseProvider';
import { ListingFavoriteButton } from '@/components/marketplace/ListingFavoriteButton';
import { resolveAvatarUrl, getAvatarFallback } from '@/lib/profile/resolveAvatarUrl';
import { cn } from '@/lib/utils';

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const { user } = useUser();
  const { supabase } = useSupabase(); // For avatar resolution if needed
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check if current user is admin
    const checkAdmin = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabaseClient = createClient();
      const { data } = await supabaseClient
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      setIsAdmin(data?.is_admin || false);
    };

    checkAdmin();
  }, [user]);

  const avatarUrl = resolveAvatarUrl(listing.author_avatar_url, supabase);
  const fallback = getAvatarFallback(listing.author_nickname);

  const getStatusColor = (status: string, isPack: boolean = false) => {
    switch (status) {
      case 'active':
        if (isPack) return 'bg-blue-100 text-blue-800 border-blue-200';
        return 'bg-green-100 text-green-800 border-green-200';
      case 'sold':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'removed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return listing.is_group ? 'PACK' : null; // Only show PACK for groups
      case 'sold':
        return 'VENDIDO';
      case 'removed':
        return 'ELIMINADO';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'hoy';
    if (diffDays === 1) return 'ayer';
    if (diffDays < 7)
      return `hace ${diffDays} ${diffDays === 1 ? 'd' : 'd'}`;
    return `hace ${diffDays}d`;
  };

  return (
    <div className="group relative h-full flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      <Link href={`/marketplace/${listing.id}`} className="absolute inset-0 z-0" aria-label={`Ver anuncio: ${listing.title}`} />

      {/* Image Container */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {listing.image_url ? (
          <Image
            src={listing.image_url}
            alt={listing.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300 font-bold text-6xl">
            {listing.title.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Favorite Button (z-20 to be clickable over the link) */}
        <div className="absolute top-2 left-2 z-20">
          <ListingFavoriteButton listingId={listing.id} variant="icon" />
        </div>

        {/* Status Badge */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10 pointer-events-none">
          {getStatusLabel(listing.status) && (
            <span
              className={cn(
                "px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border",
                getStatusColor(listing.status, listing.is_group)
              )}
            >
              {getStatusLabel(listing.status)}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        {/* Title & Collection */}
        <div className="min-h-[3rem]">
          <h3 className="font-bold text-gray-900 leading-tight line-clamp-2 text-sm group-hover:text-primary transition-colors">
            {listing.title}
          </h3>
          {listing.collection_name && (
            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
              {listing.collection_name}
            </p>
          )}
        </div>

        {/* User Info Row */}
        <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-100">
          <Link href={`/users/${listing.user_id}`} className="z-10 relative block shrink-0">
            <div className="relative w-6 h-6 rounded-full overflow-hidden bg-gray-200 ring-1 ring-gray-100">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={listing.author_nickname}
                  fill
                  className="object-cover"
                  sizes="24px"
                />
              ) : (
                <div
                  className={cn(
                    'w-full h-full flex items-center justify-center text-[10px] font-bold text-black',
                    fallback.gradientClass
                  )}
                >
                  {fallback.initial}
                </div>
              )}
            </div>
          </Link>

          <div className="flex flex-col min-w-0">
            <UserLink
              userId={listing.user_id}
              nickname={listing.author_nickname}
              variant="default"
              className="text-xs font-medium text-gray-900 hover:text-primary truncate block max-w-[100px] !text-gray-900 transition-colors"
              forceSpan={false}
            />
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              {listing.distance_km !== undefined && listing.distance_km !== null && (
                <span className="flex items-center">
                  <MapPin className="h-3 w-3 mr-0.5" />
                  {listing.distance_km}km
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-2 z-20 relative">
          <Link href={`/marketplace/${listing.id}`} className="block w-full">
            <button className="w-full bg-[#FFC000] hover:bg-[#FFD700] text-black font-black text-xs uppercase py-2.5 rounded-lg transition-colors shadow-sm">
              Ver Detalles
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
