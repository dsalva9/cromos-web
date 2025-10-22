'use client';

import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import Link from 'next/link';
import Image from 'next/image';
import { User, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Listing } from '@/types/v1.6.0';

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'sold':
        return 'bg-gray-500';
      case 'removed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <Link href={`/marketplace/${listing.id}`} aria-label={`Ver anuncio: ${listing.title}`}>
      <ModernCard className="hover:scale-105 transition-transform cursor-pointer h-full">
        <ModernCardContent className="p-0">
          {/* Image */}
          <div className="relative aspect-square bg-[#374151]">
            {listing.image_url ? (
              <Image
                src={listing.image_url}
                alt={`Imagen del anuncio ${listing.title}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-6xl font-black text-gray-600">
                  {listing.title.charAt(0).toUpperCase()}
                </div>
              </div>
            )}

            {/* Status Badge */}
            <div className="absolute top-2 right-2">
              <Badge
                className={`${getStatusColor(listing.status)} text-white uppercase text-xs border-2 border-black`}
              >
                {listing.status}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-2">
            {/* Title */}
            <h3 className="font-bold text-white text-lg line-clamp-2">
              {listing.title}
            </h3>

            {/* Collection & Number */}
            {(listing.collection_name || listing.sticker_number) && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                {listing.collection_name && (
                  <span className="line-clamp-1">
                    {listing.collection_name}
                  </span>
                )}
                {listing.sticker_number && (
                  <Badge variant="outline" className="text-xs border-black">
                    #{listing.sticker_number}
                  </Badge>
                )}
              </div>
            )}

            {/* Author */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <User className="h-4 w-4" />
                <span className="line-clamp-1">{listing.author_nickname}</span>
              </div>

              {/* Views */}
              <div className="flex items-center gap-1 text-gray-500">
                <Eye className="h-4 w-4" />
                <span>{listing.views_count}</span>
              </div>
            </div>

            {/* Date */}
            <p className="text-xs text-gray-500">
              {formatDate(listing.created_at)}
            </p>
          </div>
        </ModernCardContent>
      </ModernCard>
    </Link>
  );
}
