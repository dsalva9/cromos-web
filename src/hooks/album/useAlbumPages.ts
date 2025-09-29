'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import { Sticker } from '@/types'; // Assuming a central types file

// Types based on database-schema.md
export interface CollectionPage {
  id: number;
  collection_id: number;
  kind: 'team' | 'special';
  team_id: number | null;
  title: string;
  order_index: number;
  icon_url?: string; // For special pages
  collection_teams?: { crest_url: string | null } | null; // For team pages
}

export interface PageSlot {
  slot_index: number;
  sticker_id: number | null;
  stickers: (Sticker & { 
    user_stickers: { count: number; wanted: boolean }[] | null; 
    image_public_url: string | null;
    thumb_public_url: string | null;
  }) | null;
}

export interface AlbumPageData extends CollectionPage {
  page_slots: PageSlot[];
  total_slots: number;
  owned_slots: number;
}

export function useAlbumPages(collectionId: number | null, pageId: string | null) {
  const { supabase } = useSupabase();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const [pages, setPages] = useState<CollectionPage[]>([]);
  const [currentPage, setCurrentPage] = useState<AlbumPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    if (!collectionId) return;

    try {
      const { data, error } = await supabase
        .from('collection_pages')
        .select(`
          id, collection_id, kind, team_id, title, order_index,
          collection_teams ( crest_url )
        `)
        .eq('collection_id', collectionId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setPages(data || []);
      return data || [];
    } catch (err: unknown) {
      console.error('Error fetching album pages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load album pages.');
      return [];
    }
  }, [collectionId, supabase]);

  const fetchPageContent = useCallback(async (targetPageId: number) => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: pageData, error: pageError } = await supabase
        .from('collection_pages')
        .select(`
          *,
          collection_teams ( crest_url )
        `)
        .eq('id', targetPageId)
        .single();

      if (pageError) throw pageError;

      const { data: slotsData, error: slotsError } = await supabase
        .from('page_slots')
        .select(`
          slot_index,
          sticker_id,
          stickers (*, user_stickers!left(count, wanted))
        `)
        .eq('page_id', targetPageId)
        .eq('stickers.user_stickers.user_id', user.id)
        .order('slot_index', { ascending: true });

      if (slotsError) throw slotsError;
      
      const resolvePublicUrl = (path: string | null) => {
        if (!path) return null;
        const { data } = supabase.storage.from('sticker-images').getPublicUrl(path);
        return data?.publicUrl ?? null;
      };

      const processedSlots = slotsData.map(slot => ({
        ...slot,
        stickers: slot.stickers ? {
          ...slot.stickers,
          image_public_url: resolvePublicUrl(slot.stickers.image_path_webp_300),
          thumb_public_url: resolvePublicUrl(slot.stickers.thumb_path_webp_100),
        } : null,
      }));

      const ownedCount = processedSlots.filter(s => s.stickers && s.stickers.user_stickers && s.stickers.user_stickers.length > 0 && s.stickers.user_stickers[0].count > 0).length;

      const finalPageData: AlbumPageData = {
        ...pageData,
        page_slots: processedSlots,
        total_slots: pageData.kind === 'team' ? 20 : processedSlots.length,
        owned_slots: ownedCount,
      };

      setCurrentPage(finalPageData);

    } catch (err: unknown) {
      console.error('Error fetching page content:', err);
      setError(err instanceof Error ? err.message : 'Failed to load page content.');
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  useEffect(() => {
    if (pages.length > 0) {
      let targetPageId: number | null = null;
      if (pageId) {
        const foundPage = pages.find(p => p.id.toString() === pageId);
        if (foundPage) {
          targetPageId = foundPage.id;
        }
      }
      
      if (!targetPageId) {
        targetPageId = pages[0].id;
        router.replace(`${pathname}?page=${targetPageId}`);
      }

      if (targetPageId) {
        fetchPageContent(targetPageId);
      }
    }
  }, [pageId, pages, pathname, router, fetchPageContent]);

  return { pages, currentPage, loading, error };
}