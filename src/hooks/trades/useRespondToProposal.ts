import { useState, useCallback } from 'react';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';

type ProposalAction = 'accept' | 'reject' | 'cancel';

interface UseRespondToProposalReturn {
  loading: boolean;
  error: string | null;
  respond: (
    proposalId: number,
    action: ProposalAction
  ) => Promise<string | null>;
  reset: () => void;
}

export const useRespondToProposal = (): UseRespondToProposalReturn => {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const respond = useCallback(
    async (
      proposalId: number,
      action: ProposalAction
    ): Promise<string | null> => {
      if (!user) {
        setError('User not authenticated.');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc(
          'respond_to_trade_proposal',
          { p_proposal_id: proposalId, p_action: action }
        );

        if (rpcError) throw new Error(rpcError.message);

        return data; // Returns the new status
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Error al responder a la propuesta.'
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase, user]
  );

  const reset = useCallback(() => setError(null), []);

  return { loading, error, respond, reset };
};

