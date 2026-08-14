/**
 * Image configuration for per-viewport zoom and position control.
 */
export interface ImageViewConfig {
  scale: number;
  x: number;
  y: number;
}

export interface ImageConfig {
  mobile: ImageViewConfig;
  desktop: ImageViewConfig;
}

export const DEFAULT_IMAGE_CONFIG: ImageConfig = {
  mobile: { scale: 1, x: 0, y: 0 },
  desktop: { scale: 1, x: 0, y: 0 },
};

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
  image_config: ImageConfig;
  created_at: string;
  updated_at: string;
}

export type AffiliatePlacement = AffiliateLink['placement'];
