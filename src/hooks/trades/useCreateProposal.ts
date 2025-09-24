import { useState, useCallback } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';

interface ProposalItem {
  sticker_id: number;
  quantity: number;
}

interface CreateProposalParams {
  collectionId: number;
  toUserId: string;
  message: string;
  p_offer_items: ProposalItem[];
  p_request_items: ProposalItem[];
}

interface UseCreateProposalReturn {
  loading: boolean;
  error: string | null;
  createProposal: (params: CreateProposalParams) => Promise<number | null>;
}

export const useCreateProposal = (): UseCreateProposalReturn => {
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProposal = useCallback(
    async (params: CreateProposalParams): Promise<number | null> => {
      setLoading(true);
      setError(null);

      const rpcParams = {
        p_collection_id: params.collectionId,
        p_to_user: params.toUserId,
        p_message: params.message,
        p_offer_items: params.p_offer_items,
        p_request_items: params.p_request_items,
      };

      console.log(
        '[useCreateProposal Hook] Calling RPC with params:',
        rpcParams
      ); // DEBUG LOG

      try {
        const { data: proposalId, error: rpcError } = await supabase.rpc(
          'create_trade_proposal',
          rpcParams
        );

        if (rpcError) throw new Error(rpcError.message);
        return proposalId;
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al crear la propuesta.';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  return { loading, error, createProposal };
};
