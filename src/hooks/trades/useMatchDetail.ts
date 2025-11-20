import { useState, useCallback } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

interface TradeSticker {
  sticker_id: number;
  sticker_code: string;
  player_name: string;
  team_name: string;
  rarity: string;
  count: number;
}

interface DetailParams {
  userId: string;
  otherUserId: string;
  collectionId: number;
}

interface RawTradeDetail {
  direction: 'they_offer' | 'i_offer';
  sticker_id: number;
  sticker_code: string;
  player_name: string;
  team_name: string;
  rarity: string;
  count: number;
}

export function useMatchDetail() {
  const { supabase } = useSupabase();
  const [theyOffer, setTheyOffer] = useState<TradeSticker[]>([]);
  const [iOffer, setIOffer] = useState<TradeSticker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(
    async ({ userId, otherUserId, collectionId }: DetailParams) => {
      try {
        setLoading(true);
        setError(null);

        // Call the RPC function
        // TODO [v1.6.0 MIGRATION]: Remove deprecated get_mutual_trade_detail RPC
        // This RPC was removed in v1.4.3 (detail page removed, per api-endpoints.md line 311)
        // Migration: Remove this hook entirely and navigate directly to trade composer
        // See: docs/RPC_MIGRATION_GUIDE_v1.5_to_v1.6.md
        const { data, error: rpcError } = await supabase.rpc(
          'get_mutual_trade_detail', // ⚠️ DEPRECATED v1.4.3, REMOVED v1.6.0
          {
            p_user_id: userId,
            p_other_user_id: otherUserId,
            p_collection_id: collectionId,
          }
        );

        if (rpcError) {
          logger.error('RPC error:', rpcError);
          throw new Error('Error al cargar detalles del intercambio');
        }

        const results = (data || []) as RawTradeDetail[];

        // Separate results by direction
        const theyOfferList = results
          .filter(item => item.direction === 'they_offer')
          .map(item => ({
            sticker_id: item.sticker_id,
            sticker_code: item.sticker_code,
            player_name: item.player_name,
            team_name: item.team_name,
            rarity: item.rarity,
            count: Math.max(item.count - 1, 0),
          }));

        const iOfferList = results
          .filter(item => item.direction === 'i_offer')
          .map(item => ({
            sticker_id: item.sticker_id,
            sticker_code: item.sticker_code,
            player_name: item.player_name,
            team_name: item.team_name,
            rarity: item.rarity,
            count: Math.max(item.count - 1, 0),
          }));

        setTheyOffer(theyOfferList);
        setIOffer(iOfferList);
      } catch (err: unknown) {
        logger.error('Fetch detail error:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Error al cargar detalles';
        setError(errorMessage);

        // Reset state on error
        setTheyOffer([]);
        setIOffer([]);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const clearDetail = useCallback(() => {
    setTheyOffer([]);
    setIOffer([]);
    setError(null);
  }, []);

  return {
    theyOffer,
    iOffer,
    loading,
    error,
    fetchDetail,
    clearDetail,
  };
}


