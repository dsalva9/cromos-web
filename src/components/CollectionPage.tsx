'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
}

interface UserProgress {
  total_stickers: number;
  owned_unique_stickers: number;
  total_owned_count: number;
  duplicates_count: number;
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

export default function CollectionPage() {
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
    const completionPercentage =
      totalStickers > 0
        ? Math.round((ownedUniqueStickers / totalStickers) * 100)
        : 0;

    return {
      total_stickers: totalStickers,
      owned_unique_stickers: ownedUniqueStickers,
      total_owned_count: totalOwnedCount,
      duplicates_count: duplicatesCount,
      completion_percentage: completionPercentage,
    };
  }, [stickers]);

  // Fetch all stickers with user's collection data
  const fetchStickersAndCollection = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch all stickers with user's collection count
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
          count
        )
      `
        )
        .eq('collections.user_id', user.id)
        .order('id');

      if (stickersError) throw stickersError;

      // Transform the data to include count (default to 0 if not owned)
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

  // Update sticker count in database with optimistic updates
  const updateStickerCount = async (stickerId: number, newCount: number) => {
    if (!user) return;

    const clampedCount = Math.max(0, newCount);

    // Optimistic update - update UI immediately
    setStickers(prev =>
      prev.map(sticker =>
        sticker.id === stickerId ? { ...sticker, count: clampedCount } : sticker
      )
    );

    try {
      if (clampedCount <= 0) {
        // Delete the collection entry if count is 0 or less
        const { error } = await supabase
          .from('collections')
          .delete()
          .eq('user_id', user.id)
          .eq('sticker_id', stickerId);

        if (error) throw error;
      } else {
        // Upsert the collection entry
        const { error } = await supabase.from('collections').upsert({
          user_id: user.id,
          sticker_id: stickerId,
          count: clampedCount,
        });

        if (error) throw error;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('Error updating sticker count:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update sticker count';
      setError(errorMessage);

      // Revert optimistic update on error
      setStickers(prev =>
        prev.map(sticker =>
          sticker.id === stickerId
            ? { ...sticker, count: sticker.count } // This will revert to previous value
            : sticker
        )
      );

      // You might want to show a toast notification here
      // For now, we'll just log the error
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

  // Not authenticated
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">
            Inicia sesión para ver tu colección
          </h1>
          <p className="text-muted-foreground">
            Necesitas una cuenta para gestionar tu colección de cromos.
          </p>
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Mi Colección</h1>

        <div className="flex flex-wrap gap-4 text-sm">
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
            Progreso: {progress.completion_percentage}%
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stickers.map(sticker => (
          <div
            key={sticker.id}
            className="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Player Image Placeholder */}
            <div className="mb-4 aspect-[3/4] rounded-md bg-muted flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Foto</span>
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

              <p className="text-sm font-medium text-primary">{sticker.team}</p>
              <p className="text-xs text-muted-foreground">
                {sticker.position}
              </p>
              <p className="text-xs text-muted-foreground">
                {sticker.nationality}
              </p>
              <p className="text-xs text-muted-foreground">
                Código: {sticker.code}
              </p>

              {/* Count Display */}
              {sticker.count > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Tienes: {sticker.count}
                </Badge>
              )}

              {/* Count Controls */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() =>
                    updateStickerCount(sticker.id, sticker.count - 1)
                  }
                  disabled={sticker.count === 0}
                >
                  -
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() =>
                    updateStickerCount(sticker.id, sticker.count + 1)
                  }
                >
                  +
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
  );
}
