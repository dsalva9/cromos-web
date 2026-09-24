'use client';

import { useState, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { UserRatingDialog } from '@/components/marketplace/UserRatingDialog';
import { triggerInAppReview } from '@/lib/inAppReview';

interface RatingModalData {
    userId: string;
    nickname: string;
}

/**
 * Global rating modal extracted from SiteHeader.
 * Can be triggered from anywhere that passes `onOpenRatingModal` to child components.
 */
export function GlobalRatingModal() {
    const supabase = useSupabaseClient();
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [ratingModalData, setRatingModalData] = useState<RatingModalData | null>(null);

    const handleOpenRatingModal = useCallback(
        (userId: string, nickname: string) => {
            setRatingModalData({ userId, nickname });
            setShowRatingModal(true);
        },
        []
    );

    const handleSubmitRating = useCallback(
        async (rating: number, comment?: string) => {
            if (!ratingModalData) return;

            const { error } = await supabase.rpc('upsert_user_rating', {
                p_rated_id: ratingModalData.userId,
                p_rating: rating,
                p_comment: comment || undefined,
            });

            if (error) {
                throw new Error(error.message);
            }

            void triggerInAppReview('global_rating_submitted');
        },
        [supabase, ratingModalData]
    );

    return {
        handleOpenRatingModal,
        ratingModalElement: ratingModalData ? (
            <UserRatingDialog
                open={showRatingModal}
                onOpenChange={setShowRatingModal}
                userToRate={{
                    id: ratingModalData.userId,
                    nickname: ratingModalData.nickname,
                }}
                existingRating={null}
                onSubmit={handleSubmitRating}
            />
        ) : null,
    };
}
