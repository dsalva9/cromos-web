'use client';

import Image from 'next/image';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import AuthGuard from '@/components/AuthGuard';
import CollectionsDropdown from '@/components/collection/CollectionsDropdown';
import { toast } from '@/lib/toast';
import { Star, AlertCircle, Minus } from 'lucide-react';

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
  is_active: boolean;
  collections: Collection | Collection[] | null;
}

interface CollectionStats {
  total_stickers: number;
  owned_stickers: number;
  completion_percentage: number;
  duplicates: number;
  wanted?: number;
}

type StickerTeamRelation = { team_name: string };
type StickerUserRelation = { count: number | null; wanted: boolean | null };
type StickerRowWithRelations = Sticker & {
  collection_teams: StickerTeamRelation | StickerTeamRelation[] | null;
  user_stickers: StickerUserRelation[] | null;
};

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
  const params = useParams();
  const router = useRouter();

  const collectionId = params?.id ? parseInt(params.id as string) : null;

  const [currentCollection, setCurrentCollection] = useState<Collection | null>(
    null
  );
  const [ownedCollections, setOwnedCollections] = useState<Collection[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<number | null>(
    null
  );
  const [stickers, setStickers] = useState<CollectionItem[]>([]);
  const [collectionStats, setCollectionStats] = useState<CollectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

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

  // Fetch user's owned collections and determine active collection
  const fetchUserCollections = useCallback(async () => {
    if (!user) return;

    try {
      const { data: userCollectionsData, error: userCollectionsError } =
        await supabase
          .from('user_collections')
          .select(
            `
            collection_id,
            is_active,
            collections (
              id,
              name,
              competition,
              year,
              description
            )
          `
          )
          .eq('user_id', user.id);

      if (userCollectionsError) throw userCollectionsError;

      const collections: Collection[] = [];
      let activeId: number | null = null;

      userCollectionsData?.forEach((uc: UserCollectionData) => {
        if (uc.is_active) {
          activeId = uc.collection_id;
        }

        if (uc.collections) {
          const collection = Array.isArray(uc.collections)
            ? uc.collections[0]
            : uc.collections;

          if (collection) {
            collections.push(collection);
          }
        }
      });

      setOwnedCollections(collections);
      setActiveCollectionId(activeId);

      return { collections, activeId };
    } catch (err: unknown) {
      console.error('Error fetching user collections:', err);
      throw err;
    }
  }, [user, supabase]);

  // Fetch stickers for a specific collection
  const fetchCollectionStickers = useCallback(
    async (targetCollectionId: number) => {
      if (!user) return;

      try {
        // First check if user owns this collection
        const { data: userCollection, error: userCollectionError } =
          await supabase
            .from('user_collections')
            .select('collection_id')
            .eq('user_id', user.id)
            .eq('collection_id', targetCollectionId)
            .single();

        if (userCollectionError || !userCollection) {
          throw new Error('No tienes acceso a esta colección');
        }

        // Get collection details
        const { data: collectionData, error: collectionError } = await supabase
          .from('collections')
          .select('*')
          .eq('id', targetCollectionId)
          .single();

        if (collectionError) throw collectionError;
        setCurrentCollection(collectionData);
        setCollectionStats(null);

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
          image_path_webp_300,
          thumb_path_webp_100,
          collection_teams (
            team_name
          ),
          user_stickers!left (
            count,
            wanted
          )
        `
          )
          .eq('collection_id', targetCollectionId)
          .eq('user_stickers.user_id', user.id)
          .order('id');

        if (stickersError) throw stickersError;
        const resolvePublicUrl = (path: string | null) => {
          if (!path) return null;
          const { data } = supabase.storage.from('sticker-images').getPublicUrl(path);
          return data?.publicUrl ?? null;
        };


        // Transform the data
        const rows = (stickersData ?? []) as StickerRowWithRelations[];

        const formattedStickers: CollectionItem[] = rows.map(
          sticker => {
            // Handle team_name extraction from collection_teams
            let teamName = 'Unknown Team';
            if (sticker.collection_teams) {
              if (Array.isArray(sticker.collection_teams)) {
                teamName =
                  sticker.collection_teams[0]?.team_name || 'Unknown Team';
              } else {
                teamName =
                  (sticker.collection_teams as { team_name: string })
                    ?.team_name || 'Unknown Team';
              }
            }

            const imagePath = (sticker.image_path_webp_300 ?? null) as string | null;
            const thumbPath = (sticker.thumb_path_webp_100 ?? null) as string | null;
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
          }
        );

        setStickers(formattedStickers);

        const { data: statsData, error: statsError } = await supabase.rpc(
          'get_user_collection_stats',
          {
            p_user_id: user.id,
            p_collection_id: targetCollectionId,
          }
        );

        if (statsError) {
          console.error('Error fetching collection stats:', statsError);
          setCollectionStats(null);
        } else {
          setCollectionStats(statsData?.[0] ?? null);
        }
      } catch (err: unknown) {
        console.error('Error fetching collection stickers:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Error cargando colección';
        setError(errorMessage);
      }
    },
    [user, supabase]
  );

  // Set active collection
  const setActiveCollection = async (targetCollectionId: number) => {
    if (!user) return;

    try {
      setActivating(true);

      // Optimistic update
      setActiveCollectionId(targetCollectionId);

      // Set all collections inactive
      await supabase
        .from('user_collections')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Set selected collection as active
      const { error } = await supabase
        .from('user_collections')
        .update({ is_active: true })
        .eq('user_id', user.id)
        .eq('collection_id', targetCollectionId);

      if (error) throw error;
    } catch (err: unknown) {
      console.error('Error setting active collection:', err);
      // Revert optimistic update
      fetchUserCollections();
    } finally {
      setActivating(false);
    }
  };

  // Update sticker ownership
  const updateStickerOwnership = async (stickerId: number) => {
    if (!user) return;

    const currentSticker = stickers.find(s => s.id === stickerId);
    if (!currentSticker) return;

    const previousStickers = stickers;
    const previousStats = collectionStats;
    const newCount = currentSticker.count + 1;

    setStickers(prev =>
      prev.map(sticker =>
        sticker.id === stickerId
          ? { ...sticker, count: newCount, wanted: false }
          : sticker
      )
    );

    setCollectionStats(prev => {
      if (!prev) return prev;

      const ownershipGain = currentSticker.count === 0 ? 1 : 0;
      const duplicatesGain = currentSticker.count >= 1 ? 1 : 0;
      const updatedOwned = prev.owned_stickers + ownershipGain;
      const updatedDuplicates = prev.duplicates + duplicatesGain;
      const updatedCompletion =
        prev.total_stickers > 0
          ? Math.round((updatedOwned / prev.total_stickers) * 100)
          : prev.completion_percentage;

      return {
        ...prev,
        owned_stickers: updatedOwned,
        duplicates: updatedDuplicates,
        completion_percentage: updatedCompletion,
      };
    });

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
      setStickers(previousStickers);
      setCollectionStats(previousStats);
      toast.error('No pudimos actualizar tus cromos. Intenta de nuevo.');
    }
  };

  const decrementStickerOwnership = async (stickerId: number) => {
    if (!user) return;

    const currentSticker = stickers.find(s => s.id === stickerId);
    if (!currentSticker || currentSticker.count === 0) return;

    const previousStickers = stickers;
    const previousStats = collectionStats;
    const newCount = Math.max(currentSticker.count - 1, 0);
    const nextWanted = newCount === 0 ? currentSticker.wanted : false;

    setStickers(prev =>
      prev.map(sticker =>
        sticker.id === stickerId
          ? { ...sticker, count: newCount, wanted: nextWanted }
          : sticker
      )
    );

    setCollectionStats(prev => {
      if (!prev) return prev;

      const ownershipLoss = currentSticker.count === 1 ? 1 : 0;
      const duplicatesLoss = currentSticker.count > 1 ? 1 : 0;
      const updatedOwned = Math.max(prev.owned_stickers - ownershipLoss, 0);
      const updatedDuplicates = Math.max(prev.duplicates - duplicatesLoss, 0);
      const updatedCompletion =
        prev.total_stickers > 0
          ? Math.round((updatedOwned / prev.total_stickers) * 100)
          : prev.completion_percentage;

      return {
        ...prev,
        owned_stickers: updatedOwned,
        duplicates: updatedDuplicates,
        completion_percentage: updatedCompletion,
      };
    });

    try {
      const { error } = await supabase.from('user_stickers').upsert({
        user_id: user.id,
        sticker_id: stickerId,
        count: newCount,
        wanted: nextWanted,
      });

      if (error) throw error;
    } catch (err: unknown) {
      console.error('Error decrementing sticker ownership:', err);
      setStickers(previousStickers);
      setCollectionStats(previousStats);
      toast.error('No pudimos actualizar tus cromos. Intenta de nuevo.');
    }
  };

  // Toggle wanted status
  const toggleWantedStatus = async (stickerId: number) => {
    if (!user) return;

    const currentSticker = stickers.find(s => s.id === stickerId);
    if (!currentSticker || currentSticker.count > 0) return;

    const newWantedStatus = !currentSticker.wanted;
    const previousStickers = stickers;
    const previousStats = collectionStats;

    setStickers(prev =>
      prev.map(sticker =>
        sticker.id === stickerId
          ? { ...sticker, wanted: newWantedStatus }
          : sticker
      )
    );

    setCollectionStats(prev => {
      if (!prev || typeof prev.wanted === 'undefined') return prev;

      const updatedWanted = Math.max(
        prev.wanted + (newWantedStatus ? 1 : -1),
        0
      );

      return {
        ...prev,
        wanted: updatedWanted,
      };
    });

    try {
      if (newWantedStatus) {
        const { error } = await supabase.from('user_stickers').upsert({
          user_id: user.id,
          sticker_id: stickerId,
          count: 0,
          wanted: true,
        });
        if (error) throw error;
      } else {
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
      setStickers(previousStickers);
      setCollectionStats(previousStats);
      toast.error('No pudimos actualizar tu lista de deseos. Intenta de nuevo.');
    }
  };

  // Main data fetching effect
  useEffect(() => {
    if (!userLoading && user && collectionId) {
      const fetchData = async () => {
        try {
          setLoading(true);
          setError(null);

          await fetchUserCollections();
          await fetchCollectionStickers(collectionId);
        } catch (err: unknown) {
          console.error('Error loading collection:', err);
          setError(
            err instanceof Error ? err.message : 'Error loading collection'
          );
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [
    user,
    userLoading,
    collectionId,
    fetchUserCollections,
    fetchCollectionStickers,
  ]);

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">Cargando colección...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center">
        <div className="text-center space-y-4 text-white">
          <AlertCircle className="w-16 h-16 mx-auto text-white/70" />
          <h1 className="text-2xl font-bold">Error</h1>
          <p>{error}</p>
          <Button
            onClick={() => router.push('/profile')}
            className="bg-white text-teal-600 hover:bg-gray-100"
          >
            Ir al Perfil
          </Button>
        </div>
      </div>
    );
  }

  const isActiveCollection = activeCollectionId === collectionId;

  const ownedDisplay =
    collectionStats?.owned_stickers ?? progress.owned_unique_stickers;
  const totalStickers = collectionStats?.total_stickers ?? progress.total_stickers;
  const missingCount = Math.max(totalStickers - ownedDisplay, 0);
  const duplicatesDisplay =
    collectionStats?.duplicates ?? progress.duplicates_count;
  const completionDisplay =
    collectionStats?.completion_percentage ?? progress.completion_percentage;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600">
      {/* Sticky Progress Header */}
      <div className="sticky top-16 z-40 bg-gradient-to-r from-teal-500/95 to-cyan-600/95 backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap justify-center gap-3 text-sm mb-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white font-semibold">
              <span className="text-green-200">Tengo</span>{' '}
              {ownedDisplay}
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white font-semibold">
              <span className="text-orange-200">Me faltan</span>{' '}
              {missingCount}
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white font-semibold">
              <span className="text-purple-200">Repes</span>{' '}
              {duplicatesDisplay}
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white font-semibold">
              <span className="text-yellow-200">Progreso</span>{' '}
              {completionDisplay}%
            </div>
          </div>


          {/* Status and Switcher Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {isActiveCollection ? (
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <Star className="h-4 w-4 text-white/70" aria-hidden="true" />
                <span>Colección activa</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-white/80 text-sm">
                  No es tu colección activa
                </span>
                <Button
                  size="sm"
                  onClick={() =>
                    collectionId && setActiveCollection(collectionId)
                  }
                  disabled={activating}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1"
                >
                  {activating ? 'Activando...' : 'Hacer activa'}
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <CollectionsDropdown
                collections={ownedCollections}
                currentId={collectionId || 0}
                activeId={activeCollectionId}
              />
              {isActiveCollection && (
                <Badge className="bg-green-500 text-white shadow-lg px-2.5 py-1 text-xs">
                  Activa
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Header with Collection Info */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">
            {currentCollection?.name || 'Colección'}
          </h1>
          {currentCollection?.description && (
            <p className="text-white/80 mt-2">
              {currentCollection.description}
            </p>
          )}
        </div>

        {/* Stickers Grid */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {stickers.map(sticker => {
            const displayImage = sticker.thumb_public_url ?? sticker.image_public_url;
            const fallbackInitial = sticker.player_name?.charAt(0)?.toUpperCase() || '?';
            const showRating = Number.isFinite(sticker.rating) && sticker.rating > 0;

            return (
              <ModernCard
                key={sticker.id}
                className="bg-white hover:scale-105 transition-transform duration-200"
              >
                <ModernCardContent className="p-3">
                  {/* Player Image Area */}
                  <div
                    className={`aspect-[3/4] rounded-xl mb-3 relative overflow-hidden bg-gradient-to-br ${getRarityGradient(sticker.rarity)}`}
                  >
                    {displayImage ? (
                      <>
                        <Image
                          src={displayImage}
                          alt={`Sticker de ${sticker.player_name}`}
                          fill
                          className="object-cover"
                          loading="lazy"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                        />
                        <div className="absolute inset-0 bg-black/15" aria-hidden="true" />
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
                      <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                        QUIERO
                      </div>
                    )}

                    {sticker.count > 1 && (
                      <div className="absolute bottom-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                        +{sticker.count - 1}
                      </div>
                    )}

                    {showRating && (
                      <div className="absolute top-2 right-2 bg-white/90 text-gray-800 text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                        {sticker.rating}
                      </div>
                    )}
                  </div>

                  {/* Player Info */}
                  <div className="space-y-1 mb-3 text-center">
                    <h3 className="font-bold text-sm text-gray-800 leading-tight">
                      {sticker.player_name}
                    </h3>
                    <p className="text-xs text-gray-600 font-semibold">
                      {sticker.team_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {sticker.code}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className={`flex-1 text-xs font-bold rounded-xl transition-all duration-200 ${
                          sticker.count > 0
                            ? 'bg-green-500 hover:bg-green-600 text-white shadow-md'
                            : 'bg-white border-2 border-green-500 text-green-600 hover:bg-green-50 shadow-sm'
                        }`}
                        onClick={() => updateStickerOwnership(sticker.id)}
                      >
                        {sticker.count === 0
                          ? 'Tengo'
                          : sticker.count === 1
                          ? 'Tengo'
                          : `Repe (${sticker.count - 1})`}
                      </Button>
                      {sticker.count > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg border border-green-200 bg-white/80 text-green-600 hover:bg-green-50"
                          onClick={() => decrementStickerOwnership(sticker.id)}
                          aria-label="Quitar uno"
                          title="Quitar uno"
                        >
                          <Minus className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>

                    <Button
                      size="sm"
                      className={`w-full text-xs font-bold rounded-xl transition-all duration-200 ${
                        sticker.wanted && sticker.count === 0
                          ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md'
                          : 'bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 shadow-sm'
                      }`}
                      onClick={() => toggleWantedStatus(sticker.id)}
                      disabled={sticker.count > 0}
                    >
                      {sticker.wanted && sticker.count === 0 ? 'Ya no' : 'Quiero'}
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
