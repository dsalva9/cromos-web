'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Zap, MessageCircle, Upload, Star, Ban, Gift, Check } from 'lucide-react';
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

export default function ProPage() {
  const { user } = useUser();
  const { isPro, expiresAt, activateTrial, subscribePro, isActivating } = useProSubscription();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const router = useRouter();

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
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#111827] p-4 pt-8">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#FFC000] to-[#F59E0B] mb-4">
              <Crown size={40} className="text-black" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">¡Eres PRO!</h1>
            <ProBadge size="md" className="mx-auto" />
            {expiresAt && (
              <p className="text-gray-500 dark:text-gray-400 mt-3">
                Activo hasta: <span className="text-gray-900 dark:text-white font-medium">{new Date(expiresAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </p>
            )}
          </div>

          <ModernCard>
            <ModernCardContent className="p-6">
              <h3 className="text-gray-900 dark:text-white font-bold mb-4">Tus beneficios activos</h3>
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
        </div>
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
              className="w-full bg-gradient-to-r from-[#FFC000] to-[#F59E0B] hover:from-[#E6AD00] hover:to-[#D97706] text-black font-bold text-lg py-6"
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
          className="w-full bg-[#FFC000] hover:bg-[#E6AD00] text-black font-bold text-lg py-6"
        >
          <Zap size={20} className="mr-2" />
          Suscribirse {selectedPlan === 'monthly' ? 'mensual' : 'anual'}
        </Button>

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
