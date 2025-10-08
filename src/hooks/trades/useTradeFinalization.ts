import { useState, useCallback } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { toast } from '@/lib/toast';

interface FinalizationResult {
  status: 'accepted' | 'completed';
  both_finalized: boolean;
  who_marked: 'me';
  finalization_count?: number;
  trade_id: number;
}

interface UseTradeFinalizationReturn {
  markAsFinalized: (tradeId: number) => Promise<FinalizationResult | null>;
  loading: boolean;
  error: string | null;
}

export const useTradeFinalization = (): UseTradeFinalizationReturn => {
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markAsFinalized = useCallback(
    async (tradeId: number): Promise<FinalizationResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('mark_trade_finalized', {
          p_trade_id: tradeId,
        });

        if (rpcError) {
          throw new Error(rpcError.message || 'Error al finalizar el intercambio.');
        }

        const result = data as FinalizationResult;

        if (result.both_finalized) {
          toast.success('¡Intercambio finalizado!', {
            description: 'Ambos participantes han confirmado. El intercambio se ha completado.',
          });
        } else {
          toast.success('Marcado como finalizado', {
            description: 'Esperando confirmación de la otra persona.',
          });
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al finalizar el intercambio.';
        setError(errorMessage);
        toast.error('Error al finalizar', {
          description: errorMessage,
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  return {
    markAsFinalized,
    loading,
    error,
  };
};
