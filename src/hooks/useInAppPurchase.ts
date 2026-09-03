'use client';

import { useState, useCallback, useEffect } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
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

// Register the native plugin directly via Capacitor bridge.
// This avoids dynamic import of @capgo/native-purchases which hangs
// when the app is loaded from a remote server.url (Vercel).
let NativePurchasesPlugin: any = null;
let pluginLoadError: string | null = null;

function getNativePurchases(): any {
  if (NativePurchasesPlugin) return NativePurchasesPlugin;
  if (pluginLoadError) return null;

  try {
    NativePurchasesPlugin = registerPlugin('NativePurchases');
    return NativePurchasesPlugin;
  } catch (err: any) {
    pluginLoadError = err?.message ?? 'registerPlugin failed';
    alert('[IAP] registerPlugin FAILED: ' + pluginLoadError);
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
        const NP = getNativePurchases();
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

        // Consume any pending/unconsumed purchases from previous failed flows
        try {
          const { purchases } = await NP.restorePurchases();
          if (purchases && purchases.length > 0) {
            console.log('[IAP] Found', purchases.length, 'pending purchases, consuming...');
            for (const p of purchases) {
              const token = p.purchaseToken || p.transactionId;
              if (token) {
                try {
                  await NP.consumePurchase({ purchaseToken: token });
                  console.log('[IAP] Consumed pending purchase:', p.productIdentifier || p.productId);
                } catch (ce: any) {
                  console.warn('[IAP] Failed to consume:', ce?.message);
                }
              }
            }
          }
        } catch (restoreErr: any) {
          console.warn('[IAP] restorePurchases failed (non-fatal):', restoreErr?.message);
        }

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

    if (!Capacitor.isNativePlatform()) {
      return { success: false, error: 'Not available on web' };
    }

    const NP = getNativePurchases();
    if (!NP) {
      const errMsg = pluginLoadError || 'Plugin no disponible';
      return { success: false, error: 'Actualiza la app (' + errMsg + ')' };
    }

    try {
      const doPurchase = async (retry = false): Promise<PurchaseResult> => {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Timeout: Google Play no respondió en 60s'));
          }, 60000);
        });

        let transaction: any;
        try {
          const purchasePromise = NP.purchaseProduct({
            productIdentifier: productId,
            productType: 'inapp',
            quantity: 1,
            isConsumable: true,
          });
          transaction = await Promise.race([purchasePromise, timeoutPromise]);
        } catch (purchaseErr: any) {
          const errMsg = purchaseErr?.message ?? '';
          // If "already own", consume the old purchase and retry once
          if (!retry && (errMsg.includes('already') || errMsg.includes('ITEM_ALREADY_OWNED'))) {
            console.log('[IAP] Already owned — consuming old purchase and retrying...');
            try {
              const { purchases } = await NP.restorePurchases();
              for (const p of (purchases || [])) {
                const tok = p.purchaseToken || p.transactionId;
                if (tok) {
                  try { await NP.consumePurchase({ purchaseToken: tok }); } catch {}
                }
              }
            } catch {}
            return doPurchase(true);
          }
          throw purchaseErr;
        }

        const purchaseToken = transaction?.purchaseToken || transaction?.transactionId;
        const orderId = transaction?.orderId || transaction?.transactionId || purchaseToken;

        if (!purchaseToken) {
          return { success: false, error: 'cancelled' };
        }

        console.log('[IAP] Purchase OK, token:', purchaseToken?.substring(0, 20) + '...');

        // Verify server-side
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
          return { success: false, error: result.error || 'Error al verificar' };
        }

        // Consume so the item can be purchased again
        try {
          await NP.consumePurchase({ purchaseToken });
        } catch (consumeErr: any) {
          console.warn('[IAP] Consume failed (non-fatal):', consumeErr?.message);
        }

        return { success: true, transactionId: orderId };
      };

      return await doPurchase();
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
