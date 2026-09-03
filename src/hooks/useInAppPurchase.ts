'use client';

import { useState, useCallback, useEffect } from 'react';
import { isNative } from '@/lib/platform';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

/**
 * Product IDs matching Google Play Console configuration.
 * Must be created in Monetizar con Play - Productos integrados.
 */
export const PRODUCT_IDS = {
  LISTING_EXTRA_UPLOAD: 'listing_extra_upload',
  HIGHLIGHT_48H: 'highlight_48h',
  HIGHLIGHT_7D: 'highlight_7d',
} as const;

/**
 * Subscription IDs matching Google Play Console configuration.
 * Must be created in Monetizar con Play - Suscripciones.
 */
export const SUBSCRIPTION_IDS = {
  PRO_MONTHLY: 'pro_monthly',
  PRO_YEARLY: 'pro_yearly',
} as const;

type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

// Lazy-loaded reference to the NativePurchases plugin
let NativePurchasesModule: any = null;

async function getNativePurchases(): Promise<any> {
  if (NativePurchasesModule) return NativePurchasesModule;
  try {
    // Check if Capacitor bridge has the plugin registered natively.
    // Without this check, the import resolves but any call throws
    // "NativePurchases plugin is not implemented on android" as an
    // unhandled rejection for users on old app versions.
    const cap = (window as any).Capacitor;
    if (!cap?.isPluginAvailable?.('NativePurchases')) {
      logger.warn('[InAppPurchase] NativePurchases plugin not available on this app version');
      return null;
    }

    const mod = await import('@capgo/native-purchases');
    NativePurchasesModule = mod.NativePurchases;
    return NativePurchasesModule;
  } catch (err) {
    logger.warn('[InAppPurchase] @capgo/native-purchases not available:', err);
    return null;
  }
}

/**
 * Manages in-app purchases via @capgo/native-purchases (Capacitor native bridge).
 *
 * This plugin uses the Capacitor bridge (not Cordova), so it works even when
 * the app loads content from a remote server.url like cambiocromos.com.
 *
 * Usage:
 *   const { purchaseProduct, isReady } = useInAppPurchase();
 *   const result = await purchaseProduct('listing_extra_upload');
 *   if (result.success) { // granted server-side via Edge Function }
 *
 * Only operational on Android native. Returns no-ops on web/SSR.
 *
 * Flow:
 *   1. User taps buy - NativePurchases opens Google Play purchase sheet
 *   2. On purchase success - we get the transaction with purchaseToken
 *   3. We POST to our Edge Function verify-play-purchase
 *   4. Edge Function verifies with Google Play Developer API
 *   5. Edge Function grants the product (unlock/highlight) in DB
 *   6. We consume the purchase so it can be bought again
 */
export function useInAppPurchase() {
  const supabase = useSupabaseClient();
  const [isReady, setIsReady] = useState(false);

  // Initialize on mount (native only)
  useEffect(() => {
    if (!isNative()) return;

    (async () => {
      try {
        const NP = await getNativePurchases();
        if (!NP) return;

        // Check billing support
        const { isBillingSupported } = await NP.isBillingSupported();
        if (!isBillingSupported) {
          logger.warn('[InAppPurchase] Billing not supported on this device');
          return;
        }

        // Pre-fetch products to verify connection
        const { products } = await NP.getProducts({
          productIdentifiers: Object.values(PRODUCT_IDS),
        });

        logger.info('[InAppPurchase] Ready with ' + (products?.length ?? 0) + ' products');
        setIsReady(true);
      } catch (err) {
        logger.error('[InAppPurchase] Init failed:', err);
      }
    })();
  }, []);

  /**
   * Purchase a consumable product (listing_extra_upload, highlight_48h, highlight_7d).
   *
   * Returns { success: true, transactionId } on successful purchase + server verification.
   * Returns { success: false, error } if cancelled, failed, or verification rejected.
   */
  const purchaseProduct = useCallback(async (productId: ProductId): Promise<PurchaseResult> => {
    if (!isNative()) {
      return { success: false, error: 'Not available on web' };
    }

    const NP = await getNativePurchases();
    if (!NP) {
      return { success: false, error: 'Actualiza la app para usar pagos in-app' };
    }

    try {
      // 1. Start native purchase flow — opens Google Play purchase sheet
      const transaction = await NP.purchaseProduct({
        productIdentifier: productId,
        quantity: 1,
      });

      if (!transaction?.transactionId) {
        return { success: false, error: 'cancelled' };
      }

      logger.info('[InAppPurchase] Purchase completed:', transaction.transactionId);

      // 2. Verify purchase server-side via our Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(
        process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/verify-play-purchase',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
          },
          body: JSON.stringify({
            platform: 'google_play',
            productId,
            purchaseToken: transaction.transactionId,
            transactionId: transaction.transactionId,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        logger.error('[InAppPurchase] Verification failed:', result);
        return { success: false, error: result.error || 'Verification failed' };
      }

      // 3. Consume the purchase so it can be bought again (consumable products)
      try {
        await NP.consumePurchase({
          purchaseToken: transaction.transactionId,
        });
        logger.info('[InAppPurchase] Purchase consumed');
      } catch (consumeErr) {
        // Non-fatal — the purchase was already verified and granted
        logger.warn('[InAppPurchase] Consume failed (non-fatal):', consumeErr);
      }

      return { success: true, transactionId: transaction.transactionId };
    } catch (err: any) {
      const msg = err?.message ?? String(err);

      // User cancelled the purchase
      if (msg.includes('cancel') || msg.includes('Cancel') || msg.includes('USER_CANCELED')) {
        return { success: false, error: 'cancelled' };
      }

      logger.error('[InAppPurchase] Purchase error:', err);
      return { success: false, error: msg || 'Purchase failed' };
    }
  }, [supabase]);

  return {
    purchaseProduct,
    isReady,
  };
}
