'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/social/useFavorites';
import { toast } from 'sonner';

interface FavoriteButtonProps {
  userId: string;
  onFavoriteDelta?: (delta: number) => void;
}

export function FavoriteButton({ userId, onFavoriteDelta }: FavoriteButtonProps) {
  const { toggleFavorite, loading, checkFavorite } = useFavorites();
  const [favorited, setFavorited] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const loadFavoriteStatus = useCallback(async () => {
    try {
      setCheckingStatus(true);
      const status = await checkFavorite(userId);
      setFavorited(status);
    } finally {
      setCheckingStatus(false);
    }
  }, [userId, checkFavorite]);

  useEffect(() => {
    loadFavoriteStatus();
  }, [loadFavoriteStatus]);

  const handleToggle = async () => {
    const previous = favorited;
    const optimistic = !previous;

    try {
      // Optimistic update
      setFavorited(optimistic);
      if (onFavoriteDelta) {
        onFavoriteDelta(optimistic ? 1 : -1);
      }

      const isNowFavorited = await toggleFavorite(userId);
      setFavorited(isNowFavorited);

      if (isNowFavorited !== optimistic && onFavoriteDelta) {
        // Reconcile optimistic delta if server result differs
        onFavoriteDelta(-(optimistic ? 1 : -1));
        onFavoriteDelta(isNowFavorited ? 1 : -1);
      }

      if (isNowFavorited) {
        toast.success('Agregado a favoritos');
      } else {
        toast.success('Eliminado de favoritos');
      }
    } catch (error) {
      // Revert on error
      setFavorited(previous);
      if (onFavoriteDelta) {
        onFavoriteDelta(-(optimistic ? 1 : -1));
      }
      console.error('Favorite toggle error:', error);
      toast.error('No se pudo actualizar el favorito');
    }
  };

  if (checkingStatus) {
    return (
      <Button variant="outline" disabled>
        <Heart className="mr-2 h-4 w-4" />
        Cargando...
      </Button>
    );
  }

  return (
    <Button
      onClick={handleToggle}
      disabled={loading}
      variant={favorited ? 'default' : 'outline'}
      className={favorited ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
    >
      <Heart
        className={`mr-2 h-4 w-4 ${favorited ? 'fill-current' : ''}`}
      />
      {favorited ? 'En favoritos' : 'Agregar a favoritos'}
    </Button>
  );
}
