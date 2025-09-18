'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import { Badge } from '@/components/ui/badge';
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
}

interface CollectionItem extends Sticker {
  count: number;
  wanted: boolean;
}

interface UserProgress {
  total_stickers: number;
  owned_unique_stickers: number;
  total_owned_count: number;
  duplicates_count: number;
  wanted_count: number;
  completion_percentage: number;
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
  const setupUserActiveCollection = async () => {
    if (!user) return null;

    try {
      // First, check if user has an active collection
      const { data: userCollection, error: userCollectionError } =
        await supabase
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
        return userCollection.collections as Collection;
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
  };

  // Fetch stickers for the active collection with user's data
  const fetchStickersAndCollection = async () => {
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

      // Transform the data
      const formattedStickers: CollectionItem[] = stickersData.map(sticker => ({
        id: sticker.id,
        collection_id: sticker.collection_id,
        code: sticker.code,
        player_name: sticker.player_name,
        team_name: sticker.collection_teams?.team_name || 'Unknown Team',
        position: sticker.position || '',
        nationality: sticker.nationality || '',
        rating: sticker.rating || 0,
        rarity: sticker.rarity as Sticker['rarity'],
        image_url: sticker.image_url,
        count: sticker.user_stickers?.[0]?.count || 0,
        wanted: sticker.user_stickers?.[0]?.wanted || false,
      }));

      setStickers(formattedStickers);
    } catch (err: unknown) {
      console.error('Error fetching stickers:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
  }, [user, userLoading]);

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">Cargando tu colección...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center">
        <div className="text-center space-y-4 text-white">
          <h1 className="text-2xl font-bold">Error</h1>
          <p>{error}</p>
          <Button
            onClick={fetchStickersAndCollection}
            className="bg-white text-teal-600 hover:bg-gray-100"
          >
            Intentar de nuevo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600">
      {/* Sticky Progress Header */}
      <div className="sticky top-16 z-40 bg-gradient-to-r from-teal-500/95 to-cyan-600/95 backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white font-semibold">
              <span className="text-green-300">TENGO</span>{' '}
              {progress.owned_unique_stickers}
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white font-semibold">
              <span className="text-orange-300">ME FALTA</span>{' '}
              {progress.wanted_count}
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white font-semibold">
              {progress.completion_percentage}%{' '}
              <span className="text-yellow-300">★</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Header with Collection Info */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">
            {activeCollection?.name || 'Mi Colección'}
          </h1>
          {activeCollection?.description && (
            <p className="text-white/80 mt-2">{activeCollection.description}</p>
          )}
        </div>

        {/* Stickers Grid */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {stickers.map(sticker => (
            <ModernCard
              key={sticker.id}
              className="bg-white hover:scale-105 transition-transform duration-200"
            >
              <ModernCardContent className="p-3">
                {/* Player Image Area */}
                <div
                  className={`aspect-[3/4] rounded-xl mb-3 relative overflow-hidden bg-gradient-to-br ${getRarityGradient(sticker.rarity)} p-4 flex items-center justify-center`}
                >
                  {/* Player Avatar */}
                  <div className="relative z-10">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl shadow-lg border border-white/30">
                      👤
                    </div>
                  </div>

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

                  {/* Rating Badge */}
                  <div className="absolute top-2 right-2 bg-white/90 text-gray-800 text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                    {sticker.rating}
                  </div>
                </div>

                {/* Player Info */}
                <div className="space-y-1 mb-3">
                  <h3 className="font-bold text-sm text-gray-800 leading-tight text-center">
                    {sticker.player_name}
                  </h3>
                  <p className="text-xs text-gray-600 text-center font-semibold">
                    {sticker.team_name}
                  </p>
                  <p className="text-xs text-gray-500 text-center">
                    {sticker.code}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    size="sm"
                    className={`w-full text-xs font-bold rounded-xl transition-all duration-200 ${
                      sticker.count > 0
                        ? 'bg-green-500 hover:bg-green-600 text-white shadow-md'
                        : 'bg-white border-2 border-green-500 text-green-600 hover:bg-green-50 shadow-sm'
                    }`}
                    onClick={() => updateStickerOwnership(sticker.id)}
                  >
                    {sticker.count === 0 ? 'TENGO' : `TENGO (${sticker.count})`}
                  </Button>

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
                    {sticker.wanted && sticker.count === 0 ? 'YA NO' : 'QUIERO'}
                  </Button>
                </div>
              </ModernCardContent>
            </ModernCard>
          ))}
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
