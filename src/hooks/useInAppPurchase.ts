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
 */
export function useInAppPurchase() {
  const supabase = useSupabaseClient();
  const [isReady, setIsReady] = useState(false);

  // Initialize on mount (native only)
  useEffect(() => {
    if (!isNative()) return;

    let cancelled = false;
    (async () => {
      try {
        const NP = await getNativePurchases();
        if (!NP || cancelled) return;

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
        if (!cancelled) setIsReady(true);
      } catch (err) {
        logger.error('[InAppPurchase] Init failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Purchase a consumable product (listing_extra_upload, highlight_48h, highlight_7d).
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
      logger.info('[InAppPurchase] Initiating purchase for:', productId);

      // Safety timeout: 35 seconds to avoid infinite spinning
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('La operación tardó demasiado o Google Play no respondió')), 35000);
      });

      // 1. Start native purchase flow — opens Google Play purchase sheet
      const purchasePromise = NP.purchaseProduct({
        productIdentifier: productId,
        productType: 'inapp',
        quantity: 1,
        isConsumable: true,
      });

      const transaction = await Promise.race([purchasePromise, timeoutPromise]);

      const purchaseToken = transaction?.purchaseToken || transaction?.transactionId;
      const orderId = transaction?.orderId || transaction?.transactionId || purchaseToken;

      if (!purchaseToken) {
        return { success: false, error: 'cancelled' };
      }

      logger.info('[InAppPurchase] Purchase completed locally:', orderId);

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
            purchaseToken,
            transactionId: orderId,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        logger.error('[InAppPurchase] Verification failed:', result);
        return { success: false, error: result.error || 'Error al verificar la compra' };
      }

      // 3. Consume the purchase so it can be bought again (consumable products)
      try {
        await NP.consumePurchase({ purchaseToken });
        logger.info('[InAppPurchase] Purchase consumed successfully');
      } catch (consumeErr) {
        logger.warn('[InAppPurchase] Consume failed (non-fatal):', consumeErr);
      }

      return { success: true, transactionId: orderId };
    } catch (err: any) {
      const msg = err?.message ?? String(err);

      // User cancelled the purchase
      if (
        msg.includes('cancel') ||
        msg.includes('Cancel') ||
        msg.includes('USER_CANCELED') ||
        msg.includes('Purchase is not purchased')
      ) {
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
