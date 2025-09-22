import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import type {
  Collection,
  UserCollection,
  Profile,
  UserCollectionRawData,
} from '@/types/collections';

export function useProfileData() {
  const { supabase } = useSupabase();
  const { user, loading: userLoading } = useUser();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [nickname, setNickname] = useState('');
  const [ownedCollections, setOwnedCollections] = useState<UserCollection[]>(
    []
  );
  const [availableCollections, setAvailableCollections] = useState<
    Collection[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url, created_at')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile error:', profileError);
      }

      const userProfile = profileData || {
        id: user.id,
        nickname: null,
        avatar_url: null,
        created_at: user.created_at,
      };

      setProfile(userProfile);
      setNickname(userProfile?.nickname || '');

      // Fetch user's owned collections with stats
      const { data: userCollectionsData, error: userCollectionsError } =
        await supabase
          .from('user_collections')
          .select(
            `
            is_active,
            joined_at,
            collections (
              id,
              name,
              competition,
              year,
              description,
              is_active
            )
          `
          )
          .eq('user_id', user.id);

      if (userCollectionsError) throw userCollectionsError;

      // Process owned collections and get stats
      const ownedWithStats = await Promise.all(
        (userCollectionsData || []).map(async (uc: UserCollectionRawData) => {
          if (!uc.collections) return null;

          const collection = Array.isArray(uc.collections)
            ? uc.collections[0]
            : uc.collections;

          if (!collection) return null;

          // Get collection stats
          const { data: statsData } = await supabase.rpc(
            'get_user_collection_stats',
            {
              p_user_id: user.id,
              p_collection_id: collection.id,
            }
          );

          const stats = statsData?.[0] || {
            total_stickers: 0,
            owned_stickers: 0,
            completion_percentage: 0,
            duplicates: 0,
            wanted: 0,
          };

          return {
            ...collection,
            is_user_active: uc.is_active,
            joined_at: uc.joined_at,
            stats,
          } as UserCollection;
        })
      );

      const validOwnedCollections = ownedWithStats.filter(
        Boolean
      ) as UserCollection[];
      setOwnedCollections(validOwnedCollections);

      // Fetch available collections (not owned by user)
      const ownedIds = validOwnedCollections.map(c => c.id);

      let availableQuery = supabase
        .from('collections')
        .select('*')
        .eq('is_active', true);

      if (ownedIds.length > 0) {
        availableQuery = availableQuery.not(
          'id',
          'in',
          `(${ownedIds.join(',')})`
        );
      }

      const { data: availableData, error: availableError } =
        await availableQuery;

      if (availableError) throw availableError;
      setAvailableCollections(availableData || []);
    } catch (err: unknown) {
      console.error('Error fetching profile data:', err);
      setError(err instanceof Error ? err.message : 'Error loading profile');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  const refresh = useCallback(() => {
    if (!userLoading && user) {
      fetchProfileData();
    }
  }, [user, userLoading, fetchProfileData]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const memoizedData = useMemo(
    () => ({
      profile,
      nickname,
      setNickname,
      ownedCollections,
      availableCollections,
      loading,
      error,
      refresh,
      userLoading,
    }),
    [
      profile,
      nickname,
      ownedCollections,
      availableCollections,
      loading,
      error,
      refresh,
      userLoading,
    ]
  );

  return memoizedData;
}
