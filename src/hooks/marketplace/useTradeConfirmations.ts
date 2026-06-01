import { useState, useEffect, useCallback } from 'react';
import {
  useSupabaseClient,
  useUser,
} from '@/components/providers/SupabaseProvider';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';

interface UseTradeConfirmationsOptions {
  listingId?: number;
  matchConversationId?: number;
  participantId: string;
  messages: any[];
}

export interface TradeConfirmation {
  id: number;
  listing_id: number | null;
  match_conversation_id?: number | null;
  requester_id: string;
  confirmer_id: string;
  status: 'pending' | 'confirmed' | 'expired';
  sticker_count: number | null;
  note: string | null;
  requested_at: string;
  confirmed_at: string | null;
  expired_at: string | null;
  created_at: string;
}

export function useTradeConfirmations({
  listingId,
  matchConversationId,
  participantId,
  messages,
}: UseTradeConfirmationsOptions) {
  const supabase = useSupabaseClient();
  const { user } = useUser();

  const [pendingConfirmation, setPendingConfirmation] = useState<TradeConfirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch active pending confirmation between current user and participant for this listing/match conversation
  const fetchPendingConfirmation = useCallback(async () => {
    if (!user || !participantId) return;

    setLoading(true);
    try {
      let dbQuery = supabase
        .from('trade_confirmations')
        .select('*');

      if (matchConversationId) {
        dbQuery = dbQuery.eq('match_conversation_id', matchConversationId);
      } else if (listingId) {
        dbQuery = dbQuery.eq('listing_id', listingId);
      }

      const { data, error } = await dbQuery
        .in('status', ['pending', 'confirmed'])
        .or(`and(requester_id.eq.${user.id},confirmer_id.eq.${participantId}),and(requester_id.eq.${participantId},confirmer_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching pending confirmation:', error.message);
      } else {
        setPendingConfirmation(data as TradeConfirmation | null);
      }
    } catch (err) {
      logger.error('Error in fetchPendingConfirmation:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, listingId, matchConversationId, participantId, user]);

  useEffect(() => {
    void fetchPendingConfirmation();
  }, [fetchPendingConfirmation]);

  // Request a new trade confirmation
  const requestConfirmation = useCallback(
    async (stickerCount?: number, note?: string) => {
      if (!user || !participantId) return null;

      setSubmitting(true);
      try {
        const { data, error } = matchConversationId
          ? await supabase.rpc('request_match_trade_confirmation', {
              p_match_conversation_id: matchConversationId,
              p_confirmer_id: participantId,
              p_sticker_count: stickerCount || undefined,
              p_note: note || undefined,
            })
          : await supabase.rpc('request_trade_confirmation', {
              p_listing_id: listingId!,
              p_confirmer_id: participantId,
              p_sticker_count: stickerCount || undefined,
              p_note: note || undefined,
            });

        if (error) {
          toast.error(error.message);
          return null;
        }

        toast.success('Solicitud de confirmación enviada 📬');
        await fetchPendingConfirmation();
        return data as number;
      } catch (err) {
        logger.error('Error requesting confirmation:', err);
        toast.error('Error al enviar la solicitud');
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [supabase, listingId, matchConversationId, participantId, user, fetchPendingConfirmation]
  );

  // Confirm a pending trade
  const confirmTrade = useCallback(
    async (confirmationId: number) => {
      if (!user) return false;

      setSubmitting(true);
      try {
        const { data, error } = await supabase.rpc('confirm_trade', {
          p_confirmation_id: confirmationId,
        });

        if (error) {
          toast.error(error.message);
          return false;
        }

        toast.success('¡Intercambio confirmado! 🎉');
        await fetchPendingConfirmation();
        return true;
      } catch (err) {
        logger.error('Error confirming trade:', err);
        toast.error('Error al confirmar el intercambio');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [supabase, user, fetchPendingConfirmation]
  );

  // Dismiss a pending trade confirmation (only for confirmer)
  const dismissConfirmation = useCallback(
    async (confirmationId: number) => {
      if (!user) return false;

      setSubmitting(true);
      try {
        const { data, error } = await supabase.rpc('dismiss_trade_confirmation', {
          p_confirmation_id: confirmationId,
        });

        if (error) {
          toast.error(error.message);
          return false;
        }

        toast.success('Confirmación descartada');
        await fetchPendingConfirmation();
        return true;
      } catch (err) {
        logger.error('Error dismissing confirmation:', err);
        toast.error('Error al descartar la confirmación');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [supabase, user, fetchPendingConfirmation]
  );

  // Computed states
  const pendingForMe = pendingConfirmation?.status === 'pending' && pendingConfirmation?.confirmer_id === user?.id;
  const pendingByMe = pendingConfirmation?.status === 'pending' && pendingConfirmation?.requester_id === user?.id;

  // Determine if nudge card should show (>= 4 messages, oldest message >= 5 days ago, and no pending/active confirmation exists)
  const oldestMessage = messages[0];
  const oldestMessageDate = oldestMessage ? new Date(oldestMessage.created_at) : null;
  const isOldEnough = oldestMessageDate
    ? Date.now() - oldestMessageDate.getTime() >= 5 * 24 * 60 * 60 * 1000
    : false;

  const shouldShowNudge =
    messages.length >= 4 &&
    isOldEnough &&
    !pendingConfirmation;

  return {
    pendingConfirmation,
    pendingForMe,
    pendingByMe,
    shouldShowNudge,
    requestConfirmation,
    confirmTrade,
    dismissConfirmation,
    loading,
    submitting,
    refetch: fetchPendingConfirmation,
  };
}
