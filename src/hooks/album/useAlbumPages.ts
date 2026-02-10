'use client';

import { useEffect } from 'react';
import { useCollectionSwitcher } from './useCollectionSwitcher';
import { useAlbumNavigation } from './useAlbumNavigation';
import { useStickerOwnership } from './useStickerOwnership';

// Re-export types so consumers don't need to change imports
export type { CollectionPage, ProcessedSticker, PageSlot, AlbumPageData } from './useAlbumNavigation';
export type { AlbumSummary } from './useStickerOwnership';
export type { UserCollectionOption } from './useCollectionSwitcher';

/**
 * Composed hook for the album page.
 *
 * Delegates to three focused sub-hooks:
 * - `useCollectionSwitcher` — collection list & active collection
 * - `useAlbumNavigation` — page list & page content with sticker data
 * - `useStickerOwnership` — mark/reduce/complete + stats
 *
 * The public API is unchanged from the original monolith.
 */
export function useAlbumPages(
  collectionId: number | null,
  pageId: string | null
) {
  const {
    collectionOptions,
    activeCollectionInfo,
    switchingCollection,
    fetchUserCollections,
    switchCollection,
  } = useCollectionSwitcher(collectionId);

  const {
    pages,
    currentPage,
    loading,
    error,
    setCurrentPage,
    setLoading,
    fetchPages,
    fetchPageContent,
    router,
    pathname,
  } = useAlbumNavigation(collectionId, pageId);

  const {
    summary,
    pendingStickerIds,
    fetchCollectionStats,
    markStickerOwned,
    reduceStickerOwned,
    markPageComplete,
    setSummary,
  } = useStickerOwnership(collectionId, currentPage, setCurrentPage, fetchPageContent);

  // ─── Effects (orchestration) ───

  useEffect(() => {
    void fetchUserCollections();
  }, [fetchUserCollections]);

  useEffect(() => {
    if (!collectionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetchPages();
  }, [collectionId, fetchPages, setLoading]);

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
  }, [fetchPageContent, pageId, pages, pathname, router, setLoading]);

  useEffect(() => {
    if (!collectionId) {
      setSummary(null);
      return;
    }

    setSummary(null);
    void fetchCollectionStats(collectionId);
  }, [collectionId, fetchCollectionStats, setSummary]);

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
    markPageComplete,
  };
}
