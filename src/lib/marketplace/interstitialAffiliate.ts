import { createClient } from '@/lib/supabase/client';
import { isNative } from '@/lib/platform';
import type { AffiliateLink } from '@/types/affiliates';

/**
 * Fetches the currently active 'interstitial' affiliate link, if any.
 * Fails silently and returns null if none is active or on network error.
 */
export async function fetchInterstitialAffiliate(): Promise<AffiliateLink | null> {
  try {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_active_interstitial_affiliate') as {
      data: AffiliateLink[] | null;
      error: unknown;
    };

    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0];
  } catch {
    return null;
  }
}

/**
 * Detects current client platform for analytics tracking.
 */
export function getInterstitialPlatform(): 'android' | 'web_mobile' | 'web_desktop' {
  if (isNative()) return 'android';
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return 'web_mobile';
  }
  return 'web_desktop';
}

/**
 * Records an interstitial event ('impression' | 'click' | 'dismiss') fire-and-forget.
 */
export function recordAffiliateEvent(
  affiliateId: string,
  eventType: 'impression' | 'click' | 'dismiss'
): void {
  try {
    const supabase = createClient();
    const platform = getInterstitialPlatform();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void Promise.resolve((supabase.rpc as any)('record_affiliate_event', {
      p_affiliate_id: affiliateId,
      p_event_type: eventType,
      p_platform: platform,
    })).catch(() => {
      // Non-critical tracking
    });
  } catch {
    // Non-critical tracking
  }
}
