'use client';

import Image from 'next/image';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import { Button } from '@/components/ui/button';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import AuthGuard from '@/components/AuthGuard';

interface Collection {
  id: number;
  name: string;
  competition: string;
  year: string;
  description: string;
}

interface Sticker {
  id: number;
  collection_id: number;
  code: string;
  player_name: string;
  team_name: string;
  position: string;
  nationality: string;
  rating: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  image_url: string | null;
  image_path_webp_300: string | null;
  thumb_path_webp_100: string | null;
}

interface CollectionItem extends Sticker {
  count: number;
  image_public_url: string | null;
  thumb_public_url: string | null;
}

type StickerTeamRelation = { team_name: string };
type StickerUserRelation = { count: number | null };
type StickerRowWithRelations = Sticker & {
  collection_teams: StickerTeamRelation | StickerTeamRelation[] | null;
  user_stickers: StickerUserRelation[] | null;
};

interface UserProgress {
  total_stickers: number;
  owned_unique_stickers: number;
  total_owned_count: number;
  duplicates_count: number;
  missing_count: number;
  completion_percentage: number;
}


function CollectionContent() {
  const { supabase } = useSupabase();
  const { user, loading: userLoading } = useUser();

  const [activeCollection, setActiveCollection] = useState<Collection | null>(
    null
  );
  const [stickers, setStickers] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate progress from current stickers state
  const progress = useMemo((): UserProgress => {
    const totalStickers = stickers.length;
    const ownedUniqueStickers = stickers.filter(s => s.count > 0).length;
    const totalOwnedCount = stickers.reduce((sum, s) => sum + s.count, 0);
    const duplicatesCount = stickers.reduce(
      (sum, s) => sum + Math.max(0, s.count - 1),
      0
    );
    const missingCount = stickers.filter(s => s.count === 0).length;
    const completionPercentage =
      totalStickers > 0
        ? Math.round((ownedUniqueStickers / totalStickers) * 100)
        : 0;

    return {
      total_stickers: totalStickers,
      owned_unique_stickers: ownedUniqueStickers,
      total_owned_count: totalOwnedCount,
      duplicates_count: duplicatesCount,
      missing_count: missingCount,
      completion_percentage: completionPercentage,
    };
  }, [stickers]);

  // Get or create user's active collection
  const setupUserActiveCollection = useCallback(async () => {
    if (!user) return null;

    try {
      const { data: userCollection } = await supabase
        .from('user_collections')
        .select(
          `
          collection_id,
          collections (
            id,
            name,
            competition,
            year,
            description
          )
        `
        )
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (userCollection?.collections) {
        const col = Array.isArray(userCollection.collections)
          ? userCollection.collections[0]
          : userCollection.collections;
        setActiveCollection(col ?? null);
        return col ?? null;
      }

      const { data: fallbackCollection } = await supabase
        .from('collections')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (fallbackCollection) {
        setActiveCollection(fallbackCollection);
        await supabase.from('user_collections').upsert({
          user_id: user.id,
          collection_id: fallbackCollection.id,
          is_active: true,
        });
        return fallbackCollection;
      }

      return null;
    } catch (err) {
      console.error('Error setting up active collection:', err);
      return null;
    }
  }, [supabase, user]);

  const fetchStickersAndCollection = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      let collection = activeCollection;
      if (!collection) {
        collection = await setupUserActiveCollection();
        if (!collection) {
          setError('No se encontrï¿½ una colecciï¿½n activa.');
          setLoading(false);
          return;
        }
      }

      const { data: stickerData, error: stickersError } = await supabase
        .from('stickers')
        .select(
          `
          id,
          collection_id,
          code,
          player_name,
          team_name,
          position,
          nationality,
          rating,
          rarity,
          image_url,
          image_path_webp_300,
          thumb_path_webp_100,
          collection_teams (
            team_name
          ),
          user_stickers!left (
            count
          )
        `
        )
        .eq('collection_id', collection.id)
        .eq('user_stickers.user_id', user.id)
        .order('id');

      if (stickersError) throw stickersError;

      const resolvePublicUrl = (path: string | null) => {
        if (!path) return null;
        const { data } = supabase.storage
          .from('sticker-images')
          .getPublicUrl(path);
        return data?.publicUrl ?? null;
      };

      const formattedStickers: CollectionItem[] = (stickerData ?? []).map(
        (sticker: StickerRowWithRelations) => {
          const imagePath = (sticker.image_path_webp_300 ?? null) as
            | string
            | null;
          const thumbPath = (sticker.thumb_path_webp_100 ?? null) as
            | string
            | null;
          const publicFull = resolvePublicUrl(imagePath);
          const publicThumb = resolvePublicUrl(thumbPath);

          return {
            id: sticker.id,
            collection_id: sticker.collection_id,
            code: sticker.code,
            player_name: sticker.player_name,
            team_name: Array.isArray(sticker.collection_teams)
              ? sticker.collection_teams[0]?.team_name ?? ''
              : sticker.collection_teams?.team_name ?? '',
            position: sticker.position || '',
            nationality: sticker.nationality || '',
            rating: sticker.rating || 0,
            rarity: sticker.rarity as Sticker['rarity'],
            image_url: sticker.image_url,
            image_path_webp_300: imagePath,
            thumb_path_webp_100: thumbPath,
            image_public_url: publicFull ?? sticker.image_url,
            thumb_public_url: publicThumb ?? publicFull ?? sticker.image_url,
            count: sticker.user_stickers?.[0]?.count || 0,
          } satisfies CollectionItem;
        }
      );

      setStickers(formattedStickers);
    } catch (err: unknown) {
      console.error('Error fetching stickers:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, supabase, activeCollection, setupUserActiveCollection]);

  const updateStickerOwnership = async (stickerId: number) => {
    if (!user) return;

    const currentSticker = stickers.find(s => s.id === stickerId);
    if (!currentSticker) return;

    const newCount = currentSticker.count === 0 ? 1 : currentSticker.count + 1;

    setStickers(prev =>
      prev.map(sticker =>
        sticker.id === stickerId
          ? { ...sticker, count: newCount }
          : sticker
      )
    );

    try {
      const { error } = await supabase.from('user_stickers').upsert({
        user_id: user.id,
        sticker_id: stickerId,
        count: newCount,
        wanted: false,
      });

      if (error) throw error;
    } catch (err: unknown) {
      console.error('Error updating sticker ownership:', err);
      fetchStickersAndCollection();
    }
  };

  const reduceStickerOwnership = async (stickerId: number) => {
    if (!user) return;

    const currentSticker = stickers.find(s => s.id === stickerId);
    if (!currentSticker) return;

    if (currentSticker.count <= 0) return;
    const newCount = currentSticker.count - 1;

    setStickers(prev =>
      prev.map(sticker =>
        sticker.id === stickerId
          ? { ...sticker, count: newCount }
          : sticker
      )
    );

    try {
      if (newCount > 0) {
        const { error } = await supabase.from('user_stickers').upsert({
          user_id: user.id,
          sticker_id: stickerId,
          count: newCount,
          wanted: false,
        });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_stickers')
          .delete()
          .eq('user_id', user.id)
          .eq('sticker_id', stickerId);

        if (error) throw error;
      }
    } catch (err: unknown) {
      console.error('Error reducing sticker ownership:', err);
      fetchStickersAndCollection();
    }
  };

  useEffect(() => {
    if (!userLoading && user) {
      fetchStickersAndCollection();
    }
  }, [user, userLoading, fetchStickersAndCollection]);

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="text-white text-xl">Cargando tu colecciï¿½n...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="text-center space-y-4 text-white">
          <h1 className="text-2xl font-bold">Error</h1>
          <p>{error}</p>
          <Button
            onClick={fetchStickersAndCollection}
            className="bg-[#FFC000] text-gray-900 font-bold border border-black"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1F2937] min-h-screen">
      <div className="sticky top-16 z-40 bg-gray-800 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-between items-center text-white">
            <div className="font-bold">
              <span className="text-gray-300">TOTAL</span>{' '}
              <span className="text-[#FFC000]">{progress.total_stickers}</span>
            </div>
            <div className="font-bold">
              <span className="text-gray-300">TENGO</span>{' '}
              <span className="text-[#FFC000]">
                {progress.owned_unique_stickers}
              </span>
            </div>
            <div className="font-bold">
              <span className="text-gray-300">FALTAN</span>{' '}
              <span className="text-[#FFC000]">{progress.missing_count}</span>
            </div>
            <div className="font-bold">
              <span className="text-gray-300">REPES</span>{' '}
              <span className="text-[#FFC000]">{progress.duplicates_count}</span>
            </div>
            <div className="font-bold">
              <span className="text-gray-300">TOTAL</span>{' '}
              <span className="text-[#FFC000]">
                {progress.completion_percentage}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Header with Collection Info */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold uppercase text-white drop-shadow-lg">
            {activeCollection?.name || 'Mi Colecciï¿½n'}
          </h1>
          {activeCollection?.description && (
            <p className="text-white/80 mt-2">{activeCollection.description}</p>
          )}
        </div>

        {/* Stickers Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {stickers.map((sticker, index) => {
            const displayImage =
              sticker.thumb_public_url ?? sticker.image_public_url;
            const fallbackInitial =
              sticker.player_name?.charAt(0)?.toUpperCase() || '?';
            const showRating =
              Number.isFinite(sticker.rating) && sticker.rating > 0;
            const isPriority = index < 6; // Prioritize loading for the first row of images

            return (
              <ModernCard
                key={sticker.id}
                className="bg-gray-800 border-2 border-black rounded-lg shadow-xl transition-transform hover:scale-[1.02]"
              >
                <ModernCardContent className="p-3">
                  {/* Player Image Area */}
                  <div className={`aspect-[3/4] mb-3 relative overflow-hidden`}>
                    {displayImage ? (
                      <Image
                        src={displayImage}
                        alt={`${sticker.player_name} - ${sticker.team_name}`}
                        fill
                        className="object-cover"
                        priority={isPriority}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl font-bold text-white/80">
                          {fallbackInitial}
                        </span>
                      </div>
                    )}

                    {/* Status Indicators */}
                    {sticker.count > 1 && (
                      <div className="absolute top-2 right-2 bg-[#E84D4D] text-white border-2 border-black px-2 py-0.5 font-extrabold">
                        REPE
                      </div>
                    )}

                    {showRating && (
                      <div className="absolute bottom-2 left-2 bg-white/90 text-gray-800 text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                        {sticker.rating}
                      </div>
                    )}
                  </div>

                  {/* Player Info */}
                  <div className="mb-3 text-center">
                    <h3 className="text-xl font-bold uppercase text-white mt-2">
                      {sticker.player_name}
                    </h3>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-1">
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        className={`w-full flex-1 text-xs rounded-md transition-all duration-200 ${
                          sticker.count > 0
                            ? 'bg-[#FFC000] text-gray-900 font-bold border border-black'
                            : 'bg-gray-700 text-white font-bold border border-black'
                        }`}
                        onClick={() => updateStickerOwnership(sticker.id)}
                      >
                        {sticker.count === 0
                          ? 'TENGO'
                          : `REPE (+${sticker.count - 1})`}
                      </Button>
                    </div>
                    <div className="flex space-x-1">
                      {sticker.count > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full flex-1 text-lg font-bold border-black bg-gray-700 text-white hover:bg-gray-600"
                          onClick={() => reduceStickerOwnership(sticker.id)}
                        >
                          -
                        </Button>
                      )}
                    </div>
                  </div>
                </ModernCardContent>
              </ModernCard>
            );
          })}
        </div>
        {stickers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-white text-xl">No hay cromos disponibles</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CollectionPage() {
  return (
    <AuthGuard>
      <CollectionContent />
    </AuthGuard>
  );
}



