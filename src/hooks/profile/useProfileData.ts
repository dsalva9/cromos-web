import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import { normalizeCollectionStats } from '@/lib/collectionStats';
import { logger } from '@/lib/logger';

interface Collection {
  id: number;
  name: string;
  competition: string;
  year: string;
  description: string | null;
  is_active: boolean;
}

interface UserCollection extends Collection {
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

interface Profile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface UserCollectionRawData {
  is_active: boolean;
  joined_at: string;
  collections: Collection[] | Collection | null;
}

interface CacheSnapshot {
  ownedCollections: UserCollection[];
  availableCollections: Collection[];
  nickname: string;
  activeCollectionId: number | null;
}

export function useProfileData() {
  const { supabase } = useSupabase();
  const { user, loading: userLoading } = useUser();

  // Core state
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

  // Cache for optimistic updates (removed unused state)

  // Active collection ID for quick access
  const activeCollectionId = useMemo(() => {
    const activeCollection = ownedCollections.find(c => c.is_user_active);
    return activeCollection?.id || null;
  }, [ownedCollections]);

  // Helper: Get fallback collection ID if no active collection
  const getFallbackCollectionId = useCallback(() => {
    if (activeCollectionId) return activeCollectionId;

    // Return first owned collection if available
    return ownedCollections.length > 0 ? ownedCollections[0].id : null;
  }, [activeCollectionId, ownedCollections]);

  // Helper: Check if user owns a specific collection
  const ownsCollection = useCallback(
    (collectionId: number) => {
      return ownedCollections.some(c => c.id === collectionId);
    },
    [ownedCollections]
  );

  // Helper: Get collection by ID from owned collections
  const getOwnedCollection = useCallback(
    (collectionId: number) => {
      return ownedCollections.find(c => c.id === collectionId) || null;
    },
    [ownedCollections]
  );

  // Take snapshot for rollback
  const takeSnapshot = useCallback((): CacheSnapshot => {
    return {
      ownedCollections: [...ownedCollections],
      availableCollections: [...availableCollections],
      nickname,
      activeCollectionId,
    };
  }, [ownedCollections, availableCollections, nickname, activeCollectionId]);

  // Restore from snapshot
  const restoreSnapshot = useCallback((snapshot: CacheSnapshot) => {
    setOwnedCollections(snapshot.ownedCollections);
    setAvailableCollections(snapshot.availableCollections);
    setNickname(snapshot.nickname);
  }, []);

  // Optimistic collection actions
  const optimisticAddCollection = useCallback(
    (collection: Collection) => {
      const isFirstCollection = ownedCollections.length === 0;

      // Move from available to owned
      setAvailableCollections(prev => prev.filter(c => c.id !== collection.id));

      const newUserCollection: UserCollection = {
        ...collection,
        is_user_active: isFirstCollection,
        joined_at: new Date().toISOString(),
        stats: {
          total_stickers: 0,
          owned_stickers: 0,
          completion_percentage: 0,
          duplicates: 0,
          missing: 0,
        },
      };

      // If first collection, make it active; otherwise deactivate all others if this becomes active
      setOwnedCollections(prev => {
        if (isFirstCollection) {
          return [newUserCollection];
        }
        return [...prev, newUserCollection];
      });
    },
    [ownedCollections.length]
  );

  const optimisticRemoveCollection = useCallback(
    (collectionId: number) => {
      const collectionToRemove = ownedCollections.find(
        c => c.id === collectionId
      );
      if (!collectionToRemove) return;

      // Remove from owned
      setOwnedCollections(prev => prev.filter(c => c.id !== collectionId));

      // Add back to available
      const backToAvailable: Collection = {
        id: collectionToRemove.id,
        name: collectionToRemove.name,
        competition: collectionToRemove.competition,
        year: collectionToRemove.year,
        description: collectionToRemove.description,
        is_active: collectionToRemove.is_active,
      };

      setAvailableCollections(prev =>
        [...prev, backToAvailable].sort((a, b) => a.name.localeCompare(b.name))
      );
    },
    [ownedCollections]
  );

  const optimisticSetActiveCollection = useCallback((collectionId: number) => {
    setOwnedCollections(prev =>
      prev.map(c => ({
        ...c,
        is_user_active: c.id === collectionId,
      }))
    );
  }, []);

  const optimisticUpdateNickname = useCallback(
    (newNickname: string) => {
      setNickname(newNickname);
      if (profile) {
        setProfile(prev =>
          prev ? { ...prev, nickname: newNickname || null } : null
        );
      }
    },
    [profile]
  );

  // Fetch data from server
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
        logger.error('Profile error:', profileError);
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

      // Process owned collections
      const validCollections = (userCollectionsData || [])
        .map((uc: UserCollectionRawData) => {
          if (!uc.collections) return null;

          const collection = Array.isArray(uc.collections)
            ? uc.collections[0]
            : uc.collections;

          if (!collection) return null;

          return {
            collection,
            is_active: uc.is_active,
            joined_at: uc.joined_at,
          };
        })
        .filter(Boolean) as Array<{
          collection: Collection;
          is_active: boolean;
          joined_at: string;
        }>;

      // Batch fetch all stats in one RPC call (5-10x faster!)
      const collectionIds = validCollections.map(c => c.collection.id);

      if (collectionIds.length > 0) {
        const { data: allStats } = await supabase.rpc(
          'get_multiple_user_collection_stats',
          { p_user_id: user.id, p_collection_ids: collectionIds }
        );

        const ownedWithStats = validCollections.map(uc => {
          const stats = allStats?.find(s => s.collection_id === uc.collection.id);
          return {
            ...uc.collection,
            is_user_active: uc.is_active,
            joined_at: uc.joined_at,
            stats: stats ? normalizeCollectionStats(stats) : {
              total_stickers: 0,
              owned_stickers: 0,
              completion_percentage: 0,
              duplicates: 0,
              missing: 0,
            },
          } as UserCollection;
        });

        setOwnedCollections(ownedWithStats);
      } else {
        setOwnedCollections([]);
      }

      // Fetch available collections (not owned by user)
      const ownedIds = collectionIds;

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
      logger.error('Error fetching profile data:', err);
      setError(err instanceof Error ? err.message : 'Error loading profile');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  // Soft refresh (no loading state)
  const softRefresh = useCallback(async () => {
    if (!user) return;

    try {
      // Re-fetch owned collections stats only (lighter operation)
      const { data: userCollectionsData } = await supabase
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

      if (userCollectionsData) {
        // Process owned collections
        const validCollections = userCollectionsData
          .map((uc: UserCollectionRawData) => {
            if (!uc.collections) return null;

            const collection = Array.isArray(uc.collections)
              ? uc.collections[0]
              : uc.collections;

            if (!collection) return null;

            return {
              collection,
              is_active: uc.is_active,
              joined_at: uc.joined_at,
            };
          })
          .filter(Boolean) as Array<{
            collection: Collection;
            is_active: boolean;
            joined_at: string;
          }>;

        // Batch fetch all stats in one RPC call (5-10x faster!)
        const collectionIds = validCollections.map(c => c.collection.id);

        let validOwnedCollections: UserCollection[] = [];

        if (collectionIds.length > 0) {
          const { data: allStats } = await supabase.rpc(
            'get_multiple_user_collection_stats',
            { p_user_id: user.id, p_collection_ids: collectionIds }
          );

          validOwnedCollections = validCollections.map(uc => {
            const stats = allStats?.find(s => s.collection_id === uc.collection.id);
            return {
              ...uc.collection,
              is_user_active: uc.is_active,
              joined_at: uc.joined_at,
              stats: stats ? normalizeCollectionStats(stats) : {
                total_stickers: 0,
                owned_stickers: 0,
                completion_percentage: 0,
                duplicates: 0,
                missing: 0,
              },
            } as UserCollection;
          });
        }

        // Only update if different to avoid unnecessary re-renders
        setOwnedCollections(prev => {
          const prevIds = prev.map(c => `${c.id}-${c.is_user_active}`).sort();
          const newIds = validOwnedCollections
            .map(c => `${c.id}-${c.is_user_active}`)
            .sort();

          if (prevIds.join(',') !== newIds.join(',')) {
            return validOwnedCollections;
          }
          return prev;
        });
      }
    } catch (err) {
      logger.error('Soft refresh failed:', err);
    }
  }, [user, supabase]);

  // Full refresh (with loading state)
  const refresh = useCallback(() => {
    if (!userLoading && user) {
      fetchProfileData();
    }
  }, [user, userLoading, fetchProfileData]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    // Data
    profile,
    nickname,
    ownedCollections,
    availableCollections,
    activeCollectionId,

    // Helper methods
    getFallbackCollectionId,
    ownsCollection,
    getOwnedCollection,

    // States
    loading,
    error,
    userLoading,

    // Actions
    refresh,
    softRefresh,

    // Optimistic mutations
    optimisticAddCollection,
    optimisticRemoveCollection,
    optimisticSetActiveCollection,
    optimisticUpdateNickname,

    // Cache management
    takeSnapshot,
    restoreSnapshot,

    // Setters for direct state updates if needed
    setNickname,
    setError,
  };
}







