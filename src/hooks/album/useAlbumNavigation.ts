'use client';

import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useRouter } from '@/hooks/use-router';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';
import { legacyFrom } from '@/types/legacy-tables';

/** Base sticker fields matching the legacy v1.5.0 schema */
interface StickerBase {
    id: number;
    collection_id: number | null;
    team_id: number | null;
    code: string;
    player_name: string;
    position: string | null;
    nationality: string | null;
    rating: number | null;
    rarity: string | null;
    image_url: string | null;
    sticker_number: number | null;
    image_path_webp_300: string | null;
    thumb_path_webp_100: string | null;
    created_at: string | null;
}

export interface CollectionPage {
    id: number;
    collection_id: number;
    kind: 'team' | 'special';
    team_id: number | null;
    title: string;
    order_index: number;
    icon_url?: string;
    collection_teams?: { logo_url: string | null }[] | null;
    logo_url: string | null;
}

export interface ProcessedSticker extends StickerBase {
    user_stickers: { count: number }[] | null;
    image_public_url: string | null;
    thumb_public_url: string | null;
    collection_teams: { team_name: string } | null;
    team_name: string;
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

const EMPTY_ALBUM_MESSAGE = 'Este album todavia no tiene paginas configuradas.';

/**
 * Manages album page navigation: fetching pages for a collection
 * and loading individual page content (slots + sticker data).
 */
export function useAlbumNavigation(collectionId: number | null, pageId: string | null) {
    const supabase = useSupabaseClient();
    const { user } = useUser();
    const router = useRouter();
    const pathname = usePathname();

    const [pages, setPages] = useState<CollectionPage[]>([]);
    const [currentPage, setCurrentPage] = useState<AlbumPageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPages = useCallback(async () => {
        if (!collectionId) {
            setPages([]);
            setCurrentPage(null);
            setError('No pudimos identificar la coleccion seleccionada.');
            setLoading(false);
            return [] as CollectionPage[];
        }

        try {
            const { data, error } = await legacyFrom(supabase, 'collection_pages')
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
            logger.error('Error fetching album pages:', err);
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
                const { data: pageData, error: pageError } = await legacyFrom(supabase, 'collection_pages')
                    .select(
                        `
            *,
            collection_teams ( logo_url )
          `
                    )
                    .eq('id', targetPageId)
                    .single();

                if (pageError) throw pageError;

                const { data: slotsData, error: slotsError } = await legacyFrom(supabase, 'page_slots')
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

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const processedSlots: PageSlot[] = (slotsData ?? []).map((slot: any) => {
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
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (entry: any) => !entry?.user_id || entry.user_id === user.id
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
                logger.error('Error fetching page content:', err);
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

    return {
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
    };
}
