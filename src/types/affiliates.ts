/**
 * Affiliate link type for marketplace sponsored content and email promotions.
 * Maps to the `affiliate_links` table in Supabase.
 */
export interface AffiliateLink {
  id: string;
  placement: 'banner' | 'card_1' | 'card_2' | 'email';
  image_url: string;
  title: string;
  subtitle: string;
  rating: number;
  destination_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AffiliatePlacement = AffiliateLink['placement'];
