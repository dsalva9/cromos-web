'use client';

import { useState, useCallback } from 'react';
import { useRouter } from '@/hooks/use-router';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';
import { legacyFrom } from '@/types/legacy-tables';

export interface UserCollectionOption {
    id: number;
    name: string;
    isActive: boolean;
}

type UserCollectionRow = {
    collection_id: number;
    is_active: boolean;
    collections:
    | { id: number; name: string }
    | { id: number; name: string }[]
    | null;
};

/**
 * Manages collection switching: fetching the user's collections,
 * determining the active collection, and switching between them.
 */
export function useCollectionSwitcher(collectionId: number | null) {
    const supabase = useSupabaseClient();
    const { user } = useUser();
    const router = useRouter();

    const [collectionOptions, setCollectionOptions] = useState<
        UserCollectionOption[]
    >([]);
    const [activeCollectionInfo, setActiveCollectionInfo] =
        useState<UserCollectionOption | null>(null);
    const [switchingCollection, setSwitchingCollection] = useState(false);

    const fetchUserCollections = useCallback(async () => {
        if (!user) {
            setCollectionOptions([]);
            setActiveCollectionInfo(null);
            return;
        }

        try {
            const { data, error } = await legacyFrom(supabase, 'user_collections')
                .select(
                    `
          collection_id,
          is_active,
          collections (
            id,
            name
          )
        `
                )
                .eq('user_id', user.id)
                .order('collection_id', { ascending: true });

            if (error) throw error;

            const rows = (data ?? []) as UserCollectionRow[];
            const mapped = rows.map(row => {
                const collection = Array.isArray(row.collections)
                    ? row.collections[0]
                    : row.collections;

                return {
                    id: collection?.id ?? row.collection_id,
                    name: collection?.name ?? `Coleccion ${row.collection_id}`,
                    isActive: row.is_active,
                } satisfies UserCollectionOption;
            });

            setCollectionOptions(mapped);

            let activeOption =
                mapped.find(option => option.id === collectionId) ??
                mapped.find(option => option.isActive) ??
                null;

            if (!activeOption && collectionId) {
                const { data: fallback } = await legacyFrom(supabase, 'collections')
                    .select('id, name')
                    .eq('id', collectionId)
                    .single();

                if (fallback) {
                    activeOption = {
                        id: fallback.id,
                        name: fallback.name,
                        isActive: true,
                    };
                }
            }

            setActiveCollectionInfo(activeOption);
        } catch (err) {
            logger.error('Error fetching user collections:', err);
        }
    }, [collectionId, supabase, user]);

    const switchCollection = useCallback(
        async (targetCollectionId: number) => {
            if (!user) return;
            if (targetCollectionId === collectionId) return;

            setSwitchingCollection(true);

            try {
                await legacyFrom(supabase, 'user_collections')
                    .update({ is_active: false })
                    .eq('user_id', user.id);

                const { error } = await legacyFrom(supabase, 'user_collections')
                    .update({ is_active: true })
                    .eq('user_id', user.id)
                    .eq('collection_id', targetCollectionId);

                if (error) throw error;

                const selected = collectionOptions.find(
                    option => option.id === targetCollectionId
                );

                setCollectionOptions(prev =>
                    prev.map(option => ({
                        ...option,
                        isActive: option.id === targetCollectionId,
                    }))
                );

                if (selected) {
                    setActiveCollectionInfo({ ...selected, isActive: true });
                } else {
                    setActiveCollectionInfo(null);
                }

                router.push(`/mi-coleccion/${targetCollectionId}`);
            } catch (err) {
                logger.error('Error setting active collection:', err);
            } finally {
                setSwitchingCollection(false);
            }
        },
        [collectionId, collectionOptions, router, supabase, user]
    );

    return {
        collectionOptions,
        activeCollectionInfo,
        switchingCollection,
        fetchUserCollections,
        switchCollection,
    };
}
