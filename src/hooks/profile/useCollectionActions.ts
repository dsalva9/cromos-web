import { useState, useCallback } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';

interface UseCollectionActionsProps {
  userId: string;
  onAfterChange: () => void;
  ownedCollectionsCount: number;
}

export function useCollectionActions({
  userId,
  onAfterChange,
  ownedCollectionsCount,
}: UseCollectionActionsProps) {
  const { supabase } = useSupabase();
  const [actionLoading, setActionLoading] = useState<{
    [key: string]: boolean;
  }>({});
  const [error, setError] = useState<string | null>(null);

  const addCollection = useCallback(
    async (collectionId: number) => {
      const actionKey = `add-${collectionId}`;
      try {
        setActionLoading(prev => ({ ...prev, [actionKey]: true }));
        setError(null);

        // Determine if this should be the active collection
        const isFirstCollection = ownedCollectionsCount === 0;

        const { error } = await supabase.from('user_collections').insert({
          user_id: userId,
          collection_id: collectionId,
          is_active: isFirstCollection,
        });

        if (error) throw error;

        onAfterChange();
      } catch (err: unknown) {
        console.error('Error adding collection:', err);
        setError('Error al añadir colección');
      } finally {
        setActionLoading(prev => ({ ...prev, [actionKey]: false }));
      }
    },
    [supabase, userId, onAfterChange, ownedCollectionsCount]
  );

  const removeCollection = useCallback(
    async (collectionId: number) => {
      const actionKey = `remove-${collectionId}`;
      try {
        setActionLoading(prev => ({ ...prev, [actionKey]: true }));
        setError(null);

        // First, get all sticker IDs for this collection
        const { data: stickerIds, error: stickerIdsError } = await supabase
          .from('stickers')
          .select('id')
          .eq('collection_id', collectionId);

        if (stickerIdsError) throw stickerIdsError;

        // Remove user_stickers for this collection if any stickers exist
        if (stickerIds && stickerIds.length > 0) {
          const { error: stickersError } = await supabase
            .from('user_stickers')
            .delete()
            .eq('user_id', userId)
            .in(
              'sticker_id',
              stickerIds.map(s => s.id)
            );

          if (stickersError) throw stickersError;
        }

        // Then remove the user_collection
        const { error: collectionError } = await supabase
          .from('user_collections')
          .delete()
          .eq('user_id', userId)
          .eq('collection_id', collectionId);

        if (collectionError) throw collectionError;

        onAfterChange();
      } catch (err: unknown) {
        console.error('Error removing collection:', err);
        setError('Error al eliminar colección');
      } finally {
        setActionLoading(prev => ({ ...prev, [actionKey]: false }));
      }
    },
    [supabase, userId, onAfterChange]
  );

  const setActiveCollection = useCallback(
    async (collectionId: number) => {
      const actionKey = `activate-${collectionId}`;
      try {
        setActionLoading(prev => ({ ...prev, [actionKey]: true }));
        setError(null);

        // Set all collections inactive
        await supabase
          .from('user_collections')
          .update({ is_active: false })
          .eq('user_id', userId);

        // Set selected collection as active
        const { error } = await supabase
          .from('user_collections')
          .update({ is_active: true })
          .eq('user_id', userId)
          .eq('collection_id', collectionId);

        if (error) throw error;

        onAfterChange();
      } catch (err: unknown) {
        console.error('Error setting active collection:', err);
        setError('Error al activar colección');
      } finally {
        setActionLoading(prev => ({ ...prev, [actionKey]: false }));
      }
    },
    [supabase, userId, onAfterChange]
  );

  return {
    addCollection,
    removeCollection,
    setActiveCollection,
    actionLoading,
    error,
  };
}
