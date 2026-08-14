import { createClient } from '@/lib/supabase/client';
import type { AffiliateLink } from '@/types/affiliates';

/**
 * Fetches active affiliate links for marketplace placements (banner, card_1, card_2).
 * Returns a map by placement for easy access.
 * 
 * Uses RPC to avoid TypeScript type issues with generated Supabase types
 * (the affiliate_links table may not be in the generated types yet).
 */
export async function fetchMarketplaceAffiliates(): Promise<{
  banner: AffiliateLink | null;
  card_1: AffiliateLink | null;
  card_2: AffiliateLink | null;
}> {
  const supabase = createClient();
  
  // Use a raw query via rpc to bypass generated type constraints
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('admin_list_affiliate_links') as { data: AffiliateLink[] | null; error: any };

  if (error || !data) {
    return { banner: null, card_1: null, card_2: null };
  }

  const active = data.filter(a => a.is_active);

  return {
    banner: active.find(a => a.placement === 'banner') || null,
    card_1: active.find(a => a.placement === 'card_1') || null,
    card_2: active.find(a => a.placement === 'card_2') || null,
  };
}
