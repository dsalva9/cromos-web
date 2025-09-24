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

      try {
        const { data: proposalId, error: rpcError } = await supabase.rpc(
          'create_trade_proposal',
          {
            p_collection_id: params.collectionId, // RPC expects p_collection_id
            p_to_user: params.toUserId, // RPC expects p_to_user
            p_message: params.message, // RPC expects p_message
            p_offer_items: params.p_offer_items,
            p_request_items: params.p_request_items,
          }
        );

        if (rpcError) throw new Error(rpcError.message);
        return proposalId;
      } catch (err: any) {
        setError(err.message || 'Error al crear la propuesta.');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  return { loading, error, createProposal };
};
