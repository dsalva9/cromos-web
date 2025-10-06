import { useState, useCallback } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { toast } from '@/lib/toast';

interface Collection {
  id: number;
  name: string;
  competition: string;
  year: string;
  description: string | null;
  is_active: boolean;
}

interface UserCollection {
  id: number;
  name: string;
  competition: string;
  year: string;
  is_user_active: boolean;
  joined_at: string;
  stats?: {
    total_stickers: number;
    owned_stickers: number;
    completion_percentage: number;
    duplicates: number;
    missing: number;
  };
}

interface CacheSnapshot {
  ownedCollections: UserCollection[];
  availableCollections: Collection[];
  nickname: string;
  activeCollectionId: number | null;
}

interface UseCollectionActionsProps {
  userId: string;

  // Optimistic update functions from useProfileData
  optimisticAddCollection: (collection: Collection) => void;
  optimisticRemoveCollection: (collectionId: number) => void;
  optimisticSetActiveCollection: (collectionId: number) => void;
  optimisticUpdateNickname: (nickname: string) => void;

  // Cache management
  takeSnapshot: () => CacheSnapshot;
  restoreSnapshot: (snapshot: CacheSnapshot) => void;

  // Soft refresh after success
  softRefresh: () => Promise<void>;

  // Current data for logic decisions
  availableCollections: Collection[];
  ownedCollections: UserCollection[];
}

