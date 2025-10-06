'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import { Sticker } from '@/types';

export interface CollectionPage {
  id: number;
  collection_id: number;
  kind: 'team' | 'special';
  team_id: number | null;
  title: string;
  order_index: number;
  icon_url?: string;
  collection_teams?: { logo_url: string | null }[] | null;
}

export interface ProcessedSticker extends Sticker {
  user_stickers: { count: number }[] | null;
  image_public_url: string | null;
  thumb_public_url: string | null;
  collection_teams: { team_name: string } | null;
}

export interface PageSlot {
  slot_index: number;
  sticker_id: number | null;
  stickers: ProcessedSticker | null;
}

export interface AlbumPageData extends CollectionPage {
  page_slots: PageSlot[];
  total_slots: number;
  owned_slots: number;
}

export interface AlbumSummary {
  totalStickers: number;
  ownedUnique: number;
  duplicates: number;
  missing: number;
  completionPercentage: number;
}

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

const EMPTY_ALBUM_MESSAGE = 'Este album todavia no tiene paginas configuradas.';

const createEmptySummary = (): AlbumSummary => ({
  totalStickers: 0,
  ownedUnique: 0,
  duplicates: 0,
  missing: 0,
  completionPercentage: 0,
});

export function useAlbumPages(
  collectionId: number | null,
  pageId: string | null
) {
  const { supabase } = useSupabase();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const [pages, setPages] = useState<CollectionPage[]>([]);
  const [currentPage, setCurrentPage] = useState<AlbumPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AlbumSummary | null>(null);
  const [collectionOptions, setCollectionOptions] = useState<
    UserCollectionOption[]
  >([]);
  const [activeCollectionInfo, setActiveCollectionInfo] =
    useState<UserCollectionOption | null>(null);
  const [switchingCollection, setSwitchingCollection] = useState(false);
  const [pendingStickerIds, setPendingStickerIds] = useState<number[]>([]);

  const fetchUserCollections = useCallback(async () => {
    if (!user) {
      setCollectionOptions([]);
      setActiveCollectionInfo(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_collections')
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
        const { data: fallback } = await supabase
          .from('collections')
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
      console.error('Error fetching user collections:', err);
    }
  }, [collectionId, supabase, user]);

  const fetchCollectionStats = useCallback(
    async (
      targetCollectionId: number,
      options?: { keepExisting?: boolean }
    ) => {
      if (!user) return;

      if (!options?.keepExisting) {
        setSummary(null);
      }

      try {
        const { data, error } = await supabase.rpc(
          'get_user_collection_stats',
          {
            p_user_id: user.id,
            p_collection_id: targetCollectionId,
          }
        );

        if (error) throw error;

        const stats = Array.isArray(data) && data.length > 0 ? data[0] : null;

        if (stats) {
          const total = stats.total_stickers ?? 0;
          const owned = stats.owned_stickers ?? 0;
          const duplicates = stats.duplicates ?? 0;
          const missing = stats.missing ?? Math.max(total - owned, 0);
          const completion = total > 0 ? Math.round((owned / total) * 100) : 0;

          setSummary({
            totalStickers: total,
            ownedUnique: owned,
            duplicates,
            missing,
            completionPercentage: completion,
          });
        } else {
          setSummary(createEmptySummary());
        }
      } catch (err) {
        console.error('Error fetching collection stats:', err);

        if (!options?.keepExisting) {
          setSummary(createEmptySummary());
        }
      }
    },
    [supabase, user]
  );

  const fetchPages = useCallback(async () => {
    if (!collectionId) {
      setPages([]);
      setCurrentPage(null);
      setError('No pudimos identificar la coleccion seleccionada.');
      setLoading(false);
      return [] as CollectionPage[];
    }

    try {
      const { data, error } = await supabase
        .from('collection_pages')
        .select(
          `
          id, collection_id, kind, team_id, title, order_index,
          collection_teams ( logo_url )
        `
        )
        .eq('collection_id', collectionId)
        .order('order_index', { ascending: true });

      if (error) throw error;

      const pageList = (data ?? []) as CollectionPage[];
      setPages(pageList);

      if (pageList.length === 0) {
        setCurrentPage(null);
        setError(EMPTY_ALBUM_MESSAGE);
        setLoading(false);
      } else {
        setError(null);
      }

      return pageList;
    } catch (err) {
      console.error('Error fetching album pages:', err);
      setPages([]);
      setCurrentPage(null);
      setError(
        err instanceof Error ? err.message : 'Failed to load album pages.'
      );
      setLoading(false);
      return [] as CollectionPage[];
    }
  }, [collectionId, supabase]);

  const fetchPageContent = useCallback(
    async (targetPageId: number, options?: { silent?: boolean }) => {
      if (!user) {
        setCurrentPage(null);
        setError('Debes iniciar sesion para ver este album.');
        if (!options?.silent) {
          setLoading(false);
        }
        return;
      }

      if (!options?.silent) {
        setLoading(true);
      }

      try {
        const { data: pageData, error: pageError } = await supabase
          .from('collection_pages')
          .select(
            `
            *,
            collection_teams ( logo_url )
          `
          )
          .eq('id', targetPageId)
          .single();

        if (pageError) throw pageError;

        const { data: slotsData, error: slotsError } = await supabase
          .from('page_slots')
          .select(
            `
            slot_index,
            sticker_id,
            stickers (
              *,
              user_stickers!left ( user_id, count ),
              collection_teams ( team_name )
            )
          `
          )
          .eq('page_id', targetPageId)
          .order('slot_index', { ascending: true });

        if (slotsError) throw slotsError;

        const resolvePublicUrl = (path: string | null | undefined) => {
          if (!path) return null;
          const { data } = supabase.storage
            .from('sticker-images')
            .getPublicUrl(path);
          return data?.publicUrl ?? null;
        };

        const processedSlots: PageSlot[] = (slotsData ?? []).map(slot => {
          const rawSticker = Array.isArray(slot.stickers)
            ? slot.stickers[0]
            : slot.stickers;

          if (!rawSticker) {
            return {
              ...slot,
              stickers: null,
            } as PageSlot;
          }

          const rawUserStickers = rawSticker.user_stickers;
          let normalizedUserStickers: { count: number }[] = [];

          if (Array.isArray(rawUserStickers)) {
            const match = rawUserStickers.find(
              entry => !entry?.user_id || entry.user_id === user.id
            );
            if (match) {
              normalizedUserStickers = [
                {
                  count: match.count ?? 0,
                },
              ];
            }
          } else if (rawUserStickers && typeof rawUserStickers === 'object') {
            const record = rawUserStickers as {
              user_id?: string;
              count?: number;
            };
            if (!record.user_id || record.user_id === user.id) {
              normalizedUserStickers = [
                {
                  count: record.count ?? 0,
                },
              ];
            }
          }

          const fullImage =
            resolvePublicUrl(rawSticker.image_path_webp_300) ??
            rawSticker.image_url ??
            null;
          const thumbImage =
            resolvePublicUrl(rawSticker.thumb_path_webp_100) ?? fullImage;

          const processedSticker: ProcessedSticker = {
            ...rawSticker,
            user_stickers:
              normalizedUserStickers.length > 0 ? normalizedUserStickers : null,
            image_public_url: fullImage,
            thumb_public_url: thumbImage,
          };

          return {
            ...slot,
            stickers: processedSticker,
          } as PageSlot;
        });

        const ownedCount = processedSlots.filter(slot => {
          const sticker = slot.stickers;
          if (
            !sticker ||
            !sticker.user_stickers ||
            sticker.user_stickers.length === 0
          ) {
            return false;
          }
          return sticker.user_stickers[0].count > 0;
        }).length;

        const finalPageData: AlbumPageData = {
          ...(pageData as AlbumPageData),
          page_slots: processedSlots,
          total_slots: pageData.kind === 'team' ? 20 : processedSlots.length,
          owned_slots: ownedCount,
        };

        setCurrentPage(finalPageData);
      } catch (err) {
        console.error('Error fetching page content:', err);
        setCurrentPage(null);
        setError(
          err instanceof Error ? err.message : 'Failed to load page content.'
        );
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [supabase, user]
  );

  const switchCollection = useCallback(
    async (targetCollectionId: number) => {
      if (!user) return;
      if (targetCollectionId === collectionId) return;

      setSwitchingCollection(true);

      try {
        await supabase
          .from('user_collections')
          .update({ is_active: false })
          .eq('user_id', user.id);

        const { error } = await supabase
          .from('user_collections')
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
        console.error('Error setting active collection:', err);
      } finally {
        setSwitchingCollection(false);
      }
    },
    [collectionId, collectionOptions, router, supabase, user]
  );

  const markStickerOwned = useCallback(
    async (stickerId: number) => {
      if (!user || !collectionId || !currentPage) return;

      const pageId = currentPage.id;
      const slot = currentPage.page_slots.find(
        pageSlot => pageSlot.sticker_id === stickerId
      );

      if (!slot || !slot.stickers) return;

      const currentCount = slot.stickers.user_stickers?.[0]?.count ?? 0;
      const newCount = currentCount + 1;

      setPendingStickerIds(prev =>
        prev.includes(stickerId) ? prev : [...prev, stickerId]
      );

      setCurrentPage(prev => {
        if (!prev) return prev;
        const updatedSlots = prev.page_slots.map(pageSlot => {
          if (pageSlot.sticker_id !== stickerId || !pageSlot.stickers) {
            return pageSlot;
          }

          return {
            ...pageSlot,
            stickers: {
              ...pageSlot.stickers,
              user_stickers: [
                {
                  count: newCount,
                },
              ],
            },
          } as PageSlot;
        });

        const ownedSlots = updatedSlots.filter(pageSlot => {
          const info = pageSlot.stickers?.user_stickers?.[0];
          return info ? info.count > 0 : false;
        }).length;

        return {
          ...prev,
          page_slots: updatedSlots,
          owned_slots: ownedSlots,
        };
      });

      setSummary(prev => {
        if (!prev) return prev;
        const ownedDelta = currentCount === 0 ? 1 : 0;
        const duplicatesDelta =
          Math.max(newCount - 1, 0) - Math.max(currentCount - 1, 0);
        const missingDelta = currentCount === 0 ? -1 : 0;
        const ownedUnique = prev.ownedUnique + ownedDelta;
        const duplicates = Math.max(prev.duplicates + duplicatesDelta, 0);
        const missing = Math.max(prev.missing + missingDelta, 0);
        const completionPercentage =
          prev.totalStickers > 0
            ? Math.round((ownedUnique / prev.totalStickers) * 100)
            : 0;

        return {
          ...prev,
          ownedUnique,
          duplicates,
          missing,
          completionPercentage,
        };
      });

      try {
        const { error } = await supabase.from('user_stickers').upsert({
          user_id: user.id,
          sticker_id: stickerId,
          count: newCount,
          wanted: false,
        });

        if (error) throw error;

        await fetchCollectionStats(collectionId, { keepExisting: true });
      } catch (err) {
        console.error('Error updating sticker ownership:', err);
        await fetchPageContent(pageId, { silent: true });
        await fetchCollectionStats(collectionId, { keepExisting: true });
      } finally {
        setPendingStickerIds(prev => prev.filter(id => id !== stickerId));
      }
    },
    [
      collectionId,
      currentPage,
      fetchCollectionStats,
      fetchPageContent,
      supabase,
      user,
    ]
  );

  const reduceStickerOwned = useCallback(
    async (stickerId: number) => {
      if (!user || !collectionId || !currentPage) return;

      const pageId = currentPage.id;
      const slot = currentPage.page_slots.find(
        pageSlot => pageSlot.sticker_id === stickerId
      );

      if (!slot || !slot.stickers) return;

      const currentCount = slot.stickers.user_stickers?.[0]?.count ?? 0;
      if (currentCount <= 0) return;

      const newCount = currentCount - 1;

      setPendingStickerIds(prev =>
        prev.includes(stickerId) ? prev : [...prev, stickerId]
      );

      setCurrentPage(prev => {
        if (!prev) return prev;
        const updatedSlots = prev.page_slots.map(pageSlot => {
          if (pageSlot.sticker_id !== stickerId || !pageSlot.stickers) {
            return pageSlot;
          }

          return {
            ...pageSlot,
            stickers: {
              ...pageSlot.stickers,
              user_stickers:
                newCount > 0
                  ? [
                      {
                        count: newCount,
                      },
                    ]
                  : null,
            },
          } as PageSlot;
        });

        const ownedSlots = updatedSlots.filter(pageSlot => {
          const info = pageSlot.stickers?.user_stickers?.[0];
          return info ? info.count > 0 : false;
        }).length;

        return {
          ...prev,
          page_slots: updatedSlots,
          owned_slots: ownedSlots,
        };
      });

      setSummary(prev => {
        if (!prev) return prev;
        const ownedDelta = newCount === 0 ? -1 : 0;
        const oldDuplicates = Math.max(currentCount - 1, 0);
        const newDuplicates = Math.max(newCount - 1, 0);
        const duplicatesDelta = newDuplicates - oldDuplicates;
        const missingDelta = newCount === 0 ? 1 : 0;
        const ownedUnique = Math.max(prev.ownedUnique + ownedDelta, 0);
        const duplicates = Math.max(prev.duplicates + duplicatesDelta, 0);
        const missing = Math.max(prev.missing + missingDelta, 0);
        const completionPercentage =
          prev.totalStickers > 0
            ? Math.round((ownedUnique / prev.totalStickers) * 100)
            : 0;

        return {
          ...prev,
          ownedUnique,
          duplicates,
          missing,
          completionPercentage,
        };
      });

      try {
        if (newCount > 0) {
          const { error } = await supabase.from('user_stickers').upsert({
            user_id: user.id,
            sticker_id: stickerId,
            count: newCount,
            wanted: false,
          });

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('user_stickers')
            .delete()
            .eq('user_id', user.id)
            .eq('sticker_id', stickerId);

          if (error) throw error;
        }

        await fetchCollectionStats(collectionId, { keepExisting: true });
      } catch (err) {
        console.error('Error reducing sticker ownership:', err);
        await fetchPageContent(pageId, { silent: true });
        await fetchCollectionStats(collectionId, { keepExisting: true });
      } finally {
        setPendingStickerIds(prev => prev.filter(id => id !== stickerId));
      }
    },
    [
      collectionId,
      currentPage,
      fetchCollectionStats,
      fetchPageContent,
      supabase,
      user,
    ]
  );

  useEffect(() => {
    void fetchUserCollections();
  }, [fetchUserCollections]);

  useEffect(() => {
    if (!collectionId) {
      setPages([]);
      setCurrentPage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetchPages();
  }, [collectionId, fetchPages]);

  useEffect(() => {
    if (pages.length === 0) {
      return;
    }

    let targetPageId: number | null = null;

    if (pageId) {
      const foundPage = pages.find(page => page.id.toString() === pageId);
      if (foundPage) {
        targetPageId = foundPage.id;
      }
    }

    if (!targetPageId && pages[0]) {
      targetPageId = pages[0].id;
      const basePath = pathname.split('?')[0];
      router.replace(`${basePath}?page=${targetPageId}`);
    }

    if (targetPageId) {
      void fetchPageContent(targetPageId);
    } else {
      setLoading(false);
    }
  }, [fetchPageContent, pageId, pages, pathname, router]);

  useEffect(() => {
    if (!collectionId || !user) {
      setSummary(null);
      return;
    }

    setSummary(null);
    void fetchCollectionStats(collectionId);
  }, [collectionId, fetchCollectionStats, user]);

  return {
    pages,
    currentPage,
    loading,
    error,
    summary,
    collections: collectionOptions,
    activeCollection: activeCollectionInfo,
    switchingCollection,
    pendingStickerIds,
    switchCollection,
    markStickerOwned,
    reduceStickerOwned,
  };
}


