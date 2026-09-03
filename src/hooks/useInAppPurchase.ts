'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { isNative } from '@/lib/platform';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

/**
 * Product IDs matching Google Play Console configuration.
 * Must be created in Monetizar con Play → Productos integrados.
 */
export const PRODUCT_IDS = {
  LISTING_EXTRA_UPLOAD: 'listing_extra_upload',
  HIGHLIGHT_48H: 'highlight_48h',
  HIGHLIGHT_7D: 'highlight_7d',
} as const;

/**
 * Subscription IDs matching Google Play Console configuration.
 * Must be created in Monetizar con Play → Suscripciones.
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

/**
 * Manages in-app purchases via cordova-plugin-purchase (CdvPurchase).
 *
 * Usage:
 *   const { purchaseProduct, isReady } = useInAppPurchase();
 *   const result = await purchaseProduct('listing_extra_upload');
 *   if (result.success) { // granted server-side via Edge Function }
 *
 * Only operational on Android native. Returns no-ops on web/SSR.
 *
 * Flow:
 *   1. User taps buy - CdvPurchase opens Google Play purchase sheet
 *   2. On purchase success - we POST to our Edge Function verify-play-purchase
 *   3. Edge Function verifies with Google Play Developer API
 *   4. Edge Function grants the product (unlock/highlight) in DB
 *   5. Edge Function acknowledges the purchase with Google
 *   6. We finish the transaction locally
 */
export function useInAppPurchase() {
  const supabase = useSupabaseClient();
  const [isReady, setIsReady] = useState(false);
  const storeRef = useRef<any>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  const initStore = useCallback(async () => {
    if (!isNative()) return;
    if (storeRef.current) return;
    if (initPromiseRef.current) {
      await initPromiseRef.current;
      return;
    }

    initPromiseRef.current = (async () => {
      try {
        // cordova-plugin-purchase exposes CdvPurchase on window
        const CdvPurchase = (window as any).CdvPurchase;
        if (!CdvPurchase) {
          logger.warn('[InAppPurchase] CdvPurchase not available');
          return;
        }

        const store = CdvPurchase.store;
        storeRef.current = store;

        // Register consumable products
        store.register([
          {
            id: PRODUCT_IDS.LISTING_EXTRA_UPLOAD,
            type: CdvPurchase.ProductType.CONSUMABLE,
            platform: CdvPurchase.Platform.GOOGLE_PLAY,
          },
          {
            id: PRODUCT_IDS.HIGHLIGHT_48H,
            type: CdvPurchase.ProductType.CONSUMABLE,
            platform: CdvPurchase.Platform.GOOGLE_PLAY,
          },
          {
            id: PRODUCT_IDS.HIGHLIGHT_7D,
            type: CdvPurchase.ProductType.CONSUMABLE,
            platform: CdvPurchase.Platform.GOOGLE_PLAY,
          },
        ]);

        // Set up receipt verification via our Edge Function
        store.validator = async (receipt: any, callback: any) => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
              callback({ ok: false, message: 'Not authenticated' });
              return;
            }

            const response = await fetch(
              `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-play-purchase`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  platform: 'google_play',
                  productId: receipt.products?.[0]?.id ?? receipt.id,
                  purchaseToken: receipt.transaction?.purchaseToken ?? receipt.purchaseToken,
                  transactionId: receipt.transaction?.id ?? receipt.transactionId,
                }),
              },
            );

            const result = await response.json();

            if (response.ok && result.ok) {
              callback({ ok: true, data: result });
            } else {
              callback({ ok: false, message: result.error || 'Verification failed' });
            }
          } catch (err: any) {
            logger.error('[InAppPurchase] Verification error:', err);
            callback({ ok: false, message: err.message || 'Network error' });
          }
        };

        // When verification succeeds, finish (acknowledge) the transaction
        store.when()
          .verified((receipt: any) => {
            receipt.finish();
          })
          .finished((transaction: any) => {
            logger.info('[InAppPurchase] Transaction finished:', transaction.id);
          });

        await store.initialize([CdvPurchase.Platform.GOOGLE_PLAY]);

        setIsReady(true);
        logger.info('[InAppPurchase] Store initialized with products');
      } catch (err) {
        logger.error('[InAppPurchase] Init failed:', err);
      }
    })();

    await initPromiseRef.current;
  }, [supabase]);

  // Initialize on mount (native only)
  useEffect(() => {
    initStore();
  }, [initStore]);

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

    if (!storeRef.current) {
      await initStore();
      if (!storeRef.current) {
        return { success: false, error: 'Store not initialized' };
      }
    }

    const store = storeRef.current;
    const CdvPurchase = (window as any).CdvPurchase;

    return new Promise((resolve) => {
      const product = store.get(productId, CdvPurchase.Platform.GOOGLE_PLAY);
      if (!product) {
        resolve({ success: false, error: 'Product not found' });
        return;
      }

      // Set up one-time listeners for this purchase
      const handleApproved = (transaction: any) => {
        if (transaction.products?.some((p: any) => p.id === productId)) {
          // Verification happens automatically via store.validator
          // The verified→finish chain will complete the purchase
        }
      };

      const handleFinished = (transaction: any) => {
        if (transaction.products?.some((p: any) => p.id === productId)) {
          cleanup();
          resolve({ success: true, transactionId: transaction.id });
        }
      };

      const handleCancelled = (transaction: any) => {
        if (transaction.products?.some((p: any) => p.id === productId)) {
          cleanup();
          resolve({ success: false, error: 'cancelled' });
        }
      };

      const handleError = (error: any) => {
        cleanup();
        resolve({ success: false, error: error.message || 'Purchase failed' });
      };

      const approvedHandler = store.when().approved(handleApproved);
      const finishedHandler = store.when().finished(handleFinished);

      const cleanup = () => {
        // CdvPurchase handles listener cleanup via off()
        try {
          approvedHandler?.off?.();
          finishedHandler?.off?.();
        } catch {
          // Ignore cleanup errors
        }
      };

      // Initiate the purchase
      const offer = product.getOffer();
      if (!offer) {
        resolve({ success: false, error: 'No offer available' });
        return;
      }

      store.order(offer).then((error: any) => {
        if (error) {
          cleanup();
          if (error.code === CdvPurchase.ErrorCode.PAYMENT_CANCELLED) {
            resolve({ success: false, error: 'cancelled' });
          } else {
            resolve({ success: false, error: error.message || 'Order failed' });
          }
        }
        // If no error, purchase flow started — wait for approved/finished/cancelled
      });

      // Safety timeout (2 minutes)
      setTimeout(() => {
        cleanup();
        resolve({ success: false, error: 'timeout' });
      }, 120_000);
    });
  }, [initStore]);

  return {
    purchaseProduct,
    isReady,
  };
}
