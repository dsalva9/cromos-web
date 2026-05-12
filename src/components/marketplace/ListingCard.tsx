'use client';

import { UserLink } from '@/components/ui/user-link';
import Link from '@/components/ui/link';
import Image from 'next/image';
import { MapPin, Ban, Trash2, Flame } from 'lucide-react';
import { Listing } from '@/types/v1.6.0';
import '@/styles/highlight-animation.css';
import { useUser, useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';
import { ListingFavoriteButton } from '@/components/marketplace/ListingFavoriteButton';
import { resolveAvatarUrl, getAvatarFallback } from '@/lib/profile/resolveAvatarUrl';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ListingCardProps {
  listing: Listing;
}

/** Check if a listing was created within the last 12 hours */
function isNewListing(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return now - created < 12 * 60 * 60 * 1000;
}

/** Human-readable relative time in Spanish (hours/minutes granularity) */
function formatRelativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'ahora mismo';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours}h`;
}

export function ListingCard({ listing }: ListingCardProps) {
  const { user } = useUser();
  const supabase = useSupabaseClient(); // For avatar resolution if needed
  const { isAdmin } = useProfileCompletion();

  const isNew = isNewListing(listing.created_at);
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
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn(
        "group relative h-full flex flex-col bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border shadow-sm dark:shadow-md transition-colors duration-300",
        isNew
          ? "border-orange-300/70 dark:border-orange-500/40 animate-flame-pulse"
          : "border-gray-200/60 dark:border-gray-700/50"
      )}
    >
      <Link href={`/marketplace/${listing.id}`} className="absolute inset-0 z-10" aria-label={`Ver anuncio: ${listing.title}`} />

      {/* Image Container */}
      <div className="relative aspect-square bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden flex items-center justify-center">
        {listing.image_url ? (
          <Image
            src={listing.image_url}
            alt={listing.title}
            fill
            className="object-contain transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100/80 dark:from-gray-800 dark:to-gray-900">
            <span className="text-5xl font-black text-amber-300/60 dark:text-gray-600 select-none">
              {listing.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Favorite Button (z-20 to be clickable over the link) */}
        <div className="absolute top-2 left-2 z-20">
          <ListingFavoriteButton listingId={listing.id} variant="icon" />
        </div>

        {/* Status / New Badge */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10 pointer-events-none">
          {isNew && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100/90 text-orange-700 border border-orange-300/60 backdrop-blur-sm shadow-sm dark:bg-orange-900/60 dark:text-orange-200 dark:border-orange-600/40">
              <Flame className="h-3 w-3" />
              Nuevo
            </span>
          )}
          {getStatusLabel(listing.status) && (
            <span
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-sm shadow-sm",
                getStatusColor(listing.status, listing.is_group ?? false)
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
          <h3 className="font-bold text-gray-900 dark:text-white leading-tight line-clamp-2 text-sm group-hover:text-primary transition-colors">
            {listing.title}
          </h3>
          {listing.collection_name && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
              {listing.collection_name}
            </p>
          )}
        </div>

        {/* User Info Row */}
        <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="z-20 relative block shrink-0">
            <Link href={`/users/${listing.user_id}`} className="block">
              <div className="relative w-6 h-6 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 ring-1 ring-gray-100 dark:ring-gray-700">
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
          </div>

          <div className="flex flex-col min-w-0 z-20 relative">
            <UserLink
              userId={listing.user_id}
              nickname={listing.author_nickname}
              variant="default"
              className="text-xs font-medium text-gray-900 dark:text-white hover:text-primary truncate block max-w-[100px] !text-gray-900 dark:!text-white transition-colors"
              forceSpan={false}
            />
            <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
              {listing.distance_km !== undefined && listing.distance_km !== null && (
                <span className="flex items-center">
                  <MapPin className="h-3 w-3 mr-0.5" />
                  {listing.distance_km}km
                </span>
              )}
              {isNew && (
                <>
                  {listing.distance_km != null && <span>·</span>}
                  <span className="flex items-center gap-0.5 text-orange-600 dark:text-orange-400 font-semibold">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    {formatRelativeTime(listing.created_at)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-2 z-20 relative">
          <Link href={`/marketplace/${listing.id}`} className="block w-full">
            <button className="w-full bg-gold hover:bg-gold-light text-black font-black text-xs uppercase py-2.5 rounded-xl transition-all duration-200 shadow-sm hover:shadow">
              Ver Detalles
            </button>
          </Link>
        </div>
      </div>
    </motion.div>

  );
}
