'use client';

import { useMyFavorites } from '@/hooks/social/useMyFavorites';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { User, Star, Package, Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/social/useFavorites';
import { toast } from 'sonner';
import AuthGuard from '@/components/AuthGuard';

function FavoritesContent() {
  const { favorites, loading, refetch } = useMyFavorites();
  const { toggleFavorite } = useFavorites();

  const handleRemove = async (userId: string) => {
    try {
      await toggleFavorite(userId);
      toast.success('Removed from favorites');
      refetch();
    } catch {
      toast.error('Failed to remove favorite');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-[#FFC000] border-r-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase text-white mb-2">
            My Favorites
          </h1>
          <p className="text-gray-400">
            Users you&apos;re following
          </p>
        </div>

        {/* Empty State */}
        {favorites.length === 0 && (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400 text-lg mb-4">
              No favorites yet
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Visit user profiles and add them to your favorites to see their listings here
            </p>
            <Link href="/marketplace">
              <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700]">
                Explore Marketplace
              </Button>
            </Link>
          </div>
        )}

        {/* Favorites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((favorite) => (
            <ModernCard key={favorite.favorite_user_id}>
              <ModernCardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  {/* Avatar */}
                  <Link href={`/users/${favorite.favorite_user_id}`}>
                    {favorite.avatar_url ? (
                      <Image
                        src={favorite.avatar_url}
                        alt={favorite.nickname}
                        width={80}
                        height={80}
                        className="rounded-full border-2 border-black hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-[#FFC000] border-2 border-black flex items-center justify-center hover:scale-105 transition-transform">
                        <User className="h-10 w-10 text-black" />
                      </div>
                    )}
                  </Link>

                  {/* Name */}
                  <Link href={`/users/${favorite.favorite_user_id}`}>
                    <h3 className="font-bold text-white text-lg hover:text-[#FFC000] transition-colors">
                      {favorite.nickname}
                    </h3>
                  </Link>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-400 w-full justify-center">
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      <span>{favorite.active_listings_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-[#FFC000] text-[#FFC000]" />
                      <span className="text-white font-bold">
                        {favorite.rating_avg?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 w-full">
                    <Link href={`/users/${favorite.favorite_user_id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        View Profile
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => handleRemove(favorite.favorite_user_id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </Button>
                  </div>

                  {/* Added Date */}
                  <p className="text-xs text-gray-500">
                    Added {new Date(favorite.created_at).toLocaleDateString()}
                  </p>
                </div>
              </ModernCardContent>
            </ModernCard>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <AuthGuard>
      <FavoritesContent />
    </AuthGuard>
  );
}
