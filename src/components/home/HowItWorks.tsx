'use client';

import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { UserPlus, Search, ArrowLeftRight } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    title: 'Crea tu Cuenta',
    description:
      'Regístrate gratis y empieza a añadir cromos a tu colección personal.',
  },
  {
    icon: Search,
    title: 'Busca Intercambios',
    description:
      'Encuentra coleccionistas que tengan los cromos que necesitas y que quieran tus duplicados.',
  },
  {
    icon: ArrowLeftRight,
    title: 'Intercambia',
    description:
      'Propón intercambios justos y completa tu álbum más rápido que nunca.',
  },
];

export default function HowItWorks() {
  return (
    <section className="container mx-auto px-4 py-16 border-t-4 border-black">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <h2 className="text-3xl md:text-4xl font-extrabold uppercase text-white text-center mb-12">
          ¿Cómo Funciona?
        </h2>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <ModernCard
                key={index}
                className="bg-gray-800 border-2 border-black shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1"
              >
                <ModernCardContent className="p-6 text-center">
                  {/* Step number badge */}
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-[#FFC000] text-gray-900 font-extrabold text-xl border-2 border-black rounded-lg mb-4 shadow-lg">
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-gray-900 border-2 border-black rounded-lg flex items-center justify-center shadow-lg">
                      <Icon className="w-8 h-8 text-[#FFC000]" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-white mb-3 uppercase">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-300 leading-relaxed">
                    {step.description}
                  </p>
                </ModernCardContent>
              </ModernCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
