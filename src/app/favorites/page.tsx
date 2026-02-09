'use client';

import { useState } from 'react';
import { useMyFavorites } from '@/hooks/social/useMyFavorites';
import { useMyFavoriteListings } from '@/hooks/marketplace/useMyFavoriteListings';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { User, Star, Package, Heart, ShoppingBag } from 'lucide-react';
import { useFavorites } from '@/hooks/social/useFavorites';
import { useListingFavorite } from '@/hooks/marketplace/useListingFavorite';
import { toast } from 'sonner';
import AuthGuard from '@/components/AuthGuard';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { resolveAvatarUrl } from '@/lib/profile/resolveAvatarUrl';

type TabType = 'users' | 'listings';

function FavoritesContent() {
  const [activeTab, setActiveTab] = useState<TabType>('listings');
  const { favorites: userFavorites, loading: usersLoading, refetch: refetchUsers } = useMyFavorites();
  const { favorites: listingFavorites, loading: listingsLoading, refetch: refetchListings } = useMyFavoriteListings();
  const { toggleFavorite } = useFavorites();
  const { toggleFavorite: toggleListingFavorite } = useListingFavorite();
  const { supabase } = useSupabase();

  const handleRemoveUser = async (userId: string) => {
    try {
      await toggleFavorite(userId);
      toast.success('Usuario eliminado de favoritos');
      refetchUsers();
    } catch {
      toast.error('No se pudo eliminar el favorito');
    }
  };

  const handleRemoveListing = async (listingId: number) => {
    try {
      await toggleListingFavorite(listingId);
      toast.success('Anuncio eliminado de favoritos');
      refetchListings();
    } catch {
      toast.error('No se pudo eliminar el favorito');
    }
  };

  const isLoading = usersLoading || listingsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-[#FFC000] border-r-transparent rounded-full" />
      </div>
    );
  }

  const hasNoFavorites = userFavorites.length === 0 && listingFavorites.length === 0;
  const currentTabHasNoFavorites =
    (activeTab === 'users' && userFavorites.length === 0) ||
    (activeTab === 'listings' && listingFavorites.length === 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase text-gray-900 dark:text-white mb-2">
            Mis favoritos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Usuarios y anuncios que has marcado como favoritos
          </p>
        </div>

        {/* Tabs */}
        {!hasNoFavorites && (
          <div className="mb-8 flex gap-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('users')}
              className={`
                pb-4 px-2 font-bold transition-colors relative
                ${activeTab === 'users'
                  ? 'text-[#FFC000]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <span>Usuarios</span>
                {userFavorites.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs">
                    {userFavorites.length}
                  </span>
                )}
              </div>
              {activeTab === 'users' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFC000]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('listings')}
              className={`
                pb-4 px-2 font-bold transition-colors relative
                ${activeTab === 'listings'
                  ? 'text-[#FFC000]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                <span>Anuncios</span>
                {listingFavorites.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs">
                    {listingFavorites.length}
                  </span>
                )}
              </div>
              {activeTab === 'listings' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFC000]" />
              )}
            </button>
          </div>
        )}

        {/* Empty State - All favorites */}
        {hasNoFavorites && (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
              Todavía no tienes favoritos
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Visita perfiles de usuarios y anuncios del marketplace para agregarlos a tus favoritos
            </p>
            <Link href="/marketplace">
              <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700]">
                Explorar el marketplace
              </Button>
            </Link>
          </div>
        )}

        {/* Empty State - Current tab */}
        {!hasNoFavorites && currentTabHasNoFavorites && (
          <div className="text-center py-16">
            {activeTab === 'users' ? (
              <User className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            ) : (
              <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            )}
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
              No tienes {activeTab === 'users' ? 'usuarios' : 'anuncios'} favoritos
            </p>
            <p className="text-gray-500 text-sm mb-6">
              {activeTab === 'users'
                ? 'Visita perfiles de usuarios y agrégalos a tus favoritos'
                : 'Explora el marketplace y marca anuncios como favoritos'
              }
            </p>
          </div>
        )}

        {/* Usuarios Favoritos Section */}
        {activeTab === 'users' && userFavorites.length > 0 && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userFavorites.map((favorite) => {
                const avatarUrl = resolveAvatarUrl(favorite.avatar_url, supabase);
                return (
                  <ModernCard key={favorite.favorite_user_id}>
                    <ModernCardContent className="p-6">
                      <div className="flex flex-col items-center text-center space-y-4">
                        {/* Avatar */}
                        <Link href={`/users/${favorite.favorite_user_id}`}>
                          {avatarUrl ? (
                            <Image
                              src={avatarUrl}
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
                          <h3 className="font-bold text-gray-900 dark:text-white text-lg hover:text-[#FFC000] transition-colors">
                            {favorite.nickname}
                          </h3>
                        </Link>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 w-full justify-center">
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            <span>{favorite.active_listings_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-[#FFC000] text-[#FFC000]" />
                            <span className="text-gray-900 dark:text-white font-bold">
                              {favorite.rating_avg?.toFixed(1) || '0.0'}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 w-full">
                          <Link href={`/users/${favorite.favorite_user_id}`} className="flex-1">
                            <Button variant="outline" className="w-full">
                              Ver perfil
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            onClick={() => handleRemoveUser(favorite.favorite_user_id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Heart className="h-4 w-4 fill-current" />
                          </Button>
                        </div>

                        {/* Added Date */}
                        <p className="text-xs text-gray-500">
                          Agregado el {new Date(favorite.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </ModernCardContent>
                  </ModernCard>
                );
              })}
            </div>
          </div>
        )}

        {/* Anuncios Favoritos Section */}
        {activeTab === 'listings' && listingFavorites.length > 0 && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {listingFavorites.map((favorite) => (
                <ModernCard key={favorite.listing_id} className="group relative h-full flex flex-col">
                  <ModernCardContent className="p-0 h-full flex flex-col">
                    <Link href={`/marketplace/${favorite.listing_id}`} className="flex-1 flex flex-col">
                      {/* Image */}
                      <div className="relative aspect-square bg-gray-100 dark:bg-gray-900">
                        {favorite.image_url ? (
                          <Image
                            src={favorite.image_url}
                            alt={favorite.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-300 dark:text-gray-400 font-bold text-4xl md:text-6xl">
                            {favorite.title.charAt(0).toUpperCase()}
                          </div>
                        )}

                        {/* Status Badge - only show for packs when active, or for sold/removed */}
                        {(favorite.status !== 'active' || favorite.is_group) && (
                          <div className="absolute top-2 right-2 z-10">
                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${favorite.status === 'active' && favorite.is_group
                              ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700'
                              : 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                              }`}>
                              {favorite.status === 'active' && favorite.is_group ? 'Pack' : 'Vendido'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-3 flex flex-col flex-1 gap-2">
                        <div className="min-h-[3rem]">
                          <h3 className="font-bold text-gray-900 dark:text-white leading-tight line-clamp-2 text-sm group-hover:text-[#FFC000] transition-colors">
                            {favorite.title}
                          </h3>
                          {favorite.collection_name && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                              {favorite.collection_name}
                            </p>
                          )}
                        </div>

                        <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
                          <Link
                            href={`/users/${favorite.author_id}`}
                            className="text-xs text-gray-600 dark:text-gray-400 hover:text-[#FFC000] dark:hover:text-[#FFC000] transition-colors truncate block z-10 relative"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {favorite.author_nickname}
                          </Link>
                        </div>
                      </div>
                    </Link>

                    {/* Remove Button */}
                    <div className="p-3 pt-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveListing(Number(favorite.listing_id))}
                        className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 text-xs"
                      >
                        <Heart className="h-3 w-3 fill-current mr-1" />
                        Quitar
                      </Button>
                    </div>
                  </ModernCardContent>
                </ModernCard>
              ))}
            </div>
          </div>
        )}
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
