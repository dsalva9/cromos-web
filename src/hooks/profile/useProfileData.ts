import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
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
  postcode: string | null;
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
        .select('id, nickname, avatar_url, created_at, postcode')
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
        postcode: null,
      };

      setProfile(userProfile);
      setNickname(userProfile?.nickname || '');

      // Fetch user's owned template copies with stats
      const { data: myTemplatesData, error: myTemplatesError } =
        await supabase.rpc('get_my_template_copies');

      if (myTemplatesError) throw myTemplatesError;

      // Transform template copies to match UserCollection interface
      const ownedWithStats = (myTemplatesData || []).map(template => ({
        id: template.copy_id,
        name: template.title,
        competition: '', // Templates don't have competition field
        year: '', // Templates don't have year field
        description: null,
        is_active: true, // Templates are always active if copied
        is_user_active: template.is_active,
        joined_at: template.copied_at,
        stats: {
          total_stickers: Number(template.total_slots),
          owned_stickers: Number(template.completed_slots),
          completion_percentage: Number(template.completion_percentage),
          duplicates: 0, // Calculate from progress if needed
          missing: Number(template.total_slots) - Number(template.completed_slots),
        },
      })) as UserCollection[];

      setOwnedCollections(ownedWithStats);

      // Fetch available public templates (not owned by user)
      const ownedTemplateIds = (myTemplatesData || []).map(t => t.template_id);

      let availableQuery = supabase
        .from('collection_templates')
        .select('id, title, description, author_id, image_url, rating_avg, rating_count, copies_count, created_at')
        .eq('is_public', true);

      if (ownedTemplateIds.length > 0) {
        availableQuery = availableQuery.not(
          'id',
          'in',
          `(${ownedTemplateIds.join(',')})`
        );
      }

      const { data: availableData, error: availableError } =
        await availableQuery;

      if (availableError) throw availableError;

      // Transform templates to match Collection interface
      const availableTemplates = (availableData || []).map(template => ({
        id: template.id,
        name: template.title,
        competition: '', // Templates don't have competition
        year: '', // Templates don't have year
        description: template.description,
        is_active: true,
      })) as Collection[];

      setAvailableCollections(availableTemplates);
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
      // Re-fetch owned template copies with stats (lighter operation)
      const { data: myTemplatesData } = await supabase.rpc('get_my_template_copies');

      if (myTemplatesData) {
        // Transform template copies to match UserCollection interface
        const validOwnedCollections = myTemplatesData.map(template => ({
          id: template.copy_id,
          name: template.title,
          competition: '', // Templates don't have competition field
          year: '', // Templates don't have year field
          description: null,
          is_active: true,
          is_user_active: template.is_active,
          joined_at: template.copied_at,
          stats: {
            total_stickers: Number(template.total_slots),
            owned_stickers: Number(template.completed_slots),
            completion_percentage: Number(template.completion_percentage),
            duplicates: 0,
            missing: Number(template.total_slots) - Number(template.completed_slots),
          },
        })) as UserCollection[];

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







