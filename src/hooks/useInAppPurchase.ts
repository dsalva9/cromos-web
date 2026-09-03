'use client';

import { useState, useCallback, useEffect } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

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
    return null;
  }
}

/**
 * Consume any unconsumed in-app purchases left over from previous sessions.
 * Uses restorePurchases (which internally consumes) + getPurchases as fallback.
 */
async function consumePendingPurchases(NP: any): Promise<void> {
  try {
    await NP.restorePurchases();
  } catch {}
  try {
    const result = await NP.getPurchases();
    const purchases = result?.purchases || [];
    for (const p of purchases) {
      const token = p.purchaseToken || p.transactionId;
      if (token) {
        try { await NP.consumePurchase({ purchaseToken: token }); } catch {}
      }
    }
  } catch {}
}

export function useInAppPurchase() {
  const supabase = useSupabaseClient();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    (async () => {
      try {
        const NP = getNativePurchases();
        if (!NP || cancelled) return;

        const result = await NP.isBillingSupported();
        if (!result?.isBillingSupported) return;

        await NP.getProducts({
          productIdentifiers: Object.values(PRODUCT_IDS),
        });

        await consumePendingPurchases(NP);

        if (!cancelled) setIsReady(true);
      } catch (err: any) {
        if (err?.message?.includes('not implemented')) {
          pluginLoadError = 'old app version';
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const purchaseProduct = useCallback(async (productId: ProductId): Promise<PurchaseResult> => {
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
          if (!retry && (errMsg.includes('already') || errMsg.includes('ITEM_ALREADY_OWNED'))) {
            await consumePendingPurchases(NP);
            return doPurchase(true);
          }
          throw purchaseErr;
        }

        const purchaseToken = transaction?.purchaseToken || transaction?.transactionId;
        const orderId = transaction?.orderId || transaction?.transactionId || purchaseToken;

        if (!purchaseToken) {
          return { success: false, error: 'cancelled' };
        }

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
        } catch {}

        return { success: true, transactionId: orderId };
      };

      return await doPurchase();
    } catch (err: any) {
      const msg = err?.message ?? String(err);

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
