'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useListingFavorite } from '@/hooks/marketplace/useListingFavorite';
import { toast } from 'sonner';

interface ListingFavoriteButtonProps {
  listingId: string;
  variant?: 'full' | 'icon';
  onFavoriteChange?: (isFavorited: boolean) => void;
}

export function ListingFavoriteButton({
  listingId,
  variant = 'full',
  onFavoriteChange
}: ListingFavoriteButtonProps) {
  const { toggleFavorite, loading, checkFavorite } = useListingFavorite();
  const [favorited, setFavorited] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const loadFavoriteStatus = useCallback(async () => {
    try {
      setCheckingStatus(true);
      const status = await checkFavorite(listingId);
      setFavorited(status);
    } finally {
      setCheckingStatus(false);
    }
  }, [listingId, checkFavorite]);

  useEffect(() => {
    loadFavoriteStatus();
  }, [loadFavoriteStatus]);

  const handleToggle = async (e?: React.MouseEvent) => {
    // Prevent event propagation if clicked on a card
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const previous = favorited;
    const optimistic = !previous;

    try {
      // Optimistic update
      setFavorited(optimistic);
      if (onFavoriteChange) {
        onFavoriteChange(optimistic);
      }

      const isNowFavorited = await toggleFavorite(listingId);
      setFavorited(isNowFavorited);

      if (isNowFavorited !== optimistic && onFavoriteChange) {
        // Reconcile if server result differs
        onFavoriteChange(isNowFavorited);
      }

      if (isNowFavorited) {
        toast.success('Añadido a favoritos');
      } else {
        toast.success('Eliminado de favoritos');
      }
    } catch (error) {
      // Revert on error
      setFavorited(previous);
      if (onFavoriteChange) {
        onFavoriteChange(previous);
      }
      console.error('Favorite toggle error:', error);
      toast.error('No se pudo actualizar el favorito');
    }
  };

  if (checkingStatus && variant === 'full') {
    return (
      <Button variant="outline" disabled>
        <Heart className="mr-2 h-4 w-4" />
        Cargando...
      </Button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggle}
        disabled={loading || checkingStatus}
        className={`
          p-2 rounded-full
          transition-all duration-200
          ${favorited
            ? 'bg-red-500/80 hover:bg-red-600/90 text-white shadow-lg'
            : 'bg-white/70 hover:bg-white/90 text-gray-600 shadow-md'
          }
          ${loading || checkingStatus ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}
        `}
        aria-label={favorited ? 'Eliminar de favoritos' : 'Agregar a favoritos'}
      >
        <Heart
          className={`h-5 w-5 ${favorited ? 'fill-current' : ''}`}
        />
      </button>
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
