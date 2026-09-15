'use client';

import { useState, useCallback } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';
import { useDeviceId } from '@/hooks/useDeviceId';
import { toast } from 'sonner';

export type ProPlan = 'monthly' | 'yearly';

interface UseProSubscriptionReturn {
  isPro: boolean;
  expiresAt: string | null;
  activateTrial: () => Promise<boolean>;
  subscribePro: (plan: ProPlan) => Promise<void>;
  restorePurchases: (silent?: boolean) => Promise<boolean>;
  isActivating: boolean;
}

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
 * Centralizes PRO subscription actions:
 * - activateTrial() → calls activate_pro_trial RPC (7 days free, no card)
 * - subscribePro() → Google Play (native) or LemonSqueezy (web)
 * - restorePurchases() → queries Google Play for existing subscription and verifies
 */
export function useProSubscription(): UseProSubscriptionReturn {
  const supabase = useSupabaseClient();
  const { profile, refresh } = useProfileCompletion();
  const { deviceId } = useDeviceId();
  const [isActivating, setIsActivating] = useState(false);

  const isPro = profile?.is_pro ?? false;
  const expiresAt = profile?.pro_expires_at ?? null;

  const verifyWithBackend = useCallback(async (
    productId: string,
    purchaseToken: string,
    transactionId?: string,
    silent = false
  ): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      if (!silent) toast.error('No autenticado. Por favor inicia sesión.');
      return false;
    }

    if (!silent) {
      toast.loading('Verificando suscripción con Google Play...', { id: 'verify-sub' });
    }

    try {
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
            productId,
            purchaseToken,
            transactionId: transactionId || purchaseToken,
          }),
        }
      );

      if (!silent) toast.dismiss('verify-sub');
      const resData = await response.json().catch(() => null);

      if (response.ok && resData?.ok) {
        toast.success('¡Suscripción PRO activada con éxito!');
        await refresh();
        return true;
      } else {
        if (!silent) {
          toast.error(resData?.error || 'Error al verificar la suscripción.');
        }
        return false;
      }
    } catch (e: any) {
      if (!silent) {
        toast.dismiss('verify-sub');
        toast.error('Error de red al verificar la suscripción.');
      }
      return false;
    }
  }, [supabase, refresh]);

  const restorePurchases = useCallback(async (silent = false): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;
    const NP = getNativePurchases();
    if (!NP) return false;

    if (!silent) {
      toast.loading('Consultando compras en Google Play...', { id: 'restore-sub' });
    }

    try {
      const result = await NP.getPurchases({ productType: 'subs' });
      const purchases = result?.purchases || [];

      const proPurchase = purchases.find((p: any) =>
        p.productIdentifier === 'pro_monthly' || p.productIdentifier === 'pro_yearly_cc'
      );

      if (!silent) toast.dismiss('restore-sub');

      if (!proPurchase) {
        if (!silent) toast.info('No se encontraron suscripciones activas en Google Play.');
        return false;
      }

      const purchaseToken = proPurchase.purchaseToken || proPurchase.transactionId;
      const productId = proPurchase.productIdentifier;
      const orderId = proPurchase.orderId || proPurchase.transactionId || purchaseToken;

      if (!purchaseToken) {
        if (!silent) toast.error('Token de compra no disponible.');
        return false;
      }

      return await verifyWithBackend(productId, purchaseToken, orderId, silent);
    } catch (err: any) {
      if (!silent) {
        toast.dismiss('restore-sub');
        toast.error(err?.message || 'Error al restaurar compras.');
      }
      return false;
    }
  }, [verifyWithBackend]);

  // Silently check for existing subscription on native platform if user is not marked as PRO yet
  useState(() => {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform() && !isPro) {
      restorePurchases(true);
    }
  });

  const activateTrial = useCallback(async (): Promise<boolean> => {
    let resolvedDeviceId = deviceId;
    if (!resolvedDeviceId && typeof window !== 'undefined') {
      try { resolvedDeviceId = localStorage.getItem('cc_device_id'); } catch {}
      if (!resolvedDeviceId) {
        resolvedDeviceId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'dev_' + Date.now();
        try { localStorage.setItem('cc_device_id', resolvedDeviceId); } catch {}
      }
    }

    if (!resolvedDeviceId) {
      toast.error('Error obteniendo ID del dispositivo. Inténtalo de nuevo.');
      return false;
    }

    setIsActivating(true);
    try {
      const { data, error } = await (supabase.rpc as any)('activate_pro_trial', {
        p_device_id: resolvedDeviceId,
      });

      if (error) {
        const msg = error.message || '';
        if (msg.includes('already_pro')) {
          toast.info('¡Ya tienes PRO activo!');
        } else if (msg.includes('trial_already_claimed_user')) {
          toast.error('Ya has usado tu prueba gratuita.');
        } else if (msg.includes('trial_already_claimed_device')) {
          toast.error('Este dispositivo ya ha usado la prueba gratuita.');
        } else {
          toast.error('Error activando la prueba. Inténtalo de nuevo.');
        }
        return false;
      }

      toast.success(`¡PRO activado! ${data?.trial_days ?? 7} días gratis + ${data?.highlight_credits ?? 200} créditos de destacados.`);
      await refresh();
      return true;
    } catch (err) {
      toast.error('Error activando la prueba.');
      return false;
    } finally {
      setIsActivating(false);
    }
  }, [supabase, deviceId, refresh]);

  const subscribePro = useCallback(async (plan: ProPlan) => {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      const NP = getNativePurchases();
      if (!NP) {
        toast.error('Plugin de compras no disponible. Actualiza la app.');
        return;
      }

      const productId = plan === 'monthly' ? 'pro_monthly' : 'pro_yearly_cc';

      try {
        // Query product details from Google Play to obtain basePlanId and offerToken
        let planIdentifier = productId;
        let offerToken: string | undefined = undefined;

        try {
          const productsResult = await NP.getProducts({
            productIdentifiers: [productId],
            productType: 'subs',
          });
          const products = productsResult?.products || [];
          if (products.length > 0) {
            if (products[0].identifier) {
              planIdentifier = products[0].identifier;
            }
            if (products[0].offerToken) {
              offerToken = products[0].offerToken;
            }
          }
        } catch (queryErr) {
          console.warn('[useProSubscription] Could not pre-query subscription products:', queryErr);
        }

        const purchaseOptions: any = {
          productIdentifier: productId,
          planIdentifier,
          productType: 'subs',
          quantity: 1,
        };

        if (offerToken) {
          purchaseOptions.offerToken = offerToken;
        }

        const result = await NP.purchaseProduct(purchaseOptions);

        const purchaseToken = result?.purchaseToken || result?.transactionId;
        const transactionId = result?.transactionId || purchaseToken;

        if (purchaseToken) {
          await verifyWithBackend(productId, purchaseToken, transactionId, false);
        }
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        if (
          msg.includes('cancel') ||
          msg.includes('Cancel') ||
          msg.includes('USER_CANCELED') ||
          msg.includes('not purchased')
        ) {
          return;
        }

        // If Google Play indicates user already owns the subscription, restore immediately
        if (msg.includes('already') || msg.includes('ITEM_ALREADY_OWNED') || msg.includes('Owned')) {
          console.log('[useProSubscription] Already subscribed according to Play Store, restoring...');
          const restored = await restorePurchases(false);
          if (restored) return;
        }

        console.error('[useProSubscription] Purchase error:', err);
        toast.error(err?.message || 'Error al procesar la compra.');
      }
    } else {
      // Web — redirect to LemonSqueezy checkout
      let variantId = plan === 'monthly'
        ? process.env.NEXT_PUBLIC_LS_VARIANT_PRO_MONTHLY
        : process.env.NEXT_PUBLIC_LS_VARIANT_PRO_YEARLY;

      let storeSlug = process.env.NEXT_PUBLIC_LS_STORE_SLUG || 'cambiocromos';

      // Fallback: check pro_config in Supabase
      if (!variantId) {
        try {
          const { data: configRow } = await supabase
            .from('pro_config')
            .select('value')
            .eq('key', 'lemonsqueezy_variants')
            .maybeSingle();

          if (configRow?.value) {
            const configVal = configRow.value as any;
            if (configVal?.store_slug) storeSlug = configVal.store_slug;
            variantId = plan === 'monthly'
              ? configVal?.monthly_variant_id || configVal?.monthly
              : configVal?.yearly_variant_id || configVal?.yearly;
          }
        } catch (fetchErr) {
          console.error('[useProSubscription] Error fetching LS config from DB:', fetchErr);
        }
      }

      if (!variantId) {
        toast.error('Suscripción web no disponible todavía (Variant ID no configurado).');
        return;
      }

      // Open LemonSqueezy checkout with prefilled user info
      const { data: { user } } = await supabase.auth.getUser();
      const checkoutUrl = variantId.startsWith('http')
        ? (variantId.includes('?') ? `${variantId}&checkout[email]=${encodeURIComponent(user?.email || '')}&checkout[custom][user_id]=${user?.id || ''}` : `${variantId}?checkout[email]=${encodeURIComponent(user?.email || '')}&checkout[custom][user_id]=${user?.id || ''}`)
        : `https://${storeSlug}.lemonsqueezy.com/checkout/buy/${variantId}?checkout[email]=${encodeURIComponent(user?.email || '')}&checkout[custom][user_id]=${user?.id || ''}`;

      window.open(checkoutUrl, '_blank');
    }
  }, [supabase, refresh, verifyWithBackend, restorePurchases]);

  return {
    isPro,
    expiresAt,
    activateTrial,
    subscribePro,
    restorePurchases,
    isActivating,
  };
}
