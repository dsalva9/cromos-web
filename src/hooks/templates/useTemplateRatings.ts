'use client';

import { useState, useEffect, useCallback } from 'react';
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

      if (data && data.length > 0) {
        setSummary(data[0]);
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
        const { error: rateError } = await supabase.rpc('create_template_rating', {
          p_template_id: parseInt(templateId),
          p_rating: rating,
          p_comment: comment ?? null
        });

        if (rateError) {
          console.error('Rating error:', rateError);
          if (rateError.message.includes('cannot rate their own')) {
            throw new Error('No puedes valorar tus propias plantillas');
          }
          if (rateError.message.includes('violates unique constraint')) {
            throw new Error('Ya has valorado esta plantilla. Edita tu valoración existente.');
          }
          throw rateError;
        }

        // Refresh data
        await Promise.all([fetchSummary(), fetchRatings(0)]);
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
        const { error: updateError } = await supabase.rpc('update_template_rating', {
          p_rating_id: parseInt(ratingId),
          p_rating: rating,
          p_comment: comment || null
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

  // Get user's own rating
  const myRating = summary?.user_rating || null;

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
    summary,
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
