'use client';

/**
 * React Query hook for marketplace alerts CRUD operations.
 * Provides alerts data, loading state, and mutation functions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/components/providers/SupabaseProvider';
import { QUERY_KEYS } from '@/lib/queryKeys';
import {
  fetchUserAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  toggleAlert,
  type MarketplaceAlert,
  type CreateAlertParams,
  type UpdateAlertParams,
} from '@/lib/supabase/alerts';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export function useAlerts() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const t = useTranslations('alerts');

  // ── Fetch all user alerts ──────────────────────────────────────────────────
  const {
    data: alerts = [],
    isLoading: loading,
    error,
    refetch: refresh,
  } = useQuery({
    queryKey: QUERY_KEYS.alerts(),
    queryFn: fetchUserAlerts,
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // ── Create alert mutation ──────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.alerts() });
      toast.success(t('created'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('createError'));
    },
  });

  // ── Update alert mutation ──────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: updateAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.alerts() });
      toast.success(t('updated'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('updateError'));
    },
  });

  // ── Delete alert mutation ──────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: deleteAlert,
    onMutate: async (alertId: number) => {
      // Optimistic removal
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.alerts() });
      const previous = queryClient.getQueryData<MarketplaceAlert[]>(QUERY_KEYS.alerts());
      queryClient.setQueryData<MarketplaceAlert[]>(
        QUERY_KEYS.alerts(),
        (old) => old?.filter((a) => a.id !== alertId) ?? []
      );
      return { previous };
    },
    onSuccess: () => {
      toast.success(t('deleted'));
    },
    onError: (error: Error, _vars, context) => {
      // Rollback optimistic update
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.alerts(), context.previous);
      }
      toast.error(error.message || t('deleteError'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.alerts() });
    },
  });

  // ── Toggle alert mutation ──────────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: toggleAlert,
    onMutate: async (alertId: number) => {
      // Optimistic toggle
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.alerts() });
      const previous = queryClient.getQueryData<MarketplaceAlert[]>(QUERY_KEYS.alerts());
      queryClient.setQueryData<MarketplaceAlert[]>(
        QUERY_KEYS.alerts(),
        (old) =>
          old?.map((a) =>
            a.id === alertId ? { ...a, is_active: !a.is_active } : a
          ) ?? []
      );
      return { previous };
    },
    onSuccess: (newStatus: boolean) => {
      toast.success(newStatus ? t('resumed') : t('paused'));
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.alerts(), context.previous);
      }
      toast.error(error.message || t('toggleError'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.alerts() });
    },
  });

  return {
    alerts,
    loading,
    error,
    refresh,
    createAlert: (params: CreateAlertParams) => createMutation.mutateAsync(params),
    updateAlert: (params: UpdateAlertParams) => updateMutation.mutateAsync(params),
    deleteAlert: (alertId: number) => deleteMutation.mutateAsync(alertId),
    toggleAlert: (alertId: number) => toggleMutation.mutateAsync(alertId),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isToggling: toggleMutation.isPending,
  };
}
