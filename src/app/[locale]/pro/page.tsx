'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Zap, MessageCircle, Upload, Star, Ban, Gift, Check, ExternalLink, XCircle, Loader2, CalendarClock, CreditCard, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { ProBadge } from '@/components/ui/ProBadge';
import { useProSubscription } from '@/hooks/useProSubscription';
import { useUser } from '@/components/providers/SupabaseProvider';

const benefits = [
  {
    icon: Ban,
    title: 'Sin anuncios',
    description: 'Disfruta de CambioCromos sin interrupciones publicitarias.',
  },
  {
    icon: Upload,
    title: 'Subidas ilimitadas',
    description: 'Sin límite de 2 subidas al día. Sube todo lo que quieras.',
  },
  {
    icon: MessageCircle,
    title: 'Chats prioritarios',
    description: 'Tus mensajes aparecen primero en la bandeja de los demás.',
  },
  {
    icon: Star,
    title: '800 créditos de destacados/mes',
    description: 'Destaca tus anuncios cada mes sin coste adicional.',
  },
  {
    icon: Crown,
    title: 'Badge PRO + avatar dorado',
    description: 'Destaca con tu insignia PRO y borde dorado exclusivo.',
  },
];

function getPlanLabel(plan: string): string {
  switch (plan) {
    case 'monthly': return 'Mensual (4,99€/mes)';
    case 'yearly': return 'Anual (49,99€/año)';
    case 'trial_1m': return 'Prueba gratuita';
    case 'trial_7d': return 'Prueba gratuita';
    case 'admin_grant': return 'Cortesía';
    default: return plan;
  }
}

function getProviderLabel(provider: string | null): string {
  switch (provider) {
    case 'google_play': return 'Google Play';
    case 'lemonsqueezy': return 'Web (LemonSqueezy)';
    case 'admin_grant': return 'Administrador';
    default: return provider || 'Desconocido';
  }
}

function getStatusLabel(status: string): { label: string; color: string } {
  switch (status) {
    case 'active': return { label: 'Activa', color: 'text-green-600 dark:text-green-400' };
    case 'trial': return { label: 'Prueba gratuita', color: 'text-blue-600 dark:text-blue-400' };
    case 'cancelled': return { label: 'Cancelada (activa hasta expiración)', color: 'text-amber-600 dark:text-amber-400' };
    case 'expired': return { label: 'Expirada', color: 'text-red-600 dark:text-red-400' };
    default: return { label: status, color: 'text-gray-600 dark:text-gray-400' };
  }
}

