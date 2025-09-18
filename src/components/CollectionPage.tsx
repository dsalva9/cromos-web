'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  count: number; // How many of this sticker the user owns
  wanted: boolean; // Whether the user wants this sticker
}

interface UserProgress {
  total_stickers: number;
  owned_unique_stickers: number;
  total_owned_count: number;
  duplicates_count: number;
  wanted_count: number;
  completion_percentage: number;
}

function getRarityColor(rarity: Sticker['rarity']) {
  switch (rarity) {
    case 'legendary':
      return 'bg-yellow-500';
    case 'epic':
      return 'bg-purple-500';
    case 'rare':
      return 'bg-blue-500';
    case 'common':
      return 'bg-gray-500';
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

      // Fetch all stickers with user's collection count and wanted status
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

      // Transform the data to include count and wanted status
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

  // Update sticker ownership (count)
  const updateStickerOwnership = async (stickerId: number) => {
    if (!user) return;

    const currentSticker = stickers.find(s => s.id === stickerId);
    if (!currentSticker) return;

    const newCount = currentSticker.count === 0 ? 1 : currentSticker.count + 1;

    // Optimistic update
    setStickers(prev =>
      prev.map(sticker =>
        sticker.id === stickerId
          ? { ...sticker, count: newCount, wanted: false } // Remove from wanted when owned
          : sticker
      )
    );

    try {
      const { error } = await supabase.from('collections').upsert({
        user_id: user.id,
        sticker_id: stickerId,
        count: newCount,
        wanted: false, // Can't want what you own
      });

      if (error) throw error;
    } catch (err: unknown) {
      console.error('Error updating sticker ownership:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update sticker';
      setError(errorMessage);

      // Revert optimistic update
      fetchStickersAndCollection();
    }
  };

  // Toggle wanted status
  const toggleWantedStatus = async (stickerId: number) => {
    if (!user) return;

    const currentSticker = stickers.find(s => s.id === stickerId);
    if (!currentSticker) return;

    // Can't want stickers you already own
    if (currentSticker.count > 0) return;

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
        const { error } = await supabase.from('collections').upsert({
          user_id: user.id,
          sticker_id: stickerId,
          count: 0,
          wanted: true,
        });
        if (error) throw error;
      } else {
        // Remove from wanted list (delete the record if count is 0)
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
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update wanted status';
      setError(errorMessage);

      // Revert optimistic update
      fetchStickersAndCollection();
    }
  };

  // Load data when user is available
  useEffect(() => {
    if (!userLoading && user) {
      fetchStickersAndCollection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading]);

  // Loading state
  if (userLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p>Cargando tu colección...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchStickersAndCollection}>
            Intentar de nuevo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Sticky Progress Header */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200"
            >
              Tengo: {progress.owned_unique_stickers}/{progress.total_stickers}
            </Badge>
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200"
            >
              Total: {progress.total_owned_count}
            </Badge>
            <Badge
              variant="outline"
              className="bg-purple-50 text-purple-700 border-purple-200"
            >
              Repetidos: {progress.duplicates_count}
            </Badge>
            <Badge
              variant="outline"
              className="bg-orange-50 text-orange-700 border-orange-200"
            >
              Quiero: {progress.wanted_count}
            </Badge>
            <Badge
              variant="outline"
              className="bg-indigo-50 text-indigo-700 border-indigo-200"
            >
              Progreso: {progress.completion_percentage}%
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Mi Colección</h1>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stickers.map(sticker => (
            <div
              key={sticker.id}
              className="rounded-lg border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
            >
              {/* Player Image Placeholder */}
              <div className="mb-4 aspect-[3/4] rounded-md bg-muted flex items-center justify-center relative overflow-hidden">
                <span className="text-sm text-muted-foreground">Foto</span>
                {/* Rarity indicator corner */}
                <div
                  className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getRarityColor(sticker.rarity)}`}
                ></div>

                {/* Status indicators */}
                {sticker.wanted && sticker.count === 0 && (
                  <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                    Quiero
                  </div>
                )}
                {sticker.count > 1 && (
                  <div className="absolute bottom-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded">
                    +{sticker.count - 1} extra
                  </div>
                )}
              </div>

              {/* Player Info */}
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-sm leading-tight">
                    {sticker.player_name}
                  </h3>
                  <Badge
                    className={`${getRarityColor(sticker.rarity)} text-white text-xs`}
                  >
                    {sticker.rating}
                  </Badge>
                </div>

                <p className="text-sm font-medium text-primary">
                  {sticker.team}
                </p>
                <p className="text-xs text-muted-foreground">
                  {sticker.position}
                </p>
                <p className="text-xs text-muted-foreground">
                  {sticker.nationality}
                </p>
                <p className="text-xs text-muted-foreground">
                  Código: {sticker.code}
                </p>

                {/* Status Display */}
                {sticker.count > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Tienes: {sticker.count}
                  </Badge>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant={sticker.count > 0 ? 'default' : 'outline'}
                    className={`flex-1 text-xs transition-all duration-200 ${
                      sticker.count > 0
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'hover:bg-green-50 hover:text-green-700 hover:border-green-200'
                    }`}
                    onClick={() => updateStickerOwnership(sticker.id)}
                  >
                    {sticker.count === 0 ? 'Tengo' : 'Tengo Repe'}
                  </Button>

                  <Button
                    size="sm"
                    variant={
                      sticker.wanted && sticker.count === 0
                        ? 'default'
                        : 'outline'
                    }
                    className={`flex-1 text-xs transition-all duration-200 ${
                      sticker.wanted && sticker.count === 0
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                    }`}
                    onClick={() => toggleWantedStatus(sticker.id)}
                    disabled={sticker.count > 0} // Can't want what you own
                  >
                    {sticker.wanted && sticker.count === 0
                      ? 'Ya no lo quiero'
                      : 'Quiero'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {stickers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No hay cromos disponibles.</p>
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
