'use client';

import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
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
  isActivating: boolean;
}

/**
 * Centralizes PRO subscription actions:
 * - activateTrial() → calls activate_pro_trial RPC (7 days free, no card)
 * - subscribePro() → Google Play (native) or LemonSqueezy (web)
 */
export function useProSubscription(): UseProSubscriptionReturn {
  const supabase = useSupabaseClient();
  const { profile, refresh } = useProfileCompletion();
  const { deviceId } = useDeviceId();
  const [isActivating, setIsActivating] = useState(false);

  const isPro = profile?.is_pro ?? false;
  const expiresAt = profile?.pro_expires_at ?? null;

  const activateTrial = useCallback(async (): Promise<boolean> => {
    if (!deviceId) {
      toast.error('Error obteniendo ID del dispositivo. Inténtalo de nuevo.');
      return false;
    }

    setIsActivating(true);
    try {
      const { data, error } = await (supabase.rpc as any)('activate_pro_trial', {
        p_device_id: deviceId,
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
      // Google Play subscription — use NativePurchases plugin
      try {
        const { registerPlugin } = await import('@capacitor/core');
        const NativePurchases = registerPlugin('NativePurchases') as any;

        const productId = plan === 'monthly' ? 'pro_monthly' : 'pro_yearly_cc';
        const result = await NativePurchases.purchaseProduct({
          productIdentifier: productId,
          productType: 'subs',
        });

        if (result?.transactionId) {
          // Verify with backend
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-play-purchase`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                purchase_token: result.transactionId,
                product_id: productId,
                package_name: 'com.cambiocromos.app',
              }),
            }
          );

          if (response.ok) {
            toast.success('¡Suscripción PRO activada!');
            await refresh();
          }
        }
      } catch (err: any) {
        if (!err?.message?.includes('cancelled')) {
          toast.error('Error al procesar la compra.');
        }
      }
    } else {
      // Web — redirect to LemonSqueezy checkout
      const variantId = plan === 'monthly'
        ? process.env.NEXT_PUBLIC_LS_VARIANT_PRO_MONTHLY
        : process.env.NEXT_PUBLIC_LS_VARIANT_PRO_YEARLY;

      const storeSlug = process.env.NEXT_PUBLIC_LS_STORE_SLUG || 'cambiocromos';

      if (!variantId) {
        toast.error('Suscripción web no disponible todavía.');
        return;
      }

      // Open LemonSqueezy checkout with prefilled user info
      const { data: { user } } = await supabase.auth.getUser();
      const checkoutUrl = `https://${storeSlug}.lemonsqueezy.com/checkout/buy/${variantId}?checkout[email]=${encodeURIComponent(user?.email || '')}&checkout[custom][user_id]=${user?.id || ''}`;

      window.open(checkoutUrl, '_blank');
    }
  }, [supabase, refresh]);

  return {
    isPro,
    expiresAt,
    activateTrial,
    subscribePro,
    isActivating,
  };
}
