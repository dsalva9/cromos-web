'use client';

import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Badge } from '@/components/ui/badge';
import {
  Store,
  LayoutTemplate,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const features = [
  {
    icon: Store,
    badge: 'Mercado',
    title: 'Anuncios sin fricción',
    description:
      'Publica duplicados en segundos, con chats integrados y seguimiento de vistas para cada anuncio.',
  },
  {
    icon: LayoutTemplate,
    badge: 'Plantillas',
    title: 'Colecciones inteligentes',
    description:
      'Crea o copia plantillas, controla HAVE / NEED / DUPES y sincroniza el avance con tus anuncios.',
  },
  {
    icon: ShieldCheck,
    badge: 'Confianza',
    title: 'Reputación y moderación',
    description:
      'Sistema de calificaciones, reportes y auditoría completa para proteger cada intercambio.',
  },
  {
    icon: Sparkles,
    badge: 'Experiencia',
    title: 'UI retro-futurista',
    description:
      'Interfaz optimizada al milisegundo, con animaciones suaves y flujos sin recargas.',
  },
];

export default function FeatureHighlights() {
  return (
    <section className="border-t-4 border-black">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-[#FFC000]">
              ¿Por qué CambioCromos?
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold uppercase text-gray-900">
              Todo lo que necesitas para intercambiar con seguridad
            </h2>
            <p className="text-gray-700 max-w-3xl mx-auto">
              El backend v1.6.0 orquesta marketplace, plantillas y reputación en
              tiempo real. Cada módulo está listo para escalar con más agentes y
              nuevas plataformas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map(({ icon: Icon, badge, title, description }) => (
              <ModernCard
                key={title}
                className="border-2 border-black bg-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1"
              >
                <ModernCardContent className="p-6 space-y-4">
                  <Badge className="bg-[#FFC000] text-gray-900 font-bold border-2 border-black w-fit">
                    {badge}
                  </Badge>

                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-black bg-gray-100 shadow-lg">
                      <Icon className="h-6 w-6 text-[#FFC000]" />
                    </div>
                    <h3 className="text-xl font-bold uppercase text-gray-900">
                      {title}
                    </h3>
                  </div>

                  <p className="text-gray-700 leading-relaxed">
                    {description}
                  </p>
                </ModernCardContent>
              </ModernCard>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
