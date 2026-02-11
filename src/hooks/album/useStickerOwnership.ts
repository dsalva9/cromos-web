'use client';

import { useState, useCallback } from 'react';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';
import { legacyFrom, legacyRpc } from '@/types/legacy-tables';
import type { AlbumPageData, PageSlot } from './useAlbumNavigation';

export interface AlbumSummary {
    totalStickers: number;
    ownedUnique: number;
    duplicates: number;
    missing: number;
    completionPercentage: number;
}

const createEmptySummary = (): AlbumSummary => ({
    totalStickers: 0,
    ownedUnique: 0,
    duplicates: 0,
    missing: 0,
    completionPercentage: 0,
});

/**
 * Manages sticker ownership operations: mark/reduce/complete,
 * and collection-level stats.
 */
export function useStickerOwnership(
    collectionId: number | null,
    currentPage: AlbumPageData | null,
    setCurrentPage: React.Dispatch<React.SetStateAction<AlbumPageData | null>>,
    fetchPageContent: (id: number, opts?: { silent?: boolean }) => Promise<void>
) {
    const supabase = useSupabaseClient();
    const { user } = useUser();

    const [summary, setSummary] = useState<AlbumSummary | null>(null);
    const [pendingStickerIds, setPendingStickerIds] = useState<number[]>([]);

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
                const { data, error } = await supabase.rpc('get_my_template_copies');

                if (error) throw error;

                const copies = (data ?? []) as Array<{
                    copy_id: number;
                    template_id: number;
                    total_slots: number;
                    completed_slots: number;
                    completion_percentage: number;
                }>;

                const matchingCopy = copies.find(
                    (c) => c.copy_id === targetCollectionId || c.template_id === targetCollectionId
                );

                if (matchingCopy) {
                    const total = Number(matchingCopy.total_slots) || 0;
                    const owned = Number(matchingCopy.completed_slots) || 0;
                    const missing = Math.max(total - owned, 0);
                    const completion = Number(matchingCopy.completion_percentage) || 0;

                    setSummary({
                        totalStickers: total,
                        ownedUnique: owned,
                        duplicates: 0,
                        missing,
                        completionPercentage: completion,
                    });
                } else {
                    setSummary(createEmptySummary());
                }
            } catch (err) {
                logger.error('Error fetching collection stats:', err);

                if (!options?.keepExisting) {
                    setSummary(createEmptySummary());
                }
            }
        },
        [supabase, user]
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
                const { error } = await legacyFrom(supabase, 'user_stickers').upsert({
                    user_id: user.id,
                    sticker_id: stickerId,
                    count: newCount,
                });

                if (error) throw error;

                await fetchCollectionStats(collectionId, { keepExisting: true });
            } catch (err) {
                logger.error('Error updating sticker ownership:', err);
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
            setCurrentPage,
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
                    const { error } = await legacyFrom(supabase, 'user_stickers').upsert({
                        user_id: user.id,
                        sticker_id: stickerId,
                        count: newCount,
                    });

                    if (error) throw error;
                } else {
                    const { error } = await legacyFrom(supabase, 'user_stickers')
                        .delete()
                        .eq('user_id', user.id)
                        .eq('sticker_id', stickerId);

                    if (error) throw error;
                }

                await fetchCollectionStats(collectionId, { keepExisting: true });
            } catch (err) {
                logger.error('Error reducing sticker ownership:', err);
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
            setCurrentPage,
        ]
    );

    const markPageComplete = useCallback(
        async (targetPageId: number) => {
            if (!user || !collectionId || !currentPage) return;

            if (targetPageId !== currentPage.id) {
                logger.error('Can only complete the current page');
                return;
            }

            if (currentPage.kind !== 'team') {
                logger.error('Only team pages can be marked complete');
                return;
            }

            const snapshotPage = { ...currentPage };
            const snapshotSummary = summary ? { ...summary } : null;

            const missingSlots = currentPage.page_slots.filter(slot => {
                if (!slot.stickers) return false;
                const count = slot.stickers.user_stickers?.[0]?.count ?? 0;
                return count === 0;
            });

            const missingStickerIds = missingSlots
                .map(slot => slot.sticker_id)
                .filter((id): id is number => id !== null);

            if (missingStickerIds.length === 0) {
                return;
            }

            setCurrentPage(prev => {
                if (!prev) return prev;

                const updatedSlots = prev.page_slots.map(slot => {
                    if (!slot.stickers) return slot;

                    const currentCount = slot.stickers.user_stickers?.[0]?.count ?? 0;
                    if (currentCount > 0) return slot;

                    return {
                        ...slot,
                        stickers: {
                            ...slot.stickers,
                            user_stickers: [{ count: 1 }],
                        },
                    } as PageSlot;
                });

                const ownedSlots = updatedSlots.filter(slot => {
                    const info = slot.stickers?.user_stickers?.[0];
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

                const addedCount = missingStickerIds.length;
                const ownedUnique = prev.ownedUnique + addedCount;
                const missing = Math.max(prev.missing - addedCount, 0);
                const completionPercentage =
                    prev.totalStickers > 0
                        ? Math.round((ownedUnique / prev.totalStickers) * 100)
                        : 0;

                return {
                    ...prev,
                    ownedUnique,
                    missing,
                    completionPercentage,
                };
            });

            // v1.6.0 migration: Bulk update all template slots on the page
            // (mark_team_page_complete was removed — use template_slots + update_template_progress)
            try {
                // 1. Get all slot IDs for this page from template_slots
                const { data: templateSlots, error: slotsError } = await legacyFrom(supabase, 'template_slots')
                    .select('id')
                    .eq('page_id', targetPageId);

                if (slotsError) throw slotsError;

                const slotIds = (templateSlots as { id: number }[] | null) ?? [];

                // 2. Bulk update each slot to 'owned' via update_template_progress
                await Promise.all(
                    slotIds.map((slot) =>
                        legacyRpc(supabase, 'update_template_progress', {
                            p_copy_id: collectionId,
                            p_slot_id: slot.id,
                            p_status: 'owned',
                            p_count: 1,
                        })
                    )
                );

                logger.debug(
                    `Page complete: ${missingStickerIds.length} stickers marked via bulk slot update`
                );

                await fetchCollectionStats(collectionId, { keepExisting: true });
            } catch (err) {
                logger.error('Error marking page complete:', err);

                setCurrentPage(snapshotPage);
                if (snapshotSummary) {
                    setSummary(snapshotSummary);
                }

                if (typeof window !== 'undefined') {
                    const { toast } = await import('@/lib/toast');
                    toast.error('No se pudo completar el equipo.');
                }
            }
        },
        [collectionId, currentPage, fetchCollectionStats, supabase, summary, user, setCurrentPage]
    );

    return {
        summary,
        pendingStickerIds,
        fetchCollectionStats,
        markStickerOwned,
        reduceStickerOwned,
        markPageComplete,
        setSummary,
    };
}