export default function ProPage() {
  const { user } = useUser();
  const { isPro, expiresAt, subscriptionDetails, loadingDetails, activateTrial, subscribePro, restorePurchases, cancelSubscription, isActivating } = useProSubscription();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const router = useRouter();

  const handleCancel = async () => {
    // For Google Play, just call directly (opens external page)
    if (subscriptionDetails?.payment_provider === 'google_play') {
      setIsCancelling(true);
      await cancelSubscription();
      setIsCancelling(false);
      return;
    }
    // For LS, show confirmation modal
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    setShowCancelModal(false);
    setIsCancelling(true);
    await cancelSubscription();
    setIsCancelling(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#111827] flex items-center justify-center p-4">
        <ModernCard>
          <ModernCardContent className="p-8 text-center">
            <Crown className="mx-auto mb-4 text-[#FFC000]" size={48} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Inicia sesión para ver PRO</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Necesitas una cuenta para activar CambioCromos PRO.</p>
            <Button
              onClick={() => router.push('/es/login')}
              className="bg-[#FFC000] hover:bg-[#E6AD00] text-black font-bold"
            >
              Iniciar sesión
            </Button>
          </ModernCardContent>
        </ModernCard>
      </div>
    );
  }

  if (isPro) {
    const sub = subscriptionDetails;
    const statusInfo = sub ? getStatusLabel(sub.status) : null;
    const canCancel = sub && sub.status === 'active' && sub.plan !== 'trial_1m' && sub.plan !== 'admin_grant';
    const isTrial = sub?.plan === 'trial_1m' || sub?.plan === 'trial_7d' || sub?.status === 'trial';
    const isAdminGrant = sub?.plan === 'admin_grant';

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#111827] p-4 pt-8 pb-24">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#FFC000] to-[#F59E0B] mb-4">
              <Crown size={40} className="text-black" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">¡Eres PRO!</h1>
            <ProBadge size="md" className="mx-auto" />
          </div>

          {/* Subscription Info Card */}
          <ModernCard className="mb-4">
            <ModernCardContent className="p-6">
              <h3 className="text-gray-900 dark:text-white font-bold mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-[#FFC000]" />
                Tu suscripción
              </h3>

              {loadingDetails ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-400 text-sm">Cargando...</span>
                </div>
              ) : sub ? (
                <div className="space-y-3">
                  {/* Plan */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Plan</span>
                    <span className="text-gray-900 dark:text-white font-medium text-sm">{getPlanLabel(sub.plan)}</span>
                  </div>

                  {/* Provider */}
                  {!isTrial && !isAdminGrant && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">Plataforma</span>
                      <span className="text-gray-900 dark:text-white font-medium text-sm">{getProviderLabel(sub.payment_provider)}</span>
                    </div>
                  )}

                  {/* Status */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Estado</span>
                    <span className={`font-medium text-sm ${statusInfo?.color}`}>{statusInfo?.label}</span>
                  </div>

                  {/* Expiry */}
                  {expiresAt && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1.5">
                        <CalendarClock size={14} />
                        {sub.status === 'cancelled' ? 'Activo hasta' : 'Se renueva el'}
                      </span>
                      <span className="text-gray-900 dark:text-white font-medium text-sm">
                        {new Date(expiresAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  )}

                  {/* Cancelled warning */}
                  {sub.status === 'cancelled' && (
                    <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <p className="text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        Tu suscripción está cancelada pero seguirás disfrutando de PRO hasta la fecha de expiración.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No se encontraron detalles de suscripción.
                </p>
              )}
            </ModernCardContent>
          </ModernCard>

          {/* Active Benefits */}
          <ModernCard className="mb-4">
            <ModernCardContent className="p-6">
              <h3 className="text-gray-900 dark:text-white font-bold mb-4 flex items-center gap-2">
                <Shield size={18} className="text-[#FFC000]" />
                Tus beneficios activos
              </h3>
              <div className="space-y-3">
                {benefits.map((b) => (
                  <div key={b.title} className="flex items-center gap-3">
                    <Check size={18} className="text-[#FFC000] shrink-0" />
                    <span className="text-gray-600 dark:text-gray-300 text-sm">{b.title}</span>
                  </div>
                ))}
              </div>
            </ModernCardContent>
          </ModernCard>

          {/* Cancel / Manage Subscription */}
          {sub && sub.status !== 'cancelled' && (
            <ModernCard className="border-gray-200 dark:border-gray-700">
              <ModernCardContent className="p-6">
                <h3 className="text-gray-900 dark:text-white font-bold mb-3 flex items-center gap-2">
                  Gestionar suscripción
                </h3>
                {canCancel ? (
                  <>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mb-4">
                      {sub.payment_provider === 'google_play'
                        ? 'Se abrirá Google Play para gestionar tu suscripción. Desde allí puedes cancelar o cambiar tu plan.'
                        : 'Al cancelar, mantendrás PRO hasta el final del periodo pagado.'}
                    </p>
                    <Button
                      onClick={handleCancel}
                      disabled={isCancelling}
                      variant="outline"
                      className="w-full border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      {isCancelling ? (
                        <Loader2 size={16} className="mr-2 animate-spin" />
                      ) : sub.payment_provider === 'google_play' ? (
                        <ExternalLink size={16} className="mr-2" />
                      ) : (
                        <XCircle size={16} className="mr-2" />
                      )}
                      {sub.payment_provider === 'google_play' ? 'Gestionar en Google Play' : 'Cancelar suscripción'}
                    </Button>
                  </>
                ) : isTrial ? (
                  <>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mb-4">
                      Tu prueba gratuita expirará automáticamente. ¡Suscríbete para no perder tus beneficios!
                    </p>

                    {/* Plan selection */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button
                        onClick={() => setSelectedPlan('monthly')}
                        className={`rounded-xl border-2 p-3 text-left transition-all ${
                          selectedPlan === 'monthly'
                            ? 'border-[#FFC000] bg-[#FFC000]/10'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1F2937]'
                        }`}
                      >
                        <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Mensual</p>
                        <p className="text-gray-900 dark:text-white font-bold text-lg">4,99€</p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs">/mes</p>
                      </button>

                      <button
                        onClick={() => setSelectedPlan('yearly')}
                        className={`rounded-xl border-2 p-3 text-left transition-all relative ${
                          selectedPlan === 'yearly'
                            ? 'border-[#FFC000] bg-[#FFC000]/10'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1F2937]'
                        }`}
                      >
                        <span className="absolute -top-2.5 right-2 bg-[#FFC000] text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                          -17%
                        </span>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Anual</p>
                        <p className="text-gray-900 dark:text-white font-bold text-lg">49,99€</p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs">/año</p>
                      </button>
                    </div>

                    <Button
                      onClick={() => subscribePro(selectedPlan)}
                      className="w-full bg-gradient-to-r from-[#FFC000] to-[#F59E0B] hover:from-[#E6AD00] hover:to-[#D97706] text-black font-bold"
                    >
                      <Crown size={18} className="mr-2" />
                      Mantener beneficios PRO
                    </Button>
                  </>
                ) : isAdminGrant ? (
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    Este PRO fue otorgado por un administrador. Contacta con soporte para cualquier cambio.
                  </p>
                ) : null}
              </ModernCardContent>
            </ModernCard>
          )}
        </div>

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center mb-5">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                  <AlertTriangle size={28} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  ¿Cancelar suscripción?
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Al cancelar, perderás acceso a todos los beneficios PRO
                  {expiresAt && (
                    <> a partir del <strong className="text-gray-700 dark:text-gray-300">
                      {new Date(expiresAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </strong></>
                  )}.
                </p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-5">
                <p className="text-amber-700 dark:text-amber-300 text-xs text-center">
                  Mantendrás PRO hasta el final del periodo ya pagado.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowCancelModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Volver
                </Button>
                <Button
                  onClick={confirmCancel}
                  disabled={isCancelling}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isCancelling ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <XCircle size={16} className="mr-2" />
                  )}
                  Sí, cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111827] p-4 pt-8 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#FFC000] to-[#F59E0B] mb-4 shadow-lg shadow-[#FFC000]/20">
            <Crown size={40} className="text-black" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">CambioCromos <span className="text-[#FFC000]">PRO</span></h1>
          <p className="text-gray-500 dark:text-gray-400">La mejor experiencia para coleccionistas</p>
        </div>

        {/* Benefits */}
        <div className="space-y-3 mb-8">
          {benefits.map((benefit) => (
            <ModernCard key={benefit.title}>
              <ModernCardContent className="p-4 flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-[#FFC000]/10 flex items-center justify-center">
                  <benefit.icon size={20} className="text-[#FFC000]" />
                </div>
                <div>
                  <h3 className="text-gray-900 dark:text-white font-bold text-sm">{benefit.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{benefit.description}</p>
                </div>
              </ModernCardContent>
            </ModernCard>
          ))}
        </div>

        {/* Free Trial CTA */}
        <ModernCard className="mb-6 border-[#FFC000]/30">
          <ModernCardContent className="p-6 text-center">
            <Gift className="mx-auto mb-3 text-[#FFC000]" size={32} />
            <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-1">Prueba gratis 7 días</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Sin tarjeta de crédito. Cancela cuando quieras.</p>
            <Button
              onClick={activateTrial}
              disabled={isActivating}
              className="w-full bg-gradient-to-r from-[#FFC000] to-[#F59E0B] hover:from-[#E6AD00] hover:to-[#D97706] text-black font-bold text-sm sm:text-lg py-5 sm:py-6"
            >
              {isActivating ? 'Activando...' : '🎁 Activar prueba gratuita'}
            </Button>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">200 créditos de destacados incluidos</p>
          </ModernCardContent>
        </ModernCard>

        {/* Pricing Cards */}
        <h3 className="text-gray-900 dark:text-white font-bold text-center mb-4">O suscríbete</h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Monthly */}
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              selectedPlan === 'monthly'
                ? 'border-[#FFC000] bg-[#FFC000]/10'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1F2937]'
            }`}
          >
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Mensual</p>
            <p className="text-gray-900 dark:text-white font-bold text-xl">4,99€</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs">/mes</p>
          </button>

          {/* Yearly */}
          <button
            onClick={() => setSelectedPlan('yearly')}
            className={`rounded-xl border-2 p-4 text-left transition-all relative ${
              selectedPlan === 'yearly'
                ? 'border-[#FFC000] bg-[#FFC000]/10'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1F2937]'
            }`}
          >
            <span className="absolute -top-2.5 right-2 bg-[#FFC000] text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
              -17%
            </span>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Anual</p>
            <p className="text-gray-900 dark:text-white font-bold text-xl">49,99€</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs">/año (4,17€/mes)</p>
          </button>
        </div>

        <Button
          onClick={() => subscribePro(selectedPlan)}
          className="w-full bg-[#FFC000] hover:bg-[#E6AD00] text-black font-bold text-sm sm:text-lg py-5 sm:py-6"
        >
          <Zap size={20} className="mr-2" />
          Suscribirse {selectedPlan === 'monthly' ? 'mensual' : 'anual'}
        </Button>

        <div className="text-center mt-3">
          <button
            type="button"
            onClick={() => restorePurchases(false)}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline transition-colors"
          >
            ¿Ya te has suscrito? Restaurar compras
          </button>
        </div>

        {/* FAQ */}
        <div className="mt-10 space-y-4">
          <h3 className="text-gray-900 dark:text-white font-bold text-center">Preguntas frecuentes</h3>
          {[
            { q: '¿Puedo cancelar cuando quiera?', a: 'Sí, puedes cancelar en cualquier momento desde Google Play o tu cuenta web. Mantendrás PRO hasta el final del periodo pagado.' },
            { q: '¿Qué pasa con mis créditos al cancelar?', a: 'Los créditos de destacados que te quedan se mantienen y puedes usarlos aunque dejes de ser PRO.' },
            { q: '¿La prueba gratuita tiene todos los beneficios?', a: 'Sí, exactamente los mismos beneficios. Solo cambian los créditos de destacados (200 en trial vs 800/mes en suscripción).' },
          ].map(({ q, a }) => (
            <ModernCard key={q}>
              <ModernCardContent className="p-4">
                <h4 className="text-gray-900 dark:text-white font-bold text-sm mb-1">{q}</h4>
                <p className="text-gray-500 dark:text-gray-400 text-xs">{a}</p>
              </ModernCardContent>
            </ModernCard>
          ))}
        </div>
      </div>
    </div>
  );
}
