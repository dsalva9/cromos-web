'use client';

import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { LayoutTemplate, Store, MessageSquare } from 'lucide-react';

const steps = [
  {
    icon: LayoutTemplate,
    title: 'Activa una Plantilla',
    description:
      'Explora plantillas públicas o crea la tuya. Marca tus cromos como HAVE, NEED o DUPES en segundos.',
  },
  {
    icon: Store,
    title: 'Publica tus Duplicados',
    description:
      'Sincroniza duplicados con el marketplace, añade fotos y automatiza la visibilidad de tus anuncios.',
  },
  {
    icon: MessageSquare,
    title: 'Negocia y Finaliza',
    description:
      'Usa chats privados, reputación y auditoría para cerrar intercambios seguros y documentados.',
  },
];

export default function HowItWorks() {
  return (
    <section className="container mx-auto px-4 py-16 border-t-4 border-black">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-extrabold uppercase text-white text-center mb-12">
          Tu flujo de intercambio en tres pasos
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <ModernCard
                key={step.title}
                className="bg-gray-800 border-2 border-black shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1"
              >
                <ModernCardContent className="p-6 text-center space-y-5">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-[#FFC000] text-gray-900 font-extrabold text-xl border-2 border-black rounded-lg shadow-lg">
                    {index + 1}
                  </div>

                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg border-2 border-black bg-gray-900 shadow-lg">
                    <Icon className="h-8 w-8 text-[#FFC000]" />
                  </div>

                  <h3 className="text-xl font-bold text-white uppercase">
                    {step.title}
                  </h3>

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
