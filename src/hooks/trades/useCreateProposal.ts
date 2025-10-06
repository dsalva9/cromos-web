import { useState, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import type { TradeProposalItem } from '@/types';

interface CreateProposalParams {
  collectionId: number;
  toUserId: string;
  offerItems: TradeProposalItem[];
  requestItems: TradeProposalItem[];
  message: string;
}

/**
 * Hook for creating a new trade proposal. It handles the RPC call
 * to Supabase and manages loading and error states.
 */
export function useCreateProposal() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProposal = useCallback(
    async ({
      collectionId,
      toUserId,
      offerItems,
      requestItems,
      message,
    }: CreateProposalParams): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { error: rpcError } = await supabase.rpc(
          'create_trade_proposal',
          {
            p_collection_id: collectionId,
            p_to_user: toUserId,
            p_offer_items: offerItems,
            p_request_items: requestItems,
            p_message: message,
          }
        );

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        return true;
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred.');
        }
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  return { createProposal, loading, error };
}
