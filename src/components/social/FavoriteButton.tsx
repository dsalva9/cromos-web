'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/social/useFavorites';
import { toast } from 'sonner';

interface FavoriteButtonProps {
  userId: string;
}

export function FavoriteButton({ userId }: FavoriteButtonProps) {
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
    try {
      // Optimistic update
      setFavorited(!favorited);

      const isNowFavorited = await toggleFavorite(userId);
      setFavorited(isNowFavorited);

      if (isNowFavorited) {
        toast.success('Added to favorites');
      } else {
        toast.success('Removed from favorites');
      }
    } catch (error) {
      // Revert on error
      setFavorited(!favorited);
      console.error('Favorite toggle error:', error);
      toast.error('Failed to update favorite');
    }
  };

  if (checkingStatus) {
    return (
      <Button variant="outline" disabled>
        <Heart className="mr-2 h-4 w-4" />
        Loading...
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
      {favorited ? 'Favorited' : 'Add Favorite'}
    </Button>
  );
}
