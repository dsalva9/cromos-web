'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AuthGuard from '@/components/AuthGuard';

interface Sticker {
  id: number;
  code: string;
  player_name: string;
  team: string;
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

function getRarityColor(rarity: Sticker['rarity']) {
  switch (rarity) {
    case 'legendary':
      return 'bg-gradient-to-r from-yellow-400 to-orange-500';
    case 'epic':
      return 'bg-gradient-to-r from-purple-400 to-pink-500';
    case 'rare':
      return 'bg-gradient-to-r from-blue-400 to-cyan-500';
    case 'common':
      return 'bg-gradient-to-r from-gray-400 to-gray-500';
  }
}

function CollectionContent() {
  const { supabase } = useSupabase();
  const { user, loading: userLoading } = useUser();

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

  // Fetch all stickers with user's collection data
  const fetchStickersAndCollection = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data: stickersData, error: stickersError } = await supabase
        .from('stickers')
        .select(
          `
        id,
        code,
        player_name,
        team,
        position,
        nationality,
        rating,
        rarity,
        image_url,
        collections!left (
          count,
          wanted
        )
      `
        )
        .eq('collections.user_id', user.id)
        .order('id');

      if (stickersError) throw stickersError;

      const formattedStickers: CollectionItem[] = stickersData.map(sticker => ({
        id: sticker.id,
        code: sticker.code,
        player_name: sticker.player_name,
        team: sticker.team,
        position: sticker.position,
        nationality: sticker.nationality,
        rating: sticker.rating,
        rarity: sticker.rarity as Sticker['rarity'],
        image_url: sticker.image_url,
        count: sticker.collections?.[0]?.count || 0,
        wanted: sticker.collections?.[0]?.wanted || false,
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

    setStickers(prev =>
      prev.map(sticker =>
        sticker.id === stickerId
          ? { ...sticker, count: newCount, wanted: false }
          : sticker
      )
    );

    try {
      const { error } = await supabase.from('collections').upsert({
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

  // Toggle wanted status
  const toggleWantedStatus = async (stickerId: number) => {
    if (!user) return;

    const currentSticker = stickers.find(s => s.id === stickerId);
    if (!currentSticker || currentSticker.count > 0) return;

    const newWantedStatus = !currentSticker.wanted;

    setStickers(prev =>
      prev.map(sticker =>
        sticker.id === stickerId
          ? { ...sticker, wanted: newWantedStatus }
          : sticker
      )
    );

    try {
      if (newWantedStatus) {
        const { error } = await supabase.from('collections').upsert({
          user_id: user.id,
          sticker_id: stickerId,
          count: 0,
          wanted: true,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('collections')
          .delete()
          .eq('user_id', user.id)
          .eq('sticker_id', stickerId)
          .eq('count', 0);
        if (error) throw error;
      }
    } catch (err: unknown) {
      console.error('Error updating wanted status:', err);
      fetchStickersAndCollection();
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
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">
            Liga 2024
          </h1>
        </div>

        {/* Stickers Grid */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {stickers.map(sticker => (
            <Card
              key={sticker.id}
              className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden bg-white/95 backdrop-blur-sm"
            >
              <CardContent className="p-3">
                {/* Player Image Area */}
                <div className="aspect-[3/4] rounded-xl mb-3 relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  {/* Rarity Background */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${getRarityGradient(sticker.rarity)} opacity-20`}
                  ></div>

                  {/* Player Avatar */}
                  <div className="relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-2xl text-white shadow-lg">
                      👤
                    </div>
                  </div>

                  {/* Status Indicators */}
                  {sticker.wanted && sticker.count === 0 && (
                    <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                      ¡LO QUIERO!
                    </div>
                  )}

                  {sticker.count > 1 && (
                    <div className="absolute bottom-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                      +{sticker.count - 1}
                    </div>
                  )}

                  {/* Rating Badge */}
                  <div
                    className={`absolute top-2 right-2 ${getRarityColor(sticker.rarity)} text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg`}
                  >
                    {sticker.rating}
                  </div>
                </div>

                {/* Player Info */}
                <div className="space-y-1 mb-3">
                  <h3 className="font-bold text-sm text-gray-800 leading-tight text-center">
                    {sticker.player_name}
                  </h3>
                  <p className="text-xs text-gray-600 text-center font-semibold">
                    {sticker.team}
                  </p>
                  <p className="text-xs text-gray-500 text-center">
                    {sticker.code}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    size="sm"
                    className={`w-full text-xs font-bold rounded-xl transition-all duration-300 ${
                      sticker.count > 0
                        ? 'bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white shadow-lg'
                        : 'bg-white border-2 border-green-400 text-green-600 hover:bg-green-50'
                    }`}
                    onClick={() => updateStickerOwnership(sticker.id)}
                  >
                    {sticker.count === 0 ? 'TENGO' : `TENGO (${sticker.count})`}
                  </Button>

                  <Button
                    size="sm"
                    className={`w-full text-xs font-bold rounded-xl transition-all duration-300 ${
                      sticker.wanted && sticker.count === 0
                        ? 'bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg'
                        : 'bg-white border-2 border-blue-400 text-blue-600 hover:bg-blue-50'
                    }`}
                    onClick={() => toggleWantedStatus(sticker.id)}
                    disabled={sticker.count > 0}
                  >
                    {sticker.wanted && sticker.count === 0 ? 'YA NO' : 'QUIERO'}
                  </Button>
                </div>
              </CardContent>
            </Card>
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
