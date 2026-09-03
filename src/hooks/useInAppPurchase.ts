'use client';

import { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

/**
 * Product IDs matching Google Play Console configuration.
 */
export const PRODUCT_IDS = {
  LISTING_EXTRA_UPLOAD: 'listing_extra_upload',
  HIGHLIGHT_48H: 'highlight_48h',
  HIGHLIGHT_7D: 'highlight_7d',
} as const;

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

let NativePurchasesModule: any = null;
let pluginLoadError: string | null = null;

async function getNativePurchases(): Promise<any> {
  console.log('[IAP] getNativePurchases called, cached:', !!NativePurchasesModule, 'prevError:', pluginLoadError);
  if (NativePurchasesModule) return NativePurchasesModule;
  if (pluginLoadError) return null;

  try {
    console.log('[IAP] Attempting dynamic import of @capgo/native-purchases...');
    const mod = await import('@capgo/native-purchases');
    console.log('[IAP] Import succeeded, mod keys:', Object.keys(mod));
    NativePurchasesModule = mod.NativePurchases;
    console.log('[IAP] NativePurchases object:', typeof NativePurchasesModule);
    return NativePurchasesModule;
  } catch (err: any) {
    pluginLoadError = err?.message ?? 'import failed';
    console.error('[IAP] Import FAILED:', pluginLoadError);
    return null;
  }
}

export function useInAppPurchase() {
  const supabase = useSupabaseClient();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const native = Capacitor.isNativePlatform();
    console.log('[IAP] useEffect mount. isNative:', native, 'platform:', Capacitor.getPlatform());
    if (!native) return;

    let cancelled = false;
    (async () => {
      try {
        console.log('[IAP] Init: getting NativePurchases...');
        const NP = await getNativePurchases();
        console.log('[IAP] Init: NP is', NP ? 'loaded' : 'null');
        if (!NP || cancelled) return;

        console.log('[IAP] Init: checking isBillingSupported...');
        const result = await NP.isBillingSupported();
        console.log('[IAP] Init: isBillingSupported result:', JSON.stringify(result));
        if (!result?.isBillingSupported) {
          console.warn('[IAP] Billing not supported');
          return;
        }

        console.log('[IAP] Init: fetching products...');
        const { products } = await NP.getProducts({
          productIdentifiers: Object.values(PRODUCT_IDS),
        });
        console.log('[IAP] Init: products:', JSON.stringify(products?.map((p: any) => p.identifier)));

        if (!cancelled) {
          setIsReady(true);
          console.log('[IAP] Init: READY');
        }
      } catch (err: any) {
        console.error('[IAP] Init FAILED:', err?.message ?? err);
        if (err?.message?.includes('not implemented')) {
          pluginLoadError = 'old app version';
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const purchaseProduct = useCallback(async (productId: ProductId): Promise<PurchaseResult> => {
    console.log('[IAP] purchaseProduct called with:', productId);
    console.log('[IAP] isNative:', Capacitor.isNativePlatform(), 'platform:', Capacitor.getPlatform());

    if (!Capacitor.isNativePlatform()) {
      console.log('[IAP] Not native, returning error');
      return { success: false, error: 'Not available on web' };
    }

    console.log('[IAP] Getting NativePurchases...');
    const NP = await getNativePurchases();
    console.log('[IAP] NP is:', NP ? 'loaded' : 'null');
    if (!NP) {
      const errMsg = pluginLoadError || 'Plugin no disponible';
      console.error('[IAP] Plugin not available:', errMsg);
      return { success: false, error: 'Actualiza la app (' + errMsg + ')' };
    }

    try {
      console.log('[IAP] === STARTING PURCHASE ===');
      console.log('[IAP] productId:', productId);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.error('[IAP] TIMEOUT after 60s');
          reject(new Error('Timeout: Google Play no respondió en 60s'));
        }, 60000);
      });

      console.log('[IAP] Calling NP.purchaseProduct...');
      const purchasePromise = NP.purchaseProduct({
        productIdentifier: productId,
        productType: 'inapp',
        quantity: 1,
        isConsumable: true,
      });

      console.log('[IAP] Waiting for purchase or timeout...');
      const transaction = await Promise.race([purchasePromise, timeoutPromise]);

      console.log('[IAP] Transaction received:', JSON.stringify(transaction));

      const purchaseToken = transaction?.purchaseToken || transaction?.transactionId;
      const orderId = transaction?.orderId || transaction?.transactionId || purchaseToken;

      if (!purchaseToken) {
        console.log('[IAP] No purchaseToken, treating as cancelled');
        return { success: false, error: 'cancelled' };
      }

      console.log('[IAP] Purchase OK, token:', purchaseToken?.substring(0, 20) + '...');

      // Verify server-side
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        console.error('[IAP] Not authenticated');
        return { success: false, error: 'Not authenticated' };
      }

      console.log('[IAP] Verifying with edge function...');
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
      console.log('[IAP] Verify result:', JSON.stringify(result));

      if (!response.ok || !result.ok) {
        return { success: false, error: result.error || 'Error al verificar' };
      }

      // Consume
      try {
        console.log('[IAP] Consuming purchase...');
        await NP.consumePurchase({ purchaseToken });
        console.log('[IAP] Consumed OK');
      } catch (consumeErr: any) {
        console.warn('[IAP] Consume failed (non-fatal):', consumeErr?.message);
      }

      console.log('[IAP] === PURCHASE COMPLETE ===');
      return { success: true, transactionId: orderId };
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error('[IAP] PURCHASE ERROR:', msg);

      if (
        msg.includes('cancel') ||
        msg.includes('Cancel') ||
        msg.includes('USER_CANCELED') ||
        msg.includes('not purchased')
      ) {
        return { success: false, error: 'cancelled' };
      }

      if (msg.includes('not implemented')) {
        return { success: false, error: 'Actualiza la app desde Google Play' };
      }

      return { success: false, error: msg || 'Purchase failed' };
    }
  }, [supabase]);

  return {
    purchaseProduct,
    isReady,
  };
}
