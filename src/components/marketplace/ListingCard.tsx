'use client';

import { useState, useEffect } from 'react';
import { UserLink } from '@/components/ui/user-link';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Ban, Trash2 } from 'lucide-react';
import { Listing } from '@/types/v1.6.0';
import { useUser } from '@/components/providers/SupabaseProvider';

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check if current user is admin
    const checkAdmin = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      setIsAdmin(data?.is_admin || false);
    };

    checkAdmin();
  }, [user]);

  const getStatusColor = (status: string, isPack: boolean = false) => {
    switch (status) {
      case 'active':
        // Pack badge gets dark blue color
        if (isPack) {
          return 'bg-blue-900/40 text-blue-300 border-blue-700/60';
        }
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'sold':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      case 'removed':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        // Show "Pack de cromos" or "Cromo" for active listings
        return listing.is_group ? 'Pack de cromos' : 'Cromo';
      case 'sold':
        return 'Vendido';
      case 'removed':
        return 'Eliminado';
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
      return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
    }
    const months = Math.floor(diffDays / 30);
    return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  };

  return (
    <Link
      href={`/marketplace/${listing.id}`}
      aria-label={`Ver anuncio: ${listing.title}`}
    >
      <div className="group relative h-full bg-gray-900/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-[#FFC000]/50 hover:shadow-[0_0_15px_rgba(255,192,0,0.1)] transition-all duration-300 hover:-translate-y-1">
        {/* Image Container */}
        <div className="relative aspect-square bg-gray-800/50">
          {listing.image_url ? (
            <Image
              src={listing.image_url}
              alt={`Imagen del anuncio ${listing.title}`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <div className="text-6xl font-black text-gray-700 group-hover:text-[#FFC000]/20 transition-colors">
                {listing.title.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            <span
              className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md ${getStatusColor(listing.status, listing.is_group)}`}
            >
              {getStatusLabel(listing.status)}
            </span>

            {/* Suspension Badge - Only visible to admins, hidden if author deleted or listing removed */}
            {isAdmin && listing.author_is_suspended && !listing.author_deleted_at && listing.status !== 'removed' && (
              <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md bg-red-900/60 text-red-300 border-red-700/60 flex items-center gap-1">
                <Ban className="h-3 w-3" />
                Suspendido
              </span>
            )}

            {/* Author Deletion Badge - Only visible to admins, hidden if listing removed */}
            {isAdmin && listing.author_deleted_at && listing.status !== 'removed' && (
              <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md bg-orange-900/60 text-orange-300 border-orange-700/60 flex items-center gap-1">
                <Trash2 className="h-3 w-3" />
                Autor eliminado
              </span>
            )}
          </div>

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60" />
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Header: Title & Price/Number */}
          <div className="space-y-1">
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-bold text-white text-lg line-clamp-1 group-hover:text-[#FFC000] transition-colors">
                {listing.title}
              </h3>
              {listing.sticker_number && (
                <span className="shrink-0 px-1.5 py-0.5 rounded bg-white/10 text-white/90 text-xs font-mono border border-white/10">
                  #{listing.sticker_number}
                </span>
              )}
            </div>
            
            {listing.collection_name && (
              <p className="text-sm text-gray-400 line-clamp-1">
                {listing.collection_name}
              </p>
            )}
          </div>

          {/* Footer Info */}
          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <UserLink
                userId={listing.user_id}
                nickname={listing.author_nickname}
                variant="subtle"
                className="hover:text-white transition-colors truncate"
                forceSpan={true}
              />
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {listing.distance_km !== undefined && listing.distance_km !== null && (
                <div className="flex items-center gap-1 text-[#FFC000]">
                  <MapPin className="h-3 w-3" />
                  <span>{listing.distance_km}km</span>
                </div>
              )}
              <span className="text-gray-600">•</span>
              <span>{formatDate(listing.created_at)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
