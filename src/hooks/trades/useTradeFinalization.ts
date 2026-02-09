import { useState, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { toast } from '@/lib/toast';

interface FinalizationResult {
  status: 'pending' | 'completed' | 'already_requested';
  requester_id?: string;
  accepter_id?: string;
  request_status?: string;
}

interface UseTradeFinalizationReturn {
  requestFinalization: (tradeId: number) => Promise<FinalizationResult | null>;
  rejectFinalization: (tradeId: number) => Promise<{ status: string } | null>;
  loading: boolean;
  error: string | null;
}

export const useTradeFinalization = (): UseTradeFinalizationReturn => {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestFinalization = useCallback(
    async (tradeId: number): Promise<FinalizationResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('request_trade_finalization', {
          p_trade_id: tradeId,
        });

        if (rpcError) {
          throw new Error(rpcError.message || 'Error al solicitar finalización.');
        }

        const result = data as unknown as FinalizationResult;

        if (result.status === 'completed') {
          toast.success('¡Intercambio finalizado!', {
            description: 'Has aceptado la finalización. El intercambio se ha completado.',
          });
        } else if (result.status === 'pending') {
          toast.success('Finalización solicitada', {
            description: 'Esperando que la otra persona acepte o rechace.',
          });
        } else if (result.status === 'already_requested') {
          toast.info('Ya solicitaste la finalización', {
            description: 'Esperando respuesta de la otra persona.',
          });
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al solicitar finalización.';
        setError(errorMessage);
        toast.error('Error', {
          description: errorMessage,
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const rejectFinalization = useCallback(
    async (tradeId: number): Promise<{ status: string } | null> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('reject_trade_finalization', {
          p_trade_id: tradeId,
        });

        if (rpcError) {
          throw new Error(rpcError.message || 'Error al rechazar finalización.');
        }

        toast.success('Finalización rechazada', {
          description: 'El intercambio continúa en estado aceptado.',
        });

        return data as { status: string };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al rechazar finalización.';
        setError(errorMessage);
        toast.error('Error', {
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
    requestFinalization,
    rejectFinalization,
    loading,
    error,
  };
};
