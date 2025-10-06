import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import type {
  Collection,
  Profile,
  UserStickerWithDetails,
} from '@/types';

interface UseProposalComposerDataParams {
  fromUserId?: string | null;
  toUserId?: string | null;
  collectionId?: number | null;
}

interface ProposalComposerData {
  fromUser: Profile;
  toUser: Profile;
  collection: Collection;
  myStickers: UserStickerWithDetails[];
  otherUserStickers: UserStickerWithDetails[];
}

/**
 * Fetches all necessary data for the trade proposal composer page.
 * This includes the target user's profile, the collection details,
 * and the sticker inventories for both the current and target users.
 */
export function useProposalComposerData({
  fromUserId,
  toUserId,
  collectionId,
}: UseProposalComposerDataParams) {
  const supabase = useSupabaseClient();
  const [data, setData] = useState<ProposalComposerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!fromUserId || !toUserId || !collectionId) {
      // Don't fetch if parameters are not ready, but stop loading.
      if (loading) setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fromUserPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', fromUserId)
        .single();

      const toUserPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', toUserId)
        .single();

      const collectionPromise = supabase
        .from('collections')
        .select('*')
        .eq('id', collectionId)
        .single();

      const stickersQuery = `
        sticker_id,
        count,
        stickers (
          code,
          player_name,
          thumb_path_webp_100
        )
      `;

      const myStickersPromise = supabase
        .from('user_stickers')
        .select(stickersQuery)
        .eq('user_id', fromUserId)
        .eq('stickers.collection_id', collectionId);

      const otherUserStickersPromise = supabase
        .from('user_stickers')
        .select(stickersQuery)
        .eq('user_id', toUserId)
        .eq('stickers.collection_id', collectionId);

      const [
        fromUserRes,
        toUserRes,
        collectionRes,
        myStickersRes,
        otherUserStickersRes,
      ] = await Promise.all([
        fromUserPromise,
        toUserPromise,
        collectionPromise,
        myStickersPromise,
        otherUserStickersPromise,
      ]);

      if (toUserRes.error)
        throw new Error(`Error fetching user: ${toUserRes.error.message}`);
      if (collectionRes.error)
        throw new Error(
          `Error fetching collection: ${collectionRes.error.message}`
        );
      if (myStickersRes.error)
        throw new Error(
          `Error fetching your stickers: ${myStickersRes.error.message}`
        );
      if (otherUserStickersRes.error)
        throw new Error(
          `Error fetching other user's stickers: ${otherUserStickersRes.error.message}`
        );

      setData({
        fromUser: fromUserRes.data,
        toUser: toUserRes.data,
        collection: collectionRes.data,
        myStickers:
          (myStickersRes.data as unknown as UserStickerWithDetails[]) ?? [],
        otherUserStickers:
          (otherUserStickersRes.data as unknown as UserStickerWithDetails[]) ??
          [],
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      );
    } finally {
      setLoading(false);
    }
  }, [fromUserId, toUserId, collectionId, supabase, loading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error };
}
