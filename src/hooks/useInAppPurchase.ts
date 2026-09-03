'use client';

import { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

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
let pluginLoadError: string | null = null;

async function getNativePurchases(): Promise<any> {
  if (NativePurchasesModule) return NativePurchasesModule;
  if (pluginLoadError) return null;

  try {
    const mod = await import('@capgo/native-purchases');
    NativePurchasesModule = mod.NativePurchases;
    return NativePurchasesModule;
  } catch (err: any) {
    pluginLoadError = err?.message ?? 'import failed';
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
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    (async () => {
      try {
        const NP = await getNativePurchases();
        if (!NP || cancelled) {
          logger.warn('[InAppPurchase] Plugin not loaded. Error:', pluginLoadError);
          return;
        }

        // Check billing support
        const result = await NP.isBillingSupported();
        if (!result?.isBillingSupported) {
          logger.warn('[InAppPurchase] Billing not supported on this device');
          return;
        }

        // Pre-fetch products to verify connection
        const { products } = await NP.getProducts({
          productIdentifiers: Object.values(PRODUCT_IDS),
        });

        logger.info('[InAppPurchase] Ready with ' + (products?.length ?? 0) + ' products');
        if (!cancelled) setIsReady(true);
      } catch (err: any) {
        // If plugin is "not implemented", this is an old app version — silently ignore
        const msg = err?.message ?? '';
        if (msg.includes('not implemented')) {
          logger.warn('[InAppPurchase] Plugin not implemented (old app version)');
          pluginLoadError = 'old app version';
        } else {
          logger.error('[InAppPurchase] Init failed:', err);
        }
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
    if (!Capacitor.isNativePlatform()) {
      return { success: false, error: 'Not available on web' };
    }

    const NP = await getNativePurchases();
    if (!NP) {
      const errMsg = pluginLoadError || 'Plugin no disponible';
      return { success: false, error: 'Actualiza la app para usar pagos (' + errMsg + ')' };
    }

    try {
      // DEBUG: show what we're doing
      toast.info('Iniciando compra: ' + productId);

      // Safety timeout: 60 seconds to avoid infinite spinning
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: Google Play no respondió en 60s')), 60000);
      });

      // 1. Start native purchase flow — opens Google Play purchase sheet
      const purchasePromise = NP.purchaseProduct({
        productIdentifier: productId,
        productType: 'inapp',
        quantity: 1,
        isConsumable: true,
      });

      const transaction = await Promise.race([purchasePromise, timeoutPromise]);

      // DEBUG: show what we got back
      toast.info('Respuesta GP: ' + JSON.stringify(transaction).substring(0, 200));

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

      toast.info('Verificando con servidor...');

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
        msg.includes('not purchased')
      ) {
        return { success: false, error: 'cancelled' };
      }

      // Plugin not implemented (old app version)
      if (msg.includes('not implemented')) {
        return { success: false, error: 'Actualiza la app desde Google Play para comprar' };
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
