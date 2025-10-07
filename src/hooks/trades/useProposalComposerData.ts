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
      // Fetch profiles using maybeSingle() to handle potential no-results gracefully
      const fromUserPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', fromUserId)
        .maybeSingle();

      const toUserPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', toUserId)
        .maybeSingle();

      const collectionPromise = supabase
        .from('collections')
        .select('*')
        .eq('id', collectionId)
        .single();

      // Get sticker IDs for this collection first
      const { data: collectionStickers } = await supabase
        .from('stickers')
        .select('id')
        .eq('collection_id', collectionId);

      const stickerIds = collectionStickers?.map(s => s.id) || [];

      if (stickerIds.length === 0) {
        throw new Error('No stickers found for this collection');
      }

      const stickersQuery = `
        sticker_id,
        count,
        stickers (
          code,
          player_name,
          thumb_path_webp_100,
          collection_teams ( team_name )
        )
      `;

      const myStickersPromise = supabase
        .from('user_stickers')
        .select(stickersQuery)
        .eq('user_id', fromUserId)
        .in('sticker_id', stickerIds);

      const otherUserStickersPromise = supabase
        .from('user_stickers')
        .select(stickersQuery)
        .eq('user_id', toUserId)
        .in('sticker_id', stickerIds);

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

      if (fromUserRes.error)
        throw new Error(`Error fetching your profile: ${fromUserRes.error.message}`);
      if (toUserRes.error)
        throw new Error(`Error fetching user: ${toUserRes.error.message}`);
      if (!fromUserRes.data)
        throw new Error('Your profile not found');

      // If target user profile doesn't exist, create a default one
      const toUserProfile: Profile = toUserRes.data || {
        id: toUserId!,
        nickname: 'Usuario',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
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

      // Map stickers to add public URLs
      const mapStickersWithUrls = (stickers: unknown[]) => {
        return (stickers as UserStickerWithDetails[]).map(sticker => {
          if (sticker.stickers?.thumb_path_webp_100) {
            return {
              ...sticker,
              stickers: {
                ...sticker.stickers,
                thumb_public_url: supabase.storage
                  .from('sticker-images')
                  .getPublicUrl(sticker.stickers.thumb_path_webp_100).data
                  .publicUrl,
              },
            };
          }
          return sticker;
        });
      };

      setData({
        fromUser: fromUserRes.data,
        toUser: toUserProfile,
        collection: collectionRes.data,
        myStickers: mapStickersWithUrls(myStickersRes.data ?? []),
        otherUserStickers: mapStickersWithUrls(otherUserStickersRes.data ?? []),
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      );
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromUserId, toUserId, collectionId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error };
}
