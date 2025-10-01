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
  wanted: boolean;
  image_public_url: string | null;
  thumb_public_url: string | null;
}

type StickerTeamRelation = { team_name: string };
type StickerUserRelation = { count: number | null; wanted: boolean | null };
type StickerRowWithRelations = Sticker & {
  collection_teams: StickerTeamRelation | StickerTeamRelation[] | null;
  user_stickers: StickerUserRelation[] | null;
};

interface UserProgress {
  total_stickers: number;
  owned_unique_stickers: number;
  total_owned_count: number;
  duplicates_count: number;
  wanted_count: number;
  completion_percentage: number;
}

interface UserCollectionData {
  collection_id: number;
  collections: Collection | Collection[] | null;
}

function getRarityGradient(rarity: Sticker['rarity']) {
  switch (rarity) {
    case 'legendary':
      return 'from-yellow-400 to-orange-500';
    case 'epic':
      return 'from-purple-400 to-pink-500';
    case 'rare':
      return 'from-blue-400 to-cyan-500';
    case 'common':
      return 'from-gray-400 to-gray-500';
  }
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
    const wantedCount = stickers.filter(s => s.wanted && s.count === 0).length;
    const completionPercentage =
      totalStickers > 0
        ? Math.round((ownedUniqueStickers / totalStickers) * 100)
        : 0;

    return {
      total_stickers: totalStickers,
      owned_unique_stickers: ownedUniqueStickers,
      total_owned_count: totalOwnedCount,
      duplicates_count: duplicatesCount,
      wanted_count: wantedCount,
      completion_percentage: completionPercentage,
    };
  }, [stickers]);

  // Get or create user's active collection
  const setupUserActiveCollection = useCallback(async () => {
    if (!user) return null;

    try {
      // First, check if user has an active collection
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
        .single();

      if (userCollection && userCollection.collections) {
        const typedUserCollection = userCollection as UserCollectionData;

        // Handle both array and single object responses from Supabase
        const collections = typedUserCollection.collections;
        if (Array.isArray(collections) && collections.length > 0) {
          return collections[0];
        } else if (collections && !Array.isArray(collections)) {
          return collections;
        }
      }

      // If no active collection, get the first available collection and make it active
      const { data: firstCollection, error: firstCollectionError } =
        await supabase
          .from('collections')
          .select('*')
          .eq('is_active', true)
          .limit(1)
          .single();

      if (firstCollectionError || !firstCollection) {
        throw new Error('No collections available');
      }

      // Add user to this collection and make it active
      await supabase.from('user_collections').insert({
        user_id: user.id,
        collection_id: firstCollection.id,
        is_active: true,
      });

      return firstCollection as Collection;
    } catch (err: unknown) {
      console.error('Error setting up user collection:', err);
      throw err;
    }
  }, [user, supabase]);

  // Fetch stickers for the active collection with user's data
  const fetchStickersAndCollection = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get user's active collection
      const collection = await setupUserActiveCollection();
      if (!collection) {
        setError('No collection found');
        return;
      }

      setActiveCollection(collection);

      // Fetch all stickers for this collection with user's ownership data
      const { data: stickersData, error: stickersError } = await supabase
        .from('stickers')
        .select(
          `
          id,
          collection_id,
          code,
          player_name,
          position,
          nationality,
          rating,
          rarity,
          image_url,
          collection_teams (
            team_name
          ),
          user_stickers!left (
            count,
            wanted
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

      // Transform the data
      const rows = (stickersData ?? []) as StickerRowWithRelations[];

      const formattedStickers: CollectionItem[] = rows.map(sticker => {
        // Handle team_name extraction from collection_teams
        let teamName = 'Unknown Team';
        if (sticker.collection_teams) {
          if (Array.isArray(sticker.collection_teams)) {
            teamName = sticker.collection_teams[0]?.team_name || 'Unknown Team';
          } else {
            teamName =
              (sticker.collection_teams as { team_name: string })?.team_name ||
              'Unknown Team';
          }
        }

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
          team_name: teamName,
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
          wanted: sticker.user_stickers?.[0]?.wanted || false,
        };
      });

      setStickers(formattedStickers);
    } catch (err: unknown) {
      console.error('Error fetching stickers:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, supabase, setupUserActiveCollection]);

  // Update sticker ownership
  const updateStickerOwnership = async (stickerId: number) => {
    if (!user) return;

    const currentSticker = stickers.find(s => s.id === stickerId);
    if (!currentSticker) return;

    const newCount = currentSticker.count === 0 ? 1 : currentSticker.count + 1;

    // Optimistic update
    setStickers(prev =>
      prev.map(sticker =>
        sticker.id === stickerId
          ? { ...sticker, count: newCount, wanted: false }
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
      fetchStickersAndCollection(); // Revert on error
    }
  };

  // Toggle wanted status
  const toggleWantedStatus = async (stickerId: number) => {
    if (!user) return;

    const currentSticker = stickers.find(s => s.id === stickerId);
    if (!currentSticker || currentSticker.count > 0) return;

    const newWantedStatus = !currentSticker.wanted;

    // Optimistic update
    setStickers(prev =>
      prev.map(sticker =>
        sticker.id === stickerId
          ? { ...sticker, wanted: newWantedStatus }
          : sticker
      )
    );

    try {
      if (newWantedStatus) {
        // Add to wanted list
        const { error } = await supabase.from('user_stickers').upsert({
          user_id: user.id,
          sticker_id: stickerId,
          count: 0,
          wanted: true,
        });
        if (error) throw error;
      } else {
        // Remove from wanted list
        const { error } = await supabase
          .from('user_stickers')
          .delete()
          .eq('user_id', user.id)
          .eq('sticker_id', stickerId)
          .eq('count', 0);
        if (error) throw error;
      }
    } catch (err: unknown) {
      console.error('Error updating wanted status:', err);
      fetchStickersAndCollection(); // Revert on error
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
        <div className="text-white text-xl">Cargando tu colección...</div>
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
            className="bg-[#FFC000] text-gray-900 font-bold border border-black hover:bg-yellow-400"
          >
            Intentar de nuevo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1F2937]">
      {/* Sticky Progress Header */}
      <div className="sticky top-16 z-40 bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <div className="font-bold">
              <span className="text-gray-300">TENGO</span>{' '}
              <span className="text-[#FFC000]">
                {progress.owned_unique_stickers}
              </span>
            </div>
            <div className="font-bold">
              <span className="text-gray-300">ME FALTA</span>{' '}
              <span className="text-[#FFC000]">{progress.wanted_count}</span>
            </div>
            <div className="font-bold">
              <span className="text-gray-300">REPES</span>{' '}
              <span className="text-[#FFC000]">
                {progress.duplicates_count}
              </span>
            </div>
            <div className="font-bold">
              <span className="text-gray-300">COMPLETADO</span>{' '}
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
            {activeCollection?.name || 'Mi Colección'}
          </h1>
          {activeCollection?.description && (
            <p className="text-white/80 mt-2">{activeCollection.description}</p>
          )}
        </div>

        {/* Stickers Grid */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
                      <>
                        <Image
                          src={displayImage}
                          alt={`${sticker.player_name} - ${sticker.team_name}`}
                          fill
                          className="object-cover"
                          priority={isPriority}
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        />
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl font-bold text-white/80">
                          {fallbackInitial}
                        </span>
                      </div>
                    )}

                    {/* Status Indicators */}
                    {sticker.wanted && sticker.count === 0 && (
                      <div className="absolute top-2 right-2 bg-[#FFC000] text-gray-900 border-2 border-black px-2 py-0.5 font-extrabold">
                        QUIERO
                      </div>
                    )}

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
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      className={`w-full text-xs rounded-md transition-all duration-200 ${
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

                    <Button
                      size="sm"
                      className={`w-full text-xs rounded-md transition-all duration-200 ${
                        sticker.wanted && sticker.count === 0
                          ? 'bg-[#E84D4D] text-white font-bold border border-black'
                          : 'bg-[#FFC000] text-gray-900 font-bold border border-black'
                      }`}
                      onClick={() => toggleWantedStatus(sticker.id)}
                      disabled={sticker.count > 0}
                    >
                      {sticker.wanted && sticker.count === 0
                        ? 'YA NO'
                        : 'QUIERO'}
                    </Button>
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
