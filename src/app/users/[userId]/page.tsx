'use client';

import { useParams } from 'next/navigation';
import { useUserProfile } from '@/hooks/social/useUserProfile';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { User, Star, Heart, Package } from 'lucide-react';
import { FavoriteButton } from '@/components/social/FavoriteButton';
import { useUser } from '@/components/providers/SupabaseProvider';

export default function UserProfilePage() {
  const params = useParams();
  const { user: currentUser } = useUser();
  const userId = params.userId as string;

  const { profile, listings, loading, error } = useUserProfile(userId);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-[#FFC000] border-r-transparent rounded-full" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">User not found</p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userId;

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <ModernCard className="mb-8">
          <ModernCardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.nickname}
                    width={120}
                    height={120}
                    className="rounded-full border-4 border-black"
                  />
                ) : (
                  <div className="w-30 h-30 rounded-full bg-[#FFC000] border-4 border-black flex items-center justify-center">
                    <User className="h-16 w-16 text-black" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-black text-white mb-2">
                      {profile.nickname}
                    </h1>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-5 w-5 fill-[#FFC000] text-[#FFC000]" />
                        <span className="text-white font-bold text-lg">
                          {profile.rating_avg.toFixed(1)}
                        </span>
                      </div>
                      <span className="text-gray-400">
                        ({profile.rating_count} {profile.rating_count === 1 ? 'rating' : 'ratings'})
                      </span>
                    </div>

                    {/* Badges */}
                    <div className="flex gap-2">
                      {profile.is_admin && (
                        <Badge className="bg-red-600 text-white">Admin</Badge>
                      )}
                      {profile.is_suspended && (
                        <Badge className="bg-gray-600 text-white">Suspended</Badge>
                      )}
                    </div>
                  </div>

                  {/* Favorite Button */}
                  {!isOwnProfile && currentUser && (
                    <FavoriteButton userId={userId} />
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                  <div className="text-center">
                    <Package className="h-6 w-6 mx-auto mb-2 text-[#FFC000]" />
                    <p className="text-2xl font-black text-white">
                      {listings.length}
                    </p>
                    <p className="text-sm text-gray-400">Active Listings</p>
                  </div>

                  <div className="text-center">
                    <Heart className="h-6 w-6 mx-auto mb-2 text-[#FFC000]" />
                    <p className="text-2xl font-black text-white">
                      {profile.favorites_count}
                    </p>
                    <p className="text-sm text-gray-400">Favorites</p>
                  </div>

                  <div className="text-center">
                    <Star className="h-6 w-6 mx-auto mb-2 text-[#FFC000]" />
                    <p className="text-2xl font-black text-white">
                      {profile.rating_count}
                    </p>
                    <p className="text-sm text-gray-400">Ratings</p>
                  </div>
                </div>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>

        {/* Listings */}
        <div className="mb-4">
          <h2 className="text-2xl font-black text-white mb-4">
            Active Listings
          </h2>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">
              No active listings yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
