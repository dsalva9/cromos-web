'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/components/providers/SupabaseProvider';

export interface TemplateRating {
  id: string;
  user_id: string;
  user_nickname: string;
  user_avatar_url: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface RatingDistribution {
  '5_star': number;
  '4_star': number;
  '3_star': number;
  '2_star': number;
  '1_star': number;
}

export interface RatingSummary {
  template_id: string;
  rating_avg: number;
  rating_count: number;
  rating_distribution: RatingDistribution;
  user_rating: number | null;
  user_favourited: boolean;
  favourite_count: number;
}

const EMPTY_DISTRIBUTION: RatingDistribution = {
  '5_star': 0,
  '4_star': 0,
  '3_star': 0,
  '2_star': 0,
  '1_star': 0
};

const buildDistributionFromRatings = (list: TemplateRating[]): RatingDistribution => {
  const distribution: RatingDistribution = { ...EMPTY_DISTRIBUTION };

  for (const rating of list) {
    const key = `${rating.rating}_star` as keyof RatingDistribution;
    if (distribution[key] !== undefined) {
      distribution[key] += 1;
    }
  }

  return distribution;
};

const calculateAverageFromRatings = (list: TemplateRating[]): number => {
  if (list.length === 0) return 0;

  const total = list.reduce((sum, item) => sum + item.rating, 0);
  return total / list.length;
};

export function useTemplateRatings(templateId: string) {
  const supabase = createClient();
  const { user } = useUser();
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [ratings, setRatings] = useState<TemplateRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Fetch rating summary
  const fetchSummary = useCallback(async () => {
    try {
      const { data, error: summaryError } = await supabase.rpc(
        'get_template_rating_summary',
        { p_template_id: parseInt(templateId) }
      );

      if (summaryError) throw summaryError;

      if (data && data.length > 0 && data[0]) {
        const rawSummary = data[0] as Partial<RatingSummary> & {
          rating_distribution?: Partial<RatingDistribution> | null;
        };

        const rawDistribution = {
          ...EMPTY_DISTRIBUTION,
          ...(rawSummary.rating_distribution ?? {})
        };

        const normalizedDistribution: RatingDistribution = {
          '5_star': Number(rawDistribution['5_star'] ?? 0),
          '4_star': Number(rawDistribution['4_star'] ?? 0),
          '3_star': Number(rawDistribution['3_star'] ?? 0),
          '2_star': Number(rawDistribution['2_star'] ?? 0),
          '1_star': Number(rawDistribution['1_star'] ?? 0)
        };

        setSummary({
          template_id: String(rawSummary.template_id ?? templateId),
          rating_avg: Number(rawSummary.rating_avg ?? 0),
          rating_count: Number(rawSummary.rating_count ?? 0),
          rating_distribution: normalizedDistribution,
          user_rating:
            rawSummary.user_rating === null || rawSummary.user_rating === undefined
              ? null
              : Number(rawSummary.user_rating),
          user_favourited: Boolean(rawSummary.user_favourited),
          favourite_count: Number(rawSummary.favourite_count ?? 0)
        });
      } else {
        setSummary(null);
      }
    } catch (err) {
      console.error('Error fetching rating summary:', err);
      setError(err instanceof Error ? err : new Error('Error al cargar resumen de valoraciones'));
    }
  }, [supabase, templateId]);

  // Fetch ratings list
  const fetchRatings = useCallback(
    async (offset = 0, limit = 10) => {
      try {
        const { data, error: ratingsError } = await supabase.rpc(
          'get_template_ratings',
          {
            p_template_id: parseInt(templateId),
            p_limit: limit,
            p_offset: offset
          }
        );

        if (ratingsError) throw ratingsError;

        if (data) {
          if (offset === 0) {
            setRatings(data);
          } else {
            setRatings((prev) => [...prev, ...data]);
          }
          setHasMore(data.length === limit);
        }
      } catch (err) {
        console.error('Error fetching ratings:', err);
        setError(err instanceof Error ? err : new Error('Error al cargar valoraciones'));
      }
    },
    [supabase, templateId]
  );

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSummary(), fetchRatings()]);
      setLoading(false);
    };

    loadData();
  }, [fetchSummary, fetchRatings]);

  // Rate template
  const rateTemplate = useCallback(
    async (rating: number, comment?: string) => {
      if (!user) {
        throw new Error('Debes iniciar sesión para valorar');
      }

      try {
        // Convert empty strings to null for the comment parameter
        const cleanComment = comment && comment.trim() ? comment : null;

        console.log('Creating rating with params:', {
          p_template_id: parseInt(templateId),
          p_rating: rating,
          p_comment: cleanComment
        });

        const { data: ratingData, error: rateError } = await supabase.rpc('create_template_rating', {
          p_template_id: parseInt(templateId),
          p_rating: rating,
          p_comment: cleanComment
        });

        if (rateError) {
          console.error('Rating creation error:', rateError);
          if (rateError.message.includes('cannot rate their own')) {
            throw new Error('No puedes valorar tus propias plantillas');
          }
          if (rateError.message.includes('violates unique constraint')) {
            throw new Error('Ya has valorado esta plantilla. Edita tu valoración existente.');
          }
          throw rateError;
        }

        console.log('Rating created successfully with ID:', ratingData);
        console.log('Refreshing data...');

        // Refresh data
        try {
          await fetchSummary();
          console.log('Summary refreshed');
        } catch (summaryErr) {
          console.error('Error refreshing summary:', summaryErr);
          throw summaryErr;
        }

        try {
          await fetchRatings(0);
          console.log('Ratings refreshed');
        } catch (ratingsErr) {
          console.error('Error refreshing ratings:', ratingsErr);
          throw ratingsErr;
        }
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al crear valoración');
      }
    },
    [user, supabase, templateId, fetchSummary, fetchRatings]
  );

  // Update rating
  const updateRating = useCallback(
    async (ratingId: string, rating: number, comment?: string) => {
      if (!user) {
        throw new Error('Debes iniciar sesión para actualizar valoración');
      }

      try {
        // Convert empty strings to null for the comment parameter
        const cleanComment = comment && comment.trim() ? comment : null;

        const { error: updateError } = await supabase.rpc('update_template_rating', {
          p_rating_id: parseInt(ratingId),
          p_rating: rating,
          p_comment: cleanComment
        });

        if (updateError) throw updateError;

        // Refresh data
        await Promise.all([fetchSummary(), fetchRatings(0)]);
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al actualizar valoración');
      }
    },
    [user, supabase, fetchSummary, fetchRatings]
  );

  // Delete rating
  const deleteRating = useCallback(
    async (ratingId: string) => {
      if (!user) {
        throw new Error('Debes iniciar sesión para eliminar valoración');
      }

      try {
        const { error: deleteError } = await supabase.rpc('delete_template_rating', {
          p_rating_id: parseInt(ratingId)
        });

        if (deleteError) throw deleteError;

        // Refresh data
        await Promise.all([fetchSummary(), fetchRatings(0)]);
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al eliminar valoración');
      }
    },
    [user, supabase, fetchSummary, fetchRatings]
  );

  // Load more ratings
  const loadMore = useCallback(async () => {
    if (hasMore && !loading) {
      await fetchRatings(ratings.length);
    }
  }, [hasMore, loading, ratings.length, fetchRatings]);

  // Refresh all data
  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchSummary(), fetchRatings(0)]);
    setLoading(false);
  }, [fetchSummary, fetchRatings]);

  const distributionFromRatings = useMemo(
    () => buildDistributionFromRatings(ratings),
    [ratings]
  );

  const totalRatingsFromList = useMemo(() => ratings.length, [ratings]);

  const averageFromRatings = useMemo(
    () => calculateAverageFromRatings(ratings),
    [ratings]
  );

  const userRatingFromRatings = useMemo(() => {
    if (!user) return null;
    const entry = ratings.find((rating) => rating.user_id === user.id);
    return entry ? entry.rating : null;
  }, [ratings, user]);

  const summaryForDisplay: RatingSummary | null = useMemo(() => {
    if (summary) {
      const needsDistributionOverride =
        totalRatingsFromList > 0 &&
        Object.keys(EMPTY_DISTRIBUTION).some((key) => {
          const typedKey = key as keyof RatingDistribution;
          return (
            summary.rating_distribution[typedKey] !==
            distributionFromRatings[typedKey]
          );
        });

      const needsCountOverride =
        totalRatingsFromList > 0 && summary.rating_count !== totalRatingsFromList;

      if (needsDistributionOverride || needsCountOverride) {
        return {
          ...summary,
          rating_count: totalRatingsFromList,
          rating_avg: averageFromRatings,
          rating_distribution: distributionFromRatings,
          user_rating: summary.user_rating ?? userRatingFromRatings
        };
      }

      if (summary.user_rating === null && userRatingFromRatings !== null) {
        return {
          ...summary,
          user_rating: userRatingFromRatings
        };
      }

      return summary;
    }

    if (totalRatingsFromList > 0) {
      return {
        template_id: String(templateId),
        rating_avg: averageFromRatings,
        rating_count: totalRatingsFromList,
        rating_distribution: distributionFromRatings,
        user_rating: userRatingFromRatings,
        user_favourited: false,
        favourite_count: 0
      };
    }

    return null;
  }, [
    summary,
    totalRatingsFromList,
    distributionFromRatings,
    averageFromRatings,
    userRatingFromRatings,
    templateId
  ]);

  // Get user's own rating
  const myRating =
    summaryForDisplay?.user_rating ?? userRatingFromRatings ?? null;

  // Check if user is author
  const getIsAuthor = useCallback(async () => {
    if (!user) return false;

    try {
      const { data } = await supabase
        .from('collection_templates')
        .select('author_id')
        .eq('id', parseInt(templateId))
        .single();

      return data?.author_id === user.id;
    } catch {
      return false;
    }
  }, [user, supabase, templateId]);

  return {
    summary: summaryForDisplay,
    ratings,
    loading,
    error,
    hasMore,
    myRating,
    rateTemplate,
    updateRating,
    deleteRating,
    loadMore,
    refresh,
    getIsAuthor
  };
}