export function useCollectionActions({
  userId,
  optimisticAddCollection,
  optimisticRemoveCollection,
  optimisticSetActiveCollection,
  optimisticUpdateNickname,
  takeSnapshot,
  restoreSnapshot,
  softRefresh,
  availableCollections,
  ownedCollections,
}: UseCollectionActionsProps) {
  const { supabase } = useSupabase();

  // Per-action loading states
  const [actionLoading, setActionLoading] = useState<{
    [key: string]: boolean;
  }>({});

  // Add collection with optimistic update
  const addCollection = useCallback(
    async (collectionId: number) => {
      const actionKey = `add-${collectionId}`;

      // Find collection to add
      const collection = availableCollections.find(c => c.id === collectionId);
      if (!collection) {
        toast.error('ColecciÃ³n no encontrada');
        return;
      }

      // Take snapshot for rollback
      const snapshot = takeSnapshot();

      try {
        setActionLoading(prev => ({ ...prev, [actionKey]: true }));

        // Apply optimistic update
        optimisticAddCollection(collection);

        // Show immediate feedback
        toast.success(`"${collection.name}" aÃ±adida a tus colecciones`);

        // Server call
        const isFirstCollection = ownedCollections.length === 0;
        const { error } = await supabase.from('user_collections').insert({
          user_id: userId,
          collection_id: collectionId,
          is_active: isFirstCollection,
        });

        if (error) throw error;

        // Soft refresh to sync stats
        await softRefresh();
      } catch (err: unknown) {
        console.error('Error adding collection:', err);

        // Rollback optimistic update
        restoreSnapshot(snapshot);

        // Show error
        const errorMessage =
          err instanceof Error ? err.message : 'Error al aÃ±adir colecciÃ³n';
        toast.error(errorMessage);
      } finally {
        setActionLoading(prev => ({ ...prev, [actionKey]: false }));
      }
    },
    [
      availableCollections,
      ownedCollections.length,
      optimisticAddCollection,
      takeSnapshot,
      restoreSnapshot,
      softRefresh,
      supabase,
      userId,
    ]
  );

  // Remove collection with optimistic update
  const removeCollection = useCallback(
    async (collectionId: number) => {
      const actionKey = `remove-${collectionId}`;

      // Find collection to remove
      const collection = ownedCollections.find(c => c.id === collectionId);
      if (!collection) {
        toast.error('ColecciÃ³n no encontrada');
        return;
      }

      // Take snapshot for rollback
      const snapshot = takeSnapshot();

      try {
        setActionLoading(prev => ({ ...prev, [actionKey]: true }));

        // Apply optimistic update
        optimisticRemoveCollection(collectionId);

        // Show immediate feedback
        toast.success(`"${collection.name}" eliminada de tu perfil`);

        // Server calls
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

        // Remove the user_collection
        const { error: collectionError } = await supabase
          .from('user_collections')
          .delete()
          .eq('user_id', userId)
          .eq('collection_id', collectionId);

        if (collectionError) throw collectionError;

        // Soft refresh to sync any remaining data
        await softRefresh();
      } catch (err: unknown) {
        console.error('Error removing collection:', err);

        // Rollback optimistic update
        restoreSnapshot(snapshot);

        // Show error
        const errorMessage =
          err instanceof Error ? err.message : 'Error al eliminar colecciÃ³n';
        toast.error(errorMessage);
      } finally {
        setActionLoading(prev => ({ ...prev, [actionKey]: false }));
      }
    },
    [
      ownedCollections,
      optimisticRemoveCollection,
      takeSnapshot,
      restoreSnapshot,
      softRefresh,
      supabase,
      userId,
    ]
  );

  // Set active collection with optimistic update
  const setActiveCollection = useCallback(
    async (collectionId: number) => {
      const actionKey = `activate-${collectionId}`;

      // Find collection to activate
      const collection = ownedCollections.find(c => c.id === collectionId);
      if (!collection) {
        toast.error('ColecciÃ³n no encontrada');
        return;
      }

      // Skip if already active
      if (collection.is_user_active) {
        return;
      }

      // Take snapshot for rollback
      const snapshot = takeSnapshot();

      try {
        setActionLoading(prev => ({ ...prev, [actionKey]: true }));

        // Apply optimistic update
        optimisticSetActiveCollection(collectionId);

        // Show immediate feedback
        toast.success(`"${collection.name}" es ahora tu colecciÃ³n activa`);

        // Server calls
        // Set all collections inactive first
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

        // Soft refresh to sync
        await softRefresh();
      } catch (err: unknown) {
        console.error('Error setting active collection:', err);

        // Rollback optimistic update
        restoreSnapshot(snapshot);

        // Show error
        const errorMessage =
          err instanceof Error ? err.message : 'Error al activar colecciÃ³n';
        toast.error(errorMessage);
      } finally {
        setActionLoading(prev => ({ ...prev, [actionKey]: false }));
      }
    },
    [
      ownedCollections,
      optimisticSetActiveCollection,
      takeSnapshot,
      restoreSnapshot,
      softRefresh,
      supabase,
      userId,
    ]
  );

  // Update nickname with optimistic update
  const updateNickname = useCallback(
    async (newNickname: string) => {
      const actionKey = 'nick-user';
      const trimmedNickname = newNickname.trim();

      // Take snapshot for rollback
      const snapshot = takeSnapshot();

      try {
        setActionLoading(prev => ({ ...prev, [actionKey]: true }));

        // Apply optimistic update
        optimisticUpdateNickname(trimmedNickname);

        // Show immediate feedback
        toast.success('Nombre actualizado');

        // Server call
        const { error } = await supabase.from('profiles').upsert(
          {
            id: userId,
            nickname: trimmedNickname || null,
          },
          {
            onConflict: 'id',
          }
        );

        if (error) throw error;
      } catch (err: unknown) {
        console.error('Error updating nickname:', err);

        // Rollback optimistic update
        restoreSnapshot(snapshot);

        // Show error
        const errorMessage =
          err instanceof Error ? err.message : 'Error al actualizar nombre';
        toast.error(errorMessage);
      } finally {
        setActionLoading(prev => ({ ...prev, [actionKey]: false }));
      }
    },
    [optimisticUpdateNickname, takeSnapshot, restoreSnapshot, supabase, userId]
  );

  return {
    addCollection,
    removeCollection,
    setActiveCollection,
    updateNickname,
    actionLoading,
  };
}





